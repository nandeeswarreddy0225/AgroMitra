import http from 'http';

const BASE_PORT = 5000;

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
      port: BASE_PORT,
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

    req.on('error', (err) => reject(err));
    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
};

const runTransformationTests = async () => {
  console.log('\n========================================================================');
  console.log('   KRISHISETU COMPREHENSIVE REBRAND & SYSTEM TRANSFORMATION TESTS       ');
  console.log('========================================================================\n');

  try {
    // 1. Farmer Login Test
    console.log('▶ [TEST 1]: Existing Farmer Login (nandeeswarreddy2852@gmail.com)...');
    const farmerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'nandeeswarreddy2852@gmail.com', password: 'Password123' },
    });
    if (farmerRes.statusCode !== 200 || !farmerRes.body.token) {
      throw new Error(`Test 1 Failed: ${JSON.stringify(farmerRes.body)}`);
    }
    const farmerToken = farmerRes.body.token;
    console.log(`  ✅ PASSED: Farmer Authenticated: '${farmerRes.body.user.name}' (Role: ${farmerRes.body.user.role})`);

    // 2. Agri Store Partner Login Test
    console.log('\n▶ [TEST 2]: Agri Store Partner Login (nandeeswarreddy1346@gmail.com)...');
    const partnerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'nandeeswarreddy1346@gmail.com', password: 'Password123' },
    });
    if (partnerRes.statusCode !== 200 || !partnerRes.body.token) {
      throw new Error(`Test 2 Failed: ${JSON.stringify(partnerRes.body)}`);
    }
    const partnerToken = partnerRes.body.token;
    console.log(`  ✅ PASSED: Agri Store Partner Authenticated: '${partnerRes.body.user.name}' (Role: ${partnerRes.body.user.role})`);

    // 3. Agri Store Partner Dynamic UPI Update
    console.log('\n▶ [TEST 3]: Agri Store Partner UPI ID & Profile Configuration...');
    const customUpi = `nandeeswar.${Date.now()}@ybl`;
    const updateProfileRes = await makeRequest({
      method: 'PUT',
      path: '/api/auth/profile',
      token: partnerToken,
      body: {
        shopName: 'Sri Venkateswara Krishi Seva Kendra',
        upiId: customUpi,
        phone: '9848011223',
        address: {
          street: 'Main Mandi Road, Shop #12',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518001',
        },
      },
    });
    if (updateProfileRes.statusCode !== 200 || updateProfileRes.body.user?.upiId !== customUpi) {
      throw new Error(`Test 3 Failed: ${JSON.stringify(updateProfileRes.body)}`);
    }
    console.log(`  ✅ PASSED: Store Partner UPI updated dynamically to: '${updateProfileRes.body.user.upiId}'`);

    // 4. Register New Farmer
    const newFarmerEmail = `kisan.${Date.now()}@krishisetu.in`;
    console.log(`\n▶ [TEST 4]: Registering Brand New Farmer (${newFarmerEmail})...`);
    const regFarmerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Balaram Reddy',
        email: newFarmerEmail,
        phone: '9848098765',
        password: 'KisanPassword@2026',
        role: 'FARMER',
        address: {
          street: 'Farm Field Plot 4',
          city: 'Guntur',
          state: 'Andhra Pradesh',
          pincode: '522001',
        },
      },
    });
    if (regFarmerRes.statusCode !== 201 || !regFarmerRes.body.token) {
      throw new Error(`Test 4 Failed: ${JSON.stringify(regFarmerRes.body)}`);
    }
    console.log(`  ✅ PASSED: New Farmer Registered & Token Generated: '${regFarmerRes.body.user.name}'`);

    // 5. Register New Agri Store Partner
    const newPartnerEmail = `partner.${Date.now()}@krishisetu.in`;
    console.log(`\n▶ [TEST 5]: Registering Brand New Agri Store Partner (${newPartnerEmail})...`);
    const regPartnerRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Guntur Bio Inputs & Seeds',
        email: newPartnerEmail,
        phone: '9848055443',
        password: 'PartnerPassword@2026',
        role: 'SHOP_OWNER',
        address: {
          street: 'APMC Market Yard Gate 2',
          city: 'Guntur',
          state: 'Andhra Pradesh',
          pincode: '522001',
        },
      },
    });
    if (regPartnerRes.statusCode !== 201 || !regPartnerRes.body.token) {
      throw new Error(`Test 5 Failed: ${JSON.stringify(regPartnerRes.body)}`);
    }
    console.log(`  ✅ PASSED: New Agri Store Partner Registered: '${regPartnerRes.body.user.name}'`);

    // 6. Fetch Marketplace Products from MongoDB
    console.log('\n▶ [TEST 6]: Fetching Live Marketplace Products from Database...');
    const productsRes = await makeRequest({
      method: 'GET',
      path: '/api/products',
    });
    if (productsRes.statusCode !== 200 || !Array.isArray(productsRes.body.products)) {
      throw new Error(`Test 6 Failed: ${JSON.stringify(productsRes.body)}`);
    }
    console.log(`  ✅ PASSED: Live MongoDB Products Loaded: ${productsRes.body.products.length} products available.`);

    // 7. Verify Order Creation & Direct UPI Payment Recording
    if (productsRes.body.products.length > 0) {
      const targetProduct = productsRes.body.products[0];
      const prodId = targetProduct.id || targetProduct._id;
      console.log(`\n▶ [TEST 7]: Adding product '${targetProduct.name}' to Cart & Creating Order...`);
      
      // Add to Cart first
      const cartRes = await makeRequest({
        method: 'POST',
        path: '/api/cart/items',
        token: farmerToken,
        body: {
          productId: prodId,
          quantity: 2,
        },
      });
      if (cartRes.statusCode !== 200) {
        throw new Error(`Add to cart failed: ${JSON.stringify(cartRes.body)}`);
      }

      const orderCreateRes = await makeRequest({
        method: 'POST',
        path: '/api/orders',
        token: farmerToken,
        body: {
          deliveryAddress: {
            street: 'Farm Field Plot #12',
            city: 'Guntur',
            state: 'Andhra Pradesh',
            pincode: '522001',
          },
          notes: 'Deliver before noon spray window',
        },
      });

      if (orderCreateRes.statusCode !== 201 || !orderCreateRes.body.order) {
        throw new Error(`Order creation failed: ${JSON.stringify(orderCreateRes.body)}`);
      }
      const createdOrder = orderCreateRes.body.order;
      const orderId = createdOrder.id || createdOrder._id;
      console.log(`  ✅ PASSED: Order Created #${createdOrder.orderNumber} (Amount: ₹${createdOrder.totalAmount}, Payment: ${createdOrder.paymentStatus})`);

      // 8. Test Direct UPI Registration Endpoint (No fake PAID claim)
      console.log('\n▶ [TEST 8]: Recording Direct Store Partner UPI Payment Reference...');
      const upiRef = `UPI${Date.now().toString().slice(-8)}`;
      const directUpiRes = await makeRequest({
        method: 'POST',
        path: '/api/payments/direct-upi',
        token: farmerToken,
        body: {
          orderId,
          upiRefNumber: upiRef,
          upiPayerApp: 'PhonePe',
        },
      });
      if (directUpiRes.statusCode !== 200 || directUpiRes.body.order.paymentStatus !== 'PENDING') {
        throw new Error(`Test 8 Failed: ${JSON.stringify(directUpiRes.body)}`);
      }
      console.log(`  ✅ PASSED: Direct UPI reference recorded ('${upiRef}'). Payment status properly set to '${directUpiRes.body.order.paymentStatus}' (No false instantaneous payment success).`);
    }

    console.log('\n========================================================================');
    console.log('  🎉 ALL KRISHISETU TRANSFORMATION & PAYMENT TESTS PASSED!             ');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\n❌ Transformation Test Suite Failed:', err);
    process.exit(1);
  }
};

runTransformationTests();
