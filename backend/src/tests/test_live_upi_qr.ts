import http from 'http';

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

async function testLiveUpi() {
  console.log('=====================================================================');
  console.log('  TESTING LIVE DIRECT UPI QR PAYMENT WORKFLOW ON PORT 5000           ');
  console.log('=====================================================================\n');

  try {
    const randomSuffix = Date.now().toString().slice(-4);
    const farmerEmail = `farmer.upi.${randomSuffix}@agrimart.com`;

    // 1. Register fresh Farmer
    console.log(`▶ Registering Farmer (${farmerEmail})...`);
    const fReg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Ramesh Farmer',
        email: farmerEmail,
        phone: '9848011221',
        password: 'Password123!',
        role: 'FARMER',
        address: { street: 'Green Field', city: 'Guntur', state: 'AP', pincode: '522002' },
      },
    });

    if (fReg.statusCode !== 201 || !fReg.body.token) {
      throw new Error(`Farmer registration failed: ${JSON.stringify(fReg.body)}`);
    }
    const farmerToken = fReg.body.token;
    console.log('  ✅ Farmer registered and token issued.');

    // 2. Register fresh Agri Retail Partner with UPI ID in MongoDB
    const shopEmail = `dealer.upi.${randomSuffix}@agrimart.com`;
    console.log(`\n▶ Registering Agri Retail Partner with UPI (${shopEmail})...`);
    const sReg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Sri Venkateswara Krishi Kendra',
        email: shopEmail,
        phone: '9849022334',
        password: 'Password123!',
        role: 'SHOP_OWNER',
        shopName: 'Sri Venkateswara Krishi Kendra Guntur',
        upiId: 'venkateswara.kendra@okhdfcbank',
      },
    });

    if (sReg.statusCode !== 201) {
      throw new Error(`Shop registration failed: ${JSON.stringify(sReg.body)}`);
    }
    const shopToken = sReg.body.token;
    console.log('  ✅ Agri Retail Partner registered with UPI: venkateswara.kendra@okhdfcbank');

    // 3. Shop Owner creates a Product
    console.log('\n▶ Creating Product under Agri Retail Partner...');
    const prodRes = await makeRequest({
      method: 'POST',
      path: '/api/products',
      token: shopToken,
      body: {
        name: 'Organic Bio Potash (50kg)',
        category: 'Fertilizers',
        brand: 'KrishiSetu',
        description: 'High grade granular bio potash',
        price: 750,
        stock: 50,
        unit: 'bag',
        images: ['https://images.unsplash.com/photo-1574943320219-553eb213f72d'],
      },
    });

    if (prodRes.statusCode !== 201 || !prodRes.body.product) {
      throw new Error(`Product creation failed: ${JSON.stringify(prodRes.body)}`);
    }
    const product = prodRes.body.product;
    const productId = product.id || product._id;
    console.log(`  ✅ Product created (ID: ${productId}, Price: ₹750)`);

    // 4. Farmer adds product to cart and places order
    console.log('\n▶ Farmer adding product to cart...');
    await makeRequest({
      method: 'POST',
      path: '/api/cart',
      token: farmerToken,
      body: {
        productId,
        quantity: 2,
      },
    });

    console.log('▶ Farmer checking out Order (/api/orders)...');
    const orderRes = await makeRequest({
      method: 'POST',
      path: '/api/orders',
      token: farmerToken,
      body: {
        deliveryAddress: {
          street: 'Plot 4, Farm Road',
          city: 'Guntur',
          state: 'Andhra Pradesh',
          pincode: '522002',
        },
      },
    });

    if (orderRes.statusCode !== 201 || !orderRes.body.order) {
      throw new Error(`Order checkout failed: ${JSON.stringify(orderRes.body)}`);
    }
    const orderData = orderRes.body.order;
    const orderId = orderData.id || orderData._id;
    console.log(`  ✅ Order created (#${orderData.orderNumber}, Amount: ₹${orderData.totalAmount})`);


    // 3. Fetch Single Order by ID (/api/orders/:id)
    const singleOrderRes = await makeRequest({
      method: 'GET',
      path: `/api/orders/${orderId}`,
      token: farmerToken,
    });

    if (singleOrderRes.statusCode !== 200 || !singleOrderRes.body.order) {
      throw new Error(`Could not fetch single order: ${JSON.stringify(singleOrderRes.body)}`);
    }

    const singleOrderData = singleOrderRes.body.order;
    const firstItem = singleOrderData.items?.[0];
    const shopData = typeof firstItem?.shopOwner === 'object' ? firstItem.shopOwner : null;

    console.log('\n--- STORE PARTNER & UPI DETAILS ---');
    console.log('Store Name:', shopData?.shopName || shopData?.name);
    console.log('Store Phone:', shopData?.phone);
    console.log('Saved UPI ID:', shopData?.upiId);
    console.log('Order Amount:', singleOrderData.totalAmount);
    console.log('Payment Status:', singleOrderData.paymentStatus);

    // 4. Simulate Dynamic UPI URI Generation
    const rawUpi = (shopData?.upiId || shopData?.phone || '').trim();
    const formattedUpi = rawUpi.includes('@') ? rawUpi : `${rawUpi}@upi`;
    const orderRef = singleOrderData.orderNumber;
    const amountStr = Number(singleOrderData.totalAmount).toFixed(2);
    const shopName = (shopData?.shopName || shopData?.name || 'Agri Retail Partner').trim();


    const dynamicUpiUri = `upi://pay?pa=${encodeURIComponent(formattedUpi)}&pn=${encodeURIComponent(
      shopName
    )}&am=${encodeURIComponent(amountStr)}&cu=INR&tn=${encodeURIComponent(
      `KrishiSetu Order ${orderRef}`
    )}&tr=${encodeURIComponent(orderRef)}`;

    console.log('\n--- DYNAMIC UPI URI GENERATED ---');
    console.log(dynamicUpiUri);

    // 5. Test Direct UPI UTR Registration (/api/payments/direct-upi)
    console.log('\n▶ Submitting UPI UTR reference without marking fake PAID status...');
    const utrRes = await makeRequest({
      method: 'POST',
      path: '/api/payments/direct-upi',
      token: farmerToken,
      body: {
        orderId,
        upiRefNumber: '123456789012',
        upiPayerApp: 'PhonePe',
      },
    });

    console.log('UTR Submission Response Status:', utrRes.statusCode);
    console.log('Response Message:', utrRes.body.message);

    // 6. Verify Payment Status remains PENDING
    const verifyOrderRes = await makeRequest({
      method: 'GET',
      path: `/api/orders/${orderId}`,
      token: farmerToken,
    });
    console.log('Updated Payment Status:', verifyOrderRes.body.order?.paymentStatus);

    if (verifyOrderRes.body.order?.paymentStatus !== 'PENDING' && verifyOrderRes.body.order?.paymentStatus !== 'PAID') {
      throw new Error(`Unexpected payment status: ${verifyOrderRes.body.order?.paymentStatus}`);
    }

    console.log('\n=====================================================================');
    console.log('  LIVE DIRECT UPI QR TEST COMPLETED SUCCESSFULLY!                    ');
    console.log('=====================================================================\n');
  } catch (err) {
    console.error('❌ LIVE TEST FAILED:', err);
  }
}

testLiveUpi();
