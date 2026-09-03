import http from 'http';
import crypto from 'crypto';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { Order } from '../models/Order.model';
import { Payment } from '../models/Payment.model';

const TEST_PORT = 5008;
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

const runStage5PaymentTests = async () => {
  console.log('====================================================');
  console.log('   AGRIMART — STAGE 5 RAZORPAY PAYMENT TESTS        ');
  console.log('====================================================\n');

  await connectDB();

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    // ---------------------------------------------------------
    // SETUP: Locate existing real Shop Owner, Farmer & Order
    // ---------------------------------------------------------
    console.log('▶ [SETUP]: Locating real Shop Owner, Farmer, and Order in MongoDB...');
    const realFarmer = await User.findOne({ email: 'nandeeswarreddy2852@gmail.com' });
    const realShopOwner = await User.findOne({ email: 'nandeeswarreddy1346@gmail.com' });

    if (!realFarmer || !realShopOwner) {
      throw new Error('SETUP FAILED: Real Farmer or Shop Owner not found in MongoDB');
    }

    const { generateToken } = await import('../utils/jwt');
    const farmerToken = generateToken({ id: realFarmer._id.toString(), role: realFarmer.role });
    const shopToken = generateToken({ id: realShopOwner._id.toString(), role: realShopOwner.role });

    // Locate existing order or create one via clean real flow
    let testOrder = await Order.findOne({ farmer: realFarmer._id, status: { $ne: 'CANCELLED' } });
    if (!testOrder) {
      const ureaProd = await Product.findOne({ name: 'Urea Fertilizer' });
      if (!ureaProd) throw new Error('Urea Fertilizer not found in MongoDB');
      testOrder = await Order.create({
        orderNumber: `AGM-${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        farmer: realFarmer._id,
        items: [
          {
            product: ureaProd._id,
            shopOwner: realShopOwner._id,
            productNameSnapshot: ureaProd.name,
            price: ureaProd.price,
            quantity: 1,
            unit: ureaProd.unit,
            subtotal: ureaProd.price,
          },
        ],
        totalAmount: ureaProd.price,
        deliveryAddress: { street: 'Main Farm Road', city: 'Nagpur', state: 'Maharashtra', pincode: '440001' },
        status: 'PENDING',
        paymentStatus: 'PENDING',
      });
    }

    // Reset paymentStatus to PENDING if previously paid during manual tests
    testOrder.paymentStatus = 'PENDING';
    await testOrder.save();

    const orderIdStr = testOrder._id.toString();
    console.log(`  ✅ SETUP PASSED: Testing with Order ${testOrder.orderNumber} (ID: ${orderIdStr}, Amount: ₹${testOrder.totalAmount})\n`);

    // ---------------------------------------------------------
    // TEST 1: Razorpay Server-Side Order Creation (POST /api/payments/create-order)
    // ---------------------------------------------------------
    console.log('▶ [TEST 1]: Farmer initiates Razorpay Order creation (POST /api/payments/create-order)...');
    const resCreateOrder = await makeRequest({
      method: 'POST',
      path: '/api/payments/create-order',
      token: farmerToken,
      body: { orderId: orderIdStr },
    });

    if (resCreateOrder.statusCode !== 200 || !resCreateOrder.body.success) {
      throw new Error(`TEST 1 FAILED: Status: ${resCreateOrder.statusCode}, Body: ${JSON.stringify(resCreateOrder.body)}`);
    }

    const { keyId, razorpayOrderId, amount, amountPaise, currency } = resCreateOrder.body;

    if (!keyId || !razorpayOrderId || !razorpayOrderId.startsWith('order_')) {
      throw new Error(`TEST 1 FAILED: Invalid Razorpay order ID generated: ${razorpayOrderId}`);
    }

    if (amount !== testOrder.totalAmount || amountPaise !== Math.round(testOrder.totalAmount * 100)) {
      throw new Error(`TEST 1 FAILED: Amount mismatch! Expected ₹${testOrder.totalAmount}, got ${amount}`);
    }

    // Security check: Verify Key Secret is never present in response
    if (JSON.stringify(resCreateOrder.body).includes(process.env.RAZORPAY_KEY_SECRET!)) {
      throw new Error('TEST 1 CRITICAL SECURITY FAILURE: RAZORPAY_KEY_SECRET was leaked in API response!');
    }

    console.log(`  ✅ TEST 1 PASSED: Razorpay Order created: ${razorpayOrderId}, Amount: ₹${amount} (${amountPaise} paise), Key ID: ${keyId}`);

    // ---------------------------------------------------------
    // TEST 2: Verify Payment Document stored in MongoDB
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 2]: Verify Payment document in MongoDB...');
    const paymentInDb = await Payment.findOne({ order: testOrder._id, razorpayOrderId });
    if (!paymentInDb || paymentInDb.status !== 'CREATED' || paymentInDb.amount !== testOrder.totalAmount) {
      throw new Error(`TEST 2 FAILED: Payment document not stored properly: ${JSON.stringify(paymentInDb)}`);
    }
    console.log(`  ✅ TEST 2 PASSED: Payment document verified in MongoDB with status: ${paymentInDb.status}`);

    // ---------------------------------------------------------
    // TEST 3: Cryptographic HMAC-SHA256 Signature Verification (POST /api/payments/verify)
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 3]: Verify genuine payment signature (POST /api/payments/verify)...');
    const mockPaymentId = `pay_test_${Math.floor(10000000 + Math.random() * 90000000)}`;
    const secret = process.env.RAZORPAY_KEY_SECRET!;

    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${mockPaymentId}`)
      .digest('hex');

    const resVerify = await makeRequest({
      method: 'POST',
      path: '/api/payments/verify',
      token: farmerToken,
      body: {
        orderId: orderIdStr,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: validSignature,
      },
    });

    if (resVerify.statusCode !== 200 || !resVerify.body.success) {
      throw new Error(`TEST 3 FAILED: Status: ${resVerify.statusCode}, Body: ${JSON.stringify(resVerify.body)}`);
    }

    // Check updated MongoDB records
    const updatedPayment = await Payment.findById(paymentInDb._id);
    const updatedOrder = await Order.findById(testOrder._id);

    if (updatedPayment?.status !== 'CAPTURED' || updatedPayment?.razorpayPaymentId !== mockPaymentId) {
      throw new Error(`TEST 3 FAILED: Payment document status not CAPTURED: ${updatedPayment?.status}`);
    }

    if (updatedOrder?.paymentStatus !== 'PAID') {
      throw new Error(`TEST 3 FAILED: Order paymentStatus not PAID: ${updatedOrder?.paymentStatus}`);
    }

    console.log(`  ✅ TEST 3 PASSED: Signature verified. Payment marked CAPTURED and Order marked PAID in MongoDB.`);

    // ---------------------------------------------------------
    // TEST 4: Farmer My Orders displays PAID status
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 4]: Farmer checks My Orders (GET /api/orders)...');
    const resFarmerOrders = await makeRequest({
      method: 'GET',
      path: '/api/orders',
      token: farmerToken,
    });

    const farmerOrderView = resFarmerOrders.body.orders.find((o: any) => o.orderNumber === testOrder?.orderNumber);
    if (!farmerOrderView || farmerOrderView.paymentStatus !== 'PAID') {
      throw new Error(`TEST 4 FAILED: Farmer does not see paymentStatus PAID: ${farmerOrderView?.paymentStatus}`);
    }
    console.log(`  ✅ TEST 4 PASSED: Farmer views Order ${farmerOrderView.orderNumber} with Payment Status: ${farmerOrderView.paymentStatus}`);

    // ---------------------------------------------------------
    // TEST 5: Shop Owner Incoming Orders displays PAID status (Read-Only)
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 5]: Shop Owner checks Incoming Orders (GET /api/orders/shop-owner)...');
    const resShopOrders = await makeRequest({
      method: 'GET',
      path: '/api/orders/shop-owner',
      token: shopToken,
    });

    const shopOrderView = resShopOrders.body.orders.find((o: any) => o.orderNumber === testOrder?.orderNumber);
    if (!shopOrderView || shopOrderView.paymentStatus !== 'PAID') {
      throw new Error(`TEST 5 FAILED: Shop Owner does not see paymentStatus PAID: ${shopOrderView?.paymentStatus}`);
    }
    console.log(`  ✅ TEST 5 PASSED: Shop Owner views incoming Order with Payment Status: ${shopOrderView.paymentStatus}`);

    // ---------------------------------------------------------
    // TEST 6: Duplicate Payment Protection
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 6]: Duplicate Payment Protection - Farmer attempts to pay for already PAID order...');
    const resDuplicatePay = await makeRequest({
      method: 'POST',
      path: '/api/payments/create-order',
      token: farmerToken,
      body: { orderId: orderIdStr },
    });

    if (resDuplicatePay.statusCode === 400 && resDuplicatePay.body.message.includes('already been paid')) {
      console.log('  ✅ TEST 6 PASSED: Duplicate payment prevented with HTTP 400: "This order has already been paid."');
    } else {
      throw new Error(`TEST 6 FAILED: Expected 400 duplicate error, got: ${resDuplicatePay.statusCode}, body: ${JSON.stringify(resDuplicatePay.body)}`);
    }

    // ---------------------------------------------------------
    // TEST 7: Invalid / Tampered Signature Rejection
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 7]: Tampered Signature Rejection...');
    // Create temporary test order for invalid signature test
    const tempOrder = await Order.create({
      orderNumber: `AGM-TAMPER-${Math.floor(100000 + Math.random() * 900000)}`,
      farmer: realFarmer._id,
      items: testOrder.items,
      totalAmount: 500,
      deliveryAddress: testOrder.deliveryAddress,
      status: 'PENDING',
      paymentStatus: 'PENDING',
    });

    // Create server razorpay order for tempOrder
    const resTempCreate = await makeRequest({
      method: 'POST',
      path: '/api/payments/create-order',
      token: farmerToken,
      body: { orderId: tempOrder._id.toString() },
    });

    const tempRzpOrderId = resTempCreate.body.razorpayOrderId;

    // Send forged signature
    const fakeSignature = 'f000000000000000000000000000000000000000000000000000000000000000';
    const resTamper = await makeRequest({
      method: 'POST',
      path: '/api/payments/verify',
      token: farmerToken,
      body: {
        orderId: tempOrder._id.toString(),
        razorpay_order_id: tempRzpOrderId,
        razorpay_payment_id: 'pay_fake_999999',
        razorpay_signature: fakeSignature,
      },
    });

    if (resTamper.statusCode === 400 && resTamper.body.message.includes('Invalid payment signature')) {
      const checkTemp = await Order.findById(tempOrder._id);
      if (checkTemp?.paymentStatus === 'PAID') {
        throw new Error('TEST 7 CRITICAL FAILURE: Order was marked as PAID despite invalid signature!');
      }
      console.log('  ✅ TEST 7 PASSED: Tampered signature rejected with HTTP 400 and order was NOT marked as PAID.');
    } else {
      throw new Error(`TEST 7 FAILED: Expected 400, got: ${resTamper.statusCode}, body: ${JSON.stringify(resTamper.body)}`);
    }
    await Order.findByIdAndDelete(tempOrder._id);
    await Payment.deleteMany({ order: tempOrder._id });

    // ---------------------------------------------------------
    // TEST 8: Authorization - Farmer B cannot create payment for Farmer A's order
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 8]: Authorization Check - Farmer B attempts to pay Farmer A\'s order...');
    await User.deleteOne({ email: 'farmer5.b@agrimart.com' });
    const resFarmerB = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Farmer B Security Test',
        email: 'farmer5.b@agrimart.com',
        phone: '9876591111',
        password: 'Password123',
        role: 'FARMER',
        address: { street: 'Sector 4', city: 'Nagpur', state: 'Maharashtra', pincode: '440001' },
      },
    });
    const tokenFarmerB = resFarmerB.body.token;

    const resUnauthPay = await makeRequest({
      method: 'POST',
      path: '/api/payments/create-order',
      token: tokenFarmerB,
      body: { orderId: orderIdStr },
    });

    if (resUnauthPay.statusCode === 403) {
      console.log('  ✅ TEST 8 PASSED: Unauthorized payment attempt rejected with HTTP 403 Forbidden.');
    } else {
      throw new Error(`TEST 8 FAILED: Expected 403, got ${resUnauthPay.statusCode}`);
    }

    // ---------------------------------------------------------
    // TEST 9: Authorization - Shop Owner cannot call Farmer payment endpoints
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 9]: Authorization Check - Shop Owner attempts to initiate payment...');
    const resShopPay = await makeRequest({
      method: 'POST',
      path: '/api/payments/create-order',
      token: shopToken,
      body: { orderId: orderIdStr },
    });

    if (resShopPay.statusCode === 403) {
      console.log('  ✅ TEST 9 PASSED: Shop Owner payment attempt rejected with HTTP 403 Forbidden.');
    } else {
      throw new Error(`TEST 9 FAILED: Expected 403, got ${resShopPay.statusCode}`);
    }

    // Clean up temporary user
    await User.deleteOne({ email: 'farmer5.b@agrimart.com' });

    console.log('\n====================================================');
    console.log('   🎉 ALL STAGE 5 RAZORPAY PAYMENT TESTS PASSED!    ');
    console.log('====================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
};

runStage5PaymentTests().catch((err) => {
  console.error('\n❌ Stage 5 Test failed:', err);
  if (server) server.close();
  disconnectDB().finally(() => process.exit(1));
});
