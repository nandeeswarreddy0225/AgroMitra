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

const runComprehensiveAuthTests = async () => {
  console.log('\n================================================================');
  console.log('   AGRIMART — FULL AUTHENTICATION & ROLE VERIFICATION SUITE     ');
  console.log('================================================================\n');

  try {
    // 1. Existing Farmer Account Login (without resetting)
    console.log('▶ [TEST 1]: Existing Farmer Login (Password123)...');
    const existingFarmer = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'nandeeswarreddy2852@gmail.com', password: 'Password123' },
    });
    if (existingFarmer.statusCode !== 200 || !existingFarmer.body.token) {
      throw new Error(`Test 1 Failed: ${JSON.stringify(existingFarmer.body)}`);
    }
    console.log(`  ✅ PASSED: Logged in as '${existingFarmer.body.user.name}' (${existingFarmer.body.user.role}).`);

    // 2. Existing Store Partner Login (without resetting)
    console.log('\n▶ [TEST 2]: Existing Store Partner Login (Password123)...');
    const existingPartner = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'nandeeswarreddy1346@gmail.com', password: 'Password123' },
    });
    if (existingPartner.statusCode !== 200 || !existingPartner.body.token) {
      throw new Error(`Test 2 Failed: ${JSON.stringify(existingPartner.body)}`);
    }
    console.log(`  ✅ PASSED: Logged in as '${existingPartner.body.user.name}' (${existingPartner.body.user.role}).`);

    // 3. Session Persistence via /api/auth/me (Simulates browser refresh)
    console.log('\n▶ [TEST 3]: Session Persistence Check (/api/auth/me)...');
    const meRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
      token: existingFarmer.body.token,
    });
    if (meRes.statusCode !== 200 || meRes.body.user?.email !== 'nandeeswarreddy2852@gmail.com') {
      throw new Error(`Test 3 Failed: ${JSON.stringify(meRes.body)}`);
    }
    console.log(`  ✅ PASSED: Session restored for '${meRes.body.user.name}'.`);

    // 4. Register a Brand New Real Farmer
    const newFarmerEmail = `kisan.farmer.${Date.now()}@agrimart.in`;
    const newFarmerPassword = `KisanSecurePass#${Date.now().toString().slice(-4)}`;
    console.log(`\n▶ [TEST 4]: Register New Farmer (${newFarmerEmail})...`);
    const regFarmer = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Balaji Rao',
        email: newFarmerEmail,
        phone: '9848022334',
        password: newFarmerPassword,
        role: 'FARMER',
        address: {
          street: 'Guntur Rural Cross',
          city: 'Guntur',
          state: 'Andhra Pradesh',
          pincode: '522001',
        },
      },
    });
    if (regFarmer.statusCode !== 201 || !regFarmer.body.token) {
      throw new Error(`Test 4 Failed: ${JSON.stringify(regFarmer.body)}`);
    }
    console.log(`  ✅ PASSED: Farmer registered. Token issued: ${regFarmer.body.token.slice(0, 15)}...`);

    // 5. Login with the newly registered Farmer
    console.log('\n▶ [TEST 5]: Login with Newly Registered Farmer...');
    const loginFarmer = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: newFarmerEmail, password: newFarmerPassword },
    });
    if (loginFarmer.statusCode !== 200 || !loginFarmer.body.token) {
      throw new Error(`Test 5 Failed: ${JSON.stringify(loginFarmer.body)}`);
    }
    console.log(`  ✅ PASSED: Logged in successfully with new farmer credentials.`);

    // 6. Register a Brand New Agri Store Partner
    const newPartnerEmail = `store.partner.${Date.now()}@agrimart.in`;
    const newPartnerPassword = `StorePartnerPass#${Date.now().toString().slice(-4)}`;
    console.log(`\n▶ [TEST 6]: Register New Agri Store Partner (${newPartnerEmail})...`);
    const regPartner = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Sri Venkateswara Agro Agency',
        email: newPartnerEmail,
        phone: '9849011223',
        password: newPartnerPassword,
        role: 'SHOP_OWNER',
        address: {
          street: 'APMC Complex Shop #14',
          city: 'Vijayawada',
          state: 'Andhra Pradesh',
          pincode: '520001',
        },
      },
    });
    if (regPartner.statusCode !== 201 || !regPartner.body.token) {
      throw new Error(`Test 6 Failed: ${JSON.stringify(regPartner.body)}`);
    }
    console.log(`  ✅ PASSED: Agri Store Partner registered. Role: '${regPartner.body.user.role}'.`);

    // 7. Login with the newly registered Store Partner
    console.log('\n▶ [TEST 7]: Login with Newly Registered Store Partner...');
    const loginPartner = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: newPartnerEmail, password: newPartnerPassword },
    });
    if (loginPartner.statusCode !== 200 || !loginPartner.body.token) {
      throw new Error(`Test 7 Failed: ${JSON.stringify(loginPartner.body)}`);
    }
    console.log(`  ✅ PASSED: Logged in successfully with new store partner credentials.`);

    // 8. Re-login multiple times with SAME new credentials (verify no reset required)
    console.log('\n▶ [TEST 8]: Sequential Re-logins without Reset (3 cycles)...');
    for (let i = 1; i <= 3; i++) {
      const re = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: newPartnerEmail, password: newPartnerPassword },
      });
      if (re.statusCode !== 200) throw new Error(`Cycle ${i} failed`);
      console.log(`  → Cycle ${i}: OK (Status 200)`);
    }
    console.log('  ✅ PASSED: Re-login works repeatedly without requiring reset.');

    // 9. Duplicate Email Registration Rejection
    console.log('\n▶ [TEST 9]: Duplicate Email Registration Rejection (409 Conflict)...');
    const dupRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Duplicate Attempt',
        email: newFarmerEmail,
        phone: '9999988888',
        password: 'SomePassword123',
        role: 'FARMER',
      },
    });
    if (dupRes.statusCode === 409) {
      console.log(`  ✅ PASSED: Duplicate email cleanly rejected with HTTP 409: "${dupRes.body.message}"`);
    } else {
      throw new Error(`Expected 409, got ${dupRes.statusCode}: ${JSON.stringify(dupRes.body)}`);
    }

    // 10. Wrong Password Rejection
    console.log('\n▶ [TEST 10]: Wrong Password Rejection (401 Unauthorized, NOT Network Error)...');
    const wrongPass = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: newFarmerEmail, password: 'IncorrectPassword999!' },
    });
    if (wrongPass.statusCode === 401 && wrongPass.body.message === 'Invalid email or password.') {
      console.log(`  ✅ PASSED: Wrong password rejected cleanly: "${wrongPass.body.message}"`);
    } else {
      throw new Error(`Expected 401, got ${wrongPass.statusCode}: ${JSON.stringify(wrongPass.body)}`);
    }

    // 11. Unauthenticated Request Protection
    console.log('\n▶ [TEST 11]: Unauthenticated API Route Protection...');
    const unauthRes = await makeRequest({
      method: 'GET',
      path: '/api/orders',
    });
    if (unauthRes.statusCode === 401) {
      console.log(`  ✅ PASSED: Unauthenticated request rejected: "${unauthRes.body.message}"`);
    } else {
      throw new Error(`Expected 401, got ${unauthRes.statusCode}`);
    }

    console.log('\n================================================================');
    console.log('  🎉 ALL COMPREHENSIVE AUTH & LIFECYCLE TESTS PASSED!           ');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Comprehensive Auth Test Suite Failed:', err);
    process.exit(1);
  }
};

runComprehensiveAuthTests();
