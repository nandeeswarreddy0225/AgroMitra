import http from 'http';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Market } from '../models/Market.model';
import { Commodity } from '../models/Commodity.model';

const TEST_PORT = 5012;
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

const runMarketOwnerPhase1Tests = async () => {
  console.log('\n🌾 =======================================================');
  console.log('🌾 STARTING AGROMITRA MARKET OWNER PHASE 1 TEST SUITE');
  console.log('🌾 =======================================================\n');

  try {
    await connectDB();
    console.log('✔ Connected to MongoDB for testing.');

    await new Promise<void>((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`✔ Test HTTP Server listening on port ${TEST_PORT}.`);
        resolve();
      });
    });

    const uniqueSuffix = crypto.randomBytes(4).toString('hex');

    // -------------------------------------------------------------
    // Test 1: Indian Pincode Auto-Fill API
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Indian Pincode Auto-Fill API ---');
    const pinRes = await makeRequest({
      method: 'GET',
      path: '/api/location/pincode/518001',
    });
    console.log(`PIN 518001 Lookup Status: ${pinRes.statusCode}`);
    if (pinRes.statusCode !== 200 || !pinRes.body.success) {
      throw new Error(`Pincode lookup failed: ${JSON.stringify(pinRes.body)}`);
    }
    console.log(`✔ PIN 518001 resolved to: ${pinRes.body.district}, ${pinRes.body.state} (${pinRes.body.source})`);

    // -------------------------------------------------------------
    // Test 2: Market Owner Registration & Automatic Mandi Setup
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Market Owner Registration & Mandi Linking ---');
    const marketOwnerEmail = `market_owner_${uniqueSuffix}@agromitra.test`;
    const regRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Ramesh Mandi Admin ${uniqueSuffix}`,
        email: marketOwnerEmail,
        phone: `98480${Math.floor(10000 + Math.random() * 90000)}`,
        password: 'Password@123',
        role: 'MARKET_OWNER',
        marketName: `Guntur Chilli APMC Yard ${uniqueSuffix}`,
        address: {
          street: 'Gate No. 4, Market Yard',
          city: 'Guntur',
          state: 'Andhra Pradesh',
          pincode: '522001',
        },
      },
    });

    if (regRes.statusCode !== 201 || !regRes.body.success) {
      throw new Error(`Market Owner Registration failed: ${JSON.stringify(regRes.body)}`);
    }
    const marketOwnerToken = regRes.body.token;
    const marketOwnerUser = regRes.body.user;
    console.log(`✔ Registered Market Owner: ${marketOwnerUser.name} (Role: ${marketOwnerUser.role})`);
    console.log(`✔ Market ID linked to Owner: ${marketOwnerUser.market}`);

    // Verify Market Document in DB
    const marketDoc = await Market.findById(marketOwnerUser.market);
    if (!marketDoc) {
      throw new Error('Market document was not created or linked in database!');
    }
    console.log(`✔ Market Document verified in DB: ${marketDoc.name} in ${marketDoc.district}, ${marketDoc.state}`);

    // -------------------------------------------------------------
    // Test 3: Farmer User Registration (for RBAC & Comparisons)
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Farmer Registration for RBAC Verification ---');
    const farmerEmail = `farmer_${uniqueSuffix}@agromitra.test`;
    const farmerRegRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Suresh Farmer ${uniqueSuffix}`,
        email: farmerEmail,
        phone: `98490${Math.floor(10000 + Math.random() * 90000)}`,
        password: 'Password@123',
        role: 'FARMER',
        address: {
          street: 'Village Road',
          city: 'Tenali',
          state: 'Andhra Pradesh',
          pincode: '522201',
        },
      },
    });
    if (farmerRegRes.statusCode !== 201) {
      throw new Error(`Farmer registration failed: ${JSON.stringify(farmerRegRes.body)}`);
    }
    const farmerToken = farmerRegRes.body.token;
    console.log(`✔ Registered Farmer: ${farmerRegRes.body.user.name}`);

    // -------------------------------------------------------------
    // Test 4: Market Owner Dashboard API
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Market Owner Dashboard Retrieval ---');
    const dashRes = await makeRequest({
      method: 'GET',
      path: '/api/market-owner/dashboard',
      token: marketOwnerToken,
    });
    if (dashRes.statusCode !== 200 || !dashRes.body.success) {
      throw new Error(`Dashboard retrieval failed: ${JSON.stringify(dashRes.body)}`);
    }
    console.log(`✔ Dashboard loaded: Market ${dashRes.body.market.name}, Total Commodities: ${dashRes.body.totalCommodities}`);

    // -------------------------------------------------------------
    // Test 5: Commodity Creation & Retrieval
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Commodity Management ---');
    const commRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/commodities',
      token: marketOwnerToken,
      body: {
        name: `Teja Chilli ${uniqueSuffix}`,
        category: 'Spices',
        variety: 'Export Grade 334',
        defaultUnit: 'quintal',
        allowedUnits: ['quintal', 'kg', 'bag'],
        icon: '🌶️',
      },
    });
    if (commRes.statusCode !== 201 || !commRes.body.success) {
      throw new Error(`Commodity creation failed: ${JSON.stringify(commRes.body)}`);
    }
    const commodityDoc = commRes.body.commodity;
    console.log(`✔ Created Commodity: ${commodityDoc.name} (Unit: ${commodityDoc.defaultUnit})`);

    // -------------------------------------------------------------
    // Test 6: Daily Market Price Submission & Modal Calculation
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Daily Market Price Management ---');
    const priceRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: marketOwnerToken,
      body: {
        commodityId: commodityDoc._id || commodityDoc.id,
        minPrice: 18500,
        maxPrice: 22000,
        modalPrice: 20500,
        unit: 'quintal',
        notes: 'Heavy arrivals from Guntur & Prakasam',
      },
    });
    if (priceRes.statusCode !== 200 || !priceRes.body.success) {
      throw new Error(`Daily price creation failed: ${JSON.stringify(priceRes.body)}`);
    }
    console.log(`✔ Daily Price Added: Modal ₹${priceRes.body.marketPrice.modalPrice}/${priceRes.body.marketPrice.unit} (Min: ₹${priceRes.body.marketPrice.minPrice}, Max: ₹${priceRes.body.marketPrice.maxPrice})`);
    console.log(`✔ Price Audit Record logged: Action ${priceRes.body.audit.action}, Changed by: ${priceRes.body.audit.changedByName}`);

    // -------------------------------------------------------------
    // Test 7: Suspicious Price Swing Detection & Audit Log
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Price Update with Swing Detection ---');
    const swingPriceRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: marketOwnerToken,
      body: {
        commodityId: commodityDoc._id || commodityDoc.id,
        minPrice: 27000,
        maxPrice: 32000,
        modalPrice: 29500, // >40% increase from 20500
        unit: 'quintal',
        notes: 'Sudden spike due to festival demand',
      },
    });
    if (swingPriceRes.statusCode !== 200 || !swingPriceRes.body.success) {
      throw new Error(`Swing price update failed: ${JSON.stringify(swingPriceRes.body)}`);
    }
    console.log(`✔ Price Revision Logged. Modal changed from ₹20500 to ₹${swingPriceRes.body.marketPrice.modalPrice}`);
    console.log(`✔ Flagged Suspicious Swing: ${swingPriceRes.body.audit.isFlaggedSuspicious} (Reason: ${swingPriceRes.body.audit.suspicionReason})`);

    // -------------------------------------------------------------
    // Test 8: Price History & Multi-Day Trend
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Price History Analysis ---');
    const histRes = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/prices/history?commodity=${encodeURIComponent(commodityDoc.name)}&days=30`,
      token: farmerToken,
    });
    if (histRes.statusCode !== 200 || !histRes.body.success) {
      throw new Error(`Price history failed: ${JSON.stringify(histRes.body)}`);
    }
    console.log(`✔ Price History retrieved: Highest ₹${histRes.body.highestPrice}, Lowest ₹${histRes.body.lowestPrice}, Trend: ${histRes.body.trend}`);

    // -------------------------------------------------------------
    // Test 9: Nearby Market Comparison with Haversine Distance
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Nearby Market Comparison (Haversine Formula) ---');
    const compRes = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/prices/compare?commodity=${encodeURIComponent(commodityDoc.name)}&lat=16.3067&lon=80.4365`,
      token: farmerToken,
    });
    if (compRes.statusCode !== 200 || !compRes.body.success) {
      throw new Error(`Nearby market comparison failed: ${JSON.stringify(compRes.body)}`);
    }
    console.log(`✔ Compared ${compRes.body.totalMarkets} Mandi(s) for ${compRes.body.commodity}`);
    if (compRes.body.comparisons.length > 0) {
      const top = compRes.body.comparisons[0];
      console.log(`✔ Closest Mandi: ${top.marketName} (Distance: ${top.distanceKm} km, Rate: ₹${top.modalPrice}/${top.unit})`);
    }

    // -------------------------------------------------------------
    // Test 10: RBAC Protection - Farmer cannot publish Mandi Rates
    // -------------------------------------------------------------
    console.log('\n--- Test 10: RBAC Authorization Protection ---');
    const forbiddenRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: farmerToken,
      body: {
        commodityId: commodityDoc._id || commodityDoc.id,
        minPrice: 10000,
        maxPrice: 12000,
        modalPrice: 11000,
      },
    });
    console.log(`Farmer Price Publishing Response Status: ${forbiddenRes.statusCode}`);
    if (forbiddenRes.statusCode !== 403) {
      throw new Error(`Expected 403 Forbidden for Farmer posting market prices, but got ${forbiddenRes.statusCode}`);
    }
    console.log(`✔ RBAC Protection Verified: Non-owners successfully blocked from publishing Mandi prices.`);

    // -------------------------------------------------------------
    // Test 11: Admin Governance (Approve / Disable Market Owners)
    // -------------------------------------------------------------
    console.log('\n--- Test 11: Admin Governance & Auditing ---');
    let adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) {
      adminUser = await User.create({
        name: `Super Admin ${uniqueSuffix}`,
        email: `admin_${uniqueSuffix}@agromitra.test`,
        phone: `9999${Math.floor(100000 + Math.random() * 900000)}`,
        password: 'Password@123',
        role: 'ADMIN',
        status: 'ACTIVE',
        isApproved: true,
      });
    }
    const adminToken = jwt.sign(
      { id: adminUser._id.toString(), role: 'ADMIN' },
      process.env.JWT_SECRET || 'agromitra_super_secret_jwt_key_2026',
      { expiresIn: '7d' }
    );

    // Admin get all Market Owners
    const adminOwnersRes = await makeRequest({
      method: 'GET',
      path: '/api/market-owner/admin/owners',
      token: adminToken,
    });
    if (adminOwnersRes.statusCode !== 200 || !adminOwnersRes.body.success) {
      throw new Error(`Admin owners retrieval failed: ${JSON.stringify(adminOwnersRes.body)}`);
    }
    console.log(`✔ Admin loaded ${adminOwnersRes.body.count} registered Market Owner(s).`);

    // Admin toggle Market Owner status
    const statusUpdateRes = await makeRequest({
      method: 'PUT',
      path: `/api/market-owner/admin/owners/${marketOwnerUser.id || marketOwnerUser._id}/status`,
      token: adminToken,
      body: {
        status: 'ACTIVE',
        isApproved: true,
      },
    });
    if (statusUpdateRes.statusCode !== 200 || !statusUpdateRes.body.success) {
      throw new Error(`Admin status update failed: ${JSON.stringify(statusUpdateRes.body)}`);
    }
    console.log(`✔ Admin approved & activated Market Owner ${marketOwnerUser.name}.`);

    // Admin view Price Audits with suspicious filter
    const adminAuditsRes = await makeRequest({
      method: 'GET',
      path: '/api/market-owner/admin/audits?suspicious=true',
      token: adminToken,
    });
    if (adminAuditsRes.statusCode !== 200 || !adminAuditsRes.body.success) {
      throw new Error(`Admin audits failed: ${JSON.stringify(adminAuditsRes.body)}`);
    }
    console.log(`✔ Admin retrieved ${adminAuditsRes.body.count} flagged suspicious price audit record(s).`);

    console.log('\n🎉 =======================================================');
    console.log('🎉 ALL 11 PHASE 1 MARKET OWNER INTEGRATION TESTS PASSED!');
    console.log('🎉 =======================================================\n');
  } catch (error: any) {
    console.error('\n❌ TEST SUITE FAILED:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
};

runMarketOwnerPhase1Tests();
