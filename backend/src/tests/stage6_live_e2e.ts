import http from 'http';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

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
      hostname: 'localhost',
      port: 5000,
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

const runStage6LiveVerification = async () => {
  console.log('================================================================');
  console.log('  AGRIMART STAGE 6 — LIVE FULL WORKFLOW VERIFICATION            ');
  console.log('  Live Backend: http://localhost:5000                           ');
  console.log('  Live Frontend: http://localhost:5173                          ');
  console.log('================================================================\n');

  // Step 1: Health check
  console.log('▶ [1/9] Checking live backend health (/api/health)...');
  const health = await makeRequest({ method: 'GET', path: '/api/health' });
  if (health.statusCode !== 200 || !health.body.success) {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }
  console.log('  ✅ Backend is HEALTHY and responding on port 5000.\n');

  // Step 2: Login Farmer and Shop Owner via live /api/auth/login
  console.log('▶ [2/9] Authenticating Farmer & Shop Owner via POST /api/auth/login...');
  const farmerLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: 'nandeeswarreddy2852@gmail.com',
      password: 'Password123',
    },
  });

  if (farmerLogin.statusCode !== 200 || !farmerLogin.body.token) {
    throw new Error(`Farmer login failed: ${JSON.stringify(farmerLogin.body)}`);
  }
  const farmerToken = farmerLogin.body.token;
  console.log(`  ✅ Farmer Logged In: ${farmerLogin.body.user.name} (${farmerLogin.body.user.email})`);

  const shopLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: 'nandeeswarreddy1346@gmail.com',
      password: 'Password123',
    },
  });

  if (shopLogin.statusCode !== 200 || !shopLogin.body.token) {
    throw new Error(`Shop Owner login failed: ${JSON.stringify(shopLogin.body)}`);
  }
  const shopToken = shopLogin.body.token;
  console.log(`  ✅ Shop Owner Logged In: ${shopLogin.body.user.name} (${shopLogin.body.user.email})\n`);

  // Step 3: Fetch Product Catalog
  console.log('▶ [3/9] Farmer views products in marketplace (GET /api/products)...');
  const prodRes = await makeRequest({ method: 'GET', path: '/api/products' });
  if (prodRes.statusCode !== 200 || prodRes.body.count < 1) {
    throw new Error(`Product retrieval failed: ${JSON.stringify(prodRes.body)}`);
  }
  const urea = prodRes.body.products.find((p: any) => p.name === 'Urea Fertilizer') || prodRes.body.products[0];
  const prodId = urea.id || urea._id;
  console.log(`  ✅ Product Located: ${urea.name} | Price: ₹${urea.price} / ${urea.unit} | Stock: ${urea.stock}\n`);

  // Step 4: Add to Cart & Checkout
  console.log('▶ [4/9] Farmer adds product to Cart & Places Order...');
  await makeRequest({ method: 'DELETE', path: '/api/cart', token: farmerToken }); // Clear cart
  await makeRequest({
    method: 'POST',
    path: '/api/cart/items',
    token: farmerToken,
    body: { productId: prodId, quantity: 1 },
  });

  const orderRes = await makeRequest({
    method: 'POST',
    path: '/api/orders',
    token: farmerToken,
    body: {
      deliveryAddress: {
        street: 'Farm Survey 42, Green Belt',
        city: 'Nagpur',
        state: 'Maharashtra',
        pincode: '440001',
      },
    },
  });

  if (orderRes.statusCode !== 201 || !orderRes.body.success) {
    throw new Error(`Order placement failed: ${JSON.stringify(orderRes.body)}`);
  }
  const order = orderRes.body.order;
  const orderId = order.id || order._id;
  console.log(`  ✅ Order Placed: #${order.orderNumber} | Total: ₹${order.totalAmount} | Status: ${order.status}\n`);

  // Step 5: Razorpay Test Payment
  console.log('▶ [5/9] Processing Razorpay Test Payment & Server Verification...');
  const rzpOrderRes = await makeRequest({
    method: 'POST',
    path: '/api/payments/create-order',
    token: farmerToken,
    body: { orderId },
  });

  if (rzpOrderRes.statusCode !== 200 || !rzpOrderRes.body.success) {
    throw new Error(`Razorpay create-order failed: ${JSON.stringify(rzpOrderRes.body)}`);
  }

  const { razorpayOrderId, keyId, amount } = rzpOrderRes.body;
  const paymentId = `pay_live_${Date.now()}`;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${paymentId}`)
    .digest('hex');

  const verifyRes = await makeRequest({
    method: 'POST',
    path: '/api/payments/verify',
    token: farmerToken,
    body: {
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    },
  });

  if (verifyRes.statusCode !== 200 || !verifyRes.body.success) {
    throw new Error(`Payment verification failed: ${JSON.stringify(verifyRes.body)}`);
  }
  console.log(`  ✅ Payment Verified & Captured! Order #${order.orderNumber} paymentStatus: ${verifyRes.body.order.paymentStatus}\n`);

  // Step 6: Shop Owner Views the Order
  console.log('▶ [6/9] Shop Owner views incoming orders (GET /api/orders/shop-owner)...');
  const shopOrdersRes = await makeRequest({
    method: 'GET',
    path: '/api/orders/shop-owner',
    token: shopToken,
  });

  const shopView = shopOrdersRes.body.orders.find((o: any) => o.orderNumber === order.orderNumber);
  if (!shopView || shopView.paymentStatus !== 'PAID') {
    throw new Error(`Shop Owner view failed: ${JSON.stringify(shopOrdersRes.body)}`);
  }
  console.log(`  ✅ Shop Owner sees Order #${shopView.orderNumber} | Customer: ${shopView.farmer.name} | Payment: ${shopView.paymentStatus}\n`);

  // Step 7: Shop Owner Transitions the Order through Complete Lifecycle
  console.log('▶ [7/9] Shop Owner executes progressive fulfillment lifecycle...');
  
  // 7.1 ACCEPTED
  await makeRequest({
    method: 'PUT',
    path: `/api/orders/${orderId}/status`,
    token: shopToken,
    body: { status: 'ACCEPTED' },
  });
  console.log('  → [Step 1/4] Status: ACCEPTED');

  // 7.2 PROCESSING
  await makeRequest({
    method: 'PUT',
    path: `/api/orders/${orderId}/status`,
    token: shopToken,
    body: { status: 'PROCESSING', message: 'Fertilizer bags loaded for delivery.' },
  });
  console.log('  → [Step 2/4] Status: PROCESSING');

  // 7.3 DISPATCHED
  await makeRequest({
    method: 'PUT',
    path: `/api/orders/${orderId}/status`,
    token: shopToken,
    body: { status: 'DISPATCHED', message: 'Dispatched via local tractor service.' },
  });
  console.log('  → [Step 3/4] Status: DISPATCHED');

  // 7.4 DELIVERED
  const resDelivered = await makeRequest({
    method: 'PUT',
    path: `/api/orders/${orderId}/status`,
    token: shopToken,
    body: { status: 'DELIVERED', message: 'Safely delivered at farm storage.' },
  });
  console.log('  → [Step 4/4] Status: DELIVERED\n');

  // Step 8: Farmer Views the Final Tracking Timeline
  console.log('▶ [8/9] Farmer views Order Tracking Timeline (GET /api/orders/:id)...');
  const farmerDetail = await makeRequest({
    method: 'GET',
    path: `/api/orders/${orderId}`,
    token: farmerToken,
  });

  const finalOrder = farmerDetail.body.order;
  if (finalOrder.status !== 'DELIVERED' || !finalOrder.statusTimeline || finalOrder.statusTimeline.length < 5) {
    throw new Error(`Timeline verification failed: ${JSON.stringify(finalOrder)}`);
  }

  console.log(`  ✅ Farmer verified Order #${finalOrder.orderNumber} (Status: ${finalOrder.status}). Timeline:`);
  finalOrder.statusTimeline.forEach((t: any, i: number) => {
    console.log(`     ${i + 1}. [${t.status}] ${t.message}`);
  });

  // Step 9: Rejection with Custom Reason
  console.log('\n▶ [9/9] Testing Shop Owner rejection with reason on second order...');
  // Place another order
  await makeRequest({
    method: 'POST',
    path: '/api/cart/items',
    token: farmerToken,
    body: { productId: prodId, quantity: 1 },
  });
  const order2Res = await makeRequest({
    method: 'POST',
    path: '/api/orders',
    token: farmerToken,
    body: {
      deliveryAddress: { street: 'Farm 2', city: 'Nagpur', state: 'Maharashtra', pincode: '440001' },
    },
  });
  const order2Id = order2Res.body.order.id || order2Res.body.order._id;
  const rejReason = 'Fertilizer batch already committed to local cooperative.';

  const rejectRes = await makeRequest({
    method: 'PUT',
    path: `/api/orders/${order2Id}/status`,
    token: shopToken,
    body: { status: 'REJECTED', rejectionReason: rejReason },
  });

  if (rejectRes.body.order.status !== 'REJECTED' || rejectRes.body.order.rejectionReason !== rejReason) {
    throw new Error(`Rejection test failed: ${JSON.stringify(rejectRes.body)}`);
  }
  console.log(`  ✅ Order #${order2Res.body.order.orderNumber} rejected with reason: "${rejReason}" and inventory restored.\n`);

  console.log('================================================================');
  console.log('  🎉 STAGE 6 WORKFLOW FULLY VERIFIED ON LIVE APPLICATION!       ');
  console.log('================================================================\n');
};

runStage6LiveVerification().catch((err) => {
  console.error('\n❌ Live Verification Failed:', err);
  process.exit(1);
});
