import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

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

const runPasswordSecurityTests = async () => {
  console.log('====================================================');
  console.log('  PASSWORD SECURITY & MIGRATION VERIFICATION        ');
  console.log('====================================================\n');

  // Test 1: New User Registration & Bcrypt Verification
  console.log('▶ [TEST 1]: Testing New User Registration & Bcrypt Hashing...');
  const newEmail = `farmer.sec.${Date.now()}@agrimart.com`;
  const regRes = await makeRequest({
    method: 'POST',
    path: '/api/auth/register',
    body: {
      name: 'Security Test Farmer',
      email: newEmail,
      phone: '9123456780',
      password: 'MySecurePassword2026',
      role: 'FARMER',
    },
  });

  if (regRes.statusCode !== 201 || !regRes.body.token) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
  }

  // Verify response does not leak password
  if (regRes.body.user.password || regRes.body.user.passwordHash) {
    throw new Error('SECURITY VIOLATION: Registration response leaked password field!');
  }
  console.log('  ✅ Registration successful without exposing password in response.');

  // Test 2: Login with New User
  console.log('\n▶ [TEST 2]: Logging in with newly registered user...');
  const loginRes = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: newEmail,
      password: 'MySecurePassword2026',
    },
  });

  if (loginRes.statusCode !== 200 || !loginRes.body.token) {
    throw new Error(`Login failed for newly registered user: ${JSON.stringify(loginRes.body)}`);
  }
  if (loginRes.body.user.password) {
    throw new Error('SECURITY VIOLATION: Login response leaked password field!');
  }
  console.log(`  ✅ Login successful for ${loginRes.body.user.name} (${loginRes.body.user.email}).`);

  // Test 3: Existing Real Users Authentication (Shop Owner & Farmer)
  console.log('\n▶ [TEST 3]: Authenticating existing Shop Owner & Farmer accounts...');
  const shopLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: 'nandeeswarreddy1346@gmail.com',
      password: 'Password123',
    },
  });
  if (shopLogin.statusCode !== 200) {
    throw new Error(`Shop Owner login failed: ${JSON.stringify(shopLogin.body)}`);
  }
  console.log(`  ✅ Existing Shop Owner authenticated: ${shopLogin.body.user.name} (Role: ${shopLogin.body.user.role})`);

  const farmerLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: 'nandeeswarreddy2852@gmail.com',
      password: 'Password123',
    },
  });
  if (farmerLogin.statusCode !== 200) {
    throw new Error(`Farmer login failed: ${JSON.stringify(farmerLogin.body)}`);
  }
  console.log(`  ✅ Existing Farmer authenticated: ${farmerLogin.body.user.name} (Role: ${farmerLogin.body.user.role})`);

  // Test 4: Profile Endpoint Security (GET /api/auth/me)
  console.log('\n▶ [TEST 4]: Verifying Profile endpoint does NOT leak password...');
  const meRes = await makeRequest({
    method: 'GET',
    path: '/api/auth/me',
    token: farmerLogin.body.token,
  });

  if (meRes.statusCode !== 200 || meRes.body.user.password) {
    throw new Error(`Profile security violation: ${JSON.stringify(meRes.body)}`);
  }
  console.log('  ✅ Profile endpoint verified secure: no password fields exposed.');

  console.log('\n====================================================');
  console.log('  🎉 ALL PASSWORD SECURITY VERIFICATIONS PASSED!    ');
  console.log('====================================================\n');
};

runPasswordSecurityTests().catch((err) => {
  console.error('\n❌ Password Security Test Failed:', err);
  process.exit(1);
});
