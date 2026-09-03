import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { Cart } from '../models/Cart.model';
import { Order } from '../models/Order.model';

const TEST_PORT = 5006;
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

const runAllStage4Tests = async () => {
  console.log('====================================================');
  console.log('   AGRIMART — STAGE 4 CART & REAL ORDER TESTS       ');
  console.log('====================================================\n');

  await connectDB();

  // Clean previous test data
  await User.deleteMany({
    email: {
      $in: [
        'shop4.a@agrimart.com',
        'shop4.b@agrimart.com',
        'farmer4.a@agrimart.com',
        'farmer4.b@agrimart.com',
      ],
    },
  });

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  let farmerAToken = '';
  let farmerBToken = '';
  let shopAToken = '';
  let shopBToken = '';
  let ureaProductId = '';
  let initialUreaStock = 100;
  let testOrderId = '';

  try {
    // ---------------------------------------------------------
    // SETUP: Register Shop Owners and Farmers, Locate Urea Fertilizer
    // ---------------------------------------------------------
    console.log('▶ [SETUP]: Registering Shop Owners & Farmers...');

    const resShopA = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Kisan Kendra Shop A',
        email: 'shop4.a@agrimart.com',
        phone: '9876540001',
        password: 'Password123',
        role: 'SHOP_OWNER',
        address: { street: 'Main Market 1', city: 'Nagpur', state: 'Maharashtra', pincode: '440001' },
      },
    });
    shopAToken = resShopA.body.token;

    const resShopB = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Green Agro Store B',
        email: 'shop4.b@agrimart.com',
        phone: '9876540002',
        password: 'Password123',
        role: 'SHOP_OWNER',
        address: { street: 'Bazaar Road 2', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      },
    });
    shopBToken = resShopB.body.token;

    const resFarmerA = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Ramesh Kisan',
        email: 'farmer4.a@agrimart.com',
        phone: '9876540003',
        password: 'Password123',
        role: 'FARMER',
        address: { street: 'Farm Sector 10', city: 'Nagpur', state: 'Maharashtra', pincode: '440023' },
      },
    });
    farmerAToken = resFarmerA.body.token;

    const resFarmerB = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Suresh Farmer B',
        email: 'farmer4.b@agrimart.com',
        phone: '9876540004',
        password: 'Password123',
        role: 'FARMER',
        address: { street: 'Village Road 5', city: 'Wardha', state: 'Maharashtra', pincode: '442001' },
      },
    });
    farmerBToken = resFarmerB.body.token;

    // Ensure Urea Fertilizer exists in MongoDB
    let urea = await Product.findOne({ name: 'Urea Fertilizer' });
    if (!urea) {
      urea = await Product.create({
        name: 'Urea Fertilizer',
        description: 'High nitrogen 46% prilled urea for vegetative crop growth.',
        category: 'Fertilizers',
        brand: 'IFFCO',
        price: 266.50,
        unit: '45kg bag',
        stock: 100,
        images: ['https://example.com/urea.jpg'],
        shopOwner: resShopA.body.user.id || resShopA.body.user._id,
      });
    } else {
      urea.shopOwner = resShopA.body.user.id || resShopA.body.user._id;
      urea.stock = 100;
      await urea.save();
    }
    ureaProductId = urea._id.toString();
    initialUreaStock = urea.stock;

    console.log(`  ✅ SETUP PASSED: Verified Urea Fertilizer in MongoDB with ID: ${ureaProductId}, Stock: ${initialUreaStock}\n`);

    // ---------------------------------------------------------
    // TEST 1: Farmer opens Urea Fertilizer product details
    // ---------------------------------------------------------
    console.log('▶ [TEST 1]: Farmer opens Urea Fertilizer details (GET /api/products/:id)...');
    const resT1 = await makeRequest({
      method: 'GET',
      path: `/api/products/${ureaProductId}`,
      token: farmerAToken,
    });
    if (resT1.statusCode !== 200 || resT1.body.product.name !== 'Urea Fertilizer') {
      throw new Error(`TEST 1 FAILED: Status: ${resT1.statusCode}`);
    }
    console.log(`  ✅ TEST 1 PASSED: Retrieved product "${resT1.body.product.name}", price: ₹${resT1.body.product.price}`);

    // ---------------------------------------------------------
    // TEST 2: Farmer adds quantity 1 to cart
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 2]: Add quantity 1 to Cart (POST /api/cart/items)...');
    const resT2 = await makeRequest({
      method: 'POST',
      path: '/api/cart/items',
      token: farmerAToken,
      body: { productId: ureaProductId, quantity: 1 },
    });
    if (resT2.statusCode !== 200 || !resT2.body.success) {
      throw new Error(`TEST 2 FAILED: Status: ${resT2.statusCode}, Body: ${JSON.stringify(resT2.body)}`);
    }
    const cartDbT2 = await Cart.findOne({ farmer: resFarmerA.body.user.id || resFarmerA.body.user._id });
    if (!cartDbT2 || cartDbT2.items.length !== 1 || cartDbT2.items[0].quantity !== 1) {
      throw new Error(`TEST 2 FAILED: MongoDB cart mismatch: ${JSON.stringify(cartDbT2)}`);
    }
    console.log('  ✅ TEST 2 PASSED: Quantity 1 added and verified in MongoDB Cart.');

    // ---------------------------------------------------------
    // TEST 3: Cart shows exactly 1 item
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 3]: Fetch Cart (GET /api/cart)...');
    const resT3 = await makeRequest({
      method: 'GET',
      path: '/api/cart',
      token: farmerAToken,
    });
    if (resT3.statusCode !== 200 || resT3.body.cart.totalItems !== 1 || resT3.body.cart.items.length !== 1) {
      throw new Error(`TEST 3 FAILED: Cart items count mismatch: ${JSON.stringify(resT3.body)}`);
    }
    console.log(`  ✅ TEST 3 PASSED: Cart displays exactly 1 item: "${resT3.body.cart.items[0].product.name}"`);

    // ---------------------------------------------------------
    // TEST 4 & 5: Increase quantity to 5 and verify total calculation
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 4 & 5]: Update quantity to 5 and verify real total calculation...');
    const resT4 = await makeRequest({
      method: 'PUT',
      path: `/api/cart/items/${ureaProductId}`,
      token: farmerAToken,
      body: { quantity: 5 },
    });
    if (resT4.statusCode !== 200 || resT4.body.cart.totalItems !== 5) {
      throw new Error(`TEST 4 FAILED: Status: ${resT4.statusCode}`);
    }
    const expectedTotal5 = 5 * 266.50;
    if (Math.abs(resT4.body.cart.total - expectedTotal5) > 0.01) {
      throw new Error(`TEST 5 FAILED: Expected total ₹${expectedTotal5}, got ₹${resT4.body.cart.total}`);
    }
    console.log(`  ✅ TEST 4 & 5 PASSED: Quantity updated to 5. Subtotal: ₹${resT4.body.cart.total} (5 × ₹266.50)`);

    // ---------------------------------------------------------
    // TEST 6: Decrease quantity to 2
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 6]: Decrease quantity to 2...');
    const resT6 = await makeRequest({
      method: 'PUT',
      path: `/api/cart/items/${ureaProductId}`,
      token: farmerAToken,
      body: { quantity: 2 },
    });
    if (resT6.statusCode !== 200 || resT6.body.cart.totalItems !== 2) {
      throw new Error(`TEST 6 FAILED: Status: ${resT6.statusCode}`);
    }
    console.log(`  ✅ TEST 6 PASSED: Quantity decreased to 2. Subtotal: ₹${resT6.body.cart.total}`);

    // ---------------------------------------------------------
    // TEST 7: Remove product from cart
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 7]: Remove product from Cart (DELETE /api/cart/items/:productId)...');
    const resT7 = await makeRequest({
      method: 'DELETE',
      path: `/api/cart/items/${ureaProductId}`,
      token: farmerAToken,
    });
    if (resT7.statusCode !== 200 || resT7.body.cart.items.length !== 0) {
      throw new Error(`TEST 7 FAILED: Item not removed: ${JSON.stringify(resT7.body)}`);
    }
    console.log('  ✅ TEST 7 PASSED: Product removed from cart, cart is now empty.');

    // ---------------------------------------------------------
    // TEST 8: Add product again with quantity 10
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 8]: Add Urea Fertilizer again with quantity 10...');
    const resT8 = await makeRequest({
      method: 'POST',
      path: '/api/cart/items',
      token: farmerAToken,
      body: { productId: ureaProductId, quantity: 10 },
    });
    if (resT8.statusCode !== 200 || resT8.body.cart.totalItems !== 10) {
      throw new Error(`TEST 8 FAILED: Status: ${resT8.statusCode}`);
    }
    console.log('  ✅ TEST 8 PASSED: Re-added product with quantity 10.');

    // ---------------------------------------------------------
    // TEST 9 & 10 & 11: Place Order and verify MongoDB Order document
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 9, 10, 11]: Checkout and Place Order (POST /api/orders)...');
    const resT10 = await makeRequest({
      method: 'POST',
      path: '/api/orders',
      token: farmerAToken,
      body: {
        deliveryAddress: {
          street: 'Kisan Farm Road 12',
          city: 'Nagpur',
          state: 'Maharashtra',
          pincode: '440023',
        },
      },
    });
    if (resT10.statusCode !== 201 || !resT10.body.success) {
      throw new Error(`TEST 10 FAILED: Status: ${resT10.statusCode}, Body: ${JSON.stringify(resT10.body)}`);
    }
    const createdOrder = resT10.body.order;
    testOrderId = createdOrder.id || createdOrder._id;

    // Verify in MongoDB
    const orderInDb = await Order.findById(testOrderId);
    if (!orderInDb || orderInDb.items[0].quantity !== 10 || orderInDb.totalAmount !== (10 * 266.50)) {
      throw new Error(`TEST 11 FAILED: Order not found or incorrect in DB: ${JSON.stringify(orderInDb)}`);
    }
    console.log(`  ✅ TEST 9, 10, 11 PASSED: Order created in MongoDB with Number: ${orderInDb.orderNumber}, Total: ₹${orderInDb.totalAmount}`);

    // ---------------------------------------------------------
    // TEST 12: Verify Cart is cleared after order creation
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 12]: Verify Farmer Cart is cleared...');
    const resT12 = await makeRequest({
      method: 'GET',
      path: '/api/cart',
      token: farmerAToken,
    });
    if (resT12.body.cart.items.length !== 0 || resT12.body.cart.totalItems !== 0) {
      throw new Error(`TEST 12 FAILED: Cart was not cleared: ${JSON.stringify(resT12.body)}`);
    }
    console.log('  ✅ TEST 12 PASSED: Farmer Cart is completely cleared (0 items).');

    // ---------------------------------------------------------
    // TEST 13: Verify Product stock in MongoDB is decreased accurately (100 - 10 = 90)
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 13]: Verify product stock decreased in MongoDB...');
    const updatedUreaDb = await Product.findById(ureaProductId);
    if (!updatedUreaDb || updatedUreaDb.stock !== (initialUreaStock - 10)) {
      throw new Error(`TEST 13 FAILED: Expected stock ${initialUreaStock - 10}, got ${updatedUreaDb?.stock}`);
    }
    console.log(`  ✅ TEST 13 PASSED: Stock safely decremented from ${initialUreaStock} to ${updatedUreaDb.stock} in MongoDB.`);

    // ---------------------------------------------------------
    // TEST 14: Farmer sees the order in My Orders
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 14]: Farmer retrieves My Orders (GET /api/orders)...');
    const resT14 = await makeRequest({
      method: 'GET',
      path: '/api/orders',
      token: farmerAToken,
    });
    if (resT14.statusCode !== 200 || resT14.body.count < 1) {
      throw new Error(`TEST 14 FAILED: Status: ${resT14.statusCode}`);
    }
    console.log(`  ✅ TEST 14 PASSED: Farmer views order list containing ${resT14.body.count} order(s).`);

    // ---------------------------------------------------------
    // TEST 15: Shop Owner sees the order
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 15]: Shop Owner retrieves store orders (GET /api/orders/shop-owner)...');
    const resT15 = await makeRequest({
      method: 'GET',
      path: '/api/orders/shop-owner',
      token: shopAToken,
    });
    if (resT15.statusCode !== 200 || resT15.body.count < 1) {
      throw new Error(`TEST 15 FAILED: Shop Owner orders not returned: ${JSON.stringify(resT15.body)}`);
    }
    console.log(`  ✅ TEST 15 PASSED: Shop Owner views incoming order for Urea Fertilizer with subtotal ₹${resT15.body.orders[0].shopSubtotal}.`);

    // ---------------------------------------------------------
    // TEST 16 & 17: Shop Owner accepts order -> Farmer sees ACCEPTED status
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 16 & 17]: Shop Owner accepts order...');
    const resT16 = await makeRequest({
      method: 'PUT',
      path: `/api/orders/${testOrderId}/status`,
      token: shopAToken,
      body: { status: 'ACCEPTED' },
    });
    if (resT16.statusCode !== 200 || resT16.body.order.status !== 'ACCEPTED') {
      throw new Error(`TEST 16 FAILED: Status: ${resT16.statusCode}, Body: ${JSON.stringify(resT16.body)}`);
    }
    const resT17 = await makeRequest({
      method: 'GET',
      path: `/api/orders/${testOrderId}`,
      token: farmerAToken,
    });
    if (resT17.statusCode !== 200 || resT17.body.order.status !== 'ACCEPTED') {
      throw new Error(`TEST 17 FAILED: Farmer did not see ACCEPTED status: ${JSON.stringify(resT17.body)}`);
    }
    console.log('  ✅ TEST 16 & 17 PASSED: Order status transitioned to ACCEPTED and verified by Farmer.');

    // ---------------------------------------------------------
    // TEST 18: Shop Owner rejection and stock restoration
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 18]: Shop Owner rejects order -> verifies stock restoration...');
    const stockBeforeReject = (await Product.findById(ureaProductId))?.stock || 0;
    const resT18 = await makeRequest({
      method: 'PUT',
      path: `/api/orders/${testOrderId}/status`,
      token: shopAToken,
      body: { status: 'REJECTED' },
    });
    if (resT18.statusCode !== 200 || resT18.body.order.status !== 'REJECTED') {
      throw new Error(`TEST 18 FAILED: Status: ${resT18.statusCode}`);
    }
    const stockAfterReject = (await Product.findById(ureaProductId))?.stock || 0;
    if (stockAfterReject !== stockBeforeReject + 10) {
      throw new Error(`TEST 18 FAILED: Stock not restored on rejection! Before: ${stockBeforeReject}, After: ${stockAfterReject}`);
    }
    console.log(`  ✅ TEST 18 PASSED: Order rejected and 10 units of stock restored in MongoDB (now: ${stockAfterReject}).`);

    // ---------------------------------------------------------
    // TEST 19: Test invalid quantity (quantity > available stock)
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 19]: Add quantity exceeding available stock (e.g. 500 units)...');
    const resT19 = await makeRequest({
      method: 'POST',
      path: '/api/cart/items',
      token: farmerAToken,
      body: { productId: ureaProductId, quantity: 500 },
    });
    if (resT19.statusCode === 400 && resT19.body.message.includes('Requested quantity exceeds available stock')) {
      console.log('  ✅ TEST 19 PASSED: Excessive quantity rejected with HTTP 400 and clear error message.');
    } else {
      throw new Error(`TEST 19 FAILED: Expected 400, got: ${resT19.statusCode}, body: ${JSON.stringify(resT19.body)}`);
    }

    // ---------------------------------------------------------
    // TEST 20: Test Out of Stock product (stock = 0)
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 20]: Test adding Out of Stock product...');
    const zeroStockProduct = await Product.create({
      name: 'Zero Stock Test Seed',
      description: 'Seed with 0 stock',
      category: 'Seeds',
      brand: 'TestBrand',
      price: 150,
      unit: 'packet',
      stock: 0,
      shopOwner: resShopA.body.user.id || resShopA.body.user._id,
    });
    const resT20 = await makeRequest({
      method: 'POST',
      path: '/api/cart/items',
      token: farmerAToken,
      body: { productId: zeroStockProduct._id.toString(), quantity: 1 },
    });
    if (resT20.statusCode === 400 && resT20.body.message.includes('Out of Stock')) {
      console.log('  ✅ TEST 20 PASSED: Out of Stock product rejected with HTTP 400.');
    } else {
      throw new Error(`TEST 20 FAILED: Expected 400 Out of Stock, got: ${resT20.statusCode}`);
    }
    await Product.findByIdAndDelete(zeroStockProduct._id);

    // ---------------------------------------------------------
    // TEST 21: Security - Farmer A cannot access Farmer B's order
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 21]: Security check - Farmer B attempts to view Farmer A\'s order...');
    const resT21 = await makeRequest({
      method: 'GET',
      path: `/api/orders/${testOrderId}`,
      token: farmerBToken,
    });
    if (resT21.statusCode === 403) {
      console.log('  ✅ TEST 21 PASSED: Farmer B rejected with HTTP 403 Forbidden.');
    } else {
      throw new Error(`TEST 21 FAILED: Expected 403, got ${resT21.statusCode}`);
    }

    // ---------------------------------------------------------
    // TEST 22: Security - Shop Owner B cannot modify Shop Owner A's order
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 22]: Security check - Shop Owner B attempts to accept Shop Owner A\'s order...');
    const resT22 = await makeRequest({
      method: 'PUT',
      path: `/api/orders/${testOrderId}/status`,
      token: shopBToken,
      body: { status: 'ACCEPTED' },
    });
    if (resT22.statusCode === 403) {
      console.log('  ✅ TEST 22 PASSED: Shop Owner B rejected with HTTP 403 Forbidden.');
    } else {
      throw new Error(`TEST 22 FAILED: Expected 403, got ${resT22.statusCode}`);
    }

    console.log('\n====================================================');
    console.log('    🎉 ALL 22 STAGE 4 TESTS PASSED SUCCESSFULLY!    ');
    console.log('====================================================\n');
  } finally {
    // Clean up test data and restore Urea Fertilizer to clean state
    await User.deleteMany({
      email: {
        $in: [
          'shop4.a@agrimart.com',
          'shop4.b@agrimart.com',
          'farmer4.a@agrimart.com',
          'farmer4.b@agrimart.com',
        ],
      },
    });
    await Order.deleteMany({
      orderNumber: { $regex: '^AGM-' },
    });
    if (ureaProductId) {
      await Cart.deleteMany({});
      const realOwner = await User.findOne({ email: 'nandeeswarreddy1346@gmail.com' });
      await Product.findByIdAndUpdate(ureaProductId, {
        stock: 100,
        ...(realOwner ? { shopOwner: realOwner._id } : {}),
      });
    }
    server.close();
    await disconnectDB();
  }
};

runAllStage4Tests().catch((err) => {
  console.error('\n❌ Stage 4 Test Suite Failed:', err);
  if (server) server.close();
  disconnectDB().finally(() => process.exit(1));
});
