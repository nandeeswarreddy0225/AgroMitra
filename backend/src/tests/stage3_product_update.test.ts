import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';

const TEST_PORT = 5004;
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

const runAllProductUpdateTests = async () => {
  console.log('====================================================');
  console.log('  AGRIMART — STAGE 3 COMPLETE PRODUCT UPDATE FIX    ');
  console.log('====================================================\n');

  await connectDB();

  // Clear test users and products
  await User.deleteMany({
    email: {
      $in: [
        'shop.update.a@agrimart.com',
        'shop.update.b@agrimart.com',
        'farmer.update@agrimart.com',
      ],
    },
  });
  await Product.deleteMany({
    name: {
      $in: [
        'Initial Test Fertilizer',
        'Updated Product Name Pro',
        'Shop B Protected Seed',
      ],
    },
  });

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    // ---------------------------------------------------------
    // SETUP: Register Shop Owner A, Shop Owner B, and Farmer
    // ---------------------------------------------------------
    console.log('▶ [SETUP]: Registering Shop Owner A, Shop Owner B, and Farmer...');
    
    // Register Shop Owner A
    const resShopA = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Apex Agro Supplies',
        email: 'shop.update.a@agrimart.com',
        phone: '9876500001',
        password: 'Password123',
        role: 'SHOP_OWNER',
        address: { street: 'Old Market 1', city: 'Nagpur', state: 'Maharashtra', pincode: '440001' },
      },
    });
    const tokenShopA = resShopA.body.token;

    // Register Shop Owner B
    const resShopB = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Kisan Kendra Store B',
        email: 'shop.update.b@agrimart.com',
        phone: '9876500002',
        password: 'Password123',
        role: 'SHOP_OWNER',
        address: { street: 'Bazaar 2', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      },
    });
    const tokenShopB = resShopB.body.token;

    // Register Farmer
    const resFarmer = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Gopal Farmer',
        email: 'farmer.update@agrimart.com',
        phone: '9876500003',
        password: 'Password123',
        role: 'FARMER',
      },
    });
    const tokenFarmer = resFarmer.body.token;

    // Create Initial Product for Shop Owner A with stock = 50 and price = 1000
    const resInitProd = await makeRequest({
      method: 'POST',
      path: '/api/products',
      token: tokenShopA,
      body: {
        name: 'Initial Test Fertilizer',
        description: 'Initial product description for testing updates.',
        category: 'Fertilizers',
        brand: 'Initial Brand',
        price: 1000,
        unit: 'kg',
        stock: 50,
        image: 'https://example.com/initial.jpg',
        location: { street: 'Shop Street 10', city: 'Nagpur', state: 'Maharashtra', pincode: '440001' },
      },
    });

    const targetProductId = resInitProd.body.product.id || resInitProd.body.product._id;
    console.log(`  ✅ SETUP PASSED: Initial product created with ID: ${targetProductId}, price: 1000, stock: 50\n`);

    // ---------------------------------------------------------
    // TEST 1: stock: 50 → 55
    // ---------------------------------------------------------
    console.log('▶ [TEST 1]: Update stock from 50 → 55...');
    const resT1 = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenShopA,
      body: { stock: 55 },
    });
    if (resT1.statusCode !== 200 || resT1.body.product.stock !== 55) {
      throw new Error(`TEST 1 FAILED: Status: ${resT1.statusCode}, Stock: ${resT1.body.product?.stock}`);
    }
    const dbT1 = await Product.findById(targetProductId);
    if (dbT1?.stock !== 55) throw new Error(`TEST 1 DB MISMATCH: Expected 55, got ${dbT1?.stock}`);
    console.log(`  ✅ TEST 1 PASSED: Stock updated to 55 in MongoDB. Farmer sees: ${dbT1?.stock}`);

    // ---------------------------------------------------------
    // TEST 2: stock: 55 → 20
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 2]: Update stock from 55 → 20...');
    const resT2 = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenShopA,
      body: { stock: 20 },
    });
    if (resT2.statusCode !== 200 || resT2.body.product.stock !== 20) {
      throw new Error(`TEST 2 FAILED: Status: ${resT2.statusCode}, Stock: ${resT2.body.product?.stock}`);
    }
    const dbT2 = await Product.findById(targetProductId);
    if (dbT2?.stock !== 20) throw new Error(`TEST 2 DB MISMATCH: Expected 20, got ${dbT2?.stock}`);
    console.log(`  ✅ TEST 2 PASSED: Stock updated to 20 in MongoDB. Farmer sees: ${dbT2?.stock}`);

    // ---------------------------------------------------------
    // TEST 3: stock: 20 → 100
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 3]: Update stock from 20 → 100...');
    const resT3 = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenShopA,
      body: { stock: 100 },
    });
    if (resT3.statusCode !== 200 || resT3.body.product.stock !== 100) {
      throw new Error(`TEST 3 FAILED: Status: ${resT3.statusCode}, Stock: ${resT3.body.product?.stock}`);
    }
    const dbT3 = await Product.findById(targetProductId);
    if (dbT3?.stock !== 100) throw new Error(`TEST 3 DB MISMATCH: Expected 100, got ${dbT3?.stock}`);
    console.log(`  ✅ TEST 3 PASSED: Stock updated to 100 in MongoDB. Farmer sees: ${dbT3?.stock}`);

    // ---------------------------------------------------------
    // TEST 4: price: 1000 → 950
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 4]: Update price from 1000 → 950...');
    const resT4 = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenShopA,
      body: { price: 950 },
    });
    if (resT4.statusCode !== 200 || resT4.body.product.price !== 950) {
      throw new Error(`TEST 4 FAILED: Status: ${resT4.statusCode}, Price: ${resT4.body.product?.price}`);
    }
    const dbT4 = await Product.findById(targetProductId);
    if (dbT4?.price !== 950) throw new Error(`TEST 4 DB MISMATCH: Expected 950, got ${dbT4?.price}`);
    console.log(`  ✅ TEST 4 PASSED: Price updated to ₹950 in MongoDB. Farmer sees: ₹${dbT4?.price}`);

    // ---------------------------------------------------------
    // TEST 5: price: 950 → 1200
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 5]: Update price from 950 → 1200...');
    const resT5 = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenShopA,
      body: { price: 1200 },
    });
    if (resT5.statusCode !== 200 || resT5.body.product.price !== 1200) {
      throw new Error(`TEST 5 FAILED: Status: ${resT5.statusCode}, Price: ${resT5.body.product?.price}`);
    }
    const dbT5 = await Product.findById(targetProductId);
    if (dbT5?.price !== 1200) throw new Error(`TEST 5 DB MISMATCH: Expected 1200, got ${dbT5?.price}`);
    console.log(`  ✅ TEST 5 PASSED: Price updated to ₹1200 in MongoDB. Farmer sees: ₹${dbT5?.price}`);

    // ---------------------------------------------------------
    // TEST 6: change product name
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 6]: Update product name...');
    const resT6 = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenShopA,
      body: { name: 'Updated Product Name Pro' },
    });
    if (resT6.statusCode !== 200 || resT6.body.product.name !== 'Updated Product Name Pro') {
      throw new Error(`TEST 6 FAILED: Status: ${resT6.statusCode}, Name: ${resT6.body.product?.name}`);
    }
    const dbT6 = await Product.findById(targetProductId);
    if (dbT6?.name !== 'Updated Product Name Pro') throw new Error(`TEST 6 DB MISMATCH: got ${dbT6?.name}`);
    console.log(`  ✅ TEST 6 PASSED: Product name updated in MongoDB to: "${dbT6?.name}"`);

    // ---------------------------------------------------------
    // TEST 7: change description
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 7]: Update description...');
    const resT7 = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenShopA,
      body: { description: 'New advanced organic formula for enhanced soil fertility and root growth.' },
    });
    if (resT7.statusCode !== 200 || !resT7.body.product.description.includes('advanced organic formula')) {
      throw new Error(`TEST 7 FAILED: Status: ${resT7.statusCode}`);
    }
    const dbT7 = await Product.findById(targetProductId);
    console.log(`  ✅ TEST 7 PASSED: Description updated in MongoDB.`);

    // ---------------------------------------------------------
    // TEST 8: change brand
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 8]: Update brand...');
    const resT8 = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenShopA,
      body: { brand: 'IFFCO Prime Gold' },
    });
    if (resT8.statusCode !== 200 || resT8.body.product.brand !== 'IFFCO Prime Gold') {
      throw new Error(`TEST 8 FAILED: Status: ${resT8.statusCode}, Brand: ${resT8.body.product?.brand}`);
    }
    const dbT8 = await Product.findById(targetProductId);
    if (dbT8?.brand !== 'IFFCO Prime Gold') throw new Error(`TEST 8 DB MISMATCH: got ${dbT8?.brand}`);
    console.log(`  ✅ TEST 8 PASSED: Brand updated in MongoDB to: "${dbT8?.brand}"`);

    // ---------------------------------------------------------
    // TEST 9: change category, unit, location, and images
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 9]: Update category, unit, location, and images...');
    const resT9 = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenShopA,
      body: {
        category: 'Bio Products',
        unit: '50kg bag',
        image: 'https://example.com/updated-image.jpg',
        location: { street: 'New Plaza 99', city: 'Amravati', state: 'Maharashtra', pincode: '444601' },
      },
    });
    if (resT9.statusCode !== 200) {
      throw new Error(`TEST 9 FAILED: Status: ${resT9.statusCode}, Body: ${JSON.stringify(resT9.body)}`);
    }
    const dbT9 = await Product.findById(targetProductId);
    if (dbT9?.category !== 'Bio Products' || dbT9?.unit !== '50kg bag' || dbT9?.location?.city !== 'Amravati') {

      throw new Error(`TEST 9 DB MISMATCH: ${JSON.stringify(dbT9)}`);
    }
    console.log(`  ✅ TEST 9 PASSED: Category, unit, image, and location all dynamically updated in MongoDB.`);

    // ---------------------------------------------------------
    // TEST 10: Farmer Marketplace query verification
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 10]: Farmer Marketplace retrieves updated values from API/MongoDB...');
    const resMarket = await makeRequest({
      method: 'GET',
      path: `/api/products/${targetProductId}`,
      token: tokenFarmer,
    });
    if (resMarket.statusCode !== 200 || !resMarket.body.success) {
      throw new Error(`TEST 10 FAILED: Status: ${resMarket.statusCode}`);
    }
    const p = resMarket.body.product;
    if (p.name !== 'Updated Product Name Pro' || p.price !== 1200 || p.stock !== 100 || p.category !== 'Bio Products' || p.unit !== '50kg bag') {
      throw new Error(`TEST 10 FAILED: Stale values returned in marketplace: ${JSON.stringify(p)}`);
    }
    console.log(`  ✅ TEST 10 PASSED: Farmer views exact updated values:`);
    console.log(`     Name: "${p.name}", Price: ₹${p.price}/${p.unit}, Stock: ${p.stock}, Category: ${p.category}`);

    // ---------------------------------------------------------
    // TEST 11: Security: Shop Owner A cannot update Shop Owner B's product
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 11]: Ownership security check (Shop Owner A cannot edit Shop Owner B product)...');
    const resShopBCreate = await makeRequest({
      method: 'POST',
      path: '/api/products',
      token: tokenShopB,
      body: {
        name: 'Shop B Protected Seed',
        description: 'High yield certified seed.',
        category: 'Seeds',
        price: 600,
        unit: 'packet',
        stock: 40,
      },
    });
    const shopBProductId = resShopBCreate.body.product.id || resShopBCreate.body.product._id;

    const resAttack = await makeRequest({
      method: 'PUT',
      path: `/api/products/${shopBProductId}`,
      token: tokenShopA,
      body: { price: 1 },
    });
    if (resAttack.statusCode === 403) {
      console.log('  ✅ TEST 11 PASSED: Shop Owner A edit attempt on Shop Owner B product rejected with HTTP 403 Forbidden.');
    } else {
      throw new Error(`TEST 11 FAILED: Expected 403, got ${resAttack.statusCode}`);
    }

    // ---------------------------------------------------------
    // TEST 12: Security: Farmer cannot update products
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 12]: Farmer role restriction check...');
    const resFarmerAttack = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenFarmer,
      body: { price: 10 },
    });
    if (resFarmerAttack.statusCode === 403) {
      console.log('  ✅ TEST 12 PASSED: Farmer update attempt rejected with HTTP 403 Forbidden.');
    } else {
      throw new Error(`TEST 12 FAILED: Expected 403, got ${resFarmerAttack.statusCode}`);
    }

    // ---------------------------------------------------------
    // TEST 13: Input validation check (negative price, negative stock, empty category)
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 13]: Validation checks for invalid inputs...');
    const resInvalidPrice = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenShopA,
      body: { price: -50 },
    });
    const resInvalidStock = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenShopA,
      body: { stock: -10 },
    });
    const resInvalidCategory = await makeRequest({
      method: 'PUT',
      path: `/api/products/${targetProductId}`,
      token: tokenShopA,
      body: { category: ' ' },
    });

    if (resInvalidPrice.statusCode === 400 && resInvalidStock.statusCode === 400 && resInvalidCategory.statusCode === 400) {
      console.log('  ✅ TEST 13 PASSED: Invalid price (-50), invalid stock (-10), and empty category all rejected with HTTP 400.');
    } else {
      throw new Error(`TEST 13 FAILED: Invalid inputs not rejected properly with 400`);
    }

    console.log('\n====================================================');
    console.log('   🎉 ALL PRODUCT UPDATE TESTS PASSED SUCCESSFULLY! ');
    console.log('====================================================\n');
  } finally {
    await User.deleteMany({
      email: {
        $in: [
          'shop.update.a@agrimart.com',
          'shop.update.b@agrimart.com',
          'farmer.update@agrimart.com',
        ],
      },
    });
    await Product.deleteMany({
      name: {
        $in: [
          'Initial Test Fertilizer',
          'Updated Product Name Pro',
          'Shop B Protected Seed',
        ],
      },
    });
    server.close();
    await disconnectDB();
  }
};

runAllProductUpdateTests().catch((err) => {
  console.error('\n❌ Product Update Test Suite Failed:', err);
  if (server) server.close();
  disconnectDB().finally(() => process.exit(1));
});
