import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000';

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
      hostname: 'localhost',
      port: 5000,
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

    req.on('error', (e) => reject(e));

    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
};

const runAuthVerification = async () => {
  console.log('====================================================');
  console.log('  AGRIMART AUTHENTICATION SYSTEM VERIFICATION       ');
  console.log('====================================================\n');

  // Test 1: Live Health Check
  console.log('▶ [TEST 1]: Checking API Server status...');
  const health = await makeRequest({ method: 'GET', path: '/api/health' });
  if (health.statusCode !== 200) {
    throw new Error(`API health check failed: ${JSON.stringify(health)}`);
  }
  console.log('  ✅ API Server is HEALTHY.\n');

  // Test 2: Existing Farmer Login
  console.log('▶ [TEST 2]: Logging in with existing Farmer account...');
  const farmerLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: 'nandeeswarreddy2852@gmail.com',
      password: 'Password123',
    },
  });

  if (farmerLogin.statusCode !== 200 || !farmerLogin.body.token) {
    throw new Error(`Farmer login failed: ${JSON.stringify(farmerLogin.body)}`);
  }
  const farmerToken = farmerLogin.body.token;
  console.log(`  ✅ Farmer Login PASSED: ${farmerLogin.body.user.name} (${farmerLogin.body.user.role})\n`);

  // Test 3: Existing Shop Owner Login
  console.log('▶ [TEST 3]: Logging in with existing Shop Owner account...');
  const shopLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: 'nandeeswarreddy1346@gmail.com',
      password: 'Password123',
    },
  });

  if (shopLogin.statusCode !== 200 || !shopLogin.body.token) {
    throw new Error(`Shop Owner login failed: ${JSON.stringify(shopLogin.body)}`);
  }
  const shopToken = shopLogin.body.token;
  console.log(`  ✅ Shop Owner Login PASSED: ${shopLogin.body.user.name} (${shopLogin.body.user.role})\n`);

  // Test 4: Email Case-Insensitivity & Whitespace Trimming
  console.log('▶ [TEST 4]: Testing Email normalization (Mixed Case & Whitespace)...');
  const normalizedLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: '   NANdeeswarReddy2852@GMAIL.COM   ',
      password: 'Password123',
    },
  });

  if (normalizedLogin.statusCode !== 200 || !normalizedLogin.body.token) {
    throw new Error(`Email normalization login failed: ${JSON.stringify(normalizedLogin.body)}`);
  }
  console.log('  ✅ Email normalization PASSED: Whitespace and mixed casing handled gracefully.\n');

  // Test 5: Incorrect Password Rejection
  console.log('▶ [TEST 5]: Testing Incorrect Password rejection...');
  const wrongPassLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: 'nandeeswarreddy2852@gmail.com',
      password: 'WrongPassword999!',
    },
  });

  if (wrongPassLogin.statusCode === 401 && wrongPassLogin.body.message === 'Invalid email or password.') {
    console.log('  ✅ Wrong Password correctly rejected with HTTP 401 "Invalid email or password."\n');
  } else {
    throw new Error(`Wrong password test failed: ${JSON.stringify(wrongPassLogin)}`);
  }

  // Test 6: Non-Existent User Rejection
  console.log('▶ [TEST 6]: Testing Non-existent email rejection...');
  const nonExistentLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: 'nonexistent.user.2026@agrimart.com',
      password: 'Password123',
    },
  });

  if (nonExistentLogin.statusCode === 401 && nonExistentLogin.body.message === 'Invalid email or password.') {
    console.log('  ✅ Non-existent user correctly rejected with HTTP 401 "Invalid email or password."\n');
  } else {
    throw new Error(`Non-existent user test failed: ${JSON.stringify(nonExistentLogin)}`);
  }

  // Test 7: Authenticated Profile Fetch (GET /api/auth/me)
  console.log('▶ [TEST 7]: Verifying JWT Session & Authenticated Profile (GET /api/auth/me)...');
  const meRes = await makeRequest({
    method: 'GET',
    path: '/api/auth/me',
    token: farmerToken,
  });

  if (meRes.statusCode !== 200 || meRes.body.user.email !== 'nandeeswarreddy2852@gmail.com') {
    throw new Error(`Profile fetch failed: ${JSON.stringify(meRes.body)}`);
  }
  console.log(`  ✅ JWT Session PASSED: User profile retrieved: ${meRes.body.user.name} (${meRes.body.user.email})\n`);

  // Test 8: Authenticated Orders Endpoint Access
  console.log('▶ [TEST 8]: Verifying Authenticated API Endpoint Access (GET /api/orders)...');
  const ordersRes = await makeRequest({
    method: 'GET',
    path: '/api/orders',
    token: farmerToken,
  });

  if (ordersRes.statusCode !== 200 || !ordersRes.body.success) {
    throw new Error(`Orders fetch failed: ${JSON.stringify(ordersRes.body)}`);
  }
  console.log(`  ✅ Authenticated API Access PASSED: Retrieved ${ordersRes.body.count} farmer orders.\n`);

  // Test 9: Simulate Logout & Re-login
  console.log('▶ [TEST 9]: Simulating Client Logout & Re-login with Existing Account...');
  // After logout, token is discarded. Login again:
  const reLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: 'nandeeswarreddy2852@gmail.com',
      password: 'Password123',
    },
  });

  if (reLogin.statusCode !== 200 || !reLogin.body.token) {
    throw new Error(`Re-login failed: ${JSON.stringify(reLogin.body)}`);
  }
  console.log(`  ✅ Re-login PASSED: Successfully authenticated existing account again.\n`);

  console.log('====================================================');
  console.log('  🎉 ALL AUTHENTICATION VERIFICATIONS PASSED!       ');
  console.log('====================================================\n');
};

runAuthVerification().catch((err) => {
  console.error('\n❌ Auth Verification Failed:', err);
  process.exit(1);
});
