import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';

const TEST_PORT = 5005;
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

const runDuplicateCheckTests = async () => {
  console.log('====================================================');
  console.log('  AGRIMART — STAGE 3 DUPLICATE PRODUCT DISPLAY FIX  ');
  console.log('====================================================\n');

  await connectDB();

  // Clear previous test users and products
  await User.deleteMany({
    email: {
      $in: [
        'shop.dup.test@agrimart.com',
        'farmer.dup.test@agrimart.com',
      ],
    },
  });
  await Product.deleteMany({});

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    // ---------------------------------------------------------
    // SETUP: Register Shop Owner and Farmer
    // ---------------------------------------------------------
    console.log('▶ [SETUP]: Registering Shop Owner and Farmer...');
    const resShop = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'National Fertilizer Store',
        email: 'shop.dup.test@agrimart.com',
        phone: '9876511111',
        password: 'Password123',
        role: 'SHOP_OWNER',
        address: { street: 'Main Bazaar', city: 'Nagpur', state: 'Maharashtra', pincode: '440001' },
      },
    });
    const tokenShop = resShop.body.token;

    // ---------------------------------------------------------
    // SCENARIO 1: MongoDB contains exactly ONE product: Urea Fertilizer
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 1]: Inserting exactly ONE product (Urea Fertilizer)...');
    const resCreate = await makeRequest({
      method: 'POST',
      path: '/api/products',
      token: tokenShop,
      body: {
        name: 'Urea Fertilizer',
        description: 'High nitrogen 46% prilled urea for vegetative crop growth.',
        category: 'Fertilizers',
        brand: 'IFFCO',
        price: 266.50,
        unit: '45kg bag',
        stock: 100,
        image: 'https://example.com/urea.jpg',
      },
    });

    if (resCreate.statusCode !== 201) {
      throw new Error(`Failed to create product. Status: ${resCreate.statusCode}`);
    }

    const countInDb = await Product.countDocuments();
    console.log(`  Count in MongoDB: ${countInDb}`);

    // Call GET /api/products multiple times (simulating reloads and repeated requests)
    for (let i = 1; i <= 3; i++) {
      const resGet = await makeRequest({
        method: 'GET',
        path: '/api/products',
      });

      if (resGet.statusCode !== 200 || !resGet.body.success) {
        throw new Error(`GET /api/products request ${i} failed`);
      }

      if (resGet.body.count !== 1 || resGet.body.products.length !== 1) {
        throw new Error(`DUPLICATION DETECTED on call ${i}: Expected 1 product, got ${resGet.body.count} items!`);
      }

      if (resGet.body.products[0].name !== 'Urea Fertilizer') {
        throw new Error(`Unexpected product name: ${resGet.body.products[0].name}`);
      }
      console.log(`  ✅ Call ${i} to GET /api/products returned exactly ${resGet.body.products.length} product: "${resGet.body.products[0].name}"`);
    }

    // ---------------------------------------------------------
    // SCENARIO 2: Scale test - Insert 4 more products (Total 5 distinct products)
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 2]: Inserting 4 additional distinct products (Total 5)...');
    const additionalProducts = [
      { name: 'DAP 18-46-0 Fertilizer', category: 'Fertilizers', brand: 'IFFCO', price: 1350, unit: '50kg bag', stock: 60, description: 'Di-ammonium phosphate' },
      { name: 'Confidor Insecticide', category: 'Insecticides', brand: 'Bayer', price: 450, unit: '250ml bottle', stock: 25, description: 'Imidacloprid 17.8% SL' },
      { name: 'Roundup Herbicide', category: 'Herbicides', brand: 'Bayer', price: 680, unit: '1 liter', stock: 35, description: 'Glyphosate 41% SL' },
      { name: 'Hybrid Cotton Seeds', category: 'Seeds', brand: 'Mahyco', price: 820, unit: 'packet', stock: 80, description: 'BG-II hybrid cotton seed' },
    ];

    for (const p of additionalProducts) {
      await makeRequest({
        method: 'POST',
        path: '/api/products',
        token: tokenShop,
        body: p,
      });
    }

    const totalInDb = await Product.countDocuments();
    console.log(`  Total count in MongoDB: ${totalInDb}`);

    const resGet5 = await makeRequest({
      method: 'GET',
      path: '/api/products',
    });

    if (resGet5.statusCode !== 200 || resGet5.body.count !== 5 || resGet5.body.products.length !== 5) {
      throw new Error(`Expected 5 products, got count: ${resGet5.body.count}, array length: ${resGet5.body.products.length}`);
    }

    // Verify all 5 IDs are unique
    const ids = resGet5.body.products.map((p: any) => p._id || p.id);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== 5) {
      throw new Error(`Duplicate IDs detected in API response! Unique IDs: ${uniqueIds.size}, Total: ${ids.length}`);
    }

    console.log('  ✅ TEST 2 PASSED: Exactly 5 unique products returned from MongoDB with 0 duplicates.');

    // ---------------------------------------------------------
    // SCENARIO 3: Category filter and search accuracy
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 3]: Search and category filter verification...');
    const resCategoryFilter = await makeRequest({
      method: 'GET',
      path: '/api/products?category=Fertilizers',
    });

    if (resCategoryFilter.body.count !== 2) {
      throw new Error(`Expected 2 Fertilizer products (Urea & DAP), got ${resCategoryFilter.body.count}`);
    }
    console.log(`  ✅ TEST 3 PASSED: Category filter returned exactly 2 fertilizers: ${resCategoryFilter.body.products.map((p: any) => p.name).join(', ')}`);

    console.log('\n====================================================');
    console.log('   🎉 ALL DUPLICATE CHECKS PASSED SUCCESSFULLY!    ');
    console.log('====================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
};

runDuplicateCheckTests().catch((err) => {
  console.error('\n❌ Duplicate Check Test Failed:', err);
  if (server) server.close();
  disconnectDB().finally(() => process.exit(1));
});
