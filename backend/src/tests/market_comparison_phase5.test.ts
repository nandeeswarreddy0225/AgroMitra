import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Market } from '../models/Market.model';
import { Commodity } from '../models/Commodity.model';
import { MarketPrice } from '../models/MarketPrice.model';

const TEST_PORT = 5017;
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

const getRandomPhone = () => `98${Math.floor(10000000 + Math.random() * 90000000)}`;

const runMarketComparisonPhase5Tests = async () => {
  console.log('\n=============================================================');
  console.log('📊 STARTING AGROMITRA PHASE 5 MARKET COMPARISON & PRICE INTELLIGENCE TEST SUITE');
  console.log('=============================================================\n');

  try {
    await connectDB();
    console.log('✔ Connected to MongoDB for Phase 5 validation.');

    await new Promise<void>((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`✔ Test HTTP Server listening on port ${TEST_PORT}.`);
        resolve();
      });
    });

    const uniqueTag = Math.random().toString(36).substring(2, 8);

    // -------------------------------------------------------------
    // Setup Step: Register 3 Distinct Market Owners for APMC Mandis
    // -------------------------------------------------------------
    console.log('\n--- Setup 1: Onboarding 3 Authorized APMC Mandis ---');
    
    // Mandi 1: Kurnool APMC Yard (15.8281, 78.0373)
    const owner1Reg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Kurnool Mandi Owner ${uniqueTag}`,
        email: `kurnool_owner_${uniqueTag}@agrimart.test`,
        password: 'Password@123',
        phone: getRandomPhone(),
        role: 'MARKET_OWNER',
        marketName: `Kurnool APMC Yard ${uniqueTag}`,
        marketAddress: 'Agricultural Market Yard, Bellary Road',
        state: 'Andhra Pradesh',
        district: 'Kurnool',
        city: 'Kurnool',
        pincode: '518001',
      },
    });

    if (owner1Reg.statusCode !== 201 || !owner1Reg.body.success) {
      throw new Error(`Owner 1 registration failed: ${JSON.stringify(owner1Reg.body)}`);
    }
    const token1 = owner1Reg.body.token;
    const market1Id = owner1Reg.body.user.market;

    // Set coordinates for Mandi 1
    await Market.findByIdAndUpdate(market1Id, { latitude: 15.8281, longitude: 78.0373 });

    // Mandi 2: Guntur Chilli APMC Yard (16.3067, 80.4365)
    const owner2Reg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Guntur Mandi Owner ${uniqueTag}`,
        email: `guntur_owner_${uniqueTag}@agrimart.test`,
        password: 'Password@123',
        phone: getRandomPhone(),
        role: 'MARKET_OWNER',
        marketName: `Guntur Commercial Mandi ${uniqueTag}`,
        marketAddress: 'GT Road APMC Commercial Complex',
        state: 'Andhra Pradesh',
        district: 'Guntur',
        city: 'Guntur',
        pincode: '522004',
      },
    });

    if (owner2Reg.statusCode !== 201 || !owner2Reg.body.success) {
      throw new Error(`Owner 2 registration failed: ${JSON.stringify(owner2Reg.body)}`);
    }
    const token2 = owner2Reg.body.token;
    const market2Id = owner2Reg.body.user.market;

    // Set coordinates for Mandi 2
    await Market.findByIdAndUpdate(market2Id, { latitude: 16.3067, longitude: 80.4365 });

    // Mandi 3: Anantapur Groundnut Yard (14.6819, 77.6006)
    const owner3Reg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Anantapur Mandi Owner ${uniqueTag}`,
        email: `anantapur_owner_${uniqueTag}@agrimart.test`,
        password: 'Password@123',
        phone: getRandomPhone(),
        role: 'MARKET_OWNER',
        marketName: `Anantapur APMC Yard ${uniqueTag}`,
        marketAddress: 'NH 44 Market Yard',
        state: 'Andhra Pradesh',
        district: 'Anantapur',
        city: 'Anantapur',
        pincode: '515001',
      },
    });

    if (owner3Reg.statusCode !== 201 || !owner3Reg.body.success) {
      throw new Error(`Owner 3 registration failed: ${JSON.stringify(owner3Reg.body)}`);
    }
    const token3 = owner3Reg.body.token;
    const market3Id = owner3Reg.body.user.market;

    // Set coordinates for Mandi 3
    await Market.findByIdAndUpdate(market3Id, { latitude: 14.6819, longitude: 77.6006 });

    // Setup Farmer Account
    const farmerReg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Farmer Venkat ${uniqueTag}`,
        email: `farmer_venkat_${uniqueTag}@agrimart.test`,
        password: 'Password@123',
        phone: getRandomPhone(),
        role: 'FARMER',
      },
    });

    if (farmerReg.statusCode !== 201 || !farmerReg.body.success) {
      throw new Error(`Farmer registration failed: ${JSON.stringify(farmerReg.body)}`);
    }
    const farmerToken = farmerReg.body.token;

    console.log(`✔ Onboarded 3 Mandis & Farmer Account.`);

    // -------------------------------------------------------------
    // Setup Step 2: Create Test Commodity
    // -------------------------------------------------------------
    console.log('\n--- Setup 2: Creating Test Commodity ---');
    const commRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/commodities',
      token: token1,
      body: {
        name: `BPT 5204 Paddy ${uniqueTag}`,
        category: 'Cereals',
        variety: 'Fine Grain Samba Mahsuri',
        defaultUnit: 'quintal',
      },
    });
    const commodityId = commRes.body.commodity?.id || commRes.body.commodity?._id;
    const commodityName = commRes.body.commodity?.name;
    console.log(`✔ Created Commodity: '${commodityName}' (ID: ${commodityId})`);

    // -------------------------------------------------------------
    // Test 1: Publish Distinct Daily Prices Across All 3 Mandis
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Market Owners Publishing Wholesale Quotes ---');
    // Mandi 1: ₹3100
    await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: token1,
      body: {
        commodityId,
        minPrice: 2900,
        maxPrice: 3250,
        modalPrice: 3100,
        unit: 'quintal',
      },
    });

    // Mandi 2: ₹3450 (Highest)
    await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: token2,
      body: {
        commodityId,
        minPrice: 3300,
        maxPrice: 3600,
        modalPrice: 3450,
        unit: 'quintal',
      },
    });

    // Mandi 3: ₹2950 (Lowest)
    await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: token3,
      body: {
        commodityId,
        minPrice: 2800,
        maxPrice: 3100,
        modalPrice: 2950,
        unit: 'quintal',
      },
    });
    console.log(`✔ Published real quotes: Mandi 1 = ₹3100, Mandi 2 = ₹3450 (High), Mandi 3 = ₹2950 (Low).`);

    // -------------------------------------------------------------
    // Test 2: Farmer Market Comparison with GPS Distance Calculation
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Farmer Market Comparison via GPS (15.8281, 78.0373) ---');
    const compRes = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/compare?commodityId=${commodityId}&lat=15.8281&lon=78.0373`,
      token: farmerToken,
    });

    if (compRes.statusCode !== 200 || !compRes.body.success) {
      throw new Error(`Market comparison failed: ${JSON.stringify(compRes.body)}`);
    }

    const { comparisons, totalMarkets, highestPriceMarket, lowestPriceMarket, averageModalPrice, priceSpread } = compRes.body;

    if (totalMarkets !== 3 || comparisons.length !== 3) {
      throw new Error(`Expected 3 markets in comparison, got ${totalMarkets}`);
    }

    if (highestPriceMarket.modalPrice !== 3450) {
      throw new Error(`Expected highest price 3450, got ${highestPriceMarket.modalPrice}`);
    }

    if (lowestPriceMarket.modalPrice !== 2950) {
      throw new Error(`Expected lowest price 2950, got ${lowestPriceMarket.modalPrice}`);
    }

    if (priceSpread !== 500) { // 3450 - 2950 = 500
      throw new Error(`Expected price spread 500, got ${priceSpread}`);
    }

    console.log(`✔ Comparison Output Verified:`);
    console.log(`   • Total Authorized Mandis: ${totalMarkets}`);
    console.log(`   • Highest Rate Mandi: ${highestPriceMarket.marketName} (₹${highestPriceMarket.modalPrice}/quintal)`);
    console.log(`   • Lowest Rate Mandi: ${lowestPriceMarket.marketName} (₹${lowestPriceMarket.modalPrice}/quintal)`);
    console.log(`   • Inter-Mandi Spread: ₹${priceSpread}/quintal`);
    console.log(`   • Average Modal Rate: ₹${averageModalPrice}/quintal`);

    // Verify distance sorting: Closest mandi should be Mandi 1 (distance ~0 km)
    console.log(`   • Closest Mandi: ${comparisons[0].marketName} (${comparisons[0].distanceKm} km away)`);
    if (comparisons[0].distanceKm === null || comparisons[0].distanceKm > 1) {
      throw new Error(`Expected closest mandi distance ~0km, got ${comparisons[0].distanceKm}`);
    }

    // -------------------------------------------------------------
    // Test 3: Price Shift & History Analytics
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Price Shift & Historical Trend Analytics ---');
    // Simulate updating price in Mandi 1 from ₹3100 to ₹3350
    const updateRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: token1,
      body: {
        commodityId,
        minPrice: 3100,
        maxPrice: 3500,
        modalPrice: 3350,
        unit: 'quintal',
      },
    });

    if (updateRes.statusCode !== 200 || !updateRes.body.success) {
      throw new Error(`Price update failed: ${JSON.stringify(updateRes.body)}`);
    }

    // Query Price History
    const histRes = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/history?commodityId=${commodityId}&marketId=${market1Id}&days=7`,
      token: farmerToken,
    });

    if (histRes.statusCode !== 200 || !histRes.body.success) {
      throw new Error(`Price history retrieval failed: ${JSON.stringify(histRes.body)}`);
    }

    console.log(`✔ Price History Output:`);
    console.log(`   • Current Modal: ₹${histRes.body.currentPrice || histRes.body.todayPrice.modalPrice}`);
    console.log(`   • Trend Status: ${histRes.body.trend}`);
    console.log(`   • Highest in Period: ₹${histRes.body.highestPrice}`);
    console.log(`   • Lowest in Period: ₹${histRes.body.lowestPrice}`);
    console.log(`   • Total Sessions: ${histRes.body.historyPoints.length}`);

    // -------------------------------------------------------------
    // Test 4: Security & RBAC Enforcement (Farmer cannot mutate prices)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Security Verification (RBAC) ---');
    const farmerMutateRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: farmerToken,
      body: {
        commodityId,
        minPrice: 2000,
        maxPrice: 2500,
        modalPrice: 2200,
      },
    });

    if (farmerMutateRes.statusCode !== 403) {
      throw new Error(`Farmer was not blocked with HTTP 403! Got ${farmerMutateRes.statusCode}`);
    }
    console.log(`✔ Verified: Farmer mutating market price blocked with HTTP 403 Forbidden.`);

    // Unauthenticated request
    const unauthRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      body: {
        commodityId,
        minPrice: 2000,
        maxPrice: 2500,
        modalPrice: 2200,
      },
    });

    if (unauthRes.statusCode !== 401) {
      throw new Error(`Unauthenticated request was not blocked with HTTP 401! Got ${unauthRes.statusCode}`);
    }
    console.log(`✔ Verified: Unauthenticated request blocked with HTTP 401 Unauthorized.`);

    // -------------------------------------------------------------
    // Test 5: Insufficient History State Handling
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Insufficient History Handling ---');
    const freshCommRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/commodities',
      token: token1,
      body: {
        name: `Organic Jowar ${uniqueTag}`,
        category: 'Cereals',
      },
    });
    const freshCommId = freshCommRes.body.commodity?.id || freshCommRes.body.commodity?._id;

    // Single price
    await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: token1,
      body: {
        commodityId: freshCommId,
        minPrice: 2500,
        maxPrice: 2800,
        modalPrice: 2650,
      },
    });

    const singleHistRes = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/history?commodityId=${freshCommId}`,
    });

    if (singleHistRes.body.insufficientData !== true) {
      throw new Error(`Expected insufficientData === true for 1 session`);
    }
    console.log(`✔ Handled single-session history cleanly: insufficientData = ${singleHistRes.body.insufficientData}, dataPoints = ${singleHistRes.body.dataPointsCount}`);

    console.log('\n=============================================================');
    console.log('🎉 ALL 5 PHASE 5 MARKET COMPARISON & PRICE INTELLIGENCE TESTS PASSED!');
    console.log('=============================================================\n');
  } catch (error: any) {
    console.error('\n❌ PHASE 5 TEST FAILED:', error.message);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
};

runMarketComparisonPhase5Tests();
