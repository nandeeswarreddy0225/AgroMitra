import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';

// Use a separate port for automated testing runner
const TEST_PORT = 5002;
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

    req.on('error', (e) => reject(e));

    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
};

const runAllStage2Tests = async () => {
  console.log('====================================================');
  console.log('   AGRIMART — STAGE 2 AUTHENTICATION & DB TESTS     ');
  console.log('====================================================\n');

  await connectDB();

  // Clear previous test users
  await User.deleteMany({
    email: {
      $in: [
        'farmer.test@agrimart.com',
        'shop.test@agrimart.com',
        'admin.seeded@agrimart.com',
      ],
    },
  });

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  let farmerToken = '';
  let shopOwnerToken = '';

  try {
    // ---------------------------------------------------------
    // TEST 1: Register Farmer
    // ---------------------------------------------------------
    console.log('▶ [TEST 1]: Register Farmer...');
    const res1 = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Ramesh Farmer',
        email: 'farmer.test@agrimart.com',
        phone: '9876543210',
        password: 'FarmerSecurePassword123',
        role: 'FARMER',
        address: {
          street: 'Kisan Road 4',
          city: 'Nagpur',
          state: 'Maharashtra',
          pincode: '440001',
        },
      },
    });

    const farmerUserInDb = await User.findOne({ email: 'farmer.test@agrimart.com' });
    if (res1.statusCode === 201 && res1.body.success && farmerUserInDb && farmerUserInDb.role === 'FARMER') {
      farmerToken = res1.body.token;
      console.log('  ✅ TEST 1 PASSED: Farmer successfully created in MongoDB with ID:', farmerUserInDb._id.toString());
      console.log('  Response token generated:', farmerToken.substring(0, 20) + '...');
    } else {
      throw new Error(`TEST 1 FAILED. Status: ${res1.statusCode}, Body: ${JSON.stringify(res1.body)}`);
    }

    // ---------------------------------------------------------
    // TEST 2: Register Shop Owner
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 2]: Register Shop Owner...');
    const res2 = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Green Agro Fertilizers',
        email: 'shop.test@agrimart.com',
        phone: '9123456780',
        password: 'ShopSecurePassword123',
        role: 'SHOP_OWNER',
        address: {
          street: 'Market Yard Shop #12',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
        },
      },
    });

    const shopUserInDb = await User.findOne({ email: 'shop.test@agrimart.com' });
    if (res2.statusCode === 201 && res2.body.success && shopUserInDb && shopUserInDb.role === 'SHOP_OWNER') {
      shopOwnerToken = res2.body.token;
      console.log('  ✅ TEST 2 PASSED: Shop Owner successfully created in MongoDB with ID:', shopUserInDb._id.toString());
    } else {
      throw new Error(`TEST 2 FAILED. Status: ${res2.statusCode}, Body: ${JSON.stringify(res2.body)}`);
    }

    // ---------------------------------------------------------
    // TEST 3: Try duplicate email
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 3]: Try duplicate email registration...');
    const res3 = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Duplicate Farmer',
        email: 'farmer.test@agrimart.com',
        phone: '9876543211',
        password: 'AnotherPassword123',
        role: 'FARMER',
      },
    });

    if (res3.statusCode === 409 || res3.statusCode === 400) {
      console.log(`  ✅ TEST 3 PASSED: Duplicate registration correctly rejected with HTTP ${res3.statusCode}: "${res3.body.message}"`);
    } else {
      throw new Error(`TEST 3 FAILED. Expected 409/400 but got ${res3.statusCode}`);
    }

    // ---------------------------------------------------------
    // TEST 4: Login with correct password
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 4]: Login with correct password...');
    const res4 = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: 'farmer.test@agrimart.com',
        password: 'FarmerSecurePassword123',
      },
    });

    if (res4.statusCode === 200 && res4.body.success && res4.body.token && res4.body.user) {
      console.log('  ✅ TEST 4 PASSED: Login succeeded and valid JWT returned for role:', res4.body.user.role);
    } else {
      throw new Error(`TEST 4 FAILED. Status: ${res4.statusCode}, Body: ${JSON.stringify(res4.body)}`);
    }

    // ---------------------------------------------------------
    // TEST 5: Login with incorrect password
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 5]: Login with incorrect password...');
    const res5 = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: 'farmer.test@agrimart.com',
        password: 'WrongPasswordXYZ',
      },
    });

    if (res5.statusCode === 401 && !res5.body.success) {
      console.log(`  ✅ TEST 5 PASSED: Login correctly rejected with HTTP 401: "${res5.body.message}"`);
    } else {
      throw new Error(`TEST 5 FAILED. Expected 401 but got ${res5.statusCode}`);
    }

    // ---------------------------------------------------------
    // TEST 6: GET /api/auth/me with valid JWT
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 6]: GET /api/auth/me with valid JWT...');
    const res6 = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
      token: farmerToken,
    });

    if (res6.statusCode === 200 && res6.body.success && res6.body.user && res6.body.user.email === 'farmer.test@agrimart.com') {
      console.log('  ✅ TEST 6 PASSED: Authenticated user profile returned:', res6.body.user.name, `(${res6.body.user.role})`);
      if (res6.body.user.password) {
        throw new Error('SECURITY VIOLATION: Password field exposed in /api/auth/me response!');
      }
    } else {
      throw new Error(`TEST 6 FAILED. Status: ${res6.statusCode}, Body: ${JSON.stringify(res6.body)}`);
    }

    // ---------------------------------------------------------
    // TEST 7: GET /api/auth/me without JWT
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 7]: GET /api/auth/me without JWT...');
    const res7 = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
    });

    if (res7.statusCode === 401 && !res7.body.success) {
      console.log(`  ✅ TEST 7 PASSED: Access rejected with HTTP 401: "${res7.body.message}"`);
    } else {
      throw new Error(`TEST 7 FAILED. Expected 401 but got ${res7.statusCode}`);
    }

    // ---------------------------------------------------------
    // TEST 8: Farmer accessing Farmer Dashboard / Farmer-only endpoint
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 8]: Farmer accessing Farmer-only endpoint...');
    const res8 = await makeRequest({
      method: 'GET',
      path: '/api/auth/farmer-only',
      token: farmerToken,
    });

    if (res8.statusCode === 200 && res8.body.success) {
      console.log('  ✅ TEST 8 PASSED: Farmer authorized for FARMER endpoint (HTTP 200)');
    } else {
      throw new Error(`TEST 8 FAILED. Status: ${res8.statusCode}, Body: ${JSON.stringify(res8.body)}`);
    }

    // ---------------------------------------------------------
    // TEST 9: Farmer accessing Shop Owner endpoint
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 9]: Farmer accessing Shop Owner-only endpoint...');
    const res9 = await makeRequest({
      method: 'GET',
      path: '/api/auth/shop-owner-only',
      token: farmerToken,
    });

    if (res9.statusCode === 403 && !res9.body.success) {
      console.log(`  ✅ TEST 9 PASSED: Forbidden access rejected with HTTP 403: "${res9.body.message}"`);
    } else {
      throw new Error(`TEST 9 FAILED. Expected 403 but got ${res9.statusCode}`);
    }

    // ---------------------------------------------------------
    // TEST 10: Shop Owner accessing Admin endpoint
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 10]: Shop Owner accessing Admin-only endpoint...');
    const res10 = await makeRequest({
      method: 'GET',
      path: '/api/auth/admin-only',
      token: shopOwnerToken,
    });

    if (res10.statusCode === 403 && !res10.body.success) {
      console.log(`  ✅ TEST 10 PASSED: Forbidden access rejected with HTTP 403: "${res10.body.message}"`);
    } else {
      throw new Error(`TEST 10 FAILED. Expected 403 but got ${res10.statusCode}`);
    }

    // ---------------------------------------------------------
    // TEST 11: Verify password in MongoDB is hashed
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 11]: Verify password stored in MongoDB is hashed with bcrypt...');
    const rawUserDoc = await User.findOne({ email: 'farmer.test@agrimart.com' }).select('+password');
    const storedPassword = rawUserDoc?.password || '';

    const isBcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(storedPassword);
    if (isBcryptHash && storedPassword !== 'FarmerSecurePassword123') {
      console.log('  ✅ TEST 11 PASSED: Password is cryptographically hashed with bcrypt!');
      console.log('  Sample hash in database:', storedPassword.substring(0, 25) + '...');
    } else {
      throw new Error(`TEST 11 FAILED: Plaintext password or invalid hash detected: ${storedPassword}`);
    }

    // ---------------------------------------------------------
    // EXTRA TEST: Verify Admin Seed & Public Admin Registration Block
    // ---------------------------------------------------------
    console.log('\n▶ [EXTRA TEST]: Verify public registration cannot create ADMIN...');
    const resAdminBlock = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Hacker Admin',
        email: 'hacker@agrimart.com',
        phone: '9999999999',
        password: 'Password123',
        role: 'ADMIN',
      },
    });

    if (resAdminBlock.statusCode === 400 && !resAdminBlock.body.success) {
      console.log(`  ✅ ADMIN REGISTRATION BLOCK PASSED: "${resAdminBlock.body.message}"`);
    } else {
      throw new Error(`ADMIN REGISTRATION BLOCK FAILED. Status: ${resAdminBlock.statusCode}`);
    }

    console.log('\n====================================================');
    console.log('   🎉 ALL 11 TESTS PASSED SUCCESSFULLY!            ');
    console.log('====================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
};

runAllStage2Tests().catch((err) => {
  console.error('\n❌ Test Suite Failed with error:', err);
  if (server) server.close();
  disconnectDB().finally(() => process.exit(1));
});
