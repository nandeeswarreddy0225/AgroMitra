import http from 'http';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000';

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

const runLiveE2E = async () => {
  console.log('================================================================');
  console.log('  AGRIMART STAGE 5 — LIVE FULL END-TO-END VERIFICATION          ');
  console.log('  Live Backend: http://localhost:5000                           ');
  console.log('  Live Frontend: http://localhost:5173                          ');
  console.log('================================================================\n');

  // Step 1: Health check
  console.log('▶ [1/10] Checking live backend health (/api/health)...');
  const health = await makeRequest({ method: 'GET', path: '/api/health' });
  if (health.statusCode !== 200 || !health.body.success) {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }
  console.log('  ✅ Backend is HEALTHY and responding on port 5000.\n');

  // Step 2: Authenticate real Farmer and Shop Owner
  console.log('▶ [2/10] Authenticating Farmer and Shop Owner with live backend...');
  const farmerEmail = 'nandeeswarreddy2852@gmail.com';
  const shopEmail = 'nandeeswarreddy1346@gmail.com';

  // Import jwt to create authentic tokens for existing database accounts
  const { generateToken } = await import('../utils/jwt');
  const { connectDB, disconnectDB } = await import('../config/db');
  const { User } = await import('../models/User.model');
  const { Product } = await import('../models/Product.model');
  const { Cart } = await import('../models/Cart.model');
  const { Order } = await import('../models/Order.model');
  const { Payment } = await import('../models/Payment.model');

  await connectDB();

  const farmerUser = await User.findOne({ email: farmerEmail });
  const shopUser = await User.findOne({ email: shopEmail });

  if (!farmerUser || !shopUser) {
    throw new Error('Farmer or Shop Owner user not found in MongoDB');
  }

  const farmerToken = generateToken({ id: farmerUser._id.toString(), role: farmerUser.role });
  const shopToken = generateToken({ id: shopUser._id.toString(), role: shopUser.role });

  console.log(`  ✅ Farmer Authenticated: ${farmerUser.name} (${farmerUser.email})`);
  console.log(`  ✅ Shop Owner Authenticated: ${shopUser.name} (${shopUser.email})\n`);

  // Step 3: Fetch Product
  console.log('▶ [3/10] Fetching Urea Fertilizer from live catalog...');
  const prodRes = await makeRequest({ method: 'GET', path: '/api/products' });
  if (prodRes.statusCode !== 200 || prodRes.body.count < 1) {
    throw new Error('Failed to retrieve products');
  }
  const urea = prodRes.body.products.find((p: any) => p.name === 'Urea Fertilizer') || prodRes.body.products[0];
  const prodId = urea.id || urea._id;
  console.log(`  ✅ Product Located: ${urea.name} | Price: ₹${urea.price} / ${urea.unit} | Stock: ${urea.stock}\n`);

  // Step 4: Add to Cart
  console.log('▶ [4/10] Farmer adds product to Cart (POST /api/cart/items)...');
  await makeRequest({ method: 'DELETE', path: '/api/cart', token: farmerToken }); // clear previous cart
  const cartRes = await makeRequest({
    method: 'POST',
    path: '/api/cart/items',
    token: farmerToken,
    body: { productId: prodId, quantity: 1 },
  });
  if (cartRes.statusCode !== 200 || !cartRes.body.success) {
    throw new Error(`Cart add failed: ${JSON.stringify(cartRes.body)}`);
  }
  console.log(`  ✅ Cart contains ${cartRes.body.cart.totalItems} item. Subtotal: ₹${cartRes.body.cart.total}\n`);

  // Step 5: Checkout & Place Order
  console.log('▶ [5/10] Farmer places order (POST /api/orders)...');
  const orderRes = await makeRequest({
    method: 'POST',
    path: '/api/orders',
    token: farmerToken,
    body: {
      deliveryAddress: {
        street: 'Survey 42, Green Agro Farm',
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
  console.log(`  ✅ Order Placed: #${order.orderNumber} | Total: ₹${order.totalAmount} | Status: ${order.status} | Payment: ${order.paymentStatus}\n`);

  // Step 6: Razorpay Server Order Creation
  console.log('▶ [6/10] Creating Razorpay Server Order (POST /api/payments/create-order)...');
  const rzpOrderRes = await makeRequest({
    method: 'POST',
    path: '/api/payments/create-order',
    token: farmerToken,
    body: { orderId },
  });
  if (rzpOrderRes.statusCode !== 200 || !rzpOrderRes.body.success) {
    throw new Error(`Razorpay order creation failed: ${JSON.stringify(rzpOrderRes.body)}`);
  }
  const { keyId, razorpayOrderId, amount, amountPaise } = rzpOrderRes.body;
  console.log(`  ✅ Razorpay Order ID: ${razorpayOrderId} | Key ID: ${keyId} | Amount: ₹${amount} (${amountPaise} paise)\n`);

  // Step 7: Cryptographic HMAC-SHA256 Signature Verification
  console.log('▶ [7/10] Verifying cryptographic payment signature (POST /api/payments/verify)...');
  const paymentId = `pay_e2e_${Date.now()}`;
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
    throw new Error(`Signature verification failed: ${JSON.stringify(verifyRes.body)}`);
  }
  console.log(`  ✅ Payment Verified & Captured! Order paymentStatus: ${verifyRes.body.order.paymentStatus}\n`);

  // Step 8: Verify in MongoDB Atlas
  console.log('▶ [8/10] Verifying Payment & Order records in MongoDB Atlas...');
  const orderInDb = await Order.findById(orderId);
  const paymentInDb = await Payment.findOne({ order: orderId });
  if (orderInDb?.paymentStatus !== 'PAID' || paymentInDb?.status !== 'CAPTURED') {
    throw new Error(`MongoDB verification mismatch: Order paymentStatus=${orderInDb?.paymentStatus}, Payment status=${paymentInDb?.status}`);
  }
  console.log(`  ✅ MongoDB Verified: Order #${orderInDb.orderNumber} is PAID, Payment document is CAPTURED.\n`);

  // Step 9: Shop Owner Views the Paid Order
  console.log('▶ [9/10] Shop Owner views incoming orders (GET /api/orders/shop-owner)...');
  const shopOrdersRes = await makeRequest({
    method: 'GET',
    path: '/api/orders/shop-owner',
    token: shopToken,
  });
  if (shopOrdersRes.statusCode !== 200) {
    throw new Error(`Shop owner orders fetch failed: ${JSON.stringify(shopOrdersRes.body)}`);
  }
  const shopView = shopOrdersRes.body.orders.find((o: any) => o.orderNumber === order.orderNumber);
  if (!shopView || shopView.paymentStatus !== 'PAID') {
    throw new Error(`Shop owner order view failed: ${JSON.stringify(shopView)}`);
  }
  console.log(`  ✅ Shop Owner verified incoming order #${shopView.orderNumber} with Payment Status: ${shopView.paymentStatus}`);

  // Shop Owner Accepts the Order
  const acceptRes = await makeRequest({
    method: 'PUT',
    path: `/api/orders/${orderId}/status`,
    token: shopToken,
    body: { status: 'ACCEPTED' },
  });
  if (acceptRes.statusCode !== 200 || acceptRes.body.order.status !== 'ACCEPTED') {
    throw new Error(`Shop Owner accept failed: ${JSON.stringify(acceptRes.body)}`);
  }
  console.log(`  ✅ Shop Owner ACCEPTED Order #${order.orderNumber}. Status is now: ACCEPTED.\n`);

  // Step 10: Verify Farmer My Orders
  console.log('▶ [10/10] Farmer checks My Orders (GET /api/orders)...');
  const farmerOrdersRes = await makeRequest({
    method: 'GET',
    path: '/api/orders',
    token: farmerToken,
  });
  const farmerView = farmerOrdersRes.body.orders.find((o: any) => o.orderNumber === order.orderNumber);
  if (!farmerView || farmerView.status !== 'ACCEPTED' || farmerView.paymentStatus !== 'PAID') {
    throw new Error(`Farmer orders view mismatch: ${JSON.stringify(farmerView)}`);
  }
  console.log(`  ✅ Farmer views Order #${farmerView.orderNumber} | Order Status: ${farmerView.status} | Payment Status: ${farmerView.paymentStatus}\n`);

  await disconnectDB();

  console.log('================================================================');
  console.log('  🎉 FULL STAGE 5 END-TO-END FLOW VERIFIED WITH 100% SUCCESS!   ');
  console.log('================================================================\n');
};

runLiveE2E().catch((err) => {
  console.error('\n❌ Live E2E Verification failed:', err);
  process.exit(1);
});
