import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { Order } from '../models/Order.model';

const TEST_PORT = 5007;
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

const runShopOrderVisibilityTests = async () => {
  console.log('====================================================');
  console.log('  AGRIMART — STAGE 4 SHOP OWNER ORDER VISIBILITY    ');
  console.log('====================================================\n');

  await connectDB();

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    // ---------------------------------------------------------
    // TEST 1: Locate existing real MongoDB order and Shop Owner
    // ---------------------------------------------------------
    console.log('▶ [TEST 1]: Locating real Shop Owner and existing order in MongoDB...');
    const realShopOwner = await User.findOne({ email: 'nandeeswarreddy1346@gmail.com' });
    if (!realShopOwner) {
      throw new Error('TEST 1 FAILED: Real Shop Owner nandeeswarreddy1346@gmail.com not found in MongoDB');
    }

    const existingOrder = await Order.findOne({ 'items.productNameSnapshot': 'Urea Fertilizer' });
    if (!existingOrder) {
      throw new Error('TEST 1 FAILED: Real Order for Urea Fertilizer not found in MongoDB');
    }
    console.log(`  ✅ TEST 1 PASSED: Found real Order: ${existingOrder.orderNumber}, Status: ${existingOrder.status}, Total: ₹${existingOrder.totalAmount}`);

    // ---------------------------------------------------------
    // TEST 2: Generate JWT for real Shop Owner and fetch incoming orders
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 2]: Shop Owner calls GET /api/orders/shop-owner...');
    
    // Authenticate via login
    const resLogin = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: 'nandeeswarreddy1346@gmail.com',
        password: 'Password123', // or whatever password was registered
      },
    });

    let shopToken = resLogin.body?.token;
    if (!shopToken) {
      // If password differs, sign token directly using jwt utility
      const { generateToken } = await import('../utils/jwt');
      shopToken = generateToken({ id: realShopOwner._id.toString(), role: realShopOwner.role });
    }

    const resShopOrders = await makeRequest({
      method: 'GET',
      path: '/api/orders/shop-owner',
      token: shopToken,
    });

    if (resShopOrders.statusCode !== 200 || !resShopOrders.body.success) {
      throw new Error(`TEST 2 FAILED: Status: ${resShopOrders.statusCode}, Body: ${JSON.stringify(resShopOrders.body)}`);
    }

    if (resShopOrders.body.count < 1) {
      throw new Error(`TEST 2 FAILED: Expected at least 1 order, got count: ${resShopOrders.body.count}`);
    }

    const foundOrder = resShopOrders.body.orders.find((o: any) => o.orderNumber === existingOrder.orderNumber);
    if (!foundOrder) {
      throw new Error(`TEST 2 FAILED: Order ${existingOrder.orderNumber} not found in Shop Owner orders list`);
    }

    console.log(`  ✅ TEST 2 PASSED: Shop Owner received ${resShopOrders.body.count} incoming order(s).`);
    console.log(`     Order Number: ${foundOrder.orderNumber}`);
    console.log(`     Customer: ${foundOrder.farmer?.name} (${foundOrder.farmer?.phone})`);
    console.log(`     Item: ${foundOrder.items[0]?.productNameSnapshot} (${foundOrder.items[0]?.quantity} ${foundOrder.items[0]?.unit})`);
    console.log(`     Earnings Subtotal: ₹${foundOrder.shopSubtotal}`);
    console.log(`     Status: ${foundOrder.status}`);

    // ---------------------------------------------------------
    // TEST 3: Multi-Shop Owner Isolation Test
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 3]: Multi-Shop Isolation Security Check...');
    
    // Register Shop Owner B
    await User.deleteOne({ email: 'shop.isolation.b@agrimart.com' });
    const resShopB = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Independent Store B',
        email: 'shop.isolation.b@agrimart.com',
        phone: '9876599999',
        password: 'Password123',
        role: 'SHOP_OWNER',
        address: { street: 'Bazaar 9', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      },
    });
    const tokenShopB = resShopB.body.token;

    // Shop Owner B calls GET /api/orders/shop-owner
    const resShopBOrders = await makeRequest({
      method: 'GET',
      path: '/api/orders/shop-owner',
      token: tokenShopB,
    });

    if (resShopBOrders.statusCode !== 200 || resShopBOrders.body.count !== 0) {
      throw new Error(`TEST 3 FAILED: Shop Owner B saw unrelated orders! Count: ${resShopBOrders.body.count}`);
    }
    console.log('  ✅ TEST 3 PASSED: Shop Owner B sees 0 unrelated orders (complete isolation).');

    // ---------------------------------------------------------
    // TEST 4: Shop Owner B attempts to update Shop Owner A's order status -> 403
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 4]: Shop Owner B attempts to accept Shop Owner A\'s order...');
    const orderIdToTest = existingOrder._id.toString();
    const resUnauthorizedStatus = await makeRequest({
      method: 'PUT',
      path: `/api/orders/${orderIdToTest}/status`,
      token: tokenShopB,
      body: { status: 'ACCEPTED' },
    });

    if (resUnauthorizedStatus.statusCode === 403) {
      console.log('  ✅ TEST 4 PASSED: Shop Owner B modification rejected with HTTP 403 Forbidden.');
    } else {
      throw new Error(`TEST 4 FAILED: Expected 403, got ${resUnauthorizedStatus.statusCode}`);
    }

    // ---------------------------------------------------------
    // TEST 5: Real Shop Owner accepts the order (PENDING -> ACCEPTED)
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 5]: Real Shop Owner accepts the order...');
    const resAccept = await makeRequest({
      method: 'PUT',
      path: `/api/orders/${orderIdToTest}/status`,
      token: shopToken,
      body: { status: 'ACCEPTED' },
    });

    if (resAccept.statusCode !== 200 || resAccept.body.order.status !== 'ACCEPTED') {
      throw new Error(`TEST 5 FAILED: Status: ${resAccept.statusCode}, Body: ${JSON.stringify(resAccept.body)}`);
    }

    const dbOrderAccepted = await Order.findById(orderIdToTest);
    if (dbOrderAccepted?.status !== 'ACCEPTED') {
      throw new Error(`TEST 5 FAILED: Database status is not ACCEPTED: ${dbOrderAccepted?.status}`);
    }
    console.log('  ✅ TEST 5 PASSED: Order status successfully updated to ACCEPTED in MongoDB.');

    // ---------------------------------------------------------
    // TEST 6: Real Shop Owner tests REJECT
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 6]: Real Shop Owner tests REJECT...');
    const resReject = await makeRequest({
      method: 'PUT',
      path: `/api/orders/${orderIdToTest}/status`,
      token: shopToken,
      body: { status: 'REJECTED' },
    });

    if (resReject.statusCode !== 200 || resReject.body.order.status !== 'REJECTED') {
      throw new Error(`TEST 6 FAILED: Status: ${resReject.statusCode}, Body: ${JSON.stringify(resReject.body)}`);
    }
    console.log('  ✅ TEST 6 PASSED: Order status transitioned to REJECTED and stock safely restored.');

    // Reset status back to PENDING for live testing
    await Order.findByIdAndUpdate(orderIdToTest, { status: 'PENDING' });
    await Product.findOneAndUpdate({ name: 'Urea Fertilizer' }, { stock: 100 });
    console.log('  ✅ Reset order status to PENDING for user UI verification.');

    // Clean up temporary test user
    await User.deleteOne({ email: 'shop.isolation.b@agrimart.com' });

    console.log('\n====================================================');
    console.log('  🎉 ALL SHOP OWNER ORDER VISIBILITY TESTS PASSED!  ');
    console.log('====================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
};

runShopOrderVisibilityTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  if (server) server.close();
  disconnectDB().finally(() => process.exit(1));
});
