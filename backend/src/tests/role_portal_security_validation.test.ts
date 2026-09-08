import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User, UserRole } from '../models/User.model';
import bcrypt from 'bcryptjs';

const TEST_PORT = 5037;
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

    req.on('error', (err) => {
      reject(err);
    });

    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
};

const TEST_USERS = [
  { name: 'Ramesh Farmer', phone: '9848011111', email: 'farmer@test.com', password: 'Password@123', role: 'FARMER' as UserRole },
  { name: 'Suresh Shop Owner', phone: '9848022222', email: 'shopowner@test.com', password: 'Password@123', role: 'SHOP_OWNER' as UserRole },
  { name: 'Anil Agri Partner', phone: '9848033333', email: 'agripartner@test.com', password: 'Password@123', role: 'AGRI_PARTNER' as UserRole },
  { name: 'Mahesh Market Owner', phone: '9848044444', email: 'marketowner@test.com', password: 'Password@123', role: 'MARKET_OWNER' as UserRole },
  { name: 'Vijay Delivery Boy', phone: '9848055555', email: 'deliveryboy@test.com', password: 'Password@123', role: 'DELIVERY_BOY' as UserRole },
  { name: 'Rajesh Admin', phone: '9848066666', email: 'admin@test.com', password: 'Password@123', role: 'ADMIN' as UserRole },
];

const EXPECTED_MISMATCH_MSG = 'These credentials are not registered for the selected portal. Please select the correct portal or use the correct account.';

