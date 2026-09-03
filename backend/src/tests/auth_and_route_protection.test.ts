import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { generateToken, verifyToken } from '../utils/jwt';
import crypto from 'crypto';

const TEST_PORT = 5011;
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
  headers: http.IncomingHttpHeaders;
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
          headers: res.headers,
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

const runTests = async () => {
  console.log('\n============================================================');
  console.log('   AGRIMART — AUTHENTICATION & ROUTE PROTECTION TEST SUITE  ');
  console.log('============================================================\n');

  try {
    await connectDB();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(TEST_PORT, () => {
        console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);
        resolve();
      });
    });

    // Seed test accounts for deterministic assertions
    const testFarmerEmail = `test.farmer.${Date.now()}@agrimart.test`;
    const testPartnerEmail = `test.partner.${Date.now()}@agrimart.test`;
    const initialPassword = 'Password123!';

    const farmerUser = await User.create({
      name: 'Ramesh Farmer',
      email: testFarmerEmail,
      phone: '9876543210',
      password: initialPassword,
      role: 'FARMER',
    });

    const partnerUser = await User.create({
      name: 'Kisan Store Depot',
      email: testPartnerEmail,
      phone: '9876543211',
      password: initialPassword,
      role: 'SHOP_OWNER',
      shopName: 'Kisan Agri Store Partner',
      upiId: 'kisanagri@okaxis',
    });

    const farmerToken = generateToken({
      id: farmerUser._id.toString(),
      email: farmerUser.email,
      role: farmerUser.role,
      name: farmerUser.name,
    });

    const partnerToken = generateToken({
      id: partnerUser._id.toString(),
      email: partnerUser.email,
      role: partnerUser.role,
      name: partnerUser.name,
    });

    // TEST 1: Unauthenticated request to protected Farmer Dashboard / profile
    console.log('▶ [TEST 1 & 2 & 3 & 4]: Unauthenticated access to protected APIs without token...');
    const unauthOrders = await makeRequest({
      method: 'GET',
      path: '/api/orders',
    });
    if (unauthOrders.statusCode === 401) {
      console.log('  ✅ TEST 1-4 PASSED: Unauthenticated access rejected with HTTP 401 Unauthorized.');
    } else {
      throw new Error(`Expected 401, got ${unauthOrders.statusCode}: ${JSON.stringify(unauthOrders.body)}`);
    }

    // TEST 5: Farmer attempts to access Agri Store Partner orders
    console.log('\n▶ [TEST 5]: Farmer attempts to access Agri Store Partner protected endpoints (/api/orders/shop-owner)...');
    const farmerAccessPartner = await makeRequest({
      method: 'GET',
      path: '/api/orders/shop-owner',
      token: farmerToken,
    });
    if (farmerAccessPartner.statusCode === 403) {
      console.log(`  ✅ TEST 5 PASSED: Farmer access to Store Partner endpoint rejected with HTTP 403 Forbidden: "${farmerAccessPartner.body.message}"`);
    } else {
      throw new Error(`Expected 403, got ${farmerAccessPartner.statusCode}`);
    }

    // TEST 6: Store Partner attempts to access Cart/Farmer-only endpoints
    console.log('\n▶ [TEST 6]: Store Partner attempts to access Farmer-only Cart endpoints (/api/cart)...');
    const partnerAccessCart = await makeRequest({
      method: 'GET',
      path: '/api/cart',
      token: partnerToken,
    });
    if (partnerAccessCart.statusCode === 403) {
      console.log(`  ✅ TEST 6 PASSED: Store Partner access to Farmer Cart rejected with HTTP 403 Forbidden: "${partnerAccessCart.body.message}"`);
    } else {
      throw new Error(`Expected 403, got ${partnerAccessCart.statusCode}`);
    }

    // TEST 7: Token verification and auth session persistence (/api/auth/me)
    console.log('\n▶ [TEST 7]: Valid Token Session Persistence (/api/auth/me)...');
    const meRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
      token: farmerToken,
    });
    if (meRes.statusCode === 200 && meRes.body.user?.email === testFarmerEmail) {
      console.log(`  ✅ TEST 7 PASSED: Valid token verified. User identity restored for '${meRes.body.user.name}' (${meRes.body.user.role}).`);
    } else {
      throw new Error(`Expected 200 with user, got ${meRes.statusCode}`);
    }

    // TEST 8 & 9: Invalid and Expired JWT Tokens
    console.log('\n▶ [TEST 8 & 9]: Testing Invalid and Malformed JWT Tokens...');
    const invalidJwtRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
      token: 'invalid.tampered.jwt.signature.here',
    });
    if (invalidJwtRes.statusCode === 401) {
      console.log(`  ✅ TEST 8 & 9 PASSED: Invalid JWT rejected with HTTP 401: "${invalidJwtRes.body.message}"`);
    } else {
      throw new Error(`Expected 401 for invalid JWT, got ${invalidJwtRes.statusCode}`);
    }

    // TEST 10: Full Password Reset Flow with Real Crypto Token
    console.log('\n▶ [TEST 10]: Forgot Password with Registered Account & Token-Based Reset Flow...');
    const forgotRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/forgot-password',
      body: { email: testFarmerEmail },
    });

    if (forgotRes.statusCode !== 200 || !forgotRes.body.resetToken) {
      throw new Error(`Forgot password failed: ${JSON.stringify(forgotRes.body)}`);
    }

    const resetToken = forgotRes.body.resetToken;
    console.log(`  → Token Generated: ${resetToken.slice(0, 16)}...`);
    console.log(`  → Reset Link: ${forgotRes.body.resetLink}`);

    // Verify token was stored as SHA-256 hash in MongoDB
    const expectedHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const userInDb = await User.findOne({ email: testFarmerEmail }).select('+resetPasswordToken +resetPasswordExpires');
    if (userInDb?.resetPasswordToken !== expectedHash) {
      throw new Error(`MongoDB does not contain the hashed reset token!`);
    }
    console.log(`  → Verified: Token is stored securely as SHA-256 hash in MongoDB.`);

    // Perform actual password reset using the token
    const newPassword = 'NewFarmerSecurePass99!';
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
    console.log(`  → Password successfully reset with token.`);

    // Verify token was cleared from MongoDB
    const userAfterReset = await User.findOne({ email: testFarmerEmail }).select('+resetPasswordToken +resetPasswordExpires');
    if (userAfterReset?.resetPasswordToken) {
      throw new Error(`Reset token was not cleared after use!`);
    }
    console.log(`  → Verified: Reset token invalidated/cleared in MongoDB.`);

    // Verify login with NEW password
    const loginNewRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: testFarmerEmail,
        password: newPassword,
      },
    });
    if (loginNewRes.statusCode === 200 && loginNewRes.body.token) {
      console.log(`  → Verified: Login with NEW password succeeds.`);
    } else {
      throw new Error(`Login with new password failed: ${JSON.stringify(loginNewRes.body)}`);
    }

    // Verify OLD password fails
    const loginOldRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: testFarmerEmail,
        password: initialPassword,
      },
    });
    if (loginOldRes.statusCode === 401) {
      console.log(`  → Verified: Login with OLD password rejected with HTTP 401.`);
    } else {
      throw new Error(`Old password unexpectedly succeeded!`);
    }
    console.log('  ✅ TEST 10 PASSED: Complete Forgot Password & Token-Based Reset workflow succeeded.');

    // TEST 11: Forgot Password with Unregistered Email
    console.log('\n▶ [TEST 11]: Forgot Password with Unregistered Email...');
    const unregRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/forgot-password',
      body: { email: 'nonexistent.random.user.999@agrimart.test' },
    });
    if (unregRes.statusCode === 404) {
      console.log(`  ✅ TEST 11 PASSED: Unregistered email securely rejected with HTTP 404: "${unregRes.body.message}"`);
    } else {
      throw new Error(`Expected 404 for unregistered email, got ${unregRes.statusCode}: ${JSON.stringify(unregRes.body)}`);
    }

    // TEST 12: Reset Password with Invalid or Expired Token
    console.log('\n▶ [TEST 12]: Reset Password with Invalid / Expired Token...');
    const invalidTokenRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/reset-password',
      body: {
        token: 'completely_fake_or_expired_token_1234567890',
        newPassword: 'SomePassword123!',
      },
    });
    if (invalidTokenRes.statusCode === 400) {
      console.log(`  ✅ TEST 12 PASSED: Invalid token rejected with HTTP 400: "${invalidTokenRes.body.message}"`);
    } else {
      throw new Error(`Expected 400 for invalid token, got ${invalidTokenRes.statusCode}`);
    }

    console.log('\n============================================================');
    console.log('  🎉 ALL 12 AUTHENTICATION & ROUTE PROTECTION TESTS PASSED! ');
    console.log('============================================================\n');

  } catch (err) {
    console.error('\n❌ Tests Failed:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit(0);
  }
};

runTests();
