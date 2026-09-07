import http from 'http';
import crypto from 'crypto';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Market } from '../models/Market.model';
import { Commodity } from '../models/Commodity.model';
import { MarketPrice } from '../models/MarketPrice.model';
import { PriceAudit } from '../models/PriceAudit.model';

const TEST_PORT = 5019;
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

const runMarketOwnerPortalTests = async () => {
  console.log('\n======================================================');
  console.log('   MARKET OWNER PORTAL VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (detail) console.error(`         Detail: ${detail}`);
    }
  };

  try {
    await connectDB();

    await new Promise<void>((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`[TEST SERVER] Running on port ${TEST_PORT}\n`);
        resolve();
      });
    });

    const randSuffix = crypto.randomBytes(3).toString('hex');
    const moPhone = `981${Math.floor(1000000 + Math.random() * 9000000)}`;
    const moEmail = `mandi_owner_${randSuffix}@agrimart.test`;
    const password = 'Password@123';

    const farmerPhone = `982${Math.floor(1000000 + Math.random() * 9000000)}`;
    const farmerEmail = `farmer_${randSuffix}@agrimart.test`;

    // 1. REGISTER MARKET OWNER WITH MANDI
    console.log('--- TEST 1: Register Market Owner with Authorized APMC Mandi ---');
    const regRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Mandi Operator ${randSuffix}`,
        email: moEmail,
        phone: moPhone,
        password,
        role: 'MARKET_OWNER',
        marketName: `Kurnool APMC Yard ${randSuffix}`,
        address: {
          street: 'APMC Market Yard, NH 44',
          city: 'Kurnool',
          district: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518001',
        },
      },
    });

    assert(
      regRes.statusCode === 201 && regRes.body.success === true,
      'Market Owner registration responds 201 with success: true',
      JSON.stringify(regRes.body)
    );
    assert(
      regRes.body.user?.role === 'MARKET_OWNER',
      'Registered user has role MARKET_OWNER',
      `Got role: ${regRes.body.user?.role}`
    );

    const marketOwnerToken = regRes.body.token;
    const marketOwnerId = regRes.body.user.id || regRes.body.user._id;

    // 2. REGISTER A FARMER FOR RBAC TESTING
    console.log('\n--- TEST 2: Register Farmer for RBAC Comparison ---');
    const farmerRegRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Farmer Raju ${randSuffix}`,
        email: farmerEmail,
        phone: farmerPhone,
        password,
        role: 'FARMER',
        address: {
          city: 'Kurnool',
          district: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518001',
        },
      },
    });
    const farmerToken = farmerRegRes.body.token;
    assert(farmerRegRes.statusCode === 201, 'Farmer registered successfully');

    // 3. LOGIN MARKET OWNER & VERIFY CREDENTIALS
    console.log('\n--- TEST 3: Market Owner Login ---');
    const loginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        identifier: moPhone,
        password,
      },
    });

    assert(loginRes.statusCode === 200 && loginRes.body.success === true, 'Login with phone & password succeeded');
    assert(loginRes.body.user?.role === 'MARKET_OWNER', 'Login payload returns MARKET_OWNER role');

    // 4. SECURITY & RBAC: ACCESS CONTROL TO MARKET OWNER APIS
    console.log('\n--- TEST 4: Security & Route Protection on /api/market-owner/* ---');
    
    // 4a. Unauthenticated request to /api/market-owner/dashboard
    const unauthRes = await makeRequest({
      method: 'GET',
      path: '/api/market-owner/dashboard',
    });
    assert(unauthRes.statusCode === 401, 'Unauthenticated request to /api/market-owner/dashboard is blocked (401)');

    // 4b. Farmer attempting to access market owner protected management APIs
    const farmerMoRes = await makeRequest({
      method: 'GET',
      path: '/api/market-owner/dashboard',
      token: farmerToken,
    });
    assert(farmerMoRes.statusCode === 403, 'Farmer attempting to access /api/market-owner/dashboard is blocked (403 Forbidden)');

    const farmerUpdateRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: farmerToken,
      body: { minPrice: 2000, maxPrice: 3000, modalPrice: 2500 },
    });
    assert(farmerUpdateRes.statusCode === 403, 'Farmer attempting to update market prices is blocked (403 Forbidden)');

    // 5. MARKET OWNER ACCESS TO DASHBOARD
    console.log('\n--- TEST 5: Market Owner Dashboard Data Retrieval ---');
    const dashRes = await makeRequest({
      method: 'GET',
      path: '/api/market-owner/dashboard',
      token: marketOwnerToken,
    });

    assert(dashRes.statusCode === 200 && dashRes.body.success === true, 'Market owner dashboard API returns 200 with success');
    assert(dashRes.body.market && dashRes.body.market.name.includes('Kurnool'), 'Dashboard returns authorized mandi details');
    assert(typeof dashRes.body.updatedTodayCount === 'number', 'Dashboard returns updatedTodayCount statistic');
    assert(typeof dashRes.body.pendingTodayCount === 'number', 'Dashboard returns pendingTodayCount statistic');

    // 6. CREATE COMMODITY & SET DAILY PRICE
    console.log('\n--- TEST 6: Commodity Creation & Daily Price Quote Publication ---');
    const commRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/commodities',
      token: marketOwnerToken,
      body: {
        name: `Paddy Sona Masoori ${randSuffix}`,
        category: 'Cereals',
        variety: 'FAQ / Grade A',
        defaultUnit: 'quintal',
      },
    });

    assert(commRes.statusCode === 201 && commRes.body.success === true, 'Commodity created successfully');
    const commodityId = commRes.body.commodity._id || commRes.body.commodity.id;

    // 6a. Invalid Price Range (min > modal or modal > max)
    const invalidPriceRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: marketOwnerToken,
      body: {
        commodityId,
        minPrice: 3200,
        modalPrice: 2900, // Invalid: modal < min
        maxPrice: 3100,
        unit: 'quintal',
      },
    });
    assert(invalidPriceRes.statusCode === 400, 'Price update with modalPrice < minPrice is rejected (400)');

    // 6b. Valid Price Quote
    const validPriceRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: marketOwnerToken,
      body: {
        commodityId,
        minPrice: 2800,
        modalPrice: 2950,
        maxPrice: 3100,
        unit: 'quintal',
        notes: 'Good quality grain auction session',
      },
    });

    assert(validPriceRes.statusCode === 200 && validPriceRes.body.success === true, 'Valid daily price quote published successfully');
    assert(validPriceRes.body.price?.modalPrice === 2950, 'Price record modalPrice matches 2950');

    // 7. PRICE AUDIT TRAIL PRESERVATION
    console.log('\n--- TEST 7: Price Update & Audit Trail Preservation ---');
    // Update the price again to generate revision audit
    const updatePriceRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: marketOwnerToken,
      body: {
        commodityId,
        minPrice: 2850,
        modalPrice: 3000,
        maxPrice: 3150,
        unit: 'quintal',
        notes: 'Mid-day auction adjustment',
      },
    });
    assert(updatePriceRes.statusCode === 200, 'Mid-day price revision saved successfully');

    // Check history and audits
    const histRes = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/prices/history?commodity=${encodeURIComponent(`Paddy Sona Masoori ${randSuffix}`)}&days=30`,
      token: marketOwnerToken,
    });

    assert(histRes.statusCode === 200 && histRes.body.success === true, 'Price history retrieved successfully');
    assert(histRes.body.currentPrice === 3000, 'History reflects current revised modal price (3000)');

    // 8. MANDI PROFILE & GEOLOCATION UPDATE
    console.log('\n--- TEST 8: Mandi Profile & Geolocation Coordinates Update ---');
    const updateMarketRes = await makeRequest({
      method: 'PUT',
      path: '/api/market-owner/my-market',
      token: marketOwnerToken,
      body: {
        name: `Kurnool APMC Central Yard ${randSuffix}`,
        address: 'Bypass Road, Kurnool',
        state: 'Andhra Pradesh',
        district: 'Kurnool',
        city: 'Kurnool',
        pincode: '518002',
        latitude: 15.8281,
        longitude: 78.0373,
        operatingHours: '06:00 AM - 06:00 PM',
      },
    });

    assert(updateMarketRes.statusCode === 200 && updateMarketRes.body.success === true, 'Mandi profile & coordinates updated successfully');
    assert(updateMarketRes.body.market?.latitude === 15.8281, 'Mandi latitude set to 15.8281');
    assert(updateMarketRes.body.market?.longitude === 78.0373, 'Mandi longitude set to 78.0373');

    // 9. PUBLIC / FARMER ACCESS TO MARKET RATES
    console.log('\n--- TEST 9: Public / Farmer Access to Daily Mandi Rates ---');
    const publicRatesRes = await makeRequest({
      method: 'GET',
      path: '/api/market-owner/prices/today',
    });

    assert(publicRatesRes.statusCode === 200 && publicRatesRes.body.success === true, 'Public / Farmer endpoint /prices/today responds 200');
    assert(Array.isArray(publicRatesRes.body.prices), 'Returns prices array for farmers');

    // Clean up test documents
    console.log('\n--- Cleaning up test artifacts ---');
    await PriceAudit.deleteMany({ changedBy: marketOwnerId });
    await MarketPrice.deleteMany({ market: dashRes.body.market?._id });
    await Commodity.deleteOne({ _id: commodityId });
    await Market.deleteOne({ _id: dashRes.body.market?._id });
    await User.deleteMany({ _id: { $in: [marketOwnerId, farmerRegRes.body.user.id] } });
    console.log('Cleanup completed.\n');

  } catch (err: any) {
    console.error('[UNEXPECTED ERROR]', err);
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();

    console.log('======================================================');
    console.log(`   TEST RESULT: ${passedTests}/${totalTests} PASSED (${passedTests === totalTests ? 'ALL PASSED' : 'SOME FAILED'})`);
    console.log('======================================================\n');

    process.exit(passedTests === totalTests ? 0 : 1);
  }
};

runMarketOwnerPortalTests();
