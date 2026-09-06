import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';

const TEST_PORT = 5099;
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

const runFinalAdminVerification = async () => {
  console.log('================================================================');
  console.log('   AGRIMART — FINAL ADMIN PRODUCT MANAGEMENT VERIFICATION       ');
  console.log('================================================================\n');

  await connectDB();

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    // 0. Ensure clean starting state
    await Product.deleteMany({});
    await User.deleteMany({
      email: { $in: ['test.farmer.verify@agrimart.com', 'test.delivery.verify@agrimart.com'] },
    });

    // -------------------------------------------------------------------------
    // 1 & 2. Verify Admin opens page and sees empty inventory (0 products)
    // -------------------------------------------------------------------------
    console.log('▶ [CHECK 1 & 2]: Verify initial zero-products state');
    const initialDbCount = await Product.countDocuments({});
    console.log(`   - MongoDB product count: ${initialDbCount}`);
    if (initialDbCount !== 0) throw new Error(`Expected 0 products in MongoDB, got ${initialDbCount}`);

    // Authenticate Admin
    let adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'AgroMitra Admin',
        email: 'admin.verify@agrimart.com',
        phone: '9876543211',
        password: 'Password123',
        role: 'ADMIN',
      });
    }

    const adminLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: adminUser.phone || adminUser.email, password: 'Password123' },
    });
    const adminToken = adminLoginRes.body.token;
    if (!adminToken) throw new Error('Failed to obtain Admin token');

    const adminInitialList = await makeRequest({
      method: 'GET',
      path: '/api/products/my',
      token: adminToken,
    });
    console.log(`   - Admin /api/products/my count: ${adminInitialList.body.count}`);
    if (adminInitialList.body.count !== 0) throw new Error('Admin inventory should be empty');
    console.log('   ✅ Initial empty state verified.\n');

    // -------------------------------------------------------------------------
    // 3, 4, 5. Admin adds temporary test product with all required fields
    // -------------------------------------------------------------------------
    console.log('▶ [CHECK 3, 4, 5]: Admin adds real agricultural product');
    const testProductData = {
      name: 'IFFCO Nano Urea Liquid',
      brand: 'IFFCO',
      category: 'Bio-Fertilizers',
      description: 'Targeted 4% nano nitrogen liquid fertilizer boosting photosynthetic activity and root proliferation.',
      price: 225.0,
      unit: '500ml bottle',
      stock: 200,
      isActive: true,
      image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600',
      location: {
        street: 'Kurnool Agro Mandi Complex, Stall 14',
        city: 'Kurnool',
        state: 'Andhra Pradesh',
        pincode: '518001',
      },
    };

    const createRes = await makeRequest({
      method: 'POST',
      path: '/api/products',
      body: testProductData,
      token: adminToken,
    });

    console.log(`   - Create Response Status: ${createRes.statusCode}`);
    if (createRes.statusCode !== 201 || !createRes.body.product) {
      throw new Error(`Product creation failed: ${JSON.stringify(createRes.body)}`);
    }
    const createdId = createRes.body.product.id || createRes.body.product._id;
    console.log(`   - Created Product ID: ${createdId}`);
    console.log(`   - Stored Name: "${createRes.body.product.name}" | Price: ₹${createRes.body.product.price} | Unit: ${createRes.body.product.unit}`);
    console.log('   ✅ Product created and saved successfully.\n');

    // -------------------------------------------------------------------------
    // 6. Confirm actually stored in MongoDB
    // -------------------------------------------------------------------------
    console.log('▶ [CHECK 6]: Direct MongoDB document verification');
    const dbDoc = await Product.findById(createdId);
    if (!dbDoc) throw new Error('Product document not found in MongoDB!');
    console.log(`   - MongoDB document verified: [${dbDoc._id}] "${dbDoc.name}"`);
    console.log(`   - Verified MongoDB category: "${dbDoc.category}" | Brand: "${dbDoc.brand}" | Active: ${dbDoc.isActive}`);
    console.log('   ✅ Direct MongoDB persistence verified.\n');

    // -------------------------------------------------------------------------
    // 7 & 8. Confirm appears in Public Marketplace with MongoDB Price
    // -------------------------------------------------------------------------
    console.log('▶ [CHECK 7 & 8]: Public Marketplace verification');
    const publicMarketplaceRes = await makeRequest({
      method: 'GET',
      path: '/api/products',
    });

    console.log(`   - Public Marketplace total products: ${publicMarketplaceRes.body.count}`);
    if (publicMarketplaceRes.body.count !== 1) throw new Error('Marketplace must show 1 product');

    const marketProduct = publicMarketplaceRes.body.products[0];
    if (marketProduct.price !== 225.0) throw new Error(`Marketplace price mismatch: expected 225, got ${marketProduct.price}`);
    console.log(`   - Public Marketplace product: "${marketProduct.name}" (Price: ₹${marketProduct.price})`);
    console.log('   ✅ Marketplace sync and MongoDB price verified.\n');

    // -------------------------------------------------------------------------
    // 9 & 10. Edit product price and verify immediate Marketplace update
    // -------------------------------------------------------------------------
    console.log('▶ [CHECK 9 & 10]: Edit selling price and verify dynamic reflection');
    const updatedPrice = 245.5;
    const priceEditRes = await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdId}`,
      body: { price: updatedPrice },
      token: adminToken,
    });

    if (priceEditRes.statusCode !== 200 || priceEditRes.body.product.price !== updatedPrice) {
      throw new Error(`Price update failed: ${JSON.stringify(priceEditRes.body)}`);
    }

    const marketPriceCheck = await makeRequest({
      method: 'GET',
      path: `/api/products/${createdId}`,
    });
    console.log(`   - Updated Price in Public API: ₹${marketPriceCheck.body.product.price}`);
    if (marketPriceCheck.body.product.price !== updatedPrice) {
      throw new Error('Public product detail did not show updated price');
    }
    console.log('   ✅ Price update and instant reflection verified.\n');

    // -------------------------------------------------------------------------
    // 11. Change stock quantity and verify stock status
    // -------------------------------------------------------------------------
    console.log('▶ [CHECK 11]: Update stock quantity and verify stock tracking');
    const stockEditRes = await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdId}`,
      body: { stock: 10 },
      token: adminToken,
    });
    if (stockEditRes.body.product.stock !== 10) throw new Error('Stock update failed');
    console.log(`   - Updated Stock: ${stockEditRes.body.product.stock} (In Stock)`);
    console.log('   ✅ Stock update verified.\n');

    // -------------------------------------------------------------------------
    // 12 & 13. Disable availability and Re-enable toggle
    // -------------------------------------------------------------------------
    console.log('▶ [CHECK 12 & 13]: Product availability toggle (Disable & Re-enable)');
    // A. Disable product
    const disableRes = await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdId}`,
      body: { isActive: false },
      token: adminToken,
    });
    if (disableRes.body.product.isActive !== false) throw new Error('Disable product failed');

    const marketplaceWhenDisabled = await makeRequest({
      method: 'GET',
      path: '/api/products',
    });
    console.log(`   - Public marketplace count when disabled: ${marketplaceWhenDisabled.body.count}`);
    if (marketplaceWhenDisabled.body.count !== 0) {
      throw new Error('Disabled product must NOT be returned to the public marketplace');
    }

    // B. Re-enable product
    const reEnableRes = await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdId}`,
      body: { isActive: true },
      token: adminToken,
    });
    if (reEnableRes.body.product.isActive !== true) throw new Error('Re-enable product failed');

    const marketplaceWhenReEnabled = await makeRequest({
      method: 'GET',
      path: '/api/products',
    });
    console.log(`   - Public marketplace count when re-enabled: ${marketplaceWhenReEnabled.body.count}`);
    if (marketplaceWhenReEnabled.body.count !== 1) {
      throw new Error('Re-enabled product must be visible again');
    }
    console.log('   ✅ Availability toggle (Disable & Re-enable) verified.\n');

    // -------------------------------------------------------------------------
    // SECURITY TESTS: Verify Role Permissions
    // -------------------------------------------------------------------------
    console.log('▶ [SECURITY]: Verify unauthorized roles cannot manage products');
    // Farmer Account
    const farmerUser = await User.create({
      name: 'Verify Farmer',
      email: 'test.farmer.verify@agrimart.com',
      phone: '9988776655',
      password: 'Password123',
      role: 'FARMER',
    });
    const farmerLogin = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: '9988776655', password: 'Password123' },
    });
    const farmerToken = farmerLogin.body.token;

    // Delivery Boy Account
    const deliveryUser = await User.create({
      name: 'Verify Delivery',
      email: 'test.delivery.verify@agrimart.com',
      phone: '9988776666',
      password: 'Password123',
      role: 'DELIVERY_BOY',
    });
    const deliveryLogin = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { identifier: '9988776666', password: 'Password123' },
    });
    const deliveryToken = deliveryLogin.body.token;

    // Farmer tests
    const farmerCreate = await makeRequest({ method: 'POST', path: '/api/products', body: testProductData, token: farmerToken });
    const farmerUpdate = await makeRequest({ method: 'PUT', path: `/api/products/${createdId}`, body: { price: 1 }, token: farmerToken });
    const farmerDelete = await makeRequest({ method: 'DELETE', path: `/api/products/${createdId}`, token: farmerToken });

    if (farmerCreate.statusCode !== 403 || farmerUpdate.statusCode !== 403 || farmerDelete.statusCode !== 403) {
      throw new Error(`Farmer authorization violation: create=${farmerCreate.statusCode}, update=${farmerUpdate.statusCode}, delete=${farmerDelete.statusCode}`);
    }
    console.log('   - Farmer: All CRUD operations blocked with 403 Forbidden.');

    // Delivery Boy tests
    const deliveryCreate = await makeRequest({ method: 'POST', path: '/api/products', body: testProductData, token: deliveryToken });
    const deliveryUpdate = await makeRequest({ method: 'PUT', path: `/api/products/${createdId}`, body: { price: 1 }, token: deliveryToken });
    const deliveryDelete = await makeRequest({ method: 'DELETE', path: `/api/products/${createdId}`, token: deliveryToken });

    if (deliveryCreate.statusCode !== 403 || deliveryUpdate.statusCode !== 403 || deliveryDelete.statusCode !== 403) {
      throw new Error(`Delivery Boy authorization violation: create=${deliveryCreate.statusCode}, update=${deliveryUpdate.statusCode}, delete=${deliveryDelete.statusCode}`);
    }
    console.log('   - Delivery Boy: All CRUD operations blocked with 403 Forbidden.');

    // Unauthenticated test
    const anonDelete = await makeRequest({ method: 'DELETE', path: `/api/products/${createdId}` });
    if (anonDelete.statusCode !== 401) {
      throw new Error(`Unauthenticated request returned ${anonDelete.statusCode}, expected 401`);
    }
    console.log('   - Unauthenticated: Blocked with 401 Unauthorized.');
    console.log('   ✅ All security authorization checks PASSED.\n');

    // -------------------------------------------------------------------------
    // 14, 15, 16. Delete product and confirm 0 remaining products
    // -------------------------------------------------------------------------
    console.log('▶ [CHECK 14, 15, 16]: Delete test product & confirm zero state');
    const deleteRes = await makeRequest({
      method: 'DELETE',
      path: `/api/products/${createdId}`,
      token: adminToken,
    });
    if (deleteRes.statusCode !== 200) throw new Error('Product deletion failed');

    const finalMongoCount = await Product.countDocuments({});
    console.log(`   - Final MongoDB Product Count: ${finalMongoCount}`);
    if (finalMongoCount !== 0) throw new Error(`Expected 0 products in MongoDB, found ${finalMongoCount}`);

    const finalMarketplace = await makeRequest({
      method: 'GET',
      path: '/api/products',
    });
    console.log(`   - Final Public Marketplace Product Count: ${finalMarketplace.body.count}`);
    if (finalMarketplace.body.count !== 0) throw new Error('Marketplace must return 0 products');

    // Clean up temporary test users
    await User.deleteMany({
      email: { $in: ['test.farmer.verify@agrimart.com', 'test.delivery.verify@agrimart.com'] },
    });

    console.log('   ✅ Product deletion verified. Database and marketplace returned to 0 products.\n');

    console.log('================================================================');
    console.log('🎉 COMPLETE 16-POINT ADMIN VERIFICATION SUITE PASSED!           ');
    console.log('================================================================');

  } catch (err) {
    console.error('\n❌ VERIFICATION SUITE FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    // Ensure cleanup of any leftover test products
    await Product.deleteMany({});
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
};

runFinalAdminVerification();
