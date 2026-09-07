import http from 'http';
import crypto from 'crypto';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Market } from '../models/Market.model';
import { Commodity } from '../models/Commodity.model';
import { MarketPrice } from '../models/MarketPrice.model';
import { PriceAudit } from '../models/PriceAudit.model';

const TEST_PORT = 5024;
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

const runPriceSyncTests = async () => {
  console.log('\n================================================================');
  console.log('🔄 REAL-TIME MARKET PRICE SYNCHRONIZATION: OWNER ➔ DB ➔ FARMER');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS ${total}]: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL ${total}]: ${testName} - ${detail || 'Assertion failed'}`);
      throw new Error(`Test failed: ${testName}`);
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
    // Step 1: Onboard Market Owner & Mandi
    // -------------------------------------------------------------
    console.log('\n▶ [STEP 1]: Registering Market Owner & APMC Mandi Yard...');
    const moPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const moRegRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Ramesh Mandi Admin ${runId}`,
        phone: moPhone,
        email: `ramesh_${runId}@agromitra.test`,
        password: 'Password@123',
        role: 'MARKET_OWNER',
        marketName: `Kurnool APMC Yard ${runId}`,
        address: {
          street: 'APMC Market Main Gate',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518001',
        },
        latitude: 15.8281,
        longitude: 78.0373,
      },
    });

    assert(moRegRes.statusCode === 201, 'Market Owner registered successfully (201)');
    const moToken = moRegRes.body.token;
    const moId = moRegRes.body.user._id || moRegRes.body.user.id;

    // -------------------------------------------------------------
    // Step 2: Create a Dedicated Test Commodity
    // -------------------------------------------------------------
    console.log('\n▶ [STEP 2]: Creating Commodity for Live Synchronization...');
    const commName = `Sona Masoori Paddy ${runId}`;
    const comm = await Commodity.create({
      name: commName,
      category: 'Cereals',
      defaultUnit: 'quintal',
      allowedUnits: ['quintal', 'kg', 'bag'],
      isActive: true,
    });
    assert(!!comm._id, `Commodity created in MongoDB: "${commName}" (_id: ${comm._id})`);

    // -------------------------------------------------------------
    // Step 3: Market Owner Publishes Initial Price (₹3000/quintal)
    // -------------------------------------------------------------
    console.log('\n▶ [STEP 3]: Market Owner publishes initial quote (Modal: ₹3000/quintal)...');
    const todayDate = new Date().toISOString().split('T')[0];
    const initialPriceRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: moToken,
      body: {
        commodityId: comm._id.toString(),
        minPrice: 2800,
        modalPrice: 3000,
        maxPrice: 3200,
        unit: 'quintal',
        priceDate: todayDate,
        notes: 'Morning trading session open',
      },
    });

    assert(initialPriceRes.statusCode === 200, 'Market Owner price publish responds HTTP 200', JSON.stringify(initialPriceRes.body));
    assert(initialPriceRes.body.success === true, 'Price publish success is true');

    // -------------------------------------------------------------
    // Step 4: Verify MongoDB Persistence of Initial Price
    // -------------------------------------------------------------
    console.log('\n▶ [STEP 4]: Verifying direct MongoDB persistence...');
    const savedPriceDoc = await MarketPrice.findOne({
      commodity: comm._id,
      priceDate: todayDate,
    });
    assert(!!savedPriceDoc, 'MarketPrice document exists in MongoDB');
    assert(savedPriceDoc?.modalPrice === 3000, 'Saved modalPrice in MongoDB is exactly 3000');
    assert(savedPriceDoc?.minPrice === 2800, 'Saved minPrice in MongoDB is 2800');
    assert(savedPriceDoc?.maxPrice === 3200, 'Saved maxPrice in MongoDB is 3200');
    console.log(`     → MongoDB Record: ID=${savedPriceDoc?._id}, Modal=₹${savedPriceDoc?.modalPrice}, Status=${savedPriceDoc?.status}`);

    // Verify initial audit entry
    const initialAudits = await PriceAudit.find({ marketPrice: savedPriceDoc?._id });
    assert(initialAudits.length === 1, 'Exactly 1 audit log created for initial CREATE action');
    assert(initialAudits[0].action === 'CREATE', 'Audit log action is CREATE');
    assert(initialAudits[0].newPrice.modalPrice === 3000, 'Audit log records new modalPrice ₹3000');

    // -------------------------------------------------------------
    // Step 5: Farmer Reads Initial Price via Public APIs
    // -------------------------------------------------------------
    console.log('\n▶ [STEP 5]: Farmer Portal fetches initial price via Backend API...');
    
    // 5a. Via /api/market-owner/prices/today (Used by Farmer Comparison & Market Details)
    const farmerTodayRes = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/prices/today?commodity=${encodeURIComponent(commName)}`,
    });
    assert(farmerTodayRes.statusCode === 200, 'GET /api/market-owner/prices/today responds 200');
    const farmerTodayRecords = farmerTodayRes.body.records || farmerTodayRes.body.prices || [];
    const matchedRecord = farmerTodayRecords.find((r: any) => r.commodityName === commName || r.commodity?.name === commName);
    assert(!!matchedRecord, 'Farmer endpoint returned today quote for commodity');
    assert(matchedRecord.modalPrice === 3000, `Farmer portal receives live price: ₹${matchedRecord.modalPrice}/quintal (matches ₹3000)`);

    // 5b. Via /api/mandi-prices (Used by LiveMandiPricesCard on Farmer Dashboard)
    const farmerMandiRes = await makeRequest({
      method: 'GET',
      path: `/api/mandi-prices?commodity=${encodeURIComponent(commName)}`,
    });
    assert(farmerMandiRes.statusCode === 200, 'GET /api/mandi-prices responds 200');
    const farmerMandiList = farmerMandiRes.body.records || [];
    const mandiMatch = farmerMandiList.find((r: any) => r.commodity.toLowerCase().includes(commName.toLowerCase()));
    assert(!!mandiMatch, 'Farmer Mandi Feed contains the newly published APMC price');
    assert(mandiMatch?.modalPrice === 3000, `Farmer Mandi Feed modalPrice is ₹${mandiMatch?.modalPrice}/quintal`);

    // 5c. Via /api/market-owner/compare (Farmer Nearby Market Intelligence)
    const farmerCompareRes = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/compare?commodity=${encodeURIComponent(commName)}&lat=15.8281&lon=78.0373`,
    });
    assert(farmerCompareRes.statusCode === 200, 'GET /api/market-owner/compare responds 200');
    const compList = farmerCompareRes.body.comparisons || [];
    assert(compList.length > 0, 'Comparison returned at least 1 market');
    assert(compList[0].modalPrice === 3000, 'Comparison mandi modalPrice matches ₹3000');
    assert(farmerCompareRes.body.lowestPriceMarket?.modalPrice === 3000, 'Comparison lowestPriceMarket matches ₹3000');

    // -------------------------------------------------------------
    // Step 6: Market Owner Updates the Price a Second Time (₹3250/quintal)
    // -------------------------------------------------------------
    console.log('\n▶ [STEP 6]: Market Owner updates price a second time (Modal: ₹3250/quintal)...');
    const secondPriceRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: moToken,
      body: {
        commodityId: comm._id.toString(),
        minPrice: 2900,
        modalPrice: 3250,
        maxPrice: 3400,
        unit: 'quintal',
        priceDate: todayDate,
        notes: 'Afternoon auction revision: High demand from buyers',
      },
    });

    assert(secondPriceRes.statusCode === 200, 'Second price update responds HTTP 200');

    // -------------------------------------------------------------
    // Step 7: Verify MongoDB Update & Audit History Preservation
    // -------------------------------------------------------------
    console.log('\n▶ [STEP 7]: Verifying MongoDB price update & immutable audit preservation...');
    const updatedPriceDoc = await MarketPrice.findOne({
      commodity: comm._id,
      priceDate: todayDate,
    });
    assert(updatedPriceDoc?.modalPrice === 3250, 'MongoDB MarketPrice modalPrice updated to exactly ₹3250');
    assert(updatedPriceDoc?.minPrice === 2900, 'MongoDB MarketPrice minPrice updated to ₹2900');
    assert(updatedPriceDoc?.maxPrice === 3400, 'MongoDB MarketPrice maxPrice updated to ₹3400');

    // Check Audit logs
    const allAudits = await PriceAudit.find({ marketPrice: updatedPriceDoc?._id }).sort({ createdAt: 1 });
    assert(allAudits.length === 2, `Expected 2 audit records, found ${allAudits.length}`);
    assert(allAudits[0].action === 'CREATE' && allAudits[0].newPrice.modalPrice === 3000, 'First audit log is CREATE (₹3000)');
    assert(allAudits[1].action === 'UPDATE', 'Second audit log is UPDATE');
    assert(allAudits[1].previousPrice?.modalPrice === 3000, 'Second audit records previousPrice = ₹3000');
    assert(allAudits[1].newPrice.modalPrice === 3250, 'Second audit records newPrice = ₹3250');
    console.log(`     → Audit History: Action '${allAudits[1].action}' from ₹${allAudits[1].previousPrice?.modalPrice} ➔ ₹${allAudits[1].newPrice.modalPrice}`);

    // -------------------------------------------------------------
    // Step 8: Farmer Portal Fetches and Displays Second Update (₹3250)
    // -------------------------------------------------------------
    console.log('\n▶ [STEP 8]: Farmer Portal fetches updated price...');
    
    // 8a. Verify Today Prices
    const farmerUpdatedTodayRes = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/prices/today?commodity=${encodeURIComponent(commName)}`,
    });
    const updatedMatchedRecord = (farmerUpdatedTodayRes.body.records || farmerUpdatedTodayRes.body.prices || []).find(
      (r: any) => r.commodityName === commName || r.commodity?.name === commName
    );
    assert(updatedMatchedRecord.modalPrice === 3250, `Farmer portal instantly reflects revised price: ₹${updatedMatchedRecord.modalPrice}/quintal`);

    // 8b. Verify Mandi Feed
    const farmerUpdatedMandiRes = await makeRequest({
      method: 'GET',
      path: `/api/mandi-prices?commodity=${encodeURIComponent(commName)}`,
    });
    const updatedMandiMatch = (farmerUpdatedMandiRes.body.records || []).find((r: any) =>
      r.commodity.toLowerCase().includes(commName.toLowerCase())
    );
    assert(updatedMandiMatch?.modalPrice === 3250, `Farmer Mandi Feed modalPrice reflects ₹${updatedMandiMatch?.modalPrice}/quintal`);

    // 8c. Verify Nearby Market Comparison reflects new rate
    const farmerUpdatedCompareRes = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/compare?commodity=${encodeURIComponent(commName)}&lat=15.8281&lon=78.0373`,
    });
    const updatedCompList = farmerUpdatedCompareRes.body.comparisons || [];
    assert(updatedCompList.length > 0, 'Updated comparison returned at least 1 market');
    assert(updatedCompList[0].modalPrice === 3250, 'Updated comparison mandi modalPrice matches ₹3250');
    assert(farmerUpdatedCompareRes.body.highestPriceMarket?.modalPrice === 3250, 'Updated comparison highestPriceMarket matches ₹3250');

    // -------------------------------------------------------------
    // Step 9: Price History Analytics Verification
    // -------------------------------------------------------------
    console.log('\n▶ [STEP 9]: Verifying Price History Analytics for Farmer & Market Owner...');
    const histRes = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/history?commodity=${encodeURIComponent(commName)}&days=30`,
      token: moToken,
    });
    assert(histRes.statusCode === 200, 'GET /api/market-owner/history responds 200');
    assert(histRes.body.success === true, 'Price history success is true');
    assert(histRes.body.currentPrice === 3250 || histRes.body.todayPrice?.modalPrice === 3250, 'History currentPrice reflects ₹3250');
    
    // Verify dashboard displays recent audits
    const dashRes = await makeRequest({
      method: 'GET',
      path: '/api/market-owner/dashboard',
      token: moToken,
    });
    assert(dashRes.statusCode === 200, 'Market Owner Dashboard responds 200');
    assert(dashRes.body.recentAudits.length >= 2, 'Dashboard recentAudits includes immutable price-change logs');

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passed}/${total} SYNCHRONIZATION TESTS PASSED (100% SUCCESS)!`);
    console.log('================================================================\n');

  } catch (err: any) {
    console.error('\n❌ PRICE SYNC TEST RUN FAILED:', err.message);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
};

runPriceSyncTests();
