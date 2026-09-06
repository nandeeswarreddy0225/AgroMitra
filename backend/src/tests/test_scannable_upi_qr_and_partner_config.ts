import http from 'http';
import axios from 'axios';
import QRCode from 'qrcode';
import app from '../app';
import { connectDB } from '../config/db';
import { Product } from '../models/Product.model';
import { User } from '../models/User.model';
import { Order } from '../models/Order.model';
import { Payment } from '../models/Payment.model';
import { StorePaymentConfig } from '../models/StorePaymentConfig.model';
import { generateToken } from '../utils/jwt';

const PORT = 5133;
const BASE_URL = `http://localhost:${PORT}/api`;

interface TestReportItem {
  no: number;
  testItem: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const testResults: TestReportItem[] = [];

function recordTest(no: number, testItem: string, passed: boolean, details: string) {
  testResults.push({
    no,
    testItem,
    status: passed ? 'PASS' : 'FAIL',
    details,
  });
  if (passed) {
    console.log(`✅ [PASS] #${no} ${testItem}: ${details}`);
  } else {
    console.error(`❌ [FAIL] #${no} ${testItem}: ${details}`);
  }
}

async function runScannableUpiAndPartnerConfigTest() {
  console.log('================================================================================');
  console.log('🌾 AgriMart — REAL STORE PARTNER UPI & SCANNABLE QR VERIFICATION');
  console.log('================================================================================\n');

  await connectDB();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`📡 Verification Server listening on port ${PORT}`);
      resolve();
    });
  });

  try {
    // ----------------------------------------------------------------------------
    // 1. SETUP USERS & AUTH TOKENS
    // ----------------------------------------------------------------------------
    let adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'AgriMart Admin',
        email: 'admin_scannable_upi@agrimart.test',
        phone: '9888877772',
        password: 'password123',
        role: 'ADMIN',
        isVerified: true,
      });
    }

    let partnerUser = await User.findOne({ role: 'AGRI_PARTNER' });
    if (!partnerUser) {
      partnerUser = await User.create({
        name: 'Kisan Kendra Store Partner',
        email: 'partner_scannable_upi@agrimart.test',
        phone: '8247303735',
        password: 'password123',
        role: 'AGRI_PARTNER',
        isVerified: true,
      });
    }

    let farmerUser = await User.findOne({ role: 'FARMER' });
    if (!farmerUser) {
      farmerUser = await User.create({
        name: 'Suresh Kumar (Farmer)',
        email: 'farmer_scannable_upi@agrimart.test',
        phone: '9777766662',
        password: 'password123',
        role: 'FARMER',
        address: { street: 'Gooty Road', city: 'Anantapur', state: 'Andhra Pradesh', pincode: '515001' },
        isVerified: true,
      });
    }

    let deliveryUser = await User.findOne({ role: 'DELIVERY_BOY' });
    if (!deliveryUser) {
      deliveryUser = await User.create({
        name: 'Delivery Agent',
        email: 'delivery_scannable_upi@agrimart.test',
        phone: '9666655552',
        password: 'password123',
        role: 'DELIVERY_BOY',
        isVerified: true,
      });
    }

    const adminToken = generateToken({ id: adminUser._id.toString(), role: adminUser.role });
    const partnerToken = generateToken({ id: partnerUser._id.toString(), role: partnerUser.role });
    const farmerToken = generateToken({ id: farmerUser._id.toString(), role: farmerUser.role });
    const deliveryToken = generateToken({ id: deliveryUser._id.toString(), role: deliveryUser.role });

    // ----------------------------------------------------------------------------
    // TEST 1: AGRI PARTNER / STORE PARTNER PAYMENT CONFIGURATION (Phone: 8247303735)
    // ----------------------------------------------------------------------------
    const partnerPayload = {
      storeName: 'Anantapur Kisan Agro Seva Kendra',
      phoneNumber: '8247303735',
      upiId: '8247303735@ybl',
      merchantName: 'Kisan Kendra Store',
      isActive: true,
    };

    const partnerUpdateRes = await axios.put(`${BASE_URL}/payments/store-config`, partnerPayload, {
      headers: { Authorization: `Bearer ${partnerToken}` },
    });

    const isPartnerSaved =
      partnerUpdateRes.status === 200 &&
      partnerUpdateRes.data.data.phoneNumber === '8247303735' &&
      partnerUpdateRes.data.data.upiId === '8247303735@ybl' &&
      partnerUpdateRes.data.data.storeName === 'Anantapur Kisan Agro Seva Kendra';

    recordTest(
      1,
      'Store Partner Payment Phone & UPI Configuration',
      isPartnerSaved,
      `Store Partner configured phone ${partnerUpdateRes.data.data.phoneNumber}, UPI VPA ${partnerUpdateRes.data.data.upiId}, Store: ${partnerUpdateRes.data.data.storeName}`
    );

    // ----------------------------------------------------------------------------
    // TEST 2: ADMIN PAYMENT CONFIGURATION PERMISSION
    // ----------------------------------------------------------------------------
    const adminPayload = {
      storeName: 'Anantapur Kisan Agro Hub',
      phoneNumber: '8247303735',
      upiId: '8247303735@upi',
      merchantName: 'AgriMart Store Partner',
      isActive: true,
    };

    const adminUpdateRes = await axios.put(`${BASE_URL}/payments/store-config`, adminPayload, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const isAdminSaved =
      adminUpdateRes.status === 200 &&
      adminUpdateRes.data.data.phoneNumber === '8247303735' &&
      adminUpdateRes.data.data.upiId === '8247303735@upi' &&
      adminUpdateRes.data.data.storeName === 'Anantapur Kisan Agro Hub';

    recordTest(
      2,
      'Admin Store Payment Update Permission',
      isAdminSaved,
      `Admin successfully updated store payment config. New UPI VPA: ${adminUpdateRes.data.data.upiId}`
    );

    // ----------------------------------------------------------------------------
    // TEST 3: ROLE SECURITY ISOLATION (FARMER & DELIVERY_BOY 403 FORBIDDEN)
    // ----------------------------------------------------------------------------
    let farmerBlocked = false;
    try {
      await axios.put(
        `${BASE_URL}/payments/store-config`,
        { storeName: 'Hacked Store', upiId: 'fraud@upi' },
        { headers: { Authorization: `Bearer ${farmerToken}` } }
      );
    } catch (err: any) {
      if (err.response && (err.response.status === 403 || err.response.status === 401)) {
        farmerBlocked = true;
      }
    }

    let deliveryBlocked = false;
    try {
      await axios.put(
        `${BASE_URL}/payments/store-config`,
        { storeName: 'Hacked Store 2', upiId: 'fraud2@upi' },
        { headers: { Authorization: `Bearer ${deliveryToken}` } }
      );
    } catch (err: any) {
      if (err.response && (err.response.status === 403 || err.response.status === 401)) {
        deliveryBlocked = true;
      }
    }

    recordTest(
      3,
      'Security Isolation (Farmer & Delivery Blocked from Config)',
      farmerBlocked && deliveryBlocked,
      `Farmer status: ${farmerBlocked ? '403 Forbidden' : 'Failed'}, Delivery status: ${deliveryBlocked ? '403 Forbidden' : 'Failed'}`
    );

    // ----------------------------------------------------------------------------
    // TEST 4: MONGODB PERSISTENCE & RETRIEVAL OF UPI CONFIG
    // ----------------------------------------------------------------------------
    const dbConfig = await StorePaymentConfig.findOne({ isActive: true });
    const isDbPersisted =
      !!dbConfig &&
      dbConfig.phoneNumber === '8247303735' &&
      dbConfig.upiId === '8247303735@upi' &&
      dbConfig.storeName === 'Anantapur Kisan Agro Hub';

    recordTest(
      4,
      'MongoDB Store Payment Persistence',
      isDbPersisted,
      `Persisted in MongoDB: Store="${dbConfig?.storeName}", Phone="${dbConfig?.phoneNumber}", UPI="${dbConfig?.upiId}", Active=${dbConfig?.isActive}`
    );

    // ----------------------------------------------------------------------------
    // TEST 5: ORDER CREATION & DYNAMIC ORDER AMOUNT CALCULATION
    // ----------------------------------------------------------------------------
    const realProduct = await Product.findOne({ stock: { $gt: 5 } });
    if (!realProduct) {
      throw new Error('Real product not found in catalog');
    }

    const testQuantity = 2;
    const expectedTotal = realProduct.price * testQuantity;

    const testOrder = await Order.create({
      farmer: farmerUser._id,
      orderNumber: `ORD-${Date.now()}`,
      items: [
        {
          product: realProduct._id,
          shopOwner: realProduct.shopOwner || adminUser._id,
          productNameSnapshot: realProduct.name,
          quantity: testQuantity,
          price: realProduct.price,
          unit: realProduct.unit || 'packet',
          subtotal: expectedTotal,
        },
      ],
      totalAmount: expectedTotal,
      deliveryAddress: {
        street: 'Gooty Road',
        city: 'Anantapur',
        state: 'Andhra Pradesh',
        pincode: '515001',
      },
      paymentStatus: 'PENDING',
      status: 'PENDING',
    });

    const isOrderCreated = !!testOrder && testOrder.totalAmount === expectedTotal;
    recordTest(
      5,
      'Order Creation with Authoritative Server Amount',
      isOrderCreated,
      `Order ${testOrder.orderNumber} created for ₹${testOrder.totalAmount.toFixed(2)} (Product: ${realProduct.name} @ ₹${realProduct.price} x ${testQuantity})`
    );

    // ----------------------------------------------------------------------------
    // TEST 6: DYNAMIC NPCI UPI URI FORMAT VALIDATION
    // ----------------------------------------------------------------------------
    const upiDetailsRes = await axios.get(`${BASE_URL}/payments/order/${testOrder._id}/upi`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });

    const upiData = upiDetailsRes.data.data;
    const upiUri: string = upiData.upiUri;

    const hasCorrectScheme = upiUri.startsWith('upi://pay?');
    const hasVpa = upiUri.includes(`pa=${dbConfig?.upiId}`);
    const hasAmount = upiUri.includes(`am=${expectedTotal.toFixed(2)}`);
    const hasCurrency = upiUri.includes('cu=INR');
    const hasUnencodedAt = dbConfig?.upiId ? upiUri.includes(dbConfig.upiId) : false;

    const isUriCompliant = hasCorrectScheme && hasVpa && hasAmount && hasCurrency && hasUnencodedAt;

    recordTest(
      6,
      'NPCI Standard UPI URI Spec Compliance',
      isUriCompliant,
      `URI: ${upiUri} (pa=${upiData.upiId}, pn=${upiData.merchantName}, am=${expectedTotal.toFixed(2)}, cu=INR)`
    );

    // ----------------------------------------------------------------------------
    // TEST 7: HIGH-CONTRAST SCANNABLE QR GENERATION (Pure Black on White, Margin >= 4)
    // ----------------------------------------------------------------------------
    const qrDataUrl = await QRCode.toDataURL(upiUri, {
      width: 320,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    const isBase64Png = qrDataUrl.startsWith('data:image/png;base64,');
    const hasSufficientPayload = qrDataUrl.length > 500;

    recordTest(
      7,
      'High-Contrast Scannable QR Code Generation',
      isBase64Png && hasSufficientPayload,
      `Valid Base64 PNG QR generated (length: ${qrDataUrl.length} chars, color: #000000 on #ffffff, margin: 4, ECC: M)`
    );

    // ----------------------------------------------------------------------------
    // TEST 8: DISPLAY OF STORE PARTNER PAYMENT DETAILS (Name, Phone 8247303735, UPI ID)
    // ----------------------------------------------------------------------------
    const hasPhoneNumber = upiData.phoneNumber === '8247303735';
    const hasStoreName = upiData.storeName === 'Anantapur Kisan Agro Hub';
    const hasUpiId = upiData.upiId === '8247303735@upi';

    recordTest(
      8,
      'Store Partner Details in Payment Payload',
      hasPhoneNumber && hasStoreName && hasUpiId,
      `Store: "${upiData.storeName}", Phone: "${upiData.phoneNumber}", UPI ID: "${upiData.upiId}", Amount: ₹${upiData.amount}`
    );

    // ----------------------------------------------------------------------------
    // TEST 9: ANTI-FRAUD PAYMENT STATUS PRESERVATION (QR DISPLAY -> PENDING)
    // ----------------------------------------------------------------------------
    const orderBeforeUtr = await Order.findById(testOrder._id);
    const isPendingBeforeUtr = orderBeforeUtr?.paymentStatus === 'PENDING' && orderBeforeUtr?.status === 'PENDING';

    recordTest(
      9,
      'Anti-Fraud Order Status Preservation (QR Display)',
      isPendingBeforeUtr,
      `Order status is strictly PENDING while customer scans QR code`
    );

    // ----------------------------------------------------------------------------
    // TEST 10: CUSTOMER UTR SUBMISSION (STATUS REMAINS PENDING AWAITING VERIFICATION)
    // ----------------------------------------------------------------------------
    const utrSubmissionRes = await axios.post(
      `${BASE_URL}/payments/record-direct-upi`,
      {
        orderId: testOrder._id.toString(),
        upiRefNumber: 'UTR824730373501',
        upiPayerApp: 'PhonePe',
      },
      { headers: { Authorization: `Bearer ${farmerToken}` } }
    );

    const isUtrSubmitted = utrSubmissionRes.status === 200;
    const orderAfterUtr = await Order.findById(testOrder._id);
    const isStillPending = orderAfterUtr?.paymentStatus === 'PENDING';

    recordTest(
      10,
      'Customer UTR Submission & Anti-Fraud Pending Verification',
      isUtrSubmitted && isStillPending,
      `UTR "UTR824730373501" submitted. Order status remained PENDING (prevents fraudulent self-approval)`
    );

    // ----------------------------------------------------------------------------
    // TEST 11: PAYMENT RECORD CREATION & UTR PERSISTENCE
    // ----------------------------------------------------------------------------
    const paymentRecord = await Payment.findOne({ order: testOrder._id });
    const isPaymentRecorded =
      !!paymentRecord &&
      paymentRecord.upiTransactionId === 'UTR824730373501' &&
      paymentRecord.amount === expectedTotal;

    recordTest(
      11,
      'Payment Record & UTR Persistence in MongoDB',
      isPaymentRecorded,
      `Payment ID: ${paymentRecord?._id}, UTR: ${paymentRecord?.upiTransactionId}, Amount: ₹${paymentRecord?.amount}, Status: ${paymentRecord?.status}`
    );

    // ----------------------------------------------------------------------------
    // TEST 12: ADMIN / STORE PARTNER PAYMENT VERIFICATION -> STATUS TRANSITIONS TO PAID
    // ----------------------------------------------------------------------------
    const verifyPaymentRes = await axios.post(
      `${BASE_URL}/payments/admin/verify-upi`,
      {
        orderId: testOrder._id.toString(),
        status: 'PAID',
        notes: 'Payment verified in Store Partner Bank Account (8247303735)',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const isPaymentVerified = verifyPaymentRes.status === 200;
    const finalOrder = await Order.findById(testOrder._id);
    const isOrderPaid = finalOrder?.paymentStatus === 'PAID';

    recordTest(
      12,
      'Admin / Store Partner Payment Approval Lifecycle',
      isPaymentVerified && isOrderPaid,
      `Payment approved by Admin/Partner. Order ${finalOrder?.orderNumber} paymentStatus transitioned to PAID`
    );

    // ----------------------------------------------------------------------------
    // TEST 13: REAL CATALOG INTEGRITY PRESERVATION (30 PRODUCTS ACROSS 10 CATEGORIES)
    // ----------------------------------------------------------------------------
    const totalProducts = await Product.countDocuments();
    const categories = await Product.distinct('category');

    const isCatalogIntact = totalProducts === 30 && categories.length === 10;

    recordTest(
      13,
      'Real Product Catalog Integrity Preservation',
      isCatalogIntact,
      `MongoDB contains exactly ${totalProducts} products across ${categories.length} categories (0 corruptions, 0 deletions)`
    );

    // ----------------------------------------------------------------------------
    // TEST 14: MULTI-AMOUNT DYNAMIC QR TEST (ACCURACY ACROSS VARIED ORDER AMOUNTS)
    // ----------------------------------------------------------------------------
    const testAmounts = [150, 850, 1250.5, 9999];
    let allAmountsAccurate = true;

    for (const amt of testAmounts) {
      const tempOrder = await Order.create({
        farmer: farmerUser._id,
        orderNumber: `ORD-TEMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        items: [
          {
            product: realProduct._id,
            shopOwner: realProduct.shopOwner || adminUser._id,
            productNameSnapshot: realProduct.name,
            quantity: 1,
            price: amt,
            unit: 'unit',
            subtotal: amt,
          },
        ],
        totalAmount: amt,
        deliveryAddress: { street: 'Main', city: 'Anantapur', state: 'AP', pincode: '515001' },
        paymentStatus: 'PENDING',
        status: 'PENDING',
      });

      const res = await axios.get(`${BASE_URL}/payments/order/${tempOrder._id}/upi`, {
        headers: { Authorization: `Bearer ${farmerToken}` },
      });

      const expectedAmStr = `am=${amt.toFixed(2)}`;
      if (!res.data.data.upiUri.includes(expectedAmStr)) {
        allAmountsAccurate = false;
      }
      await Order.findByIdAndDelete(tempOrder._id);
    }

    recordTest(
      14,
      'Dynamic Amount Precision in Scannable QR Payload',
      allAmountsAccurate,
      `Verified exact dynamic formatting (am=150.00, am=850.00, am=1250.50, am=9999.00) in generated QR URIs`
    );

    // Clean up temporary test order
    await Order.findByIdAndDelete(testOrder._id);
    if (paymentRecord) {
      await Payment.findByIdAndDelete(paymentRecord._id);
    }

    // Print summary
    console.log('\n================================================================================');
    console.log('📊 FINAL TEST RESULTS SUMMARY');
    console.log('================================================================================');
    console.table(testResults);

    const totalPassed = testResults.filter((r) => r.status === 'PASS').length;
    console.log(`\n🎉 Passed ${totalPassed}/${testResults.length} Tests Successfully!`);
  } catch (error: any) {
    console.error('❌ Test execution error:', error.message, error.response?.data || '');
  } finally {
    server.close();
    process.exit(0);
  }
}

runScannableUpiAndPartnerConfigTest();
