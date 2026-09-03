import http from 'http';

const BASE_PORT = 5000;

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
      port: BASE_PORT,
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

const runFarmerLifecycleTests = async () => {
  console.log('\n================================================================');
  console.log('   AGRIMART — COMPLETE FARMER ACCOUNT FLOW & ROLE TEST SUITE    ');
  console.log('================================================================\n');

  try {
    // 1. Test Existing Farmer Login with Password123
    console.log('▶ [TEST 1]: Existing Farmer Login (nandeeswarreddy2852@gmail.com / Password123)...');
    const existingFarmer = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'nandeeswarreddy2852@gmail.com', password: 'Password123' },
    });
    if (existingFarmer.statusCode !== 200 || !existingFarmer.body.token) {
      throw new Error(`Test 1 Failed: ${JSON.stringify(existingFarmer.body)}`);
    }
    console.log(`  ✅ PASSED: Existing Farmer login successful! User: '${existingFarmer.body.user.name}', Role: '${existingFarmer.body.user.role}'.`);

    // 2. Session Persistence Test (/api/auth/me)
    console.log('\n▶ [TEST 2]: Farmer Session Verification (/api/auth/me)...');
    const meRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
      token: existingFarmer.body.token,
    });
    if (meRes.statusCode !== 200 || meRes.body.user?.role !== 'FARMER') {
      throw new Error(`Test 2 Failed: ${JSON.stringify(meRes.body)}`);
    }
    console.log(`  ✅ PASSED: Farmer identity verified via /auth/me: '${meRes.body.user.name}' (${meRes.body.user.email}).`);

    // 3. Register Brand New Farmer Account
    const newFarmerEmail = `kisan.farmer.${Date.now()}@agrimart.in`;
    const newFarmerPassword = `KisanFarmPass#${Date.now().toString().slice(-4)}`;
    console.log(`\n▶ [TEST 3]: Registering New Farmer (${newFarmerEmail})...`);
    const regFarmer = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Venkatesh Naidu',
        email: newFarmerEmail,
        phone: '9848099887',
        password: newFarmerPassword,
        role: 'FARMER',
        address: {
          street: 'Field #12, Agri Cluster',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518001',
        },
      },
    });
    if (regFarmer.statusCode !== 201 || !regFarmer.body.token) {
      throw new Error(`Test 3 Failed: ${JSON.stringify(regFarmer.body)}`);
    }
    console.log(`  ✅ PASSED: New Farmer account created and token issued. User: '${regFarmer.body.user.name}', Role: '${regFarmer.body.user.role}'.`);

    // 4. Log in with the newly registered Farmer
    console.log('\n▶ [TEST 4]: Login with Newly Registered Farmer...');
    const loginFarmer = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: newFarmerEmail, password: newFarmerPassword },
    });
    if (loginFarmer.statusCode !== 200 || !loginFarmer.body.token) {
      throw new Error(`Test 4 Failed: ${JSON.stringify(loginFarmer.body)}`);
    }
    console.log(`  ✅ PASSED: Login with new farmer credentials succeeded. Token: ${loginFarmer.body.token.slice(0, 15)}...`);

    // 5. Repeat Login with SAME credentials (verify no reset required)
    console.log('\n▶ [TEST 5]: Repeated Logins with SAME Farmer Password (3 cycles)...');
    for (let i = 1; i <= 3; i++) {
      const rep = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: newFarmerEmail, password: newFarmerPassword },
      });
      if (rep.statusCode !== 200) throw new Error(`Cycle ${i} failed`);
      console.log(`  → Cycle ${i}: OK (Status 200)`);
    }
    console.log('  ✅ PASSED: Farmer can log in repeatedly without resetting password.');

    // 6. Test Store Partner Login
    console.log('\n▶ [TEST 6]: Agri Store Partner Login (nandeeswarreddy1346@gmail.com / Password123)...');
    const partnerLogin = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'nandeeswarreddy1346@gmail.com', password: 'Password123' },
    });
    if (partnerLogin.statusCode !== 200 || partnerLogin.body.user?.role !== 'SHOP_OWNER') {
      throw new Error(`Test 6 Failed: ${JSON.stringify(partnerLogin.body)}`);
    }
    console.log(`  ✅ PASSED: Store Partner login successful: '${partnerLogin.body.user.name}' (${partnerLogin.body.user.role}).`);

    // 7. Wrong Password Rejection (401 Unauthorized, NOT Network Error)
    console.log('\n▶ [TEST 7]: Wrong Password Test (401 Unauthorized, NOT Network Error)...');
    const wrongRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: newFarmerEmail, password: 'WrongPassword999!' },
    });
    if (wrongRes.statusCode === 401 && wrongRes.body.message === 'Invalid email or password.') {
      console.log(`  ✅ PASSED: Proper 401 error returned: "${wrongRes.body.message}"`);
    } else {
      throw new Error(`Expected 401, got ${wrongRes.statusCode}: ${JSON.stringify(wrongRes.body)}`);
    }

    // 8. Unauthenticated API Route Protection
    console.log('\n▶ [TEST 8]: Unauthenticated API Access Protection (GET /api/orders)...');
    const unauthRes = await makeRequest({
      method: 'GET',
      path: '/api/orders',
    });
    if (unauthRes.statusCode === 401) {
      console.log(`  ✅ PASSED: Unauthenticated access blocked: "${unauthRes.body.message}"`);
    } else {
      throw new Error(`Expected 401, got ${unauthRes.statusCode}`);
    }

    console.log('\n================================================================');
    console.log('  🎉 ALL FARMER FLOW & AUTHENTICATION TESTS PASSED!             ');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Farmer Lifecycle Test Suite Failed:', err);
    process.exit(1);
  }
};

runFarmerLifecycleTests();
