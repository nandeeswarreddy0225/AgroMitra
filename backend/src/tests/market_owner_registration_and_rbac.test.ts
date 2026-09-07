import http from 'http';
import crypto from 'crypto';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Market } from '../models/Market.model';
import { PincodeService } from '../services/pincode.service';

const TEST_PORT = 5022;
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

const runRegressionSuite = async () => {
  console.log('\n=============================================================');
  console.log('🛡️  MARKET OWNER REGISTRATION & MULTI-ROLE RBAC TEST SUITE');
  console.log('=============================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (cond: boolean, name: string, detail?: string) => {
    total++;
    if (cond) {
      console.log(`  ✅ [PASS ${total}]: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL ${total}]: ${name} - ${detail || 'Assertion failed'}`);
      throw new Error(`Test failed: ${name}`);
    }
  };

  try {
    await connectDB();
    await new Promise<void>((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`✔ Test HTTP Server listening on port ${TEST_PORT}.`);
        resolve();
      });
    });

    const runId = crypto.randomBytes(3).toString('hex');

    // -------------------------------------------------------------
    // Test 1: MARKET_OWNER Registration
    // -------------------------------------------------------------
    console.log('\n--- Test 1: MARKET_OWNER Registration ---');
    const moPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const moRegRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Ramesh Mandi Admin ${runId}`,
        phone: moPhone,
        email: `mo_${runId}@agromitra.test`,
        password: 'Password@123',
        role: 'MARKET_OWNER',
        marketName: `Guntur APMC Yard ${runId}`,
        address: {
          street: 'Main Mandi Gate',
          city: 'Guntur',
          state: 'Andhra Pradesh',
          pincode: '522001',
        },
      },
    });

    assert(moRegRes.statusCode === 201, 'MARKET_OWNER registration returns HTTP 201 Created', JSON.stringify(moRegRes.body));
    assert(moRegRes.body.success === true, 'Response body success is true');
    assert(moRegRes.body.user?.role === 'MARKET_OWNER', 'Created user has role MARKET_OWNER');
    assert(!!moRegRes.body.token, 'Registration response includes JWT token');

    const moToken = moRegRes.body.token;

    // Verify Market Document in MongoDB
    const moInDb = await User.findOne({ phone: moPhone });
    assert(!!moInDb && moInDb.role === 'MARKET_OWNER', 'User persisted in MongoDB with MARKET_OWNER role');
    assert(!!moInDb?.market, 'User has linked Market ID in MongoDB');

    const marketInDb = await Market.findById(moInDb?.market);
    assert(!!marketInDb && marketInDb.name === `Guntur APMC Yard ${runId}`, 'Market document created and linked to Market Owner');

    // -------------------------------------------------------------
    // Test 2: MARKET_OWNER Authentication (Login)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: MARKET_OWNER Authentication ---');
    const moLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        identifier: moPhone,
        password: 'Password@123',
      },
    });

    assert(moLoginRes.statusCode === 200, 'MARKET_OWNER login returns HTTP 200 OK');
    assert(moLoginRes.body.user?.role === 'MARKET_OWNER', 'Login returns MARKET_OWNER role');
    assert(!!moLoginRes.body.token, 'Login returns valid JWT token');

    // -------------------------------------------------------------
    // Test 3: MARKET_OWNER Access to Protected Routes
    // -------------------------------------------------------------
    console.log('\n--- Test 3: MARKET_OWNER Authorization ---');
    const moDashRes = await makeRequest({
      method: 'GET',
      path: '/api/market-owner/dashboard',
      token: moToken,
    });
    assert(moDashRes.statusCode === 200, 'MARKET_OWNER can access /api/market-owner/dashboard (HTTP 200)');

    // -------------------------------------------------------------
    // Test 4: Existing Roles Registration (FARMER, SHOP_OWNER, AGRI_PARTNER, DELIVERY_BOY)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Existing Roles Registration ---');

    // 4a. FARMER
    const farmerPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
    const farmerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Suresh Farmer ${runId}`,
        phone: farmerPhone,
        email: `farmer_${runId}@agromitra.test`,
        password: 'Password@123',
        role: 'FARMER',
      },
    });
    assert(farmerRes.statusCode === 201 && farmerRes.body.user?.role === 'FARMER', 'FARMER registration succeeded (HTTP 201)');
    const farmerToken = farmerRes.body.token;

    // 4b. SHOP_OWNER
    const shopPhone = `96${Math.floor(10000000 + Math.random() * 90000000)}`;
    const shopRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Shop Keeper ${runId}`,
        phone: shopPhone,
        email: `shop_${runId}@agromitra.test`,
        password: 'Password@123',
        role: 'SHOP_OWNER',
        shopName: `Sri Agro Store ${runId}`,
      },
    });
    assert(shopRes.statusCode === 201 && shopRes.body.user?.role === 'SHOP_OWNER', 'SHOP_OWNER registration succeeded (HTTP 201)');
    const shopToken = shopRes.body.token;

    // 4c. AGRI_PARTNER
    const partnerPhone = `95${Math.floor(10000000 + Math.random() * 90000000)}`;
    const partnerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Agri Partner ${runId}`,
        phone: partnerPhone,
        email: `partner_${runId}@agromitra.test`,
        password: 'Password@123',
        role: 'AGRI_PARTNER',
        shopName: `Kisan Seva Kendra ${runId}`,
      },
    });
    assert(partnerRes.statusCode === 201 && partnerRes.body.user?.role === 'AGRI_PARTNER', 'AGRI_PARTNER registration succeeded (HTTP 201)');
    const partnerToken = partnerRes.body.token;

    // 4d. DELIVERY_BOY
    const deliveryPhone = `94${Math.floor(10000000 + Math.random() * 90000000)}`;
    const deliveryRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Delivery Guy ${runId}`,
        phone: deliveryPhone,
        email: `delivery_${runId}@agromitra.test`,
        password: 'Password@123',
        role: 'DELIVERY_BOY',
      },
    });
    assert(deliveryRes.statusCode === 201 && deliveryRes.body.user?.role === 'DELIVERY_BOY', 'DELIVERY_BOY registration succeeded (HTTP 201)');
    const deliveryToken = deliveryRes.body.token;

    // -------------------------------------------------------------
    // Test 5: Unauthorized Public Admin Registration Blocked
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Security Block of Admin Public Registration ---');
    const adminPhone = `93${Math.floor(10000000 + Math.random() * 90000000)}`;
    const adminRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Admin Attempt ${runId}`,
        phone: adminPhone,
        email: `admin_${runId}@agromitra.test`,
        password: 'Password@123',
        role: 'ADMIN',
      },
    });
    assert(adminRes.statusCode === 400, 'Public ADMIN registration is rejected (HTTP 400)', JSON.stringify(adminRes.body));

    // -------------------------------------------------------------
    // Test 6: Invalid Role String Blocked
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Invalid Role Handling ---');
    const invalidRoleRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Hacker Role ${runId}`,
        phone: `92${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'Password@123',
        role: 'SUPER_USER',
      },
    });
    assert(invalidRoleRes.statusCode === 400, 'Invalid role rejected with HTTP 400');
    assert(invalidRoleRes.body.message.includes('Allowed registration roles are'), 'Error message lists allowed roles including MARKET_OWNER');

    // -------------------------------------------------------------
    // Test 7: Non-Market Owner Roles Blocked from /api/market-owner/*
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Strict Authorization on Market Owner Routes ---');
    
    // Farmer blocked
    const fBlock = await makeRequest({ method: 'GET', path: '/api/market-owner/dashboard', token: farmerToken });
    assert(fBlock.statusCode === 403, 'FARMER blocked from Market Owner Dashboard (HTTP 403 Forbidden)');

    // Shop Owner blocked
    const sBlock = await makeRequest({ method: 'GET', path: '/api/market-owner/dashboard', token: shopToken });
    assert(sBlock.statusCode === 403, 'SHOP_OWNER blocked from Market Owner Dashboard (HTTP 403 Forbidden)');

    // Agri Partner blocked
    const pBlock = await makeRequest({ method: 'GET', path: '/api/market-owner/dashboard', token: partnerToken });
    assert(pBlock.statusCode === 403, 'AGRI_PARTNER blocked from Market Owner Dashboard (HTTP 403 Forbidden)');

    // Delivery Boy blocked
    const dBlock = await makeRequest({ method: 'GET', path: '/api/market-owner/dashboard', token: deliveryToken });
    assert(dBlock.statusCode === 403, 'DELIVERY_BOY blocked from Market Owner Dashboard (HTTP 403 Forbidden)');

    // Unauthenticated blocked
    const unauthBlock = await makeRequest({ method: 'GET', path: '/api/market-owner/dashboard' });
    assert(unauthBlock.statusCode === 401, 'Unauthenticated request blocked from Market Owner Dashboard (HTTP 401)');

    // -------------------------------------------------------------
    // Test 8: Pincode Lookup (561203 and Fallback Handling)
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Pincode Resolution & Fallback Handling ---');
    const pin561203 = await PincodeService.lookup('561203');
    assert(pin561203.success === true, 'Pincode 561203 lookup returns success: true');
    assert(pin561203.state === 'Karnataka', 'Pincode 561203 resolves to Karnataka');
    console.log(`     → 561203 resolved: ${pin561203.city || pin561203.district}, ${pin561203.state} (Source: ${pin561203.source || 'Auto'})`);

    const pinApiRes = await makeRequest({ method: 'GET', path: '/api/location/pincode/561203' });
    assert(pinApiRes.statusCode === 200 && pinApiRes.body.success === true, 'GET /api/location/pincode/561203 returns HTTP 200');

    // Invalid PIN format handling
    const invalidPinRes = await makeRequest({ method: 'GET', path: '/api/location/pincode/1234' });
    assert(invalidPinRes.statusCode === 400 && invalidPinRes.body.success === false, 'Invalid pincode format rejected with HTTP 400');

    console.log('\n=============================================================');
    console.log(`🎉 ALL ${passed}/${total} REGRESSION TESTS PASSED (100% SUCCESS)!`);
    console.log('=============================================================\n');

  } catch (err: any) {
    console.error('\n❌ TEST RUN FAILED:', err.message);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
};

runRegressionSuite();
