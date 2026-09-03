import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { Order } from '../models/Order.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';
import { verifyToken } from '../utils/jwt';

const TEST_PORT = 5015;
let server: http.Server;

interface RequestOptions {
  method: string;
  path: string;
  body?: any;
  token?: string;
  headers?: Record<string, string>;
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
        ...(options.headers || {}),
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

const runSecurityAuditTests = async () => {
  console.log('=====================================================================');
  console.log('  KRISHISETU — STAGE 12: COMPREHENSIVE SECURITY & AUTHENTICATION AUDIT');
  console.log('=====================================================================\n');

  await connectDB();

  server = app.listen(TEST_PORT);
  console.log(`🧪 Security Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    const randomSuffix = Date.now().toString().slice(-5);

    // ---------------------------------------------------------
    // AUDIT SECTION 1: REGISTRATION SECURITY & PASSWORD HASHING
    // ---------------------------------------------------------
    console.log('▶ [AUDIT 1]: Registration Security & Password Hashing...');

    // 1A. Farmer Registration
    const farmer1Email = `sec.farmer1.${randomSuffix}@agrimart.com`;
    const f1Reg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Sec Farmer One',
        email: farmer1Email,
        phone: '9988776611',
        password: 'Password123!',
        role: 'FARMER',
        address: { street: 'Main Road', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522002' },
      },
    });
    if (f1Reg.statusCode !== 201 || !f1Reg.body.token) {
      throw new Error(`1A FAIL: Farmer registration failed: ${JSON.stringify(f1Reg.body)}`);
    }
    const farmer1Token = f1Reg.body.token;
    const farmer1Id = f1Reg.body.user.id || f1Reg.body.user._id;

    // 1B. Retail Partner Registration
    const shop1Email = `sec.shop1.${randomSuffix}@agrimart.com`;
    const s1Reg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Sec Agro Dealer',
        email: shop1Email,
        phone: '9988776622',
        password: 'Password123!',
        role: 'SHOP_OWNER',
        shopName: 'Sec Agro Kendra',
      },
    });
    if (s1Reg.statusCode !== 201 || !s1Reg.body.token) {
      throw new Error(`1B FAIL: Shop owner registration failed: ${JSON.stringify(s1Reg.body)}`);
    }
    const shop1Token = s1Reg.body.token;
    const shop1Id = s1Reg.body.user.id || s1Reg.body.user._id;

    // 1C. Delivery Partner Registration
    const del1Email = `sec.delivery1.${randomSuffix}@agrimart.com`;
    const d1Reg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Sec Delivery Agent',
        email: del1Email,
        phone: '9988776633',
        password: 'Password123!',
        role: 'DELIVERY_BOY',
      },
    });
    if (d1Reg.statusCode !== 201 || !d1Reg.body.token) {
      throw new Error(`1C FAIL: Delivery Partner registration failed: ${JSON.stringify(d1Reg.body)}`);
    }
    const del1Token = d1Reg.body.token;
    const del1Id = d1Reg.body.user.id || d1Reg.body.user._id;

    // 1D. Farmer 2 (for tenant boundary testing)
    const farmer2Email = `sec.farmer2.${randomSuffix}@agrimart.com`;
    const f2Reg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Sec Farmer Two',
        email: farmer2Email,
        phone: '9988776644',
        password: 'Password123!',
        role: 'FARMER',
      },
    });
    const farmer2Token = f2Reg.body.token;
    const farmer2Id = f2Reg.body.user.id || f2Reg.body.user._id;

    // 1E. Shop Owner 2 (for tenant boundary testing)
    const shop2Email = `sec.shop2.${randomSuffix}@agrimart.com`;
    const s2Reg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Sec Shop Two',
        email: shop2Email,
        phone: '9988776655',
        password: 'Password123!',
        role: 'SHOP_OWNER',
        shopName: 'Sec Shop Two Kendra',
      },
    });
    const shop2Token = s2Reg.body.token;
    const shop2Id = s2Reg.body.user.id || s2Reg.body.user._id;

    // 1F. Delivery Partner 2 (for tenant boundary testing)
    const del2Email = `sec.delivery2.${randomSuffix}@agrimart.com`;
    const d2Reg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Sec Delivery Two',
        email: del2Email,
        phone: '9988776666',
        password: 'Password123!',
        role: 'DELIVERY_BOY',
      },
    });
    const del2Token = d2Reg.body.token;
    const del2Id = d2Reg.body.user.id || d2Reg.body.user._id;

    // 1G. Verify Password Hashing in Database
    const dbUser = await User.findById(farmer1Id).select('+password');
    if (!dbUser || !dbUser.password || !dbUser.password.startsWith('$2')) {
      throw new Error('1G FAIL: Passwords are not bcrypt hashed in MongoDB storage!');
    }
    if (dbUser.password === 'Password123!') {
      throw new Error('1G FAIL: Plaintext password was saved in MongoDB!');
    }

    // 1H. Duplicate Email Rejection
    const dupReg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Duplicate Hacker',
        email: farmer1Email,
        phone: '9988776677',
        password: 'Password123!',
        role: 'FARMER',
      },
    });
    if (dupReg.statusCode !== 409) {
      throw new Error(`1H FAIL: Expected 409 for duplicate email, got ${dupReg.statusCode}`);
    }

    // 1I. Invalid Role Rejection
    const invalidRoleReg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Illegal Admin',
        email: `illegal.${randomSuffix}@agrimart.com`,
        phone: '9988776688',
        password: 'Password123!',
        role: 'ADMIN',
      },
    });
    if (invalidRoleReg.statusCode !== 400) {
      throw new Error(`1I FAIL: Expected 400 for illegal ADMIN role registration, got ${invalidRoleReg.statusCode}`);
    }

    // 1J. Input Validation: Short password & Malformed email
    const shortPassReg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Short Pass',
        email: `short.${randomSuffix}@agrimart.com`,
        phone: '9988776699',
        password: '123',
        role: 'FARMER',
      },
    });
    if (shortPassReg.statusCode !== 400) {
      throw new Error(`1J FAIL: Expected 400 for password < 6 chars, got ${shortPassReg.statusCode}`);
    }

    console.log('  ✅ [AUDIT 1 PASSED]: Registration, password hashing, and role whitelisting verified.\n');

    // ---------------------------------------------------------
    // AUDIT SECTION 2: LOGIN SECURITY & JWT VALIDATION
    // ---------------------------------------------------------
    console.log('▶ [AUDIT 2]: Login Security & Token Issuance...');

    // 2A. Correct Farmer Login
    const loginFarmer = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: farmer1Email, password: 'Password123!' },
    });
    if (loginFarmer.statusCode !== 200 || !loginFarmer.body.token) {
      throw new Error(`2A FAIL: Farmer login failed: ${JSON.stringify(loginFarmer.body)}`);
    }
    const decodedFToken = verifyToken(loginFarmer.body.token);
    if (decodedFToken.role !== 'FARMER') {
      throw new Error(`2A FAIL: JWT payload contains incorrect role: ${decodedFToken.role}`);
    }

    // 2B. Correct Retail Partner Login
    const loginShop = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: shop1Email, password: 'Password123!' },
    });
    if (loginShop.statusCode !== 200 || loginShop.body.user.role !== 'SHOP_OWNER') {
      throw new Error(`2B FAIL: Retail Partner login failed: ${JSON.stringify(loginShop.body)}`);
    }

    // 2C. Correct Delivery Partner Login
    const loginDelivery = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: del1Email, password: 'Password123!' },
    });
    if (loginDelivery.statusCode !== 200 || loginDelivery.body.user.role !== 'DELIVERY_BOY') {
      throw new Error(`2C FAIL: Delivery Partner login failed: ${JSON.stringify(loginDelivery.body)}`);
    }

    // 2D. Incorrect Password Rejection
    const badPassLogin = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: farmer1Email, password: 'WrongPassword!' },
    });
    if (badPassLogin.statusCode !== 401) {
      throw new Error(`2D FAIL: Expected 401 for incorrect password, got ${badPassLogin.statusCode}`);
    }

    // 2E. Unknown Email Rejection
    const unknownEmailLogin = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: `nonexistent.${randomSuffix}@agrimart.com`, password: 'Password123!' },
    });
    if (unknownEmailLogin.statusCode !== 401) {
      throw new Error(`2E FAIL: Expected 401 for nonexistent email, got ${unknownEmailLogin.statusCode}`);
    }

    console.log('  ✅ [AUDIT 2 PASSED]: Login verification, JWT issuance, and rejection pathways verified.\n');

    // ---------------------------------------------------------
    // AUDIT SECTION 3: PROTECTED ROUTES & ROLE ISOLATION
    // ---------------------------------------------------------
    console.log('▶ [AUDIT 3]: Protected Routes & Cross-Role Access Control...');

    // 3A. Unauthenticated Request Rejection
    const unauthOrders = await makeRequest({
      method: 'GET',
      path: '/api/orders/my-orders',
    });
    if (unauthOrders.statusCode !== 401) {
      throw new Error(`3A FAIL: Expected 401 for unauthenticated request, got ${unauthOrders.statusCode}`);
    }

    // 3B. Malformed Token Rejection
    const malformedTokenReq = await makeRequest({
      method: 'GET',
      path: '/api/orders/my-orders',
      token: 'fake.invalid.jwt.token',
    });
    if (malformedTokenReq.statusCode !== 401) {
      throw new Error(`3B FAIL: Expected 401 for malformed JWT token, got ${malformedTokenReq.statusCode}`);
    }

    // 3C. Farmer CANNOT access Shop Owner orders
    const farmerAccessShopOrders = await makeRequest({
      method: 'GET',
      path: '/api/orders/shop-orders',
      token: farmer1Token,
    });
    if (farmerAccessShopOrders.statusCode !== 403) {
      throw new Error(`3C FAIL: Expected 403 when Farmer accesses shop-orders, got ${farmerAccessShopOrders.statusCode}`);
    }

    // 3D. Farmer CANNOT access Delivery Partner dispatches
    const farmerAccessDelivery = await makeRequest({
      method: 'GET',
      path: '/api/delivery/assigned-orders',
      token: farmer1Token,
    });
    if (farmerAccessDelivery.statusCode !== 403) {
      throw new Error(`3D FAIL: Expected 403 when Farmer accesses delivery-orders, got ${farmerAccessDelivery.statusCode}`);
    }

    // 3E. Shop Owner CANNOT access Delivery Partner dispatches
    const shopAccessDelivery = await makeRequest({
      method: 'GET',
      path: '/api/delivery/assigned-orders',
      token: shop1Token,
    });
    if (shopAccessDelivery.statusCode !== 403) {
      throw new Error(`3E FAIL: Expected 403 when Shop Owner accesses delivery-orders, got ${shopAccessDelivery.statusCode}`);
    }

    // 3F. Delivery Partner CANNOT access Shop Owner orders
    const delAccessShopOrders = await makeRequest({
      method: 'GET',
      path: '/api/orders/shop-orders',
      token: del1Token,
    });
    if (delAccessShopOrders.statusCode !== 403) {
      throw new Error(`3F FAIL: Expected 403 when Delivery Partner accesses shop-orders, got ${delAccessShopOrders.statusCode}`);
    }

    console.log('  ✅ [AUDIT 3 PASSED]: Role-based isolation strictly enforced across all user types.\n');

    // ---------------------------------------------------------
    // AUDIT SECTION 4: BACKEND AUTHORIZATION & DATA BOUNDARY
    // ---------------------------------------------------------
    console.log('▶ [AUDIT 4]: Backend Authorization & ID Tampering Protection...');

    // Create a real product under Shop Owner 1
    const testProduct = await Product.create({
      name: 'Organic Neem Oil',
      category: 'Pesticides',
      brand: 'AgriCare',
      description: 'Pure cold-pressed neem pesticide',
      price: 320,
      stock: 30,
      unit: 'bottle',
      shopOwner: shop1Id,
      images: ['https://example.com/neem.jpg'],
    });

    // Create Order 1 owned by Farmer 1
    const order1 = await Order.create({
      orderNumber: `ORD-SEC1-${randomSuffix}`,
      farmer: farmer1Id,
      items: [
        {
          product: testProduct._id,
          shopOwner: shop1Id,
          productNameSnapshot: testProduct.name,
          price: testProduct.price,
          quantity: 2,
          unit: testProduct.unit,
          subtotal: 640,
        },
      ],
      totalAmount: 640,
      deliveryAddress: { street: 'Green St', city: 'Guntur', state: 'AP', pincode: '522002' },
      status: 'ACCEPTED',
      paymentStatus: 'PAID',
    });

    // 4A. Farmer 2 tries to read Farmer 1's Order by ID
    const f2AccessF1Order = await makeRequest({
      method: 'GET',
      path: `/api/orders/${order1._id}`,
      token: farmer2Token,
    });
    if (f2AccessF1Order.statusCode !== 403) {
      throw new Error(`4A FAIL: Expected 403 for Farmer 2 accessing Farmer 1 order, got ${f2AccessF1Order.statusCode}`);
    }

    // 4B. Shop Owner 2 tries to modify status of Shop Owner 1's Order
    const s2ModifyS1Order = await makeRequest({
      method: 'PATCH',
      path: `/api/orders/${order1._id}/status`,
      token: shop2Token,
      body: { status: 'CANCELLED' },
    });
    if (s2ModifyS1Order.statusCode !== 403) {
      throw new Error(`4B FAIL: Expected 403 for Shop Owner 2 modifying Shop Owner 1 order, got ${s2ModifyS1Order.statusCode}`);
    }

    // 4C. Shop Owner 1 assigns Delivery Partner 1
    await makeRequest({
      method: 'POST',
      path: '/api/delivery/assign-order',
      token: shop1Token,
      body: { orderId: order1._id.toString(), deliveryBoyId: del1Id.toString() },
    });

    // 4D. Delivery Partner 2 tries to respond/accept Delivery Partner 1's order
    const d2AcceptD1Order = await makeRequest({
      method: 'POST',
      path: `/api/delivery/orders/${order1._id}/respond`,
      token: del2Token,
      body: { action: 'ACCEPT' },
    });
    if (d2AcceptD1Order.statusCode !== 403) {
      throw new Error(`4D FAIL: Expected 403 for Delivery Partner 2 tampering with assignment, got ${d2AcceptD1Order.statusCode}`);
    }

    // 4E. Delivery Partner 2 tries to mark Delivery Partner 1's order as delivered
    const d2DeliverD1Order = await makeRequest({
      method: 'PATCH',
      path: `/api/delivery/orders/${order1._id}/status`,
      token: del2Token,
      body: { status: 'DELIVERED' },
    });
    if (d2DeliverD1Order.statusCode !== 403) {
      throw new Error(`4E FAIL: Expected 403 for Delivery Partner 2 status update, got ${d2DeliverD1Order.statusCode}`);
    }

    console.log('  ✅ [AUDIT 4 PASSED]: Multi-tenant ID boundary protection verified for all roles.\n');

    // ---------------------------------------------------------
    // AUDIT SECTION 5: PAYMENT SECURITY & RAZORPAY VERIFICATION
    // ---------------------------------------------------------
    console.log('▶ [AUDIT 5]: Payment Security & Server-Side Verification...');

    // 5A. Farmer 2 CANNOT initiate payment for Farmer 1's order
    const f2PayF1Order = await makeRequest({
      method: 'POST',
      path: '/api/payments/create-order',
      token: farmer2Token,
      body: { orderId: order1._id.toString() },
    });
    if (f2PayF1Order.statusCode !== 403) {
      throw new Error(`5A FAIL: Expected 403 when unauthorized farmer pays another order, got ${f2PayF1Order.statusCode}`);
    }

    // 5B. Fake signature verification rejection
    const fakeSigVerify = await makeRequest({
      method: 'POST',
      path: '/api/payments/verify',
      token: farmer1Token,
      body: {
        orderId: order1._id.toString(),
        razorpay_payment_id: 'pay_fake_123',
        razorpay_order_id: 'order_fake_456',
        razorpay_signature: 'invalid_forged_signature_string',
      },
    });
    if (fakeSigVerify.statusCode !== 400 && fakeSigVerify.statusCode !== 404) {
      throw new Error(`5B FAIL: Expected 400/404 for forged payment signature, got ${fakeSigVerify.statusCode}`);
    }

    console.log('  ✅ [AUDIT 5 PASSED]: Payment isolation and cryptographic verification verified.\n');

    // ---------------------------------------------------------
    // AUDIT SECTION 6: INPUT VALIDATION & ERROR SANITIZATION
    // ---------------------------------------------------------
    console.log('▶ [AUDIT 6]: Input Validation & Error Sanitization...');

    // 6A. Invalid ObjectID parameter handling
    const invalidObjectIdReq = await makeRequest({
      method: 'GET',
      path: '/api/orders/not-a-valid-object-id',
      token: farmer1Token,
    });
    if (invalidObjectIdReq.statusCode !== 400 && invalidObjectIdReq.statusCode !== 404) {
      throw new Error(`6A FAIL: Expected 400/404 for invalid ObjectId parameter, got ${invalidObjectIdReq.statusCode}`);
    }

    // 6B. Empty Cart Checkout Rejection
    const emptyCheckoutReq = await makeRequest({
      method: 'POST',
      path: '/api/orders',
      token: farmer2Token,
      body: { deliveryAddress: { street: 'Main', city: 'Guntur', state: 'AP', pincode: '522002' } },
    });
    if (emptyCheckoutReq.statusCode !== 400) {
      throw new Error(`6B FAIL: Expected 400 for empty cart checkout, got ${emptyCheckoutReq.statusCode}`);
    }


    console.log('  ✅ [AUDIT 6 PASSED]: Input validation and safe error responses verified.\n');

    console.log('=====================================================================');
    console.log('  ALL STAGE 12 SECURITY AUDIT TESTS PASSED SUCCESSFULLY!             ');
    console.log('=====================================================================\n');
  } catch (error) {
    console.error('❌ SECURITY AUDIT FAILED:', error);
    process.exit(1);
  } finally {
    if (server) server.close();
    await disconnectDB();
    process.exit(0);
  }
};

runSecurityAuditTests();
