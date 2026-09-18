import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User, IUser } from '../models/User.model';
import { Product, IProduct } from '../models/Product.model';
import { Order } from '../models/Order.model';
import { Cart } from '../models/Cart.model';
import { ShopMatchingService } from '../services/shopMatching.service';

const TEST_PORT = 5012;
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

const signToken = (user: IUser): string => {
  const jwtSecret = process.env.JWT_SECRET || 'agrimart_secure_jwt_secret_dev_key';
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    },
    jwtSecret,
    { expiresIn: '1d' }
  );
};

export const runNearbyOrderRoutingTests = async () => {
  console.log('===============================================================');
  console.log('  AGROMITRA STEP 2 — NEARBY SHOP OWNER ORDER ROUTING TEST SUITE ');
  console.log('===============================================================\n');

  process.env.NODE_ENV = 'test';
  delete process.env.MONGODB_URI;
  await connectDB();

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  let passedTests = 0;
  let failedTests = 0;

  const assert = (condition: boolean, desc: string) => {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failedTests++;
    }
  };

  try {
    // -------------------------------------------------------------
    // SETUP: Test Users & Store Profiles
    // -------------------------------------------------------------
    console.log('--- 1. SETTING UP TEST USERS & LOCATIONS ---');

    // Farmer in Kurnool center (lat: 15.8281, lon: 78.0373)
    const farmer = await User.create({
      name: 'Ramesh Farmer',
      email: `farmer_${Date.now()}@agromitra.test`,
      phone: `98480${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'password123',
      role: 'FARMER',
      address: {
        street: 'Kallur Village',
        city: 'Kurnool',
        state: 'Andhra Pradesh',
        pincode: '518002',
        latitude: 15.8281,
        longitude: 78.0373,
      },
    });
    const farmerToken = signToken(farmer);

    // Shop A: 2.5 km away in Kurnool City, sells Bio-Fertilizer
    const shopA = await User.create({
      name: 'Kurnool Agro Hub (Shop A)',
      shopName: 'Kurnool Agro Hub',
      email: `shopA_${Date.now()}@agromitra.test`,
      phone: `98481${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'password123',
      role: 'SHOP_OWNER',
      status: 'ACTIVE',
      isApproved: true,
      address: {
        street: 'Market Yard Road',
        city: 'Kurnool',
        state: 'Andhra Pradesh',
        pincode: '518001',
        latitude: 15.8500, // ~2.5 km from farmer
        longitude: 78.0450,
      },
    });
    const shopAToken = signToken(shopA);

    // Shop B: 45 km away in Nandyal, also sells Bio-Fertilizer
    const shopB = await User.create({
      name: 'Nandyal Kisan Seva (Shop B)',
      shopName: 'Nandyal Kisan Seva',
      email: `shopB_${Date.now()}@agromitra.test`,
      phone: `98482${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'password123',
      role: 'SHOP_OWNER',
      status: 'ACTIVE',
      isApproved: true,
      address: {
        street: 'Station Road',
        city: 'Nandyal',
        state: 'Andhra Pradesh',
        pincode: '518501',
        latitude: 15.4883, // ~45 km away from farmer
        longitude: 78.4832,
      },
    });
    const shopBToken = signToken(shopB);

    // Shop C: 1.5 km away in Kurnool, but DOES NOT sell the product
    const shopC = await User.create({
      name: 'City Tools & Machinery (Shop C)',
      shopName: 'City Tools & Machinery',
      email: `shopC_${Date.now()}@agromitra.test`,
      phone: `98483${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'password123',
      role: 'SHOP_OWNER',
      status: 'ACTIVE',
      isApproved: true,
      address: {
        street: 'Old Town',
        city: 'Kurnool',
        state: 'Andhra Pradesh',
        pincode: '518001',
        latitude: 15.8350, // ~1.0 km from farmer
        longitude: 78.0400,
      },
    });
    const shopCToken = signToken(shopC);

    // Delivery Boy
    const deliveryBoy = await User.create({
      name: 'Suresh Express',
      email: `delivery_${Date.now()}@agromitra.test`,
      phone: `98484${Math.floor(10000 + Math.random() * 90000)}`,
      password: 'password123',
      role: 'DELIVERY_BOY',
      address: { city: 'Kurnool', state: 'Andhra Pradesh' },
    });

    // Product 1: Organic Bio-Fertilizer sold by Shop A and Shop B
    const productA = await Product.create({
      name: 'Organic Neem Bio-Fertilizer',
      description: 'Pure organic neem cake fertilizer for soil enrichment.',
      category: 'Fertilizers',
      brand: 'AgroMitra Bio',
      price: 450,
      unit: 'bag',
      stock: 50,
      shopOwner: shopA._id,
      isActive: true,
    });

    // Shop B also stocks the same product in their catalog
    const productB = await Product.create({
      name: 'Organic Neem Bio-Fertilizer',
      description: 'Pure organic neem cake fertilizer for soil enrichment.',
      category: 'Fertilizers',
      brand: 'AgroMitra Bio',
      price: 460,
      unit: 'bag',
      stock: 30,
      shopOwner: shopB._id,
      isActive: true,
    });

    // Shop C only sells Tractors/Machinery
    await Product.create({
      name: 'Heavy Duty Cultivator Tiller',
      description: 'Tractor mounted cultivator tiller.',
      category: 'Tools & Machinery',
      brand: 'Mahindra',
      price: 35000,
      unit: 'unit',
      stock: 5,
      shopOwner: shopC._id,
      isActive: true,
    });

    console.log('✅ Test environment initialized successfully.\n');

    // -------------------------------------------------------------
    // TEST 1: Haversine Distance Calculation & Location Ranking
    // -------------------------------------------------------------
    console.log('--- TEST 1: Haversine Geodesic Distance Verification ---');
    const distA = ShopMatchingService.calculateHaversineDistance(
      farmer.address!.latitude!,
      farmer.address!.longitude!,
      shopA.address!.latitude!,
      shopA.address!.longitude!
    );
    const distB = ShopMatchingService.calculateHaversineDistance(
      farmer.address!.latitude!,
      farmer.address!.longitude!,
      shopB.address!.latitude!,
      shopB.address!.longitude!
    );

    console.log(`  Shop A distance: ${distA} km | Shop B distance: ${distB} km`);
    assert(distA < distB, 'Shop A is geographically closer to Farmer than Shop B');
    assert(distA > 1.0 && distA < 5.0, 'Shop A distance in expected 1-5 km radius');
    assert(distB > 35.0 && distB < 75.0, 'Shop B distance in expected 35-75 km radius');

    // -------------------------------------------------------------
    // TEST 2: Multi-Shop Eligibility Filtering (Phase 12)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Multi-Shop Eligibility & Ranking (Phase 12) ---');
    // Simulate finding eligible shops for an order with Organic Neem Bio-Fertilizer
    const mockOrder: any = {
      orderNumber: 'TEST-ORDER-001',
      farmer: farmer._id,
      deliveryAddress: farmer.address,
      items: [
        {
          product: productA._id,
          productNameSnapshot: 'Organic Neem Bio-Fertilizer',
          quantity: 2,
          shopOwner: shopA._id,
        },
      ],
      rejectionHistory: [],
    };

    const candidates = await ShopMatchingService.findEligibleShopsForOrder(mockOrder, 100);
    console.log(`  Found ${candidates.length} eligible candidates:`, candidates.map(c => `${c.shopName} (${c.distanceKm} km)`));

    assert(candidates.length === 2, 'Exactly 2 shops sell product (Shop A and Shop B); Shop C excluded');
    assert(candidates[0].shopOwnerId.toString() === shopA._id.toString(), 'Rank 1 is closest shop (Shop A)');
    assert(candidates[1].shopOwnerId.toString() === shopB._id.toString(), 'Rank 2 is next nearest shop (Shop B)');
    assert(
      !candidates.some(c => c.shopOwnerId.toString() === shopC._id.toString()),
      'Shop C is NOT eligible because it does not sell the ordered product'
    );

    // -------------------------------------------------------------
    // TEST 3: Farmer Order Placement & Automatic Nearby Routing (Phase 4 & 5)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Farmer Order Placement & Automatic Nearby Routing ---');
    // Populate Farmer Cart
    await Cart.findOneAndUpdate(
      { farmer: farmer._id },
      {
        $set: {
          items: [{ product: productA._id, quantity: 2 }],
        },
      },
      { upsert: true, new: true }
    );

    const placeRes = await makeRequest({
      method: 'POST',
      path: '/api/orders',
      token: farmerToken,
      body: {
        deliveryAddress: farmer.address,
        paymentMethod: 'CASH_ON_DELIVERY',
      },
    });

    assert(placeRes.statusCode === 201, `Order creation returned 201 (got ${placeRes.statusCode})`);
    const createdOrder = placeRes.body.order;
    assert(createdOrder.status === 'WAITING_FOR_SHOP', `Order initial status is WAITING_FOR_SHOP (got ${createdOrder.status})`);
    const assignedShopId = createdOrder.assignedShopOwner?.id || createdOrder.assignedShopOwner?._id || createdOrder.assignedShopOwner;
    assert(
      assignedShopId?.toString() === shopA._id.toString(),
      'Order automatically assigned to closest shop (Shop A)'
    );

    // -------------------------------------------------------------
    // TEST 4: Shop Owner Incoming Orders Dashboard & Privacy Protection (Phase 6)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Shop Owner Dashboard & Privacy Protection (Phase 6) ---');
    const shopOrdersRes = await makeRequest({
      method: 'GET',
      path: '/api/orders/shop-owner',
      token: shopAToken,
    });

    assert(shopOrdersRes.statusCode === 200, 'Shop A can fetch shop-owner orders');
    const incomingOrder = shopOrdersRes.body.orders.find((o: any) => o.id === createdOrder._id || o._id === createdOrder._id);
    assert(Boolean(incomingOrder), 'Incoming order appears in Shop A dashboard');
    assert(incomingOrder.canAccept === true, 'Order has canAccept = true for Shop A');
    assert(incomingOrder.distanceKm !== undefined, `Distance reported to shop (${incomingOrder.distanceKm} km)`);
    assert(!incomingOrder.farmer?.phone?.includes('98480'), 'Farmer sensitive phone is masked for privacy before acceptance');

    // -------------------------------------------------------------
    // TEST 5: Atomic Concurrency Test — Two Shops Accept Simultaneously (Phase 11)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Atomic Concurrency Control (Phase 11) ---');
    const [resA, resB] = await Promise.all([
      makeRequest({
        method: 'POST',
        path: `/api/orders/${createdOrder._id}/accept`,
        token: shopAToken,
      }),
      makeRequest({
        method: 'POST',
        path: `/api/orders/${createdOrder._id}/accept`,
        token: shopBToken,
      }),
    ]);

    console.log(`  Shop A accept result: ${resA.statusCode} (${resA.body.message})`);
    console.log(`  Shop B accept result: ${resB.statusCode} (${resB.body.message})`);

    const oneSucceeded = (resA.statusCode === 200 && resB.statusCode === 409) || (resB.statusCode === 200 && resA.statusCode === 409);
    assert(oneSucceeded, 'Exactly ONE shop owner successfully accepted; other shop received 409 Conflict');

    // Verify order in database
    const dbOrderAfterAccept = await Order.findById(createdOrder._id);
    assert(dbOrderAfterAccept?.status === 'SHOP_ACCEPTED', `Order status in DB is SHOP_ACCEPTED (got ${dbOrderAfterAccept?.status})`);
    assert(Boolean(dbOrderAfterAccept?.acceptedShopOwner), 'Order has acceptedShopOwner recorded');
    assert(Boolean(dbOrderAfterAccept?.acceptedAt), 'Order has acceptedAt timestamp recorded');

    // -------------------------------------------------------------
    // TEST 6: Rejection & Automatic Next-Shop Rerouting (Phase 8)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Shop Rejection & Automatic Next-Shop Rerouting (Phase 8) ---');
    // Create a new order to test rejection flow
    await Cart.findOneAndUpdate(
      { farmer: farmer._id },
      {
        $set: {
          items: [{ product: productA._id, quantity: 1 }],
        },
      },
      { upsert: true, new: true }
    );

    const order2Res = await makeRequest({
      method: 'POST',
      path: '/api/orders',
      token: farmerToken,
      body: {
        deliveryAddress: farmer.address,
        paymentMethod: 'CASH_ON_DELIVERY',
      },
    });

    const order2Id = order2Res.body.order._id;
    assert(order2Res.statusCode === 201, 'Order 2 created successfully');

    // Shop A rejects with reason "Out of stock"
    const rejectRes = await makeRequest({
      method: 'POST',
      path: `/api/orders/${order2Id}/reject`,
      token: shopAToken,
      body: {
        rejectionReason: 'Out of stock',
      },
    });

    assert(rejectRes.statusCode === 200, `Rejection accepted with 200 (got ${rejectRes.statusCode})`);
    const reroutedOrder = rejectRes.body.order;
    const reroutedShopId = reroutedOrder.assignedShopOwner?.id || reroutedOrder.assignedShopOwner?._id || reroutedOrder.assignedShopOwner;
    assert(
      reroutedShopId?.toString() === shopB._id.toString(),
      'Order automatically rerouted to next closest shop (Shop B)'
    );
    assert(reroutedOrder.status === 'WAITING_FOR_SHOP', `Status remains WAITING_FOR_SHOP for Shop B (got ${reroutedOrder.status})`);
    assert(reroutedOrder.rejectionHistory?.length === 1, 'Rejection history records Shop A');

    // Now Shop B also rejects (Exhausting all eligible shops)
    console.log('\n--- TEST 7: Exhausted Rejection — All Shops Decline (Phase 13) ---');
    const reject2Res = await makeRequest({
      method: 'POST',
      path: `/api/orders/${order2Id}/reject`,
      token: shopBToken,
      body: {
        rejectionReason: 'Store closed for festival',
      },
    });

    assert(reject2Res.statusCode === 200, 'Second rejection processed');
    const exhaustedOrder = reject2Res.body.order;
    assert(exhaustedOrder.status === 'REJECTED', `Status transitions to REJECTED when exhausted (got ${exhaustedOrder.status})`);
    assert(reject2Res.body.routing?.exhausted === true, 'Routing indicates exhausted: true');

    // Verify stock restoration: Product A initial stock 50. Order 1 bought 2 units (50 -> 48). Order 2 bought 1 unit (48 -> 47). Upon full rejection of Order 2, 1 unit restored (47 -> 48).
    const restoredProductA = await Product.findById(productA._id);
    assert(restoredProductA?.stock === 48, `Stock safely restored after order cancellation/rejection (expected 48, got ${restoredProductA?.stock})`);

    // -------------------------------------------------------------
    // TEST 8: Payment Safety Check (Phase 10)
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Payment Safety Enforcement (Phase 10) ---');
    await Cart.findOneAndUpdate(
      { farmer: farmer._id },
      { $set: { items: [{ product: productA._id, quantity: 1 }] } },
      { upsert: true, new: true }
    );

    const onlineOrderRes = await makeRequest({
      method: 'POST',
      path: '/api/orders',
      token: farmerToken,
      body: {
        deliveryAddress: farmer.address,
        paymentMethod: 'RAZORPAY',
      },
    });
    const onlineOrderId = onlineOrderRes.body.order._id;

    // Attempt to accept while payment is PENDING
    const prematureAcceptRes = await makeRequest({
      method: 'POST',
      path: `/api/orders/${onlineOrderId}/accept`,
      token: shopAToken,
    });

    assert(prematureAcceptRes.statusCode === 400, `Premature online order accept blocked with 400 (got ${prematureAcceptRes.statusCode})`);
    assert(
      prematureAcceptRes.body.message.includes('Razorpay') || prematureAcceptRes.body.message.includes('payment'),
      `Correct safety message returned: "${prematureAcceptRes.body.message}"`
    );

    // -------------------------------------------------------------
    // TEST 9: Store Preparation & Delivery Workflow Preservation (Phase 14)
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Preparation & Delivery Workflow Preservation (Phase 14) ---');
    // 1. Advance to PREPARING
    const prepRes = await makeRequest({
      method: 'PUT',
      path: `/api/orders/${createdOrder._id}/prepare`,
      token: shopAToken,
    });
    assert(prepRes.statusCode === 200, 'Order successfully advanced to PREPARING');
    assert(prepRes.body.order.status === 'PREPARING', `Status is PREPARING (got ${prepRes.body.order.status})`);

    // 2. Advance to READY_FOR_PICKUP
    const pickupRes = await makeRequest({
      method: 'PUT',
      path: `/api/orders/${createdOrder._id}/ready-for-pickup`,
      token: shopAToken,
    });
    assert(pickupRes.statusCode === 200, 'Order successfully advanced to READY_FOR_PICKUP');
    assert(pickupRes.body.order.status === 'READY_FOR_PICKUP', `Status is READY_FOR_PICKUP (got ${pickupRes.body.order.status})`);

    // 3. Assign Delivery Partner
    const assignRes = await makeRequest({
      method: 'POST',
      path: '/api/delivery/assign-order',
      token: shopAToken,
      body: {
        orderId: createdOrder._id,
        deliveryBoyId: deliveryBoy._id.toString(),
      },
    });
    assert(assignRes.statusCode === 200, `Delivery partner successfully assigned (got ${assignRes.statusCode})`);
    const assignedOrder = await Order.findById(createdOrder._id);
    assert(assignedOrder?.deliveryStatus === 'PENDING_ACCEPTANCE', `Delivery status is PENDING_ACCEPTANCE (got ${assignedOrder?.deliveryStatus})`);

    // -------------------------------------------------------------
    // TEST 10: Farmer View & Status Tracking (Phase 9)
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Farmer Order Status Reflection (Phase 9) ---');
    const farmerOrdersRes = await makeRequest({
      method: 'GET',
      path: '/api/orders',
      token: farmerToken,
    });
    assert(farmerOrdersRes.statusCode === 200, 'Farmer successfully fetched orders');
    const farmerViewOrder = farmerOrdersRes.body.orders.find((o: any) => o._id === createdOrder._id || o.id === createdOrder._id);
    assert(Boolean(farmerViewOrder), 'Farmer sees the active order');
    assert(farmerViewOrder.status === 'READY_FOR_PICKUP', `Farmer sees live status READY_FOR_PICKUP (got ${farmerViewOrder.status})`);
    assert(farmerViewOrder.statusTimeline.length >= 4, `Status timeline contains full event audit trail (${farmerViewOrder.statusTimeline.length} events)`);

    // Cleanup created test records
    await Order.deleteMany({ farmer: farmer._id });
    await Product.deleteMany({ _id: { $in: [productA._id, productB._id] } });
    await User.deleteMany({ _id: { $in: [farmer._id, shopA._id, shopB._id, shopC._id, deliveryBoy._id] } });
    await Cart.deleteMany({ farmer: farmer._id });

  } catch (error) {
    console.error('❌ Test suite fatal error:', error);
    failedTests++;
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();

    console.log('\n===============================================================');
    console.log(`  TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('===============================================================\n');

    process.exit(failedTests > 0 ? 1 : 0);
  }
};

if (require.main === module) {
  runNearbyOrderRoutingTests();
}
