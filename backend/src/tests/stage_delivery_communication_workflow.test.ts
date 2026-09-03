import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { Order } from '../models/Order.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';

const TEST_PORT = 5014;
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

const runDeliveryCommunicationTests = async () => {
  console.log('=====================================================================');
  console.log('  KRISHISETU — DELIVERY PARTNER ↔ RETAIL PARTNER WORKFLOW TESTS      ');
  console.log('=====================================================================\n');

  await connectDB();

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    const randomSuffix = Date.now().toString().slice(-4);

    // ---------------------------------------------------------
    // STEP 1: Set up 3 real accounts: Farmer, Shop Owner, Delivery Partner
    // ---------------------------------------------------------
    console.log('▶ [STEP 1]: Creating test users for Farmer, Retail Partner & Delivery Partner...');

    // 1A. Farmer
    const farmerEmail = `farmer.comm.${randomSuffix}@agrimart.com`;
    const farmerReg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Ramesh Kisan',
        email: farmerEmail,
        phone: '9876543220',
        password: 'Password123!',
        role: 'FARMER',
        address: { street: 'Farm 4', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522002' },
      },
    });
    const farmerToken = farmerReg.body.token;
    const farmerUser = farmerReg.body.user;

    // 1B. Retail Partner (Shop Owner)
    const shopEmail = `shop.comm.${randomSuffix}@agrimart.com`;
    const shopReg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Krishi Seva Kendra',
        email: shopEmail,
        phone: '9876543221',
        password: 'Password123!',
        role: 'SHOP_OWNER',
        shopName: 'Krishi Seva Kendra Guntur',
      },
    });
    const shopToken = shopReg.body.token;
    const shopUser = shopReg.body.user;

    // 1C. Delivery Partner 1
    const delivery1Email = `delivery1.${randomSuffix}@agrimart.com`;
    const del1Reg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Suresh Quick Delivery',
        email: delivery1Email,
        phone: '9876543222',
        password: 'Password123!',
        role: 'DELIVERY_BOY',
      },
    });
    const delivery1Token = del1Reg.body.token;
    const delivery1User = del1Reg.body.user;

    // 1D. Delivery Partner 2 (for rejection testing)
    const delivery2Email = `delivery2.${randomSuffix}@agrimart.com`;
    const del2Reg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Mahesh Speed Express',
        email: delivery2Email,
        phone: '9876543223',
        password: 'Password123!',
        role: 'DELIVERY_BOY',
      },
    });
    const delivery2Token = del2Reg.body.token;
    const delivery2User = del2Reg.body.user;

    const farmerId = farmerUser.id || farmerUser._id;
    const shopId = shopUser.id || shopUser._id;
    const delivery1Id = delivery1User.id || delivery1User._id;
    const delivery2Id = delivery2User.id || delivery2User._id;

    console.log('  ✅ Step 1 complete: Real test accounts registered.\n');

    // ---------------------------------------------------------
    // STEP 2: Shop Owner creates a Product and Farmer places an Order
    // ---------------------------------------------------------
    console.log('▶ [STEP 2]: Setting up Product and Order...');
    const product = await Product.create({
      name: 'Bio Urea Gold',
      category: 'Fertilizers',
      brand: 'IFFCO',
      description: 'Organic slow-release granular nitrogen',
      price: 450,
      stock: 50,
      unit: 'bag',
      shopOwner: shopId,
      images: ['https://example.com/fertilizer.jpg'],
    });

    // Directly create order
    let testOrder = await Order.create({
      orderNumber: `ORD-${Date.now()}-${randomSuffix}`,
      farmer: farmerId,
      items: [
        {
          product: product._id,
          shopOwner: shopId,
          productNameSnapshot: product.name,
          price: product.price,
          quantity: 2,
          unit: product.unit,
          subtotal: 900,
        },
      ],
      totalAmount: 900,
      deliveryAddress: {
        street: 'Plot 12 Greenfield',
        city: 'Guntur',
        state: 'Andhra Pradesh',
        pincode: '522002',
      },
      status: 'PENDING',
      paymentStatus: 'PAID',
    });


    console.log(`  ✅ Step 2 complete: Order #${testOrder.orderNumber} created in MongoDB.\n`);

    // ---------------------------------------------------------
    // STEP 3: Retail Partner loads real Delivery Partners from MongoDB
    // ---------------------------------------------------------
    console.log('▶ [STEP 3]: Retail Partner querying available Delivery Partners...');
    const deliveryListRes = await makeRequest({
      method: 'GET',
      path: '/api/delivery/shop-delivery-boys',
      token: shopToken,
    });

    if (deliveryListRes.statusCode !== 200 || !Array.isArray(deliveryListRes.body.deliveryBoys)) {
      throw new Error(`STEP 3 FAILED: Could not fetch delivery boys: ${JSON.stringify(deliveryListRes.body)}`);
    }

    const foundDelivery1 = deliveryListRes.body.deliveryBoys.find(
      (db: any) => db.name === 'Suresh Quick Delivery'
    );
    if (!foundDelivery1) {
      throw new Error('STEP 3 FAILED: Registered Delivery Partner not found in shop delivery partners list');
    }
    console.log(`  ✅ Step 3 complete: Found ${deliveryListRes.body.count} registered delivery partner(s) in MongoDB.\n`);

    // ---------------------------------------------------------
    // STEP 4: Retail Partner assigns Delivery Partner 1 to Order
    // ---------------------------------------------------------
    console.log('▶ [STEP 4]: Retail Partner assigning Delivery Partner 1 to Order...');
    const assignRes = await makeRequest({
      method: 'POST',
      path: '/api/delivery/assign-order',
      token: shopToken,
      body: {
        orderId: testOrder._id.toString(),
        deliveryBoyId: delivery1Id.toString(),
      },
    });


    if (assignRes.statusCode !== 200 || !assignRes.body.order) {
      throw new Error(`STEP 4 FAILED: Assignment failed: ${JSON.stringify(assignRes.body)}`);
    }

    const assignedOrder = assignRes.body.order;
    if (assignedOrder.deliveryResponseStatus !== 'PENDING') {
      throw new Error(`STEP 4 FAILED: Expected deliveryResponseStatus 'PENDING', got ${assignedOrder.deliveryResponseStatus}`);
    }
    console.log('  ✅ Step 4 complete: Assignment created with deliveryResponseStatus = PENDING.\n');

    // ---------------------------------------------------------
    // STEP 5: Delivery Partner 1 logs in & sees "New Delivery Request"
    // ---------------------------------------------------------
    console.log('▶ [STEP 5]: Delivery Partner 1 checking assigned shipments...');
    const delOrdersRes = await makeRequest({
      method: 'GET',
      path: '/api/delivery/assigned-orders',
      token: delivery1Token,
    });

    if (delOrdersRes.statusCode !== 200 || delOrdersRes.body.count === 0) {
      throw new Error(`STEP 5 FAILED: Delivery Partner cannot see assigned order: ${JSON.stringify(delOrdersRes.body)}`);
    }

    const partnerOrderView = delOrdersRes.body.orders[0];
    if (partnerOrderView.orderNumber !== testOrder.orderNumber) {
      throw new Error('STEP 5 FAILED: Mismatched order in delivery partner dashboard');
    }
    console.log('  ✅ Step 5 complete: New Delivery Request appears in Delivery Partner dashboard.\n');

    // ---------------------------------------------------------
    // STEP 6: Delivery Partner 1 clicks ACCEPT DELIVERY
    // ---------------------------------------------------------
    console.log('▶ [STEP 6]: Delivery Partner 1 ACCEPTING delivery request...');
    const acceptRes = await makeRequest({
      method: 'POST',
      path: `/api/delivery/orders/${testOrder._id}/respond`,
      token: delivery1Token,
      body: { action: 'ACCEPT' },
    });

    if (acceptRes.statusCode !== 200 || acceptRes.body.order?.deliveryResponseStatus !== 'ACCEPTED') {
      throw new Error(`STEP 6 FAILED: Accept response failed: ${JSON.stringify(acceptRes.body)}`);
    }

    // Verify duplicate acceptance is prevented
    const duplicateAccept = await makeRequest({
      method: 'POST',
      path: `/api/delivery/orders/${testOrder._id}/respond`,
      token: delivery1Token,
      body: { action: 'ACCEPT' },
    });
    if (duplicateAccept.statusCode !== 400) {
      throw new Error('STEP 6 FAILED: Expected 400 on duplicate accept');
    }

    console.log('  ✅ Step 6 complete: Delivery request accepted, concurrency guards verified.\n');

    // ---------------------------------------------------------
    // STEP 7: Retail Partner refreshes & sees ACCEPTED
    // ---------------------------------------------------------
    console.log('▶ [STEP 7]: Retail Partner viewing updated order status...');
    const shopOrdersView = await makeRequest({
      method: 'GET',
      path: '/api/orders/shop-orders',
      token: shopToken,
    });

    const refreshedOrder = shopOrdersView.body.orders.find((o: any) => o.orderNumber === testOrder.orderNumber);
    if (!refreshedOrder || refreshedOrder.deliveryResponseStatus !== 'ACCEPTED') {
      throw new Error('STEP 7 FAILED: Retail Partner does not see ACCEPTED delivery status');
    }
    console.log('  ✅ Step 7 complete: Retail Partner sees ACCEPTED response status.\n');

    // ---------------------------------------------------------
    // STEP 8: Delivery Partner progresses through delivery stages
    // ---------------------------------------------------------
    console.log('▶ [STEP 8]: Delivery Partner progressing status: PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED...');

    // A. Store Pickup
    const pickupRes = await makeRequest({
      method: 'PATCH',
      path: `/api/delivery/orders/${testOrder._id}/status`,
      token: delivery1Token,
      body: { status: 'PICKED_UP', note: 'Package loaded on motorcycle' },
    });
    if (pickupRes.statusCode !== 200 || pickupRes.body.order.deliveryStatus !== 'PICKED_UP') {
      throw new Error(`STEP 8A FAILED: Pickup status update failed: ${JSON.stringify(pickupRes.body)}`);
    }

    // B. Out for Delivery
    const outRes = await makeRequest({
      method: 'PATCH',
      path: `/api/delivery/orders/${testOrder._id}/status`,
      token: delivery1Token,
      body: { status: 'OUT_FOR_DELIVERY', note: 'Approaching farm location' },
    });
    if (outRes.statusCode !== 200 || outRes.body.order.deliveryStatus !== 'OUT_FOR_DELIVERY') {
      throw new Error(`STEP 8B FAILED: Out for delivery update failed: ${JSON.stringify(outRes.body)}`);
    }

    // C. Delivered
    const delRes = await makeRequest({
      method: 'PATCH',
      path: `/api/delivery/orders/${testOrder._id}/status`,
      token: delivery1Token,
      body: { status: 'DELIVERED', note: 'Delivered and handed to farmer' },
    });
    if (delRes.statusCode !== 200 || delRes.body.order.deliveryStatus !== 'DELIVERED') {
      throw new Error(`STEP 8C FAILED: Delivered status update failed: ${JSON.stringify(delRes.body)}`);
    }

    console.log('  ✅ Step 8 complete: Full delivery lifecycle progressed and saved to MongoDB.\n');

    // ---------------------------------------------------------
    // STEP 9: Farmer My Orders verification
    // ---------------------------------------------------------
    console.log('▶ [STEP 9]: Farmer viewing delivery milestone in My Orders...');
    const farmerOrdersRes = await makeRequest({
      method: 'GET',
      path: '/api/orders/my-orders',
      token: farmerToken,
    });

    const farmerOrder = farmerOrdersRes.body.orders.find((o: any) => o.orderNumber === testOrder.orderNumber);
    if (!farmerOrder || farmerOrder.status !== 'DELIVERED') {
      throw new Error(`STEP 9 FAILED: Farmer does not see status DELIVERED: ${JSON.stringify(farmerOrder)}`);
    }
    console.log('  ✅ Step 9 complete: Farmer sees final DELIVERED status.\n');

    // ---------------------------------------------------------
    // STEP 10: Rejection Workflow Testing
    // ---------------------------------------------------------
    console.log('▶ [STEP 10]: Testing Rejection & Re-assignment Workflow...');

    // Create a 2nd test order
    const testOrder2 = await Order.create({
      orderNumber: `ORD-${Date.now()}-REJECT`,
      farmer: farmerId,
      items: [
        {
          product: product._id,
          shopOwner: shopId,
          productNameSnapshot: product.name,
          price: product.price,
          quantity: 1,
          unit: product.unit,
          subtotal: 450,
        },
      ],
      totalAmount: 450,
      deliveryAddress: {
        street: 'Farm 5',
        city: 'Guntur',
        state: 'Andhra Pradesh',
        pincode: '522002',
      },
      status: 'ACCEPTED',
      paymentStatus: 'PAID',
    });

    // 10A. Assign to Delivery Partner 2
    await makeRequest({
      method: 'POST',
      path: '/api/delivery/assign-order',
      token: shopToken,
      body: {
        orderId: testOrder2._id.toString(),
        deliveryBoyId: delivery2Id.toString(),
      },
    });

    // 10B. Delivery Partner 2 REJECTS
    const rejectRes = await makeRequest({
      method: 'POST',
      path: `/api/delivery/orders/${testOrder2._id}/respond`,
      token: delivery2Token,
      body: { action: 'REJECT', reason: 'Vehicle maintenance scheduled' },
    });
    if (rejectRes.statusCode !== 200 || rejectRes.body.order?.deliveryResponseStatus !== 'REJECTED') {
      throw new Error(`STEP 10B FAILED: Rejection failed: ${JSON.stringify(rejectRes.body)}`);
    }

    // 10C. Retail Partner re-assigns to Delivery Partner 1
    const reassignRes = await makeRequest({
      method: 'POST',
      path: '/api/delivery/assign-order',
      token: shopToken,
      body: {
        orderId: testOrder2._id.toString(),
        deliveryBoyId: delivery1Id.toString(),
      },
    });
    if (reassignRes.statusCode !== 200 || reassignRes.body.order?.deliveryResponseStatus !== 'PENDING') {
      throw new Error(`STEP 10C FAILED: Re-assignment failed: ${JSON.stringify(reassignRes.body)}`);
    }


    // 10D. Delivery Partner 1 accepts re-assigned order
    const accept2Res = await makeRequest({
      method: 'POST',
      path: `/api/delivery/orders/${testOrder2._id}/respond`,
      token: delivery1Token,
      body: { action: 'ACCEPT' },
    });
    if (accept2Res.statusCode !== 200 || accept2Res.body.order?.deliveryResponseStatus !== 'ACCEPTED') {
      throw new Error(`STEP 10D FAILED: Re-assigned acceptance failed: ${JSON.stringify(accept2Res.body)}`);
    }

    console.log('  ✅ Step 10 complete: Rejection and Re-assignment workflow verified successfully.\n');

    // ---------------------------------------------------------
    // STEP 11: Security & Isolation Testing
    // ---------------------------------------------------------
    console.log('▶ [STEP 11]: Testing Security & Role Isolation...');

    // Delivery Partner 2 cannot mutate Delivery Partner 1's order
    const unauthorizedUpdate = await makeRequest({
      method: 'PATCH',
      path: `/api/delivery/orders/${testOrder._id}/status`,
      token: delivery2Token,
      body: { status: 'DELIVERED' },
    });
    if (unauthorizedUpdate.statusCode !== 403) {
      throw new Error('STEP 11 FAILED: Expected 403 Forbidden for unauthorized delivery partner update');
    }

    // Farmer cannot access delivery endpoints
    const farmerUnauthorized = await makeRequest({
      method: 'GET',
      path: '/api/delivery/assigned-orders',
      token: farmerToken,
    });
    if (farmerUnauthorized.statusCode !== 403) {
      throw new Error('STEP 11 FAILED: Expected 403 Forbidden for farmer accessing delivery endpoint');
    }

    console.log('  ✅ Step 11 complete: Backend role isolation and access control enforced.\n');

    console.log('=====================================================================');
    console.log('  ALL DELIVERY PARTNER ↔ RETAIL PARTNER WORKFLOW TESTS PASSED!       ');
    console.log('=====================================================================\n');
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    if (server) server.close();
    await disconnectDB();
    process.exit(0);
  }
};

runDeliveryCommunicationTests();
