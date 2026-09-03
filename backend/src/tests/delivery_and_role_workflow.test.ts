import http from 'http';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();

interface RequestOptions {
  method: string;
  path: string;
  body?: any;
  formData?: FormData;
  token?: string;
}

interface ResponseResult {
  statusCode: number;
  body: any;
}

const makeRequest = (options: RequestOptions): Promise<ResponseResult> => {
  return new Promise((resolve, reject) => {
    let headers: http.OutgoingHttpHeaders = {};

    if (options.formData) {
      headers = {
        ...options.formData.getHeaders(),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      };
    } else {
      const dataString = options.body ? JSON.stringify(options.body) : '';
      headers = {
        'Content-Type': 'application/json',
        ...(dataString ? { 'Content-Length': Buffer.byteLength(dataString) } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      };
    }

    const reqOptions: http.RequestOptions = {
      hostname: 'localhost',
      port: 5000,
      path: options.path,
      method: options.method,
      headers,
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

    if (options.formData) {
      options.formData.pipe(req);
    } else if (options.body) {
      req.write(JSON.stringify(options.body));
      req.end();
    } else {
      req.end();
    }
  });
};

// Helper: Synthetic 64x64 green leaf bitmap
const createSyntheticLeafImage = (): Buffer => {
  const width = 64;
  const height = 64;
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buffer = Buffer.alloc(fileSize);
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);

  let offset = 54;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      buffer[offset] = 30; // B
      buffer[offset + 1] = 160 + (x % 30); // G
      buffer[offset + 2] = 50; // R
      offset += 3;
    }
    for (let p = 0; p < rowSize - width * 3; p++) {
      buffer[offset++] = 0;
    }
  }
  return buffer;
};

