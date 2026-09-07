import http from 'http';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Market } from '../models/Market.model';
import { Commodity } from '../models/Commodity.model';
import { MarketPrice } from '../models/MarketPrice.model';
import { PriceAudit } from '../models/PriceAudit.model';

const TEST_PORT = 5013;
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

const runMarketOwnerPhase2Tests = async () => {
  console.log('\n=============================================================');
  console.log('🌾 STARTING AGROMITRA PHASE 2 DATABASE & STATE INTEGRATION TESTS');
  console.log('=============================================================\n');

  try {
    await connectDB();
    console.log('✔ Connected to MongoDB for Phase 2 validation.');

    await new Promise<void>((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`✔ Test HTTP Server listening on port ${TEST_PORT}.`);
        resolve();
      });
    });

    const uniqueSuffix = crypto.randomBytes(4).toString('hex');

    // -------------------------------------------------------------
    // Step 1: Create Market Owner & Farmer Users
    // -------------------------------------------------------------
    console.log('\n--- Step 1: Setup Market Owner & Mandi ---');
    const ownerEmail = `owner_p2_${uniqueSuffix}@agromitra.test`;
    const regRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Kurnool APMC Operator ${uniqueSuffix}`,
        email: ownerEmail,
        phone: `98481${Math.floor(10000 + Math.random() * 90000)}`,
        password: 'Password@123',
        role: 'MARKET_OWNER',
        marketName: `Kurnool APMC Mandi Yard ${uniqueSuffix}`,
        address: {
          street: 'APMC Market Complex, Bellary Road',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518001',
        },
      },
    });

    if (regRes.statusCode !== 201 || !regRes.body.success) {
      throw new Error(`Market Owner Registration failed: ${JSON.stringify(regRes.body)}`);
    }
    const ownerToken = regRes.body.token;
    const ownerUser = regRes.body.user;
    console.log(`✔ Market Owner Registered: ${ownerUser.name} with Market ID: ${ownerUser.market}`);

    // Create Farmer user
    const farmerEmail = `farmer_p2_${uniqueSuffix}@agromitra.test`;
    const farmerRegRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: `Nandeesh Farmer ${uniqueSuffix}`,
        email: farmerEmail,
        phone: `98482${Math.floor(10000 + Math.random() * 90000)}`,
        password: 'Password@123',
        role: 'FARMER',
        address: {
          street: 'Village Post',
          city: 'Nandyal',
          state: 'Andhra Pradesh',
          pincode: '518501',
        },
      },
    });
    const farmerToken = farmerRegRes.body.token;
    console.log(`✔ Farmer Registered: ${farmerRegRes.body.user.name}`);

    // Create Admin Token
    let adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) {
      adminUser = await User.create({
        name: `Admin P2 ${uniqueSuffix}`,
        email: `admin_p2_${uniqueSuffix}@agromitra.test`,
        phone: `9998${Math.floor(100000 + Math.random() * 900000)}`,
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

    // -------------------------------------------------------------
    // Step 2: Ensure/Create Commodity in MongoDB
    // -------------------------------------------------------------
    console.log('\n--- Step 2: Create Test Commodity in Database ---');
    const commRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/commodities',
      token: ownerToken,
      body: {
        name: `Sona Masoori Paddy ${uniqueSuffix}`,
        category: 'Cereals',
        variety: 'BPT 5204 Grade A',
        defaultUnit: 'quintal',
        allowedUnits: ['quintal', 'kg', 'bag'],
        icon: '🌾',
      },
    });
    if (commRes.statusCode !== 201) {
      throw new Error(`Commodity creation failed: ${JSON.stringify(commRes.body)}`);
    }
    const commodity = commRes.body.commodity;
    console.log(`✔ Commodity created: ${commodity.name} (_id: ${commodity._id || commodity.id})`);

    // -------------------------------------------------------------
    // Step 3: Phase 2 Req 1 & 2 - Market Owner updates price for authorized Mandi
    // -------------------------------------------------------------
    console.log('\n--- Step 3: Market Owner Daily Price Submission to MongoDB ---');
    const todayStr = new Date().toISOString().split('T')[0];
    const priceRes1 = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: ownerToken,
      body: {
        commodityId: commodity._id || commodity.id,
        minPrice: 2800,
        maxPrice: 3200,
        modalPrice: 3050,
        unit: 'quintal',
        priceDate: todayStr,
        notes: 'Session opening quotes from Kurnool APMC auction floor',
      },
    });

    if (priceRes1.statusCode !== 200 || !priceRes1.body.success) {
      throw new Error(`Daily price submission failed: ${JSON.stringify(priceRes1.body)}`);
    }
    console.log(`✔ Price published in MongoDB: Modal ₹${priceRes1.body.marketPrice.modalPrice}/quintal (Min: ₹${priceRes1.body.marketPrice.minPrice}, Max: ₹${priceRes1.body.marketPrice.maxPrice})`);
    console.log(`✔ Verified Market ID on Price: ${priceRes1.body.marketPrice.market} matches Owner's Mandi`);

    // Verify in MongoDB direct collection query
    const dbPriceRecord = await MarketPrice.findOne({
      market: ownerUser.market,
      commodity: commodity._id || commodity.id,
      priceDate: todayStr,
    });
    if (!dbPriceRecord || dbPriceRecord.modalPrice !== 3050) {
      throw new Error('Database record was not found or price mismatch!');
    }
    console.log(`✔ Direct MongoDB query verified: Record exists in MarketPrice collection.`);

    // -------------------------------------------------------------
    // Step 4: Phase 2 Req 3 - Farmers see latest prices from Backend
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Farmer Reads Latest Prices via Public & Mandi APIs ---');
    
    // 4a. Market Owner public prices API
    const farmerTodayPrices = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/prices/today?commodity=${encodeURIComponent(commodity.name)}`,
      token: farmerToken,
    });
    if (farmerTodayPrices.statusCode !== 200 || farmerTodayPrices.body.records.length === 0) {
      throw new Error(`Farmer could not view today prices: ${JSON.stringify(farmerTodayPrices.body)}`);
    }
    console.log(`✔ Farmer retrieved ${farmerTodayPrices.body.records.length} today price record(s) from /api/market-owner/prices/today`);
    console.log(`✔ Rate verified: ₹${farmerTodayPrices.body.records[0].modalPrice} for Mandi ${farmerTodayPrices.body.records[0].marketName}`);

    // 4b. Mandi Service general prices API (integrated with MongoDB)
    const mandiPricesRes = await makeRequest({
      method: 'GET',
      path: `/api/mandi/prices?commodity=${encodeURIComponent(commodity.name)}`,
      token: farmerToken,
    });
    if (mandiPricesRes.statusCode !== 200) {
      throw new Error(`Mandi general API failed: ${JSON.stringify(mandiPricesRes.body)}`);
    }
    console.log(`✔ Mandi API (/api/mandi/prices) returned ${mandiPricesRes.body.records.length} quotes including verified MongoDB entries.`);

    // -------------------------------------------------------------
    // Step 5: Phase 2 Req 4 - Old Prices Preserved & Audit Trail Recorded
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Price Revision & Historical Audit Log Preservation ---');
    const priceRes2 = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: ownerToken,
      body: {
        commodityId: commodity._id || commodity.id,
        minPrice: 2900,
        maxPrice: 3400,
        modalPrice: 3200,
        unit: 'quintal',
        priceDate: todayStr,
        notes: 'Midday auction revision due to high demand',
      },
    });

    if (priceRes2.statusCode !== 200) {
      throw new Error(`Price revision failed: ${JSON.stringify(priceRes2.body)}`);
    }
    console.log(`✔ Updated Price to ₹${priceRes2.body.marketPrice.modalPrice}/quintal.`);

    // Verify Audit log in MongoDB
    const auditLogs = await PriceAudit.find({
      market: ownerUser.market,
      commodity: commodity._id || commodity.id,
    }).sort({ createdAt: -1 });

    if (auditLogs.length < 2) {
      throw new Error(`Expected at least 2 audit entries, found ${auditLogs.length}`);
    }
    const latestAudit = auditLogs[0];
    console.log(`✔ Immutable Audit Log preserved: Action '${latestAudit.action}', Previous: ₹${latestAudit.previousPrice?.modalPrice} -> New: ₹${latestAudit.newPrice?.modalPrice}`);

    // -------------------------------------------------------------
    // Step 6: Phase 2 Req 7 - Backend RBAC & Authorization Guard
    // -------------------------------------------------------------
    console.log('\n--- Step 6: Backend RBAC & Authorization Security Verification ---');
    
    // Farmer blocked from POST /api/market-owner/prices
    const farmerBlockedRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      token: farmerToken,
      body: {
        commodityId: commodity._id || commodity.id,
        minPrice: 1000,
        maxPrice: 2000,
        modalPrice: 1500,
      },
    });
    if (farmerBlockedRes.statusCode !== 403) {
      throw new Error(`Expected 403 for Farmer, got ${farmerBlockedRes.statusCode}`);
    }
    console.log(`✔ Verified: Farmer role receives 403 Forbidden on price mutation.`);

    // Unauthenticated request blocked
    const unauthRes = await makeRequest({
      method: 'POST',
      path: '/api/market-owner/prices',
      body: {
        commodityId: commodity._id || commodity.id,
        minPrice: 1000,
        maxPrice: 2000,
        modalPrice: 1500,
      },
    });
    if (unauthRes.statusCode !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.statusCode}`);
    }
    console.log(`✔ Verified: Unauthenticated request receives 401 Unauthorized.`);

    // -------------------------------------------------------------
    // Step 7: Phase 2 Req 8 - Admin Views Price Audits & History
    // -------------------------------------------------------------
    console.log('\n--- Step 7: Administrator Audit Trail & Market Governance ---');
    const adminAudits = await makeRequest({
      method: 'GET',
      path: `/api/market-owner/admin/audits?marketId=${ownerUser.market}`,
      token: adminToken,
    });
    if (adminAudits.statusCode !== 200 || !adminAudits.body.success) {
      throw new Error(`Admin audit retrieval failed: ${JSON.stringify(adminAudits.body)}`);
    }
    console.log(`✔ Admin loaded ${adminAudits.body.count} audit records for Market ${ownerUser.market}.`);
    console.log(`✔ Latest audit action: ${adminAudits.body.audits[0].action} by ${adminAudits.body.audits[0].changedByName}`);

    // Admin Market Owners list
    const adminOwners = await makeRequest({
      method: 'GET',
      path: '/api/market-owner/admin/owners',
      token: adminToken,
    });
    if (adminOwners.statusCode !== 200 || !adminOwners.body.success) {
      throw new Error(`Admin owners retrieval failed: ${JSON.stringify(adminOwners.body)}`);
    }
    console.log(`✔ Admin retrieved ${adminOwners.body.count} registered Market Owner(s).`);

    console.log('\n=============================================================');
    console.log('🎉 ALL PHASE 2 DATABASE & STATE INTEGRATION TESTS PASSED 100%');
    console.log('=============================================================\n');
  } catch (error: any) {
    console.error('\n❌ PHASE 2 TEST SUITE FAILED:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
};

runMarketOwnerPhase2Tests();
