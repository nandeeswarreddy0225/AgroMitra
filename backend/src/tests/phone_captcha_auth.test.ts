import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { autoSeedDefaultData } from '../utils/autoSeed';
import { User } from '../models/User.model';
import { verifyToken } from '../utils/jwt';
import { CaptchaService } from '../services/captcha.service';

const TEST_PORT = 5089;
let server: http.Server;

interface RequestOptions {
  method: string;
  path: string;
  body?: any;
  token?: string;
}

interface ResponseResult {
  statusCode: number;
  body: any;
}

const makeRequest = (options: RequestOptions): Promise<ResponseResult> => {
  return new Promise((resolve, reject) => {
    const dataString = options.body ? JSON.stringify(options.body) : '';

    const reqOptions: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: options.path,
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...(dataString ? { 'Content-Length': Buffer.byteLength(dataString) } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        let parsed: any;
        try {
          parsed = JSON.parse(responseBody);
        } catch {
          parsed = responseBody;
        }
        resolve({
          statusCode: res.statusCode || 500,
          body: parsed,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
};

const runComprehensiveAuthTestSuite = async () => {
  console.log('\n================================================================');
  console.log('   AGRIMART COMPREHENSIVE PHONE + CAPTCHA + PASSWORD TEST SUITE ');
  console.log('================================================================\n');

  try {
    // 0. Connect DB & Seed default accounts
    await connectDB();
    await autoSeedDefaultData();

    server = app.listen(TEST_PORT);
    await new Promise((res) => setTimeout(res, 300));

    const validCaptchaToken = '1x0000000000000000000000000000000AA'; // Cloudflare Turnstile official test pass token
    const invalidCaptchaToken = '2x0000000000000000000000000000000AA'; // Cloudflare Turnstile official test fail token

    const timestamp = Date.now();
    const uniquePartnerPhone = `98${String(timestamp).slice(-8)}`;
    const uniquePartnerEmail = `partner.${timestamp}@agrimart.test`;
    const partnerPassword = 'SecureAgriPartnerPassword2026!';

    // ------------------------------------------------------------------------
    // TEST 1: AGRI_PARTNER Registration & Phone Storage
    // ------------------------------------------------------------------------
    console.log('▶ [TEST 1]: Registering genuine AGRI_PARTNER with phone number...');
    const registerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Kurnool Agro Chemicals & Seeds',
        phone: uniquePartnerPhone,
        email: uniquePartnerEmail,
        password: partnerPassword,
        role: 'AGRI_PARTNER',
        shopName: 'AgroMitra Certified Kendra',
        address: {
          street: 'Shop 12, Agro Complex',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518001',
        },
      },
    });

    if (registerRes.statusCode !== 201 || registerRes.body.user?.role !== 'AGRI_PARTNER') {
      throw new Error(`AGRI_PARTNER registration failed: ${JSON.stringify(registerRes.body)}`);
    }
    console.log(`  ✅ TEST 1 PASSED: AGRI_PARTNER registered successfully. Role: ${registerRes.body.user.role}`);

    // ------------------------------------------------------------------------
    // TEST 2: Bcrypt Password Hashing in Database
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 2]: Verifying database password hashing (bcrypt $2b$)...');
    const storedUser = await User.findOne({ phone: uniquePartnerPhone }).select('+password');
    if (!storedUser || !storedUser.password || !storedUser.password.startsWith('$2') || storedUser.password.length < 60) {
      throw new Error('SECURITY VIOLATION: Password is not stored as a valid standard bcrypt hash!');
    }
    if (storedUser.password === partnerPassword) {
      throw new Error('SECURITY VIOLATION: Plaintext password stored in database!');
    }
    console.log('  ✅ TEST 2 PASSED: Password securely hashed with bcrypt ($2b$). No plaintext stored.');

    // ------------------------------------------------------------------------
    // TEST 3: Prevent Double-Hashing on Profile/User Updates
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 3]: Verifying password is not double-hashed on save/update...');
    const hashBeforeSave = storedUser.password;
    storedUser.shopName = 'AgroMitra Certified Kendra - Updated';
    await storedUser.save();
    const storedUserAfter = await User.findOne({ phone: uniquePartnerPhone }).select('+password');
    if (storedUserAfter?.password !== hashBeforeSave) {
      throw new Error('BUG: Saving user profile modified/double-hashed the password!');
    }
    console.log('  ✅ TEST 3 PASSED: User profile updated without double-hashing password.');

    // ------------------------------------------------------------------------
    // TEST 4: Valid Phone + Valid CAPTCHA + Correct Password -> AGRI_PARTNER Login
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 4]: Logging in AGRI_PARTNER with Phone + CAPTCHA + Password...');
    const loginPartnerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: uniquePartnerPhone,
        password: partnerPassword,
        captchaToken: validCaptchaToken,
      },
    });

    if (loginPartnerRes.statusCode !== 200 || !loginPartnerRes.body.token) {
      throw new Error(`AGRI_PARTNER login failed: ${JSON.stringify(loginPartnerRes.body)}`);
    }

    const partnerToken = loginPartnerRes.body.token;
    const partnerUser = loginPartnerRes.body.user;
    if (partnerUser.role !== 'AGRI_PARTNER') {
      throw new Error(`Role mismatch! Expected 'AGRI_PARTNER', got '${partnerUser.role}'`);
    }

    const decodedPartnerJwt = verifyToken(partnerToken);
    if (decodedPartnerJwt.role !== 'AGRI_PARTNER') {
      throw new Error(`JWT role mismatch! Expected 'AGRI_PARTNER', got '${decodedPartnerJwt.role}'`);
    }
    console.log(`  ✅ TEST 4 PASSED: AGRI_PARTNER logged in successfully. Role: ${partnerUser.role} (JWT: ${decodedPartnerJwt.role})`);

    // ------------------------------------------------------------------------
    // TEST 5: GET /api/auth/me Profile for AGRI_PARTNER
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 5]: Verifying GET /api/auth/me returns role AGRI_PARTNER...');
    const meRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
      token: partnerToken,
    });

    if (meRes.statusCode !== 200 || meRes.body.user?.role !== 'AGRI_PARTNER') {
      throw new Error(`GET /api/auth/me failed: ${JSON.stringify(meRes.body)}`);
    }
    console.log(`  ✅ TEST 5 PASSED: Session user verified. Role: ${meRes.body.user.role}`);

    // ------------------------------------------------------------------------
    // TEST 6: Rejection on Invalid CAPTCHA Token (HTTP 400)
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 6]: Verifying invalid CAPTCHA rejection (HTTP 400)...');
    const invalidCaptchaRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: uniquePartnerPhone,
        password: partnerPassword,
        captchaToken: invalidCaptchaToken,
      },
    });

    if (invalidCaptchaRes.statusCode === 400 && !invalidCaptchaRes.body.token) {
      console.log('  ✅ TEST 6 PASSED: Invalid CAPTCHA token rejected with HTTP 400.');
    } else {
      throw new Error(`Security failure: Invalid CAPTCHA was not rejected with 400. Status: ${invalidCaptchaRes.statusCode}`);
    }

    // ------------------------------------------------------------------------
    // TEST 7: Rejection on Missing CAPTCHA Token (HTTP 400)
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 7]: Verifying missing CAPTCHA rejection (HTTP 400)...');
    const missingCaptchaRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: uniquePartnerPhone,
        password: partnerPassword,
      },
    });

    if (missingCaptchaRes.statusCode === 400 && !missingCaptchaRes.body.token) {
      console.log('  ✅ TEST 7 PASSED: Missing CAPTCHA rejected with HTTP 400.');
    } else {
      throw new Error(`Security failure: Missing CAPTCHA was not rejected with 400. Status: ${missingCaptchaRes.statusCode}`);
    }

    // ------------------------------------------------------------------------
    // TEST 8: Rejection on Incorrect Password (HTTP 401)
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 8]: Verifying incorrect password rejection (HTTP 401)...');
    const wrongPasswordRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: uniquePartnerPhone,
        password: 'CompletelyWrongPassword999!',
        captchaToken: validCaptchaToken,
      },
    });

    if (wrongPasswordRes.statusCode === 401 && !wrongPasswordRes.body.token) {
      console.log('  ✅ TEST 8 PASSED: Incorrect password rejected with HTTP 401.');
    } else {
      throw new Error(`Security failure: Wrong password was not rejected with 401. Status: ${wrongPasswordRes.statusCode}`);
    }

    // ------------------------------------------------------------------------
    // TEST 9: Phone Number Normalization (+91 prefix, spaces, dash)
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 9]: Testing Phone Number normalization (+91, spaces)...');
    const formattedPhoneVariants = [
      `+91 ${uniquePartnerPhone}`,
      `+91-${uniquePartnerPhone.slice(0, 5)}-${uniquePartnerPhone.slice(5)}`,
      `  ${uniquePartnerPhone}  `,
      `0${uniquePartnerPhone}`,
    ];

    for (const variant of formattedPhoneVariants) {
      const normRes = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          phone: variant,
          password: partnerPassword,
          captchaToken: validCaptchaToken,
        },
      });

      if (normRes.statusCode !== 200 || normRes.body.user?.role !== 'AGRI_PARTNER') {
        throw new Error(`Normalization failed for phone variant '${variant}': ${JSON.stringify(normRes.body)}`);
      }
    }
    console.log('  ✅ TEST 9 PASSED: All phone variants (+91, 0-prefix, dashes, spaces) normalized and authenticated.');

    // ------------------------------------------------------------------------
    // TEST 10: Duplicate Phone Number Rejection on Registration (HTTP 409)
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 10]: Testing duplicate phone number registration rejection...');
    const duplicatePhoneRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Duplicate Phone Attempt',
        phone: uniquePartnerPhone, // Same phone
        email: `another.${Date.now()}@agrimart.test`,
        password: 'Password123',
        role: 'FARMER',
      },
    });

    if (duplicatePhoneRes.statusCode === 409) {
      console.log('  ✅ TEST 10 PASSED: Duplicate phone number properly rejected with HTTP 409 Conflict.');
    } else {
      throw new Error(`Duplicate phone was not rejected with 409. Status: ${duplicatePhoneRes.statusCode}`);
    }

    // ------------------------------------------------------------------------
    // TEST 11: FARMER Role Login with Seeded Account
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 11]: Testing FARMER role login (Seeded account)...');
    const farmerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: '8519813077',
        password: 'Password123',
        captchaToken: validCaptchaToken,
      },
    });

    if (farmerRes.statusCode !== 200 || farmerRes.body.user?.role !== 'FARMER') {
      throw new Error(`FARMER login failed: ${JSON.stringify(farmerRes.body)}`);
    }
    const farmerJwt = verifyToken(farmerRes.body.token);
    if (farmerJwt.role !== 'FARMER') {
      throw new Error(`FARMER JWT role mismatch: ${farmerJwt.role}`);
    }
    console.log(`  ✅ TEST 11 PASSED: FARMER logged in successfully. Role: ${farmerRes.body.user.role} (JWT: ${farmerJwt.role})`);

    // ------------------------------------------------------------------------
    // TEST 12: SHOP_OWNER Role Login with Seeded Account
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 12]: Testing SHOP_OWNER role login (Seeded account)...');
    const shopOwnerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: '9876543210',
        password: 'Password123',
        captchaToken: validCaptchaToken,
      },
    });

    if (shopOwnerRes.statusCode !== 200 || shopOwnerRes.body.user?.role !== 'SHOP_OWNER') {
      throw new Error(`SHOP_OWNER login failed: ${JSON.stringify(shopOwnerRes.body)}`);
    }
    const shopOwnerJwt = verifyToken(shopOwnerRes.body.token);
    if (shopOwnerJwt.role !== 'SHOP_OWNER') {
      throw new Error(`SHOP_OWNER JWT role mismatch: ${shopOwnerJwt.role}`);
    }
    console.log(`  ✅ TEST 12 PASSED: SHOP_OWNER logged in successfully. Role: ${shopOwnerRes.body.user.role} (JWT: ${shopOwnerJwt.role})`);

    // ------------------------------------------------------------------------
    // TEST 13: ADMIN Role Login with Seeded Account
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 13]: Testing ADMIN role login (Seeded account)...');
    const adminRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: '9876543211',
        password: 'Password123',
        captchaToken: validCaptchaToken,
      },
    });

    if (adminRes.statusCode !== 200 || adminRes.body.user?.role !== 'ADMIN') {
      throw new Error(`ADMIN login failed: ${JSON.stringify(adminRes.body)}`);
    }
    const adminJwt = verifyToken(adminRes.body.token);
    if (adminJwt.role !== 'ADMIN') {
      throw new Error(`ADMIN JWT role mismatch: ${adminJwt.role}`);
    }
    console.log(`  ✅ TEST 13 PASSED: ADMIN logged in successfully. Role: ${adminRes.body.user.role} (JWT: ${adminJwt.role})`);

    // ------------------------------------------------------------------------
    // TEST 14: Server-Side CAPTCHA Production Configuration Reporting
    // ------------------------------------------------------------------------
    console.log('\n▶ [TEST 14]: Testing Server-Side CAPTCHA Production Configuration Error Reporting...');
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.TURNSTILE_SECRET_KEY;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.TURNSTILE_SECRET_KEY;
      delete process.env.CAPTCHA_SECRET_KEY;

      const prodCheck = await CaptchaService.verifyCaptchaToken('some-production-token-12345');
      if (prodCheck.success === false && prodCheck.message?.includes('TURNSTILE_SECRET_KEY is missing')) {
        console.log('  ✅ TEST 14 PASSED: Missing production CAPTCHA configuration clearly reported.');
      } else {
        throw new Error(`Expected production missing secret rejection, got: ${JSON.stringify(prodCheck)}`);
      }
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalSecret) {
        process.env.TURNSTILE_SECRET_KEY = originalSecret;
      }
    }

    console.log('\n================================================================');
    console.log('  🎉 ALL 14 PHONE + CAPTCHA + PASSWORD AUTHENTICATION TESTS PASSED!');
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ Comprehensive Auth Test Suite Failed:', error);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
};

runComprehensiveAuthTestSuite();