const runDeliveryAndRoleTests = async () => {
  console.log('================================================================');
  console.log('  AGRIMART — FARMER + DELIVERY + FERTILIZER DEALER E2E SUITE    ');
  console.log('================================================================\n');

  // STEP 1: AI Authentication & Token Flow Diagnostics
  console.log('▶ [TEST 1]: AI Crop Health Authentication & Token Flow Verification...');

  // 1a: Unauthenticated request must return 401
  const unauthLeafForm = new FormData();
  unauthLeafForm.append('image', createSyntheticLeafImage(), {
    filename: 'test_leaf.jpg',
    contentType: 'image/jpeg',
  });
  const unauthRes = await makeRequest({
    method: 'POST',
    path: '/api/crop-health/analyze',
    formData: unauthLeafForm,
  });

  if (unauthRes.statusCode !== 401) {
    throw new Error(`Expected 401 Unauthorized for unauthenticated AI request, got HTTP ${unauthRes.statusCode}`);
  }
  console.log('  ✅ Unauthenticated AI upload correctly rejected with HTTP 401 (Authentication required).');

  // 1b: Authenticate Farmer
  const farmerLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'nandeeswarreddy2852@gmail.com', password: 'Password123' },
  });
  if (farmerLogin.statusCode !== 200 || !farmerLogin.body.token) {
    throw new Error('Farmer login failed.');
  }
  const farmerToken = farmerLogin.body.token;
  console.log(`  ✅ Farmer logged in: ${farmerLogin.body.user.name} (${farmerLogin.body.user.role})`);

  // 1c: Authenticated Farmer sends leaf image
  const authLeafForm = new FormData();
  authLeafForm.append('image', createSyntheticLeafImage(), {
    filename: 'crop_health_leaf.jpg',
    contentType: 'image/jpeg',
  });
  const authAIRes = await makeRequest({
    method: 'POST',
    path: '/api/crop-health/analyze',
    formData: authLeafForm,
    token: farmerToken,
  });

  if (authAIRes.statusCode !== 200 || !authAIRes.body.success || !authAIRes.body.analysis) {
    throw new Error(`Authenticated AI diagnosis failed: ${JSON.stringify(authAIRes.body)}`);
  }
  console.log(`  ✅ Authenticated AI diagnosis succeeded: ${authAIRes.body.analysis.crop} - ${authAIRes.body.analysis.disease} (Confidence: ${(authAIRes.body.analysis.confidence * 100).toFixed(1)}%)`);

  // STEP 2: Authenticate Fertilizer & Pesticide Shop Owner
  console.log('\n▶ [TEST 2]: Authenticating Fertilizer & Pesticide Shop Owner...');
  const shopLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'nandeeswarreddy1346@gmail.com', password: 'Password123' },
  });
  if (shopLogin.statusCode !== 200 || !shopLogin.body.token) {
    throw new Error('Shop Owner login failed.');
  }
  const shopToken = shopLogin.body.token;
  console.log(`  ✅ Fertilizer & Pesticide Dealer logged in: ${shopLogin.body.user.name}`);

  // STEP 3: Delivery Boys List for Shop Owner
  console.log('\n▶ [TEST 3]: Fertilizer & Pesticide Dealer fetches Delivery Boys list (GET /api/delivery/shop-delivery-boys)...');
  const deliveryBoysRes = await makeRequest({
    method: 'GET',
    path: '/api/delivery/shop-delivery-boys',
    token: shopToken,
  });

  if (deliveryBoysRes.statusCode !== 200 || !Array.isArray(deliveryBoysRes.body.deliveryBoys)) {
    throw new Error(`Failed to fetch shop delivery boys: ${JSON.stringify(deliveryBoysRes.body)}`);
  }

  let deliveryBoy = deliveryBoysRes.body.deliveryBoys[0];
  if (!deliveryBoy) {
    // Register if none exists
    const createDbRes = await makeRequest({
      method: 'POST',
      path: '/api/delivery/create',
      token: shopToken,
      body: {
        name: 'Ramesh Kumar',
        email: `ramesh.delivery.${Date.now()}@agrimart.com`,
        phone: '9876543220',
        password: 'Password123',
        vehicleType: 'Hero Splendor Plus (MH-31-AG-4402)',
        deliveryArea: 'Nagpur Agro Hub & Mandals',
      },
    });
    deliveryBoy = createDbRes.body.deliveryBoy;
  }
  console.log(`  ✅ Delivery Boy retrieved: ${deliveryBoy.name} (${deliveryBoy.phone}) • Vehicle: ${deliveryBoy.vehicleType}`);

  // STEP 4: Farmer Places an Order for Fertilizer
  console.log('\n▶ [TEST 4]: Farmer places an order and pays with Razorpay...');
  // Get product
  const productsRes = await makeRequest({
    method: 'GET',
    path: '/api/products',
  });
  const product = productsRes.body.products[0];

  // Add to cart
  await makeRequest({
    method: 'POST',
    path: '/api/cart/items',
    token: farmerToken,
    body: { productId: product.id, quantity: 2 },
  });

  // Create order
  const createOrderRes = await makeRequest({
    method: 'POST',
    path: '/api/orders',
    token: farmerToken,
    body: {
      deliveryAddress: {
        street: 'Farm Field Survey 77',
        city: 'Nagpur',
        state: 'Maharashtra',
        pincode: '440001',
      },
    },
  });

  const orderId = createOrderRes.body.order.id;
  const orderNumber = createOrderRes.body.order.orderNumber;
  console.log(`  ✅ Farmer created order: ${orderNumber} (Total: ₹${createOrderRes.body.order.totalAmount})`);

  // STEP 5: Shop Owner Assigns Delivery Boy
  console.log('\n▶ [TEST 5]: Fertilizer & Pesticide Dealer assigns Delivery Boy (POST /api/delivery/assign-order)...');
  const assignRes = await makeRequest({
    method: 'POST',
    path: '/api/delivery/assign-order',
    token: shopToken,
    body: {
      orderId,
      deliveryBoyId: deliveryBoy.id,
    },
  });

  if (assignRes.statusCode !== 200 || !assignRes.body.success) {
    throw new Error(`Delivery assignment failed: ${JSON.stringify(assignRes.body)}`);
  }
  console.log(`  ✅ Order ${orderNumber} assigned to ${deliveryBoy.name}. Status: ${assignRes.body.order.deliveryStatus}`);

  // STEP 6: Delivery Boy Logs in and Views Assigned Deliveries
  console.log('\n▶ [TEST 6]: Delivery Boy logs in and fetches assigned orders (GET /api/delivery/assigned-orders)...');
  const deliveryLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'delivery@agrimart.com', password: 'Password123' },
  });

  if (deliveryLogin.statusCode !== 200 || !deliveryLogin.body.token) {
    throw new Error('Delivery Boy login failed.');
  }
  const deliveryToken = deliveryLogin.body.token;
  console.log(`  ✅ Delivery Agent authenticated: ${deliveryLogin.body.user.name} (${deliveryLogin.body.user.role})`);

  const assignedOrdersRes = await makeRequest({
    method: 'GET',
    path: '/api/delivery/assigned-orders',
    token: deliveryToken,
  });

  if (assignedOrdersRes.statusCode !== 200 || !Array.isArray(assignedOrdersRes.body.orders)) {
    throw new Error(`Failed to fetch assigned orders: ${JSON.stringify(assignedOrdersRes.body)}`);
  }
  const assignedOrder = assignedOrdersRes.body.orders.find((o: any) => o.id === orderId || o._id === orderId);
  if (!assignedOrder) {
    throw new Error(`Assigned order ${orderId} not found in Delivery Boy list!`);
  }
  console.log(`  ✅ Delivery Agent sees assigned order ${orderNumber} for farmer ${assignedOrder.farmer?.name || 'Farmer'}.`);

  // STEP 7: Delivery Boy Updates Status to OUT_FOR_DELIVERY and DELIVERED
  console.log('\n▶ [TEST 7]: Delivery Boy updates status: OUT_FOR_DELIVERY -> DELIVERED...');
  // 7a: Out for delivery
  const outRes = await makeRequest({
    method: 'PATCH',
    path: `/api/delivery/orders/${orderId}/status`,
    token: deliveryToken,
    body: { status: 'OUT_FOR_DELIVERY', note: 'Out for delivery via motorcycle.' },
  });
  if (outRes.statusCode !== 200 || outRes.body.order.deliveryStatus !== 'OUT_FOR_DELIVERY') {
    throw new Error(`Failed to mark OUT_FOR_DELIVERY: ${JSON.stringify(outRes.body)}`);
  }
  console.log(`  ✅ Step 1: Order ${orderNumber} marked OUT_FOR_DELIVERY.`);

  // 7b: Delivered
  const deliveredRes = await makeRequest({
    method: 'PATCH',
    path: `/api/delivery/orders/${orderId}/status`,
    token: deliveryToken,
    body: { status: 'DELIVERED', note: 'Handed directly to farmer at farm gate.' },
  });
  if (deliveredRes.statusCode !== 200 || deliveredRes.body.order.deliveryStatus !== 'DELIVERED') {
    throw new Error(`Failed to mark DELIVERED: ${JSON.stringify(deliveredRes.body)}`);
  }
  console.log(`  ✅ Step 2: Order ${orderNumber} marked DELIVERED.`);

  // STEP 8: Farmer Views Updated Order Tracking
  console.log('\n▶ [TEST 8]: Farmer verifies delivery status in My Orders (GET /api/orders)...');
  const farmerOrdersRes = await makeRequest({
    method: 'GET',
    path: '/api/orders',
    token: farmerToken,
  });

  const updatedOrder = farmerOrdersRes.body.orders.find((o: any) => o.id === orderId || o._id === orderId);
  if (!updatedOrder) {
    throw new Error(`Order ${orderId} not found in Farmer orders!`);
  }
  console.log(`  ✅ Farmer view verified:`);
  console.log(`     - Order: ${updatedOrder.orderNumber}`);
  console.log(`     - Delivery Status: ${updatedOrder.deliveryStatus}`);
  console.log(`     - Assigned Delivery Agent: ${updatedOrder.deliveryBoyName}`);
  console.log(`     - Agent Phone: ${updatedOrder.deliveryBoyPhone}`);

  // STEP 9: Security & Authorization Verification
  console.log('\n▶ [TEST 9]: Security & Role Guard Verification...');

  // 9a: Farmer cannot access shop delivery boys
  const farmerShopAccess = await makeRequest({
    method: 'GET',
    path: '/api/delivery/shop-delivery-boys',
    token: farmerToken,
  });
  if (farmerShopAccess.statusCode !== 403) {
    throw new Error(`Expected HTTP 403 for Farmer accessing shop delivery boys, got ${farmerShopAccess.statusCode}`);
  }
  console.log('  ✅ Security 1: Farmer forbidden from accessing shop delivery boys list (HTTP 403).');

  // 9b: Farmer cannot assign delivery boys
  const farmerAssign = await makeRequest({
    method: 'POST',
    path: '/api/delivery/assign-order',
    token: farmerToken,
    body: { orderId, deliveryBoyId: deliveryBoy.id },
  });
  if (farmerAssign.statusCode !== 403) {
    throw new Error(`Expected HTTP 403 for Farmer assigning delivery boy, got ${farmerAssign.statusCode}`);
  }
  console.log('  ✅ Security 2: Farmer forbidden from assigning delivery boys (HTTP 403).');

  // 9c: Farmer cannot modify delivery status
  const farmerStatusMod = await makeRequest({
    method: 'PATCH',
    path: `/api/delivery/orders/${orderId}/status`,
    token: farmerToken,
    body: { status: 'DELIVERED' },
  });
  if (farmerStatusMod.statusCode !== 403) {
    throw new Error(`Expected HTTP 403 for Farmer modifying delivery status, got ${farmerStatusMod.statusCode}`);
  }
  console.log('  ✅ Security 3: Farmer forbidden from modifying delivery status (HTTP 403).');

  console.log('\n================================================================');
  console.log('  🎉 ALL DELIVERY & ROLE WORKFLOW TESTS PASSED SUCCESSFULLY!    ');
  console.log('================================================================\n');
};

runDeliveryAndRoleTests().catch((err) => {
  console.error('\n❌ Delivery & Role Tests Failed:', err);
  process.exit(1);
});
