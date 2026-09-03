import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';

const TEST_PORT = 5003;
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

const runAllStage3Tests = async () => {
  console.log('====================================================');
  console.log('  AGRIMART — STAGE 3 PRODUCTS & MARKETPLACE TESTS   ');
  console.log('====================================================\n');

  await connectDB();

  // Clear previous test users and products
  await User.deleteMany({
    email: {
      $in: [
        'shopA.test@agrimart.com',
        'shopB.test@agrimart.com',
        'farmer.market@agrimart.com',
      ],
    },
  });
  await Product.deleteMany({
    name: {
      $in: [
        'IFFCO NPK 19-19-19 Fertilizer',
        'Bayer Confidor Insecticide',
        'Shop B Organic Compost',
      ],
    },
  });

  server = app.listen(TEST_PORT);
  console.log(`🧪 Stage 3 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    // ---------------------------------------------------------
    // SETUP: Register Shop Owner A, Shop Owner B, and Farmer
    // ---------------------------------------------------------
    console.log('▶ [SETUP]: Registering Shop Owner A, Shop Owner B, and Farmer...');
    
    // Register Shop Owner A
    const resRegShopA = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Kisan Agro Kendra',
        email: 'shopA.test@agrimart.com',
        phone: '9876543201',
        password: 'Password123',
        role: 'SHOP_OWNER',
        address: { street: 'Main Market 1', city: 'Nagpur', state: 'Maharashtra', pincode: '440001' },
      },
    });
    const tokenShopA = resRegShopA.body.token;

    // Register Shop Owner B
    const resRegShopB = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Green Agro Store',
        email: 'shopB.test@agrimart.com',
        phone: '9876543202',
        password: 'Password123',
        role: 'SHOP_OWNER',
        address: { street: 'Bazaar Road 5', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      },
    });
    const tokenShopB = resRegShopB.body.token;

    // Register Farmer
    const resRegFarmer = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Suresh Kisan',
        email: 'farmer.market@agrimart.com',
        phone: '9876543203',
        password: 'Password123',
        role: 'FARMER',
        address: { street: 'Village Farm 9', city: 'Wardha', state: 'Maharashtra', pincode: '442001' },
      },
    });
    const tokenFarmer = resRegFarmer.body.token;

    console.log('  ✅ SETUP PASSED: Registered Shop Owner A, Shop Owner B, and Farmer.\n');

    // ---------------------------------------------------------
    // TEST 1: Shop Owner creates product -> Verified in MongoDB
    // ---------------------------------------------------------
    console.log('▶ [TEST 1]: Shop Owner creates product...');
    const resCreateProd = await makeRequest({
      method: 'POST',
      path: '/api/products',
      token: tokenShopA,
      body: {
        name: 'IFFCO NPK 19-19-19 Fertilizer',
        description: 'Water-soluble balanced grade 19:19:19 fertilizer for drip and foliar application.',
        category: 'Fertilizers',
        brand: 'IFFCO',
        price: 1250.00,
        unit: '25kg bag',
        stock: 50,
        image: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=600',
      },
    });

    if (resCreateProd.statusCode !== 201 || !resCreateProd.body.success) {
      throw new Error(`TEST 1 FAILED. Status: ${resCreateProd.statusCode}, Body: ${JSON.stringify(resCreateProd.body)}`);
    }

    const createdProductId = resCreateProd.body.product.id || resCreateProd.body.product._id;
    const dbProduct = await Product.findById(createdProductId);

    if (dbProduct && dbProduct.name === 'IFFCO NPK 19-19-19 Fertilizer' && dbProduct.price === 1250.00 && dbProduct.stock === 50) {
      console.log('  ✅ TEST 1 PASSED: Product created and verified in MongoDB with ID:', dbProduct._id.toString());
      console.log(`     Price: ₹${dbProduct.price}, Stock: ${dbProduct.stock} ${dbProduct.unit}`);
    } else {
      throw new Error('TEST 1 FAILED: Product not found or mismatch in MongoDB');
    }

    // ---------------------------------------------------------
    // TEST 2: Edit product price -> Verify MongoDB changed
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 2]: Edit product price...');
    const resEditPrice = await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdProductId}`,
      token: tokenShopA,
      body: {
        price: 1350.50,
      },
    });

    if (resEditPrice.statusCode !== 200 || !resEditPrice.body.success) {
      throw new Error(`TEST 2 FAILED. Status: ${resEditPrice.statusCode}, Body: ${JSON.stringify(resEditPrice.body)}`);
    }

    const updatedDbProductPrice = await Product.findById(createdProductId);
    if (updatedDbProductPrice && updatedDbProductPrice.price === 1350.50) {
      console.log(`  ✅ TEST 2 PASSED: Price updated in MongoDB from ₹1250.00 to ₹${updatedDbProductPrice.price}`);
    } else {
      throw new Error(`TEST 2 FAILED: Expected price 1350.50 in MongoDB, got ${updatedDbProductPrice?.price}`);
    }

    // ---------------------------------------------------------
    // TEST 3: Edit product stock -> Verify MongoDB changed
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 3]: Edit product stock...');
    const resEditStock = await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdProductId}`,
      token: tokenShopA,
      body: {
        stock: 75,
      },
    });

    if (resEditStock.statusCode !== 200 || !resEditStock.body.success) {
      throw new Error(`TEST 3 FAILED. Status: ${resEditStock.statusCode}, Body: ${JSON.stringify(resEditStock.body)}`);
    }

    const updatedDbProductStock = await Product.findById(createdProductId);
    if (updatedDbProductStock && updatedDbProductStock.stock === 75) {
      console.log(`  ✅ TEST 3 PASSED: Stock updated in MongoDB from 50 to ${updatedDbProductStock.stock}`);
    } else {
      throw new Error(`TEST 3 FAILED: Expected stock 75 in MongoDB, got ${updatedDbProductStock?.stock}`);
    }

    // ---------------------------------------------------------
    // TEST 4: Login as Farmer -> Open Marketplace -> Verify product appears
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 4]: Farmer opens Marketplace (GET /api/products)...');
    const resMarketplace = await makeRequest({
      method: 'GET',
      path: '/api/products',
      token: tokenFarmer,
    });

    if (resMarketplace.statusCode !== 200 || !resMarketplace.body.success) {
      throw new Error(`TEST 4 FAILED. Status: ${resMarketplace.statusCode}, Body: ${JSON.stringify(resMarketplace.body)}`);
    }

    const foundInMarketplace = resMarketplace.body.products.find(
      (p: any) => (p.id || p._id) === createdProductId
    );

    if (foundInMarketplace && foundInMarketplace.name === 'IFFCO NPK 19-19-19 Fertilizer') {
      console.log('  ✅ TEST 4 PASSED: Product visible in Farmer Marketplace with supplier info:', foundInMarketplace.shopOwner?.name);
    } else {
      throw new Error('TEST 4 FAILED: Product not found in Marketplace response');
    }

    // ---------------------------------------------------------
    // TEST 5: Open Product Details -> Verify displayed price matches MongoDB
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 5]: Open Product Details (GET /api/products/:id)...');
    const resProductDetails = await makeRequest({
      method: 'GET',
      path: `/api/products/${createdProductId}`,
      token: tokenFarmer,
    });

    if (resProductDetails.statusCode !== 200 || !resProductDetails.body.success) {
      throw new Error(`TEST 5 FAILED. Status: ${resProductDetails.statusCode}`);
    }

    if (resProductDetails.body.product.price === 1350.50 && resProductDetails.body.product.stock === 75) {
      console.log(`  ✅ TEST 5 PASSED: Product Details price matches MongoDB exact value: ₹${resProductDetails.body.product.price} / ${resProductDetails.body.product.unit}`);
    } else {
      throw new Error(`TEST 5 FAILED: Price/stock mismatch: ${JSON.stringify(resProductDetails.body.product)}`);
    }

    // Create a second product (Insecticide) for search/filter tests
    await makeRequest({
      method: 'POST',
      path: '/api/products',
      token: tokenShopA,
      body: {
        name: 'Bayer Confidor Insecticide',
        description: 'Imidacloprid 17.8% SL for sucking pests in cotton and chili crops.',
        category: 'Insecticides',
        brand: 'Bayer',
        price: 450.00,
        unit: '250ml bottle',
        stock: 30,
      },
    });

    // ---------------------------------------------------------
    // TEST 6: Search for the product
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 6]: Search marketplace by query (search=Confidor)...');
    const resSearch = await makeRequest({
      method: 'GET',
      path: '/api/products?search=Confidor',
    });

    if (resSearch.statusCode === 200 && resSearch.body.count >= 1 && resSearch.body.products[0].name.includes('Confidor')) {
      console.log('  ✅ TEST 6 PASSED: Search query "Confidor" returned:', resSearch.body.products[0].name);
    } else {
      throw new Error(`TEST 6 FAILED: Search did not return matching product: ${JSON.stringify(resSearch.body)}`);
    }

    // ---------------------------------------------------------
    // TEST 7: Filter by category
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 7]: Filter marketplace by category (category=Fertilizers)...');
    const resFilter = await makeRequest({
      method: 'GET',
      path: '/api/products?category=Fertilizers',
    });

    const allAreFertilizers = resFilter.body.products.every((p: any) => p.category === 'Fertilizers');
    if (resFilter.statusCode === 200 && resFilter.body.count >= 1 && allAreFertilizers) {
      console.log(`  ✅ TEST 7 PASSED: Category filter returned ${resFilter.body.count} Fertilizer products exclusively.`);
    } else {
      throw new Error(`TEST 7 FAILED: Category filtering returned non-matching items: ${JSON.stringify(resFilter.body)}`);
    }

    // ---------------------------------------------------------
    // TEST 8: Set product stock to 0 -> Verify "Out of Stock" (stock: 0)
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 8]: Set product stock to 0...');
    const resStockZero = await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdProductId}`,
      token: tokenShopA,
      body: {
        stock: 0,
      },
    });

    if (resStockZero.statusCode !== 200) {
      throw new Error(`TEST 8 PUT FAILED with status ${resStockZero.statusCode}`);
    }

    const resFarmerCheck = await makeRequest({
      method: 'GET',
      path: `/api/products/${createdProductId}`,
      token: tokenFarmer,
    });

    if (resFarmerCheck.statusCode === 200 && resFarmerCheck.body.product.stock === 0) {
      console.log('  ✅ TEST 8 PASSED: Stock is 0 in MongoDB, displayed as Out of Stock to Farmer.');
    } else {
      throw new Error(`TEST 8 FAILED: Expected stock 0, got ${resFarmerCheck.body.product?.stock}`);
    }

    // ---------------------------------------------------------
    // TEST 9: Login as Farmer -> Attempt to create/edit/delete -> 403 Forbidden
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 9]: Farmer attempts to create/edit/delete product (Authorization check)...');
    const resFarmerCreate = await makeRequest({
      method: 'POST',
      path: '/api/products',
      token: tokenFarmer,
      body: {
        name: 'Unauthorized Farmer Product',
        description: 'Should fail',
        category: 'Seeds',
        price: 100,
        unit: 'kg',
        stock: 10,
      },
    });

    const resFarmerEdit = await makeRequest({
      method: 'PUT',
      path: `/api/products/${createdProductId}`,
      token: tokenFarmer,
      body: { price: 999 },
    });

    const resFarmerDelete = await makeRequest({
      method: 'DELETE',
      path: `/api/products/${createdProductId}`,
      token: tokenFarmer,
    });

    if (resFarmerCreate.statusCode === 403 && resFarmerEdit.statusCode === 403 && resFarmerDelete.statusCode === 403) {
      console.log('  ✅ TEST 9 PASSED: Farmer product modification requests all rejected with HTTP 403 Forbidden.');
    } else {
      throw new Error(`TEST 9 FAILED: Farmer not rejected properly: create=${resFarmerCreate.statusCode}, edit=${resFarmerEdit.statusCode}, del=${resFarmerDelete.statusCode}`);
    }

    // ---------------------------------------------------------
    // TEST 10: Shop Owner A attempts to edit/delete Shop Owner B's product
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 10]: Ownership test - Shop Owner A attempts to modify Shop Owner B\'s product...');
    
    // Create product by Shop Owner B
    const resShopBCreate = await makeRequest({
      method: 'POST',
      path: '/api/products',
      token: tokenShopB,
      body: {
        name: 'Shop B Organic Compost',
        description: 'Rich organic compost prepared by Shop B.',
        category: 'Organic Fertilizers',
        brand: 'GreenBio',
        price: 550.00,
        unit: '50kg bag',
        stock: 40,
      },
    });

    const shopBProductId = resShopBCreate.body.product.id || resShopBCreate.body.product._id;

    // Shop Owner A attempts to edit Shop Owner B's product
    const resShopAEditShopB = await makeRequest({
      method: 'PUT',
      path: `/api/products/${shopBProductId}`,
      token: tokenShopA,
      body: { price: 10.00 },
    });

    // Shop Owner A attempts to delete Shop Owner B's product
    const resShopADelShopB = await makeRequest({
      method: 'DELETE',
      path: `/api/products/${shopBProductId}`,
      token: tokenShopA,
    });

    if (resShopAEditShopB.statusCode === 403 && resShopADelShopB.statusCode === 403) {
      console.log('  ✅ TEST 10 PASSED: Shop Owner A rejected with HTTP 403 Forbidden when attempting to modify Shop Owner B\'s product.');
    } else {
      throw new Error(`TEST 10 FAILED: Ownership isolation failed: edit=${resShopAEditShopB.statusCode}, del=${resShopADelShopB.statusCode}`);
    }

    console.log('\n====================================================');
    console.log('   🎉 ALL 10 STAGE 3 TESTS PASSED SUCCESSFULLY!     ');
    console.log('====================================================\n');
  } finally {
    await User.deleteMany({
      email: {
        $in: [
          'shopA.test@agrimart.com',
          'shopB.test@agrimart.com',
          'farmer.market@agrimart.com',
        ],
      },
    });
    await Product.deleteMany({
      name: {
        $in: [
          'IFFCO NPK 19-19-19 Fertilizer',
          'Bayer Confidor Insecticide',
          'Shop B Organic Compost',
        ],
      },
    });
    server.close();
    await disconnectDB();
  }
};

runAllStage3Tests().catch((err) => {
  console.error('\n❌ Stage 3 Test Suite Failed:', err);
  if (server) server.close();
  disconnectDB().finally(() => process.exit(1));
});
