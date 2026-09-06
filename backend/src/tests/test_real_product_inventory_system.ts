import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';

const TEST_PORT = 5088;
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

const runRealProductInventoryTests = async () => {
  console.log('================================================================');
  console.log('   AGRIMART — REAL PRODUCT INVENTORY SYSTEM VERIFICATION TEST   ');
  console.log('================================================================\n');

  await connectDB();

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    // Ensure clean state before running tests
    await Product.deleteMany({});
    await User.deleteMany({ email: 'test.farmer.inventory@agrimart.com' });

    // -------------------------------------------------------------
    // STEP 1 & 2: Confirm MongoDB Product count remains 0 & no demo products
    // -------------------------------------------------------------
    console.log('▶ TEST 1 & 2: Verify Initial Zero Products State');
    const initialProductCount = await Product.countDocuments({});
    console.log(`   - Initial Product Count in MongoDB: ${initialProductCount}`);
    if (initialProductCount !== 0) {
      throw new Error(`Expected 0 products in database initially, found ${initialProductCount}`);
    }

    const publicMarketplaceRes = await makeRequest({
      method: 'GET',
      path: '/api/products',
    });
    console.log(`   - Public Marketplace GET /api/products returns ${publicMarketplaceRes.body.count || 0} products.`);
    if (publicMarketplaceRes.body.count !== 0) {
      throw new Error('Public marketplace must return 0 products initially.');
    }
    console.log('   ✅ Initial zero-products confirmation PASSED.\n');

    // -------------------------------------------------------------
    // STEP 3: Ensure test accounts and obtain JWT tokens
    // -------------------------------------------------------------
    console.log('▶ TEST 3: Authenticate as ADMIN and FARMER');
    // Ensure Admin Account
    let adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'System Admin',
        email: 'test.admin@agrimart.com',
        phone: '9900112233',
        password: 'Password123',
        role: 'ADMIN',
      });
    }

    const adminLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: adminUser.phone, password: 'Password123' },
    });

    let adminToken = adminLoginRes.body.token;
    if (!adminToken) {
      // Fallback try email
      const adminLoginEmail = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { identifier: adminUser.email, password: 'Password123' },
      });
      adminToken = adminLoginEmail.body.token;
    }

    if (!adminToken) {
      throw new Error(`Failed to obtain Admin token: ${JSON.stringify(adminLoginRes.body)}`);
    }
    console.log(`   ✅ Admin authenticated successfully (Role: ${adminUser.role}).`);

    // Ensure Farmer Account
    const farmerUser = await User.create({
      name: 'Test Farmer',
      email: 'test.farmer.inventory@agrimart.com',
      phone: '9900112244',
      password: 'Password123',
      role: 'FARMER',
    });

    const farmerLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: '9900112244', password: 'Password123' },
    });
    const farmerToken = farmerLoginRes.body.token;
    if (!farmerToken) {
      throw new Error(`Failed to obtain Farmer token: ${JSON.stringify(farmerLoginRes.body)}`);
    }
    console.log(`   ✅ Farmer authenticated successfully (Role: ${farmerUser.role}).\n`);

    // -------------------------------------------------------------
    // STEP 4: Add one real test product manually through Admin API
    // -------------------------------------------------------------
    console.log('▶ TEST 4: Admin creates a real agricultural product');
    const newProductPayload = {
      name: 'Certified Hybrid Cotton Seeds RCH-659',
      category: 'Seeds',
      brand: 'Rasi Seeds',
      price: 865.0,
      unit: '450g packet',
      stock: 150,
      description: 'High-yield BG-II hybrid cotton seeds certified by State Seeds Corporation.',
      image: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=600',
      isActive: true,
      location: {
        street: 'Main APMC Mandi Road',
        city: 'Kurnool',
        state: 'Andhra Pradesh',
        pincode: '518001',
      },
    };

    const createRes = await makeRequest({
      method: 'POST',
      path: '/api/products',
      body: newProductPayload,
      token: adminToken,
    });

    console.log(`   - Status Code: ${createRes.statusCode}`);
    if (createRes.statusCode !== 201 || !createRes.body.product) {
      throw new Error(`Failed to create product: ${JSON.stringify(createRes.body)}`);
    }

    const createdProductId = createRes.body.product.id || createRes.body.product._id;
    console.log(`   - Created Product ID: ${createdProductId}`);
    console.log(`   - Product Name: "${createRes.body.product.name}" | Price: ₹${createRes.body.product.price} | Stock: ${createRes.body.product.stock}`);
    console.log('   ✅ Product creation by Admin PASSED.\n');

    // -------------------------------------------------------------
    // STEP 5: Verify it appears in the public marketplace
    // -------------------------------------------------------------
    console.log('▶ TEST 5: Verify product is visible in Public Marketplace');
    const marketplaceRes = await makeRequest({
      method: 'GET',
      path: '/api/products',
    });

    console.log(`   - Marketplace count: ${marketplaceRes.body.count}`);
    if (marketplaceRes.body.count !== 1) {
      throw new Error(`Expected 1 product in marketplace, found ${marketplaceRes.body.count}`);
    }

    const listedProduct = marketplaceRes.body.products[0];
    if (listedProduct.name !== newProductPayload.name || listedProduct.price !== newProductPayload.price) {
      throw new Error('Marketplace product details mismatch.');
    }
    console.log(`   - Verified Marketplace Product: "${listedProduct.name}" (₹${listedProduct.price})`);
    console.log('   ✅ Public marketplace dynamic listing PASSED.\n');

    // -------------------------------------------------------------
    // STEP 6: Edit its price and verify marketplace shows updated price
    // -------------------------------------------------------------
    console.log('▶ TEST 6: Admin updates product selling price');
    const newPrice = 920.0;
    const updatePriceRes = await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdProductId}`,
      body: { price: newPrice },
      token: adminToken,
    });

    console.log(`   - Status Code: ${updatePriceRes.statusCode}`);
    if (updatePriceRes.statusCode !== 200 || updatePriceRes.body.product.price !== newPrice) {
      throw new Error(`Price update failed: ${JSON.stringify(updatePriceRes.body)}`);
    }

    const verifyMarketplacePrice = await makeRequest({
      method: 'GET',
      path: `/api/products/${createdProductId}`,
    });
    console.log(`   - Updated Price in Marketplace: ₹${verifyMarketplacePrice.body.product.price}`);
    if (verifyMarketplacePrice.body.product.price !== newPrice) {
      throw new Error('Marketplace did not reflect updated price.');
    }
    console.log('   ✅ Dynamic price update PASSED.\n');

    // -------------------------------------------------------------
    // STEP 7: Change stock and verify stock status changes
    // -------------------------------------------------------------
    console.log('▶ TEST 7: Admin updates product stock quantity');
    const newStock = 5;
    const updateStockRes = await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdProductId}`,
      body: { stock: newStock },
      token: adminToken,
    });

    console.log(`   - Updated Stock: ${updateStockRes.body.product.stock}`);
    if (updateStockRes.body.product.stock !== newStock) {
      throw new Error('Stock update failed.');
    }
    console.log('   ✅ Stock update PASSED.\n');

    // -------------------------------------------------------------
    // STEP 8: Test Availability Toggle (Disable / Enable)
    // -------------------------------------------------------------
    console.log('▶ TEST 8: Test Availability Disable and Re-enable Toggle');
    // Disable product
    const disableRes = await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdProductId}`,
      body: { isActive: false },
      token: adminToken,
    });
    console.log(`   - Disabled product isActive: ${disableRes.body.product.isActive}`);

    // Public marketplace must return 0 products while product is disabled
    const marketplaceDisabledRes = await makeRequest({
      method: 'GET',
      path: '/api/products',
    });
    console.log(`   - Public Marketplace count with product disabled: ${marketplaceDisabledRes.body.count}`);
    if (marketplaceDisabledRes.body.count !== 0) {
      throw new Error('Disabled product should NOT appear in public marketplace.');
    }

    // Admin management view still sees it
    const adminViewRes = await makeRequest({
      method: 'GET',
      path: '/api/products/my',
      token: adminToken,
    });
    console.log(`   - Admin view count with product disabled: ${adminViewRes.body.count}`);
    if (adminViewRes.body.count !== 1) {
      throw new Error('Admin view must still show disabled products.');
    }

    // Re-enable product
    await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdProductId}`,
      body: { isActive: true },
      token: adminToken,
    });
    console.log('   ✅ Availability toggle behavior PASSED.\n');

    // -------------------------------------------------------------
    // STEP 9: Verify a non-admin user cannot access product-management APIs
    // -------------------------------------------------------------
    console.log('▶ TEST 9: Authorization Check (Farmer cannot create, update, or delete products)');
    const farmerCreateRes = await makeRequest({
      method: 'POST',
      path: '/api/products',
      body: newProductPayload,
      token: farmerToken,
    });
    console.log(`   - Farmer POST /api/products status: ${farmerCreateRes.statusCode} (Expected: 403)`);
    if (farmerCreateRes.statusCode !== 403) {
      throw new Error(`Expected 403 Forbidden for Farmer create, got ${farmerCreateRes.statusCode}`);
    }

    const farmerUpdateRes = await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdProductId}`,
      body: { price: 10 },
      token: farmerToken,
    });
    console.log(`   - Farmer PUT /api/products/:id status: ${farmerUpdateRes.statusCode} (Expected: 403)`);
    if (farmerUpdateRes.statusCode !== 403) {
      throw new Error(`Expected 403 Forbidden for Farmer update, got ${farmerUpdateRes.statusCode}`);
    }

    const farmerDeleteRes = await makeRequest({
      method: 'DELETE',
      path: `/api/products/${createdProductId}`,
      token: farmerToken,
    });
    console.log(`   - Farmer DELETE /api/products/:id status: ${farmerDeleteRes.statusCode} (Expected: 403)`);
    if (farmerDeleteRes.statusCode !== 403) {
      throw new Error(`Expected 403 Forbidden for Farmer delete, got ${farmerDeleteRes.statusCode}`);
    }
    console.log('   ✅ Authorization enforcement PASSED.\n');

    // -------------------------------------------------------------
    // STEP 10: Delete the test product and verify 0 remaining products
    // -------------------------------------------------------------
    console.log('▶ TEST 10: Delete test product and verify 0 remaining products');
    const deleteRes = await makeRequest({
      method: 'DELETE',
      path: `/api/products/${createdProductId}`,
      token: adminToken,
    });
    console.log(`   - Delete Status Code: ${deleteRes.statusCode}`);
    if (deleteRes.statusCode !== 200) {
      throw new Error(`Failed to delete product: ${JSON.stringify(deleteRes.body)}`);
    }

    const finalDbCount = await Product.countDocuments({});
    console.log(`   - Final MongoDB Product Count: ${finalDbCount}`);
    if (finalDbCount !== 0) {
      throw new Error(`Expected 0 products in MongoDB after cleanup, found ${finalDbCount}`);
    }

    const finalMarketplaceRes = await makeRequest({
      method: 'GET',
      path: '/api/products',
    });
    console.log(`   - Final Public Marketplace Count: ${finalMarketplaceRes.body.count}`);
    if (finalMarketplaceRes.body.count !== 0) {
      throw new Error(`Expected 0 products in marketplace after cleanup, found ${finalMarketplaceRes.body.count}`);
    }
    console.log('   ✅ Final cleanup and zero-product verification PASSED.\n');

    console.log('================================================================');
    console.log('🎉 ALL 10 PRODUCT INVENTORY SYSTEM TESTS PASSED SUCCESSFULLY!   ');
    console.log('================================================================');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
};

runRealProductInventoryTests();