async function runSecuritySuite() {
  console.log('================================================================');
  console.log('🔒 AGROMITRA RBAC & ROLE-SPECIFIC PORTAL SECURITY TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  };

  try {
    process.env.JWT_SECRET = 'test-security-secret-key-12345';
    process.env.NODE_ENV = 'test';
    delete process.env.MONGODB_URI;
    await connectDB();
    console.log('Connected to Isolated In-Memory MongoDB (MongoMemoryServer).');

    await User.deleteMany({});

    for (const u of TEST_USERS) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await User.create({
        name: u.name,
        phone: u.phone,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        isApproved: true,
        status: 'ACTIVE',
      });
    }
    console.log(`Seeded ${TEST_USERS.length} test accounts across all roles.\n`);

    server = app.listen(TEST_PORT);
    await new Promise((r) => setTimeout(r, 300));

    // TEST SUITE 1: Matching Role Logins
    console.log('--- TEST SET 1: Valid Credentials + Matching Selected Portal ---');
    for (const u of TEST_USERS) {
      const res = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          identifier: u.phone,
          password: u.password,
          role: u.role,
        },
      });

      assert(res.statusCode === 200, `${u.role} login with matching role portal (${u.phone}) returns HTTP 200`);
      assert(!!res.body.token, `${u.role} login returns a valid JWT token`);
      assert(res.body.user?.role === u.role, `${u.role} user object returned with correct role '${u.role}'`);
    }

    // TEST SUITE 2: Role Mismatch Rejection (Cross-Role Penetration)
    console.log('\n--- TEST SET 2: Cross-Role Attack Prevention (Role Mismatch Rejection) ---');
    
    // Farmer trying each other portal
    const otherRoles: UserRole[] = ['SHOP_OWNER', 'AGRI_PARTNER', 'MARKET_OWNER', 'DELIVERY_BOY', 'ADMIN'];
    for (const wrongRole of otherRoles) {
      const res = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          identifier: '9848011111', // Farmer
          password: 'Password@123',
          role: wrongRole,
        },
      });

      assert(res.statusCode === 403, `Farmer credentials on ${wrongRole} portal returns HTTP 403 Forbidden`);
      assert(res.body.success === false, `Response success is false`);
      assert(res.body.message === EXPECTED_MISMATCH_MSG, `Error message matches role mismatch message`);
      assert(!res.body.token, `No token is issued on role mismatch`);
    }

    // Delivery Boy trying Farmer portal
    const dbFarmerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        identifier: '9848055555', // Delivery Boy
        password: 'Password@123',
        role: 'FARMER',
      },
    });
    assert(dbFarmerRes.statusCode === 403, `Delivery Boy credentials on FARMER portal returns HTTP 403 Forbidden`);
    assert(dbFarmerRes.body.message === EXPECTED_MISMATCH_MSG, `Delivery Boy on Farmer portal returns expected error message`);
    assert(!dbFarmerRes.body.token, `No token issued for Delivery Boy on Farmer portal`);

    // Agri Partner trying Farmer portal
    const apFarmerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        identifier: '9848033333', // Agri Partner
        password: 'Password@123',
        role: 'FARMER',
      },
    });
    assert(apFarmerRes.statusCode === 403, `Agri Partner credentials on FARMER portal returns HTTP 403 Forbidden`);
    assert(apFarmerRes.body.message === EXPECTED_MISMATCH_MSG, `Agri Partner on Farmer portal returns expected error message`);
    assert(!apFarmerRes.body.token, `No token issued for Agri Partner on Farmer portal`);

    // Market Owner trying Shop Owner portal
    const moShopRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        identifier: '9848044444', // Market Owner
        password: 'Password@123',
        role: 'SHOP_OWNER',
      },
    });
    assert(moShopRes.statusCode === 403, `Market Owner credentials on SHOP_OWNER portal returns HTTP 403 Forbidden`);
    assert(moShopRes.body.message === EXPECTED_MISMATCH_MSG, `Market Owner on Shop Owner portal returns expected error message`);

    // Admin trying Farmer portal
    const adminFarmerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        identifier: '9848066666', // Admin
        password: 'Password@123',
        role: 'FARMER',
      },
    });
    assert(adminFarmerRes.statusCode === 403, `Admin credentials on FARMER portal returns HTTP 403 Forbidden`);
    assert(adminFarmerRes.body.message === EXPECTED_MISMATCH_MSG, `Admin on Farmer portal returns expected error message`);

    // TEST SUITE 3: Invalid Credentials
    console.log('\n--- TEST SET 3: Invalid Credentials Handling ---');
    const wrongPwdRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        identifier: '9848011111',
        password: 'WrongPassword@999',
        role: 'FARMER',
      },
    });
    assert(wrongPwdRes.statusCode === 401, `Incorrect password returns HTTP 401 Unauthorized`);
    assert(wrongPwdRes.body.message === 'Invalid phone number or password.', `Returns generic 401 message`);
    assert(!wrongPwdRes.body.token, `No token issued on wrong password`);

    const nonExistentRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        identifier: '9000000000',
        password: 'Password@123',
        role: 'FARMER',
      },
    });
    assert(nonExistentRes.statusCode === 401, `Non-existent user returns HTTP 401 Unauthorized`);
    assert(!nonExistentRes.body.token, `No token issued for non-existent user`);

    // TEST SUITE 4: Missing Fields
    console.log('\n--- TEST SET 4: Missing Request Fields ---');
    const missingPwdRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        identifier: '9848011111',
        role: 'FARMER',
      },
    });
    assert(missingPwdRes.statusCode === 400, `Missing password returns HTTP 400 Bad Request`);

    // TEST SUITE 6: Registration Strict Role Creation Tests
    console.log('\n--- TEST SET 6: Registration Strict Role Tests ---');
    const regRoles: Array<{ role: UserRole; phone: string; name: string }> = [
      { role: 'SHOP_OWNER', phone: '9848077771', name: 'New Shop Owner' },
      { role: 'FARMER', phone: '9848077772', name: 'New Farmer' },
      { role: 'AGRI_PARTNER', phone: '9848077773', name: 'New Agri Partner' },
      { role: 'DELIVERY_BOY', phone: '9848077774', name: 'New Delivery Boy' },
      { role: 'MARKET_OWNER', phone: '9848077775', name: 'New Market Owner' },
    ];

    for (const item of regRoles) {
      const regRes = await makeRequest({
        method: 'POST',
        path: '/api/auth/register',
        body: {
          name: item.name,
          phone: item.phone,
          password: 'Password@123',
          role: item.role,
        },
      });
      assert(regRes.statusCode === 201, `Registering ${item.role} returns HTTP 201 Created`);
      assert(regRes.body.user?.role === item.role, `Registered user has exact role '${item.role}' (NOT default FARMER)`);
      assert(!!regRes.body.token, `Registered user receives valid JWT token`);
    }

    // Public Admin Registration Rejection
    const adminRegRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Hacker Admin',
        phone: '9848077776',
        password: 'Password@123',
        role: 'ADMIN',
      },
    });
    assert(adminRegRes.statusCode === 400, `Public ADMIN registration is rejected with HTTP 400`);

    // Invalid / Missing Role Registration Rejection
    const missingRoleRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'No Role User',
        phone: '9848077777',
        password: 'Password@123',
      },
    });
    assert(missingRoleRes.statusCode === 400, `Registration with missing role is rejected with HTTP 400`);

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite runtime error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runSecuritySuite();
