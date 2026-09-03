import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { Order } from '../models/Order.model';
import { Cart } from '../models/Cart.model';
import { generateToken } from '../utils/jwt';

const TEST_PORT = 5011;
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

const runStage10Tests = async () => {
  console.log('====================================================');
  console.log('  AGRIMART STAGE 10 — RETAIL PARTNER DELIVERY FLOW  ');
  console.log('====================================================\n');

  await connectDB();

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    // 1. Locate Farmer and Retail Partner users
    const farmer = await User.findOne({ role: 'FARMER' });
    const shopOwnerA = await User.findOne({ email: 'nandeeswarreddy1346@gmail.com' });
    let shopOwnerB = await User.findOne({ email: 'shopb.test@agrimart.com' });
    if (!shopOwnerB) {
      shopOwnerB = await User.create({
        name: 'Secondary Shop Owner',
        email: 'shopb.test@agrimart.com',
        phone: '9988776655',
        password: 'Password123!',
        role: 'SHOP_OWNER',
      });
    }

    if (!farmer || !shopOwnerA) {
      throw new Error('Required test users missing in MongoDB');
    }

    const farmerToken = generateToken({ id: farmer._id.toString(), role: farmer.role });
    const shopAToken = generateToken({ id: shopOwnerA._id.toString(), role: shopOwnerA.role });
    const shopBToken = generateToken({ id: shopOwnerB._id.toString(), role: shopOwnerB.role });

    // 2. Locate or create a Product belonging to Shop Owner A
    let productA = await Product.findOne({ shopOwner: shopOwnerA._id });
    if (!productA) {
      productA = await Product.create({
        name: 'Neem Bio-Pesticide',
        category: 'Bio-Fungicides',
        price: 450,
        stock: 50,
        unit: 'bottle (1L)',
        shopOwner: shopOwnerA._id,
      });
    }

    // ---------------------------------------------------------
    // TEST 1: Farmer Places New Order
    // ---------------------------------------------------------
    console.log('▶ [TEST 1]: Farmer places new order...');
    await Cart.findOneAndUpdate(
      { farmer: farmer._id },
      { items: [{ product: productA._id, quantity: 2 }] },
      { upsert: true, new: true }
    );

    const placeOrderRes = await makeRequest({
      method: 'POST',
      path: '/api/orders',
      token: farmerToken,
      body: {
        deliveryAddress: {
          street: 'Plot 45, Agro Nagar',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518002',
        },
      },
    });

    if (placeOrderRes.statusCode !== 201 || !placeOrderRes.body.order) {
      throw new Error(`TEST 1 FAILED: Could not place order: ${JSON.stringify(placeOrderRes.body)}`);
    }

    const createdOrder = placeOrderRes.body.order;
    const orderId = createdOrder._id;
    console.log(`  ✅ TEST 1 PASSED: Order created (#${createdOrder.orderNumber}), status: ${createdOrder.status}`);

    // ---------------------------------------------------------
    // TEST 2: Shop Owner A can see order belonging to their store
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 2]: Shop Owner A sees their own store orders...');
    const shopAOrdersRes = await makeRequest({
      method: 'GET',
      path: '/api/orders/shop-orders',
      token: shopAToken,
    });

    const foundInA = shopAOrdersRes.body.orders?.some((o: any) => o.id === orderId || o._id === orderId);
    if (!foundInA) {
      throw new Error('TEST 2 FAILED: Shop Owner A cannot see incoming order');
    }
    console.log(`  ✅ TEST 2 PASSED: Shop Owner A successfully sees order (#${createdOrder.orderNumber})`);

    // ---------------------------------------------------------
    // TEST 3: Multi-tenant isolation: Shop Owner B CANNOT see Shop Owner A's order
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 3]: Multi-tenant check: Shop Owner B CANNOT see Shop Owner A orders...');
    const shopBOrdersRes = await makeRequest({
      method: 'GET',
      path: '/api/orders/shop-orders',
      token: shopBToken,
    });

    const foundInB = shopBOrdersRes.body.orders?.some((o: any) => o.id === orderId || o._id === orderId);
    if (foundInB) {
      throw new Error('TEST 3 FAILED: Shop Owner B breached tenant boundary and saw Shop Owner A order');
    }

    // Also verify Shop Owner B cannot update Shop Owner A order (403 Forbidden)
    const unauthorizedUpdate = await makeRequest({
      method: 'PATCH',
      path: `/api/orders/${orderId}/status`,
      token: shopBToken,
      body: { status: 'ACCEPTED' },
    });

    if (unauthorizedUpdate.statusCode !== 403) {
      throw new Error(`TEST 3 FAILED: Expected 403 Forbidden for Shop Owner B, got ${unauthorizedUpdate.statusCode}`);
    }
    console.log('  ✅ TEST 3 PASSED: Multi-tenant tenant isolation confirmed & 403 Forbidden enforced');

    // ---------------------------------------------------------
    // TEST 4: Step-by-Step Delivery Status Flow with MongoDB Persistence
    // NEW ORDER -> ACCEPTED -> PREPARING -> READY FOR DELIVERY -> OUT FOR DELIVERY -> DELIVERED
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 4]: Executing full status progression in MongoDB...');
    const workflowStages = [
      { status: 'ACCEPTED', expectedTimeline: 2 },
      { status: 'PREPARING', expectedTimeline: 3 },
      { status: 'READY_FOR_DELIVERY', expectedTimeline: 4 },
      { status: 'OUT_FOR_DELIVERY', expectedTimeline: 5 },
      { status: 'DELIVERED', expectedTimeline: 6 },
    ];

    for (const stage of workflowStages) {
      const updateRes = await makeRequest({
        method: 'PATCH',
        path: `/api/orders/${orderId}/status`,
        token: shopAToken,
        body: { status: stage.status },
      });

      if (updateRes.statusCode !== 200 || updateRes.body.order?.status !== stage.status) {
        throw new Error(`TEST 4 FAILED: Status update to ${stage.status} failed: ${JSON.stringify(updateRes.body)}`);
      }

      // Check DB directly
      const dbOrder = await Order.findById(orderId);
      if (!dbOrder || dbOrder.status !== stage.status) {
        throw new Error(`TEST 4 FAILED: MongoDB status not updated to ${stage.status}`);
      }
      if (dbOrder.statusTimeline.length < stage.expectedTimeline) {
        throw new Error(`TEST 4 FAILED: Timeline entries in MongoDB count is ${dbOrder.statusTimeline.length}, expected >= ${stage.expectedTimeline}`);
      }

      console.log(`  ✓ Stage '${stage.status}' -> Persisted in MongoDB with timeline entry count: ${dbOrder.statusTimeline.length}`);
    }
    console.log('  ✅ TEST 4 PASSED: Complete sequential status flow verified');

    // ---------------------------------------------------------
    // TEST 5: Farmer My Orders verification after refresh
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 5]: Farmer verifies updated order in My Orders...');
    const farmerOrdersRes = await makeRequest({
      method: 'GET',
      path: '/api/orders/my-orders',
      token: farmerToken,
    });

    const myOrder = farmerOrdersRes.body.orders?.find((o: any) => o._id === orderId);
    if (!myOrder || myOrder.status !== 'DELIVERED') {
      throw new Error(`TEST 5 FAILED: Farmer My Orders did not show DELIVERED status. Got: ${myOrder?.status}`);
    }

    if (!myOrder.statusTimeline || myOrder.statusTimeline.length < 6) {
      throw new Error(`TEST 5 FAILED: Farmer did not receive complete status timeline. Length: ${myOrder.statusTimeline?.length}`);
    }

    // Verify Payment & Delivery are separate
    if (myOrder.paymentStatus !== 'PENDING' && myOrder.paymentStatus !== 'PAID') {
      throw new Error(`TEST 5 FAILED: Invalid payment status ${myOrder.paymentStatus}`);
    }

    console.log(`  ✅ TEST 5 PASSED: Farmer views order status '${myOrder.status}', payment status '${myOrder.paymentStatus}', with ${myOrder.statusTimeline.length} timeline events`);

    // ---------------------------------------------------------
    // TEST 6: Delivery Partner Assignment & Empty State
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 6]: Delivery personnel assignment endpoint...');
    const deliveryBoysRes = await makeRequest({
      method: 'GET',
      path: '/api/delivery/shop-delivery-boys',
      token: shopAToken,
    });

    if (deliveryBoysRes.statusCode !== 200) {
      throw new Error(`TEST 6 FAILED: Failed to query delivery boys: ${JSON.stringify(deliveryBoysRes.body)}`);
    }

    console.log(`  ✅ TEST 6 PASSED: Delivery query responded with real count (${deliveryBoysRes.body.deliveryBoys.length}) and proper empty/registered handling`);

    console.log('\n====================================================');
    console.log('  ALL STAGE 10 RETAIL DELIVERY TESTS PASSED!        ');
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ STAGE 10 TEST SUITE FAILED:', error);
    process.exit(1);
  } finally {
    if (server) server.close();
    await disconnectDB();
    process.exit(0);
  }
};

runStage10Tests();
