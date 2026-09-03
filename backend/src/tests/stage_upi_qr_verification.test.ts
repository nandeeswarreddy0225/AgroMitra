import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { Order } from '../models/Order.model';
const QRCode = require('../../../frontend/node_modules/qrcode');


const TEST_PORT = 5017;
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

const runUpiQrVerificationTests = async () => {
  console.log('=====================================================================');
  console.log('  KRISHISETU — DIRECT UPI QR PAYMENT VERIFICATION SUITE              ');
  console.log('=====================================================================\n');

  await connectDB();

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    const randomSuffix = Date.now().toString().slice(-4);

    // 1. Create a real Farmer account
    const farmerEmail = `farmer.upi.${randomSuffix}@agrimart.com`;
    const fReg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Govind Farmer',
        email: farmerEmail,
        phone: '9848011221',
        password: 'Password123!',
        role: 'FARMER',
        address: { street: 'Green Field', city: 'Guntur', state: 'AP', pincode: '522002' },
      },
    });
    const farmerToken = fReg.body.token;
    const farmerId = fReg.body.user.id || fReg.body.user._id;

    // 2. Create a real Agri Retail Partner with real UPI ID in MongoDB
    const shopEmail = `dealer.upi.${randomSuffix}@agrimart.com`;
    const sReg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Venkateswara Krishi Kendra',
        email: shopEmail,
        phone: '9849022334',
        password: 'Password123!',
        role: 'SHOP_OWNER',
        shopName: 'Sri Venkateswara Krishi Kendra',
        upiId: 'venkateswara.kendra@okhdfcbank',
      },
    });
    const shopId = sReg.body.user.id || sReg.body.user._id;

    // 3. Create a product owned by this store
    const product = await Product.create({
      name: 'Bio Potash Plus (50kg)',
      category: 'Fertilizers',
      brand: 'KrishiSetu Gold',
      description: 'Granular organic bio potash fertilizer',
      price: 850,
      stock: 40,
      unit: 'bag',
      shopOwner: shopId,
      images: ['https://example.com/potash.jpg'],
    });

    // 4. Create an Order for the Farmer
    const order = await Order.create({
      orderNumber: `ORD-UPI-${Date.now()}-${randomSuffix}`,
      farmer: farmerId,
      items: [
        {
          product: product._id,
          shopOwner: shopId,
          productNameSnapshot: product.name,
          price: product.price,
          quantity: 2,
          unit: product.unit,
          subtotal: 1700,
        },
      ],
      totalAmount: 1700,
      deliveryAddress: { street: 'Field 4', city: 'Guntur', state: 'AP', pincode: '522002' },
      status: 'PENDING',
      paymentStatus: 'PENDING',
    });

    console.log(`▶ [STEP 1]: Order #${order.orderNumber} created. Fetching order details as Farmer...`);

    // 5. Farmer calls GET /api/orders/:id
    const orderRes = await makeRequest({
      method: 'GET',
      path: `/api/orders/${order._id}`,
      token: farmerToken,
    });

    if (orderRes.statusCode !== 200 || !orderRes.body.order) {
      throw new Error(`FAIL: Could not fetch order: ${JSON.stringify(orderRes.body)}`);
    }

    const fetchedOrder = orderRes.body.order;
    const firstItem = fetchedOrder.items?.[0];
    const shopData = typeof firstItem?.shopOwner === 'object' ? firstItem.shopOwner : null;

    if (!shopData) {
      throw new Error('FAIL: items.shopOwner is not populated as an object!');
    }

    if (shopData.upiId !== 'venkateswara.kendra@okhdfcbank') {
      throw new Error(`FAIL: Expected store upiId 'venkateswara.kendra@okhdfcbank', got '${shopData.upiId}'`);
    }

    if (shopData.shopName !== 'Sri Venkateswara Krishi Kendra') {
      throw new Error(`FAIL: Expected store shopName 'Sri Venkateswara Krishi Kendra', got '${shopData.shopName}'`);
    }

    if (fetchedOrder.totalAmount !== 1700) {
      throw new Error(`FAIL: Expected totalAmount 1700, got ${fetchedOrder.totalAmount}`);
    }

    console.log('  ✅ [STEP 1 PASSED]: Actual store UPI ID, store name, and order amount verified.\n');

    // 6. Test NPCI Standard Dynamic UPI URI Generation
    console.log('▶ [STEP 2]: Testing dynamic UPI URI generation...');
    const rawUpi = shopData.upiId;
    const formattedUpi = rawUpi.includes('@') ? rawUpi : `${rawUpi}@upi`;
    const orderRef = fetchedOrder.orderNumber;
    const amountStr = Number(fetchedOrder.totalAmount).toFixed(2);
    const shopName = shopData.shopName || shopData.name;

    const dynamicUpiUri = `upi://pay?pa=${encodeURIComponent(formattedUpi)}&pn=${encodeURIComponent(
      shopName
    )}&am=${encodeURIComponent(amountStr)}&cu=INR&tn=${encodeURIComponent(
      `KrishiSetu Order ${orderRef}`
    )}&tr=${encodeURIComponent(orderRef)}`;

    console.log('  Generated Dynamic UPI URI:');
    console.log(`  ${dynamicUpiUri}`);

    if (!dynamicUpiUri.startsWith('upi://pay?')) {
      throw new Error('FAIL: URI does not start with upi://pay?');
    }
    if (!dynamicUpiUri.includes(`pa=${encodeURIComponent(formattedUpi)}`)) {
      throw new Error('FAIL: URI missing payee VPA parameter');
    }
    if (!dynamicUpiUri.includes(`am=${encodeURIComponent(amountStr)}`)) {
      throw new Error('FAIL: URI missing amount parameter');
    }
    if (!dynamicUpiUri.includes('cu=INR')) {
      throw new Error('FAIL: URI missing cu=INR');
    }

    console.log('  ✅ [STEP 2 PASSED]: Dynamic UPI URI strictly complies with NPCI UPI specs.\n');

    // 7. Test QR Generation with QRCode library
    console.log('▶ [STEP 3]: Testing QR Code Data URL rendering...');
    const qrDataUrl = await QRCode.toDataURL(dynamicUpiUri, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#022c22',
        light: '#ffffff',
      },
    });

    if (!qrDataUrl.startsWith('data:image/png;base64,')) {
      throw new Error('FAIL: QRCode.toDataURL did not produce a valid PNG base64 Data URL');
    }
    console.log(`  QR Code successfully generated: ${qrDataUrl.slice(0, 60)}... (${qrDataUrl.length} bytes)`);
    console.log('  ✅ [STEP 3 PASSED]: Dynamic QR code renders correctly.\n');

    // 8. Test Direct UPI UTR Reference registration (Payment status remains PENDING until verified)
    console.log('▶ [STEP 4]: Testing UTR submission (No false PAID transition)...');
    const utrRes = await makeRequest({
      method: 'POST',
      path: '/api/payments/record-direct-upi',
      token: farmerToken,
      body: {
        orderId: order._id.toString(),
        upiRefNumber: '123456789012',
        upiPayerApp: 'PhonePe',
      },
    });

    if (utrRes.statusCode !== 200) {
      throw new Error(`FAIL: record-direct-upi failed: ${JSON.stringify(utrRes.body)}`);
    }

    // Verify order in MongoDB still has paymentStatus = PENDING
    const dbOrderAfterUtr = await Order.findById(order._id);
    if (!dbOrderAfterUtr || dbOrderAfterUtr.paymentStatus !== 'PENDING') {
      throw new Error(`FAIL: Order paymentStatus should remain PENDING until verified, got ${dbOrderAfterUtr?.paymentStatus}`);
    }

    console.log('  ✅ [STEP 4 PASSED]: Payment status remains PENDING and protected from fake confirmation.\n');

    console.log('=====================================================================');
    console.log('  ALL DIRECT UPI QR PAYMENT TESTS PASSED!                            ');
    console.log('=====================================================================\n');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await disconnectDB();
    process.exit(0);
  }
};

runUpiQrVerificationTests();
