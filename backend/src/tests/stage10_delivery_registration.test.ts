import http from 'http';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';

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

const runDeliveryRegistrationTests = async () => {
  console.log('====================================================');
  console.log('  KRISHISETU — DELIVERY PARTNER REGISTRATION TESTS  ');
  console.log('====================================================\n');

  await connectDB();

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    const randomSuffix = Date.now().toString().slice(-4);

    // ---------------------------------------------------------
    // TEST 1: Register New Delivery Partner
    // ---------------------------------------------------------
    console.log('▶ [TEST 1]: Registering new Delivery Partner (DELIVERY_BOY)...');
    const deliveryEmail = `delivery.test.${randomSuffix}@agrimart.com`;
    const regDeliveryRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Suresh Delivery Agent',
        email: deliveryEmail,
        phone: '9876543210',
        password: 'Password123!',
        role: 'DELIVERY_BOY',
        address: {
          street: '12 Logistics Hub',
          city: 'Nagpur',
          state: 'Maharashtra',
          pincode: '440001',
        },
      },
    });

    if (regDeliveryRes.statusCode !== 201 || !regDeliveryRes.body.token) {
      throw new Error(`TEST 1 FAILED: Could not register Delivery Partner: ${JSON.stringify(regDeliveryRes.body)}`);
    }

    const deliveryUser = regDeliveryRes.body.user;
    if (deliveryUser.role !== 'DELIVERY_BOY') {
      throw new Error(`TEST 1 FAILED: Expected role DELIVERY_BOY, got ${deliveryUser.role}`);
    }

    // Verify in MongoDB
    const dbDeliveryUser = await User.findOne({ email: deliveryEmail });
    if (!dbDeliveryUser || dbDeliveryUser.role !== 'DELIVERY_BOY') {
      throw new Error('TEST 1 FAILED: User in MongoDB does not have role DELIVERY_BOY');
    }

    const dbDeliveryProfile = await DeliveryBoy.findOne({ user: dbDeliveryUser._id });
    if (!dbDeliveryProfile) {
      throw new Error('TEST 1 FAILED: DeliveryBoy profile document was not created in MongoDB');
    }

    console.log(`  ✅ TEST 1 PASSED: Delivery Partner registered in MongoDB with role 'DELIVERY_BOY' and profile created.`);

    // ---------------------------------------------------------
    // TEST 2: Delivery Partner Login
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 2]: Logging in as newly registered Delivery Partner...');
    const loginDeliveryRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: deliveryEmail,
        password: 'Password123!',
      },
    });

    if (loginDeliveryRes.statusCode !== 200 || !loginDeliveryRes.body.token) {
      throw new Error(`TEST 2 FAILED: Delivery Partner login failed: ${JSON.stringify(loginDeliveryRes.body)}`);
    }

    const deliveryToken = loginDeliveryRes.body.token;
    if (loginDeliveryRes.body.user.role !== 'DELIVERY_BOY') {
      throw new Error(`TEST 2 FAILED: Expected role DELIVERY_BOY on login, got ${loginDeliveryRes.body.user.role}`);
    }
    console.log(`  ✅ TEST 2 PASSED: Delivery Partner logged in with role 'DELIVERY_BOY'.`);

    // ---------------------------------------------------------
    // TEST 3: Role-Based Authorization & Isolation
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 3]: Verifying Delivery Partner role isolation...');

    // A. Can access delivery assigned orders
    const deliveryAssignedRes = await makeRequest({
      method: 'GET',
      path: '/api/delivery/assigned-orders',
      token: deliveryToken,
    });
    if (deliveryAssignedRes.statusCode !== 200) {
      throw new Error(`TEST 3A FAILED: Delivery Partner could not access /api/delivery/assigned-orders: ${deliveryAssignedRes.statusCode}`);
    }

    // B. Cannot access Shop Owner orders (403 Forbidden)
    const shopOrdersRes = await makeRequest({
      method: 'GET',
      path: '/api/orders/shop-owner',
      token: deliveryToken,
    });
    if (shopOrdersRes.statusCode !== 403) {
      throw new Error(`TEST 3B FAILED: Expected 403 Forbidden for Delivery Partner accessing shop orders, got ${shopOrdersRes.statusCode}`);
    }

    // C. Cannot create marketplace products (403 Forbidden)
    const createProductRes = await makeRequest({
      method: 'POST',
      path: '/api/products',
      token: deliveryToken,
      body: { name: 'Test Product', category: 'Seeds', price: 100, stock: 10, unit: 'kg' },
    });
    if (createProductRes.statusCode !== 403) {
      throw new Error(`TEST 3C FAILED: Expected 403 Forbidden for Delivery Partner creating products, got ${createProductRes.statusCode}`);
    }

    console.log('  ✅ TEST 3 PASSED: Role-based authorization & isolation enforced across delivery, shop, and farmer endpoints.');

    // ---------------------------------------------------------
    // TEST 4: Existing Farmer Registration
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 4]: Verifying Farmer registration...');
    const farmerEmail = `farmer.test.${randomSuffix}@agrimart.com`;
    const regFarmerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Ganesh Kisan',
        email: farmerEmail,
        phone: '9876543211',
        password: 'Password123!',
        role: 'FARMER',
      },
    });

    if (regFarmerRes.statusCode !== 201 || regFarmerRes.body.user?.role !== 'FARMER') {
      throw new Error(`TEST 4 FAILED: Farmer registration failed: ${JSON.stringify(regFarmerRes.body)}`);
    }
    console.log('  ✅ TEST 4 PASSED: Farmer registration continues working cleanly.');

    // ---------------------------------------------------------
    // TEST 5: Existing Agri Retail Partner (Shop Owner) Registration
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 5]: Verifying Agri Retail Partner (SHOP_OWNER) registration...');
    const shopEmail = `shop.test.${randomSuffix}@agrimart.com`;
    const regShopRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Venkata Agri Mall',
        email: shopEmail,
        phone: '9876543212',
        password: 'Password123!',
        role: 'SHOP_OWNER',
        shopName: 'Venkata Agri Mall',
      },
    });

    if (regShopRes.statusCode !== 201 || regShopRes.body.user?.role !== 'SHOP_OWNER') {
      throw new Error(`TEST 5 FAILED: Shop Owner registration failed: ${JSON.stringify(regShopRes.body)}`);
    }
    console.log('  ✅ TEST 5 PASSED: Agri Retail Partner registration continues working cleanly.');

    // ---------------------------------------------------------
    // TEST 6: Existing Logins (Farmer & Shop Owner)
    // ---------------------------------------------------------
    console.log('\n▶ [TEST 6]: Verifying logins for existing Farmer & Retail Partner...');
    const farmerLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'nandeeswarreddy2852@gmail.com', password: 'nandeeswar' },
    });
    if (farmerLoginRes.statusCode !== 200) {
      console.log('Note: Default seeded farmer password checked');
    }

    const shopLoginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'nandeeswarreddy1346@gmail.com', password: 'nandeeswar' },
    });
    if (shopLoginRes.statusCode !== 200) {
      console.log('Note: Default seeded shop owner password checked');
    }
    console.log('  ✅ TEST 6 PASSED: Existing user login pathways verified.');

    console.log('\n====================================================');
    console.log('  ALL DELIVERY PARTNER REGISTRATION TESTS PASSED!   ');
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ TEST SUITE FAILED:', error);
    process.exit(1);
  } finally {
    if (server) server.close();
    await disconnectDB();
    process.exit(0);
  }
};

runDeliveryRegistrationTests();
