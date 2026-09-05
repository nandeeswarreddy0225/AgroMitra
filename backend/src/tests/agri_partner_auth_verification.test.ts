import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { autoSeedDefaultData } from '../utils/autoSeed';
import { User } from '../models/User.model';
import { verifyToken } from '../utils/jwt';

const TEST_PORT = 5088;
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

const runAgriPartnerAuthVerification = async () => {
  console.log('\n================================================================');
  console.log('  AGRIMART — PHONE + CAPTCHA + PASSWORD AUTHENTICATION TEST     ');
  console.log('                 GENUINE AGRI_PARTNER ROLE                      ');
  console.log('================================================================\n');

  try {
    // 0. Initialize DB and Test Server
    await connectDB();
    await autoSeedDefaultData();

    server = app.listen(TEST_PORT);
    await new Promise((res) => setTimeout(res, 300));

    // Unique dedicated Agri Partner account identifiers
    const timestamp = Date.now();
    const uniquePartnerEmail = `agripartner.${timestamp}@agrimart.com`;
    const uniquePartnerPhone = `98${String(timestamp).slice(-8)}`; // Valid 10-digit Indian phone (starts with 98)
    const partnerPassword = 'SecurePartnerPassword2026!';
    const validCaptchaToken = '1x0000000000000000000000000000000AA'; // Cloudflare Turnstile standard test pass token

    // 1. Register a genuine AGRI_PARTNER user
    console.log('▶ [TEST 1]: Registering genuine AGRI_PARTNER account with phone number...');
    const registerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Kurnool Agri Partner Center',
        email: uniquePartnerEmail,
        phone: uniquePartnerPhone,
        password: partnerPassword,
        role: 'AGRI_PARTNER',
        shopName: 'AgroMitra Certified Agri Kendra',
        address: {
          street: 'Shop 12, Agro Complex',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518001',
        },
      },
    });

    if (registerRes.statusCode !== 201 || !registerRes.body.token) {
      throw new Error(`Registration failed: ${JSON.stringify(registerRes.body)}`);
    }

    if (registerRes.body.user?.role !== 'AGRI_PARTNER') {
      throw new Error(`Role mismatch! Expected 'AGRI_PARTNER', received: '${registerRes.body.user?.role}'`);
    }

    console.log(`  ✅ TEST 1 PASSED: Registered genuine account. Role: ${registerRes.body.user.role}`);

    // Verify password is cryptographically hashed with bcrypt in database
    const dbUser = await User.findOne({ phone: uniquePartnerPhone }).select('+password');
    if (!dbUser || !dbUser.password || !dbUser.password.startsWith('$2')) {
      throw new Error('SECURITY VIOLATION: Password was not securely hashed with bcrypt in database!');
    }
    console.log('  ✅ Database verified: Password is cryptographically hashed with standard bcrypt ($2b$).');

    // 2. Login with Phone Number + CAPTCHA Token + Correct Password
    console.log('\n▶ [TEST 2]: Logging in with Phone Number + CAPTCHA + Password...');
    const loginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: uniquePartnerPhone,
        password: partnerPassword,
        captchaToken: validCaptchaToken,
      },
    });

    if (loginRes.statusCode !== 200 || !loginRes.body.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }

    const partnerToken = loginRes.body.token;
    const loggedInUser = loginRes.body.user;

    // Verify response role is AGRI_PARTNER
    if (loggedInUser.role !== 'AGRI_PARTNER') {
      throw new Error(`Expected Role 'AGRI_PARTNER', but got '${loggedInUser.role}'`);
    }

    // Verify no password leakage in response
    if (loggedInUser.password || loggedInUser.passwordHash) {
      throw new Error('SECURITY VIOLATION: Login response leaked sensitive password fields!');
    }

    // Verify JWT payload contains AGRI_PARTNER
    const decodedToken = verifyToken(partnerToken);
    if (decodedToken.role !== 'AGRI_PARTNER') {
      throw new Error(`JWT role mismatch! Expected 'AGRI_PARTNER', got '${decodedToken.role}'`);
    }

    console.log(`  ✅ TEST 2 PASSED: Phone+CAPTCHA login succeeded. Role: ${loggedInUser.role} (JWT Role: ${decodedToken.role})`);

    // 3. Reject Invalid CAPTCHA Token
    console.log('\n▶ [TEST 3]: Verifying invalid CAPTCHA rejection (HTTP 400)...');
    const invalidCaptchaRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: uniquePartnerPhone,
        password: partnerPassword,
        captchaToken: '2x0000000000000000000000000000000AA', // Turnstile test fail token
      },
    });

    if (invalidCaptchaRes.statusCode === 400) {
      console.log(`  ✅ TEST 3 PASSED: Invalid CAPTCHA token rejected with HTTP 400.`);
    } else {
      throw new Error(`Security failure: Invalid CAPTCHA was not rejected with 400. Status: ${invalidCaptchaRes.statusCode}`);
    }

    // 4. Reject Incorrect Password with HTTP 401
    console.log('\n▶ [TEST 4]: Verifying incorrect password rejection (HTTP 401)...');
    const wrongPassRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: uniquePartnerPhone,
        password: 'WrongPassword2026!',
        captchaToken: validCaptchaToken,
      },
    });

    if (wrongPassRes.statusCode === 401 && !wrongPassRes.body.token) {
      console.log(`  ✅ TEST 4 PASSED: Incorrect password properly rejected with HTTP 401.`);
    } else {
      throw new Error(`Security failure: Incorrect password was not rejected with 401. Status: ${wrongPassRes.statusCode}`);
    }

    // 5. Phone Normalization (+91 prefix, leading zero, spaces)
    console.log('\n▶ [TEST 5]: Testing Phone Number normalization (+91 prefix, spaces)...');
    const formattedPhone = `  +91 ${uniquePartnerPhone.slice(0, 5)} ${uniquePartnerPhone.slice(5)}  `;
    const normalizedRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: formattedPhone,
        password: partnerPassword,
        captchaToken: validCaptchaToken,
      },
    });

    if (normalizedRes.statusCode === 200 && normalizedRes.body.user?.role === 'AGRI_PARTNER') {
      console.log(`  ✅ TEST 5 PASSED: Phone normalization succeeded. Role: ${normalizedRes.body.user.role}`);
    } else {
      throw new Error(`Phone normalization test failed: ${JSON.stringify(normalizedRes.body)}`);
    }

    // 6. Authenticated Profile Verification (GET /api/auth/me)
    console.log('\n▶ [TEST 6]: Verifying GET /api/auth/me returns role AGRI_PARTNER...');
    const meRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
      token: partnerToken,
    });

    if (meRes.statusCode !== 200 || meRes.body.user?.role !== 'AGRI_PARTNER') {
      throw new Error(`GET /api/auth/me failed! Expected role 'AGRI_PARTNER', got: ${JSON.stringify(meRes.body)}`);
    }

    if (meRes.body.user.password || meRes.body.user.passwordHash) {
      throw new Error('SECURITY VIOLATION: Profile endpoint exposed password data!');
    }

    console.log(`  ✅ TEST 6 PASSED: Session profile retrieved for '${meRes.body.user.name}'. Role: ${meRes.body.user.role}`);

    // 7. Role-Based Access Control on Agri Partner Endpoint
    console.log('\n▶ [TEST 7]: Verifying Role Authorization (/api/auth/agri-partner-only)...');
    const roleRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/agri-partner-only',
      token: partnerToken,
    });

    if (roleRes.statusCode === 200 && roleRes.body.success) {
      console.log(`  ✅ TEST 7 PASSED: Agri Partner successfully authorized. Role: ${roleRes.body.user.role}`);
    } else {
      throw new Error(`Role authorization failed: ${JSON.stringify(roleRes.body)}`);
    }

    // 8. Phone-Based Password Recovery & Reset Flow
    console.log('\n▶ [TEST 8]: Testing Phone-based Password Reset flow...');
    const forgotRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/forgot-password',
      body: { phone: uniquePartnerPhone },
    });

    if (forgotRes.statusCode !== 200 || !forgotRes.body.resetToken) {
      throw new Error(`Forgot password failed: ${JSON.stringify(forgotRes.body)}`);
    }

    const resetToken = forgotRes.body.resetToken;
    const newPassword = 'NewSecurePartnerPassword2026!';

    const resetRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/reset-password',
      body: {
        token: resetToken,
        newPassword,
      },
    });

    if (resetRes.statusCode !== 200 || !resetRes.body.success) {
      throw new Error(`Reset password failed: ${JSON.stringify(resetRes.body)}`);
    }

    // Log in with new password
    const newLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: uniquePartnerPhone,
        password: newPassword,
        captchaToken: validCaptchaToken,
      },
    });

    if (newLoginRes.statusCode === 200 && newLoginRes.body.user?.role === 'AGRI_PARTNER') {
      console.log(`  ✅ TEST 8 PASSED: Password reset & login with new password succeeded. Role: ${newLoginRes.body.user.role}`);
    } else {
      throw new Error(`Login with new password failed: ${JSON.stringify(newLoginRes.body)}`);
    }

    console.log('\n================================================================');
    console.log('  🎉 ALL AGRI_PARTNER PHONE+CAPTCHA+PASSWORD TESTS PASSED!       ');
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ Agri Partner Auth Verification Failed:', error);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
};

runAgriPartnerAuthVerification();
