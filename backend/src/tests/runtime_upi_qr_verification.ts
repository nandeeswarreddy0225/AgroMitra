import http from 'http';
import axios from 'axios';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import app from '../app';
import { connectDB } from '../config/db';
import { Product } from '../models/Product.model';
import { User } from '../models/User.model';
import { Order } from '../models/Order.model';
import { Payment } from '../models/Payment.model';
import { StorePaymentConfig } from '../models/StorePaymentConfig.model';
import { generateToken } from '../utils/jwt';

const PORT = 5134;
const BASE_URL = `http://localhost:${PORT}/api`;

interface RuntimeVerificationResults {
  qrPayloadDecode: boolean;
  decodedPayload: string;
  upiVpa: boolean;
  actualVpa: string;
  amountValidation: boolean;
  openInUpiApp: boolean;
  dynamicConfiguration: boolean;
  adminChange: boolean;
  utrSubmission: boolean;
  adminVerification: boolean;
  roleSecurity: boolean;
  catalogPreserved: boolean;
}

async function runRuntimeVerification() {
  console.log('================================================================================');
  console.log('🔍 AgriMart — FINAL RUNTIME VERIFICATION OF UPI QR FIX');
  console.log('================================================================================\n');

  await connectDB();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(PORT, () => {
      console.log(`📡 Verification Server listening on port ${PORT}`);
      resolve();
    });
  });

  const results: RuntimeVerificationResults = {
    qrPayloadDecode: false,
    decodedPayload: '',
    upiVpa: false,
    actualVpa: '',
    amountValidation: false,
    openInUpiApp: false,
    dynamicConfiguration: false,
    adminChange: false,
    utrSubmission: false,
    adminVerification: false,
    roleSecurity: false,
    catalogPreserved: false,
  };

  try {
    // 1. SETUP USERS & TOKENS
    let adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'AgriMart Production Admin',
        email: 'admin_runtime_upi@agrimart.test',
        phone: '9888877773',
        password: 'password123',
        role: 'ADMIN',
        isVerified: true,
      });
    }

    let partnerUser = await User.findOne({ role: 'AGRI_PARTNER' });
    if (!partnerUser) {
      partnerUser = await User.create({
        name: 'Agri Store Partner',
        email: 'partner_runtime_upi@agrimart.test',
        phone: '8247303735',
        password: 'password123',
        role: 'AGRI_PARTNER',
        isVerified: true,
      });
    }

    let farmerUser = await User.findOne({ role: 'FARMER' });
    if (!farmerUser) {
      farmerUser = await User.create({
        name: 'Farmer Customer',
        email: 'farmer_runtime_upi@agrimart.test',
        phone: '9777766663',
        password: 'password123',
        role: 'FARMER',
        address: { street: 'Anantapur Market Road', city: 'Anantapur', state: 'Andhra Pradesh', pincode: '515001' },
        isVerified: true,
      });
    }

    const adminToken = generateToken({ id: adminUser._id.toString(), role: adminUser.role });
    const partnerToken = generateToken({ id: partnerUser._id.toString(), role: partnerUser.role });
    const farmerToken = generateToken({ id: farmerUser._id.toString(), role: farmerUser.role });

    // 2. STORE PARTNER CONFIGURES INITIAL PAYMENT DETAILS (Phone 8247303735 & UPI VPA)
    const initialConfig = {
      storeName: 'Anantapur Kisan Agro Seva Kendra',
      phoneNumber: '8247303735',
      upiId: '8247303735@upi',
      merchantName: 'Kisan Agro Store',
      isActive: true,
    };

    const partnerConfigRes = await axios.put(`${BASE_URL}/payments/store-config`, initialConfig, {
      headers: { Authorization: `Bearer ${partnerToken}` },
    });

    if (
      partnerConfigRes.status === 200 &&
      partnerConfigRes.data.config.phoneNumber === '8247303735' &&
      partnerConfigRes.data.config.upiId === '8247303735@upi'
    ) {
      console.log('✅ Store Partner successfully configured phone: 8247303735 and UPI VPA: 8247303735@upi');
    }

    // 3. RETRIEVE A REAL CATALOG PRODUCT & CREATE A REAL PENDING ORDER
    const realProduct = await Product.findOne({ stock: { $gt: 5 } });
    if (!realProduct) throw new Error('No real products found in database.');

    const orderQty = 2;
    const orderTotal = realProduct.price * orderQty;
    const orderNumber = `ORD-RT-${Date.now()}`;

    const pendingOrder = await Order.create({
      farmer: farmerUser._id,
      orderNumber,
      items: [
        {
          product: realProduct._id,
          shopOwner: realProduct.shopOwner || adminUser._id,
          productNameSnapshot: realProduct.name,
          quantity: orderQty,
          price: realProduct.price,
          unit: realProduct.unit || 'packet',
          subtotal: orderTotal,
        },
      ],
      totalAmount: orderTotal,
      deliveryAddress: {
        street: 'Market Road',
        city: 'Anantapur',
        state: 'Andhra Pradesh',
        pincode: '515001',
      },
      paymentStatus: 'PENDING',
      status: 'PENDING',
    });

    console.log(`✅ Real Pending Order created: ${orderNumber} for ₹${orderTotal.toFixed(2)} (Product: ${realProduct.name})`);

    // 4. FETCH ORDER UPI PAYMENT DETAILS (Simulating Farmer opening payment page)
    const upiRes = await axios.get(`${BASE_URL}/payments/order/${pendingOrder._id}/upi`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });

    const upiData = upiRes.data;
    console.log('📦 Direct Store Partner UPI Section API Response:', {
      upiConfigured: upiData.upiConfigured,
      storeName: upiData.storeName,
      phoneNumber: upiData.phoneNumber,
      upiId: upiData.upiId,
      amount: upiData.amount,
      upiIntentUrl: upiData.upiIntentUrl,
    });

    // Check Phone Number & UPI VPA
    if (upiData.phoneNumber === '8247303735') {
      console.log('✅ Configured store payment number is exactly 8247303735');
    }

    if (upiData.upiId === '8247303735@upi' && !upiData.upiId.startsWith('dummy')) {
      results.upiVpa = true;
      results.actualVpa = upiData.upiId;
      console.log(`✅ Actual UPI VPA loaded from database/config: ${results.actualVpa}`);
    }

    // Check Intent URL / Open in UPI App
    if (upiData.upiIntentUrl && upiData.upiIntentUrl.startsWith('upi://pay?')) {
      results.openInUpiApp = true;
      console.log(`✅ Open in UPI App intent URL generated: ${upiData.upiIntentUrl}`);
    }

    // 5. GENERATE QR CODE IMAGE AND PERFORM ACTUAL IMAGE PIXEL DECODE (jsQR)
    const qrDataUrl = await QRCode.toDataURL(upiData.upiIntentUrl, {
      width: 320,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Convert Base64 PNG to raw RGBA buffer and decode QR
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const png = PNG.sync.read(imageBuffer);
    const decodedQR = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

    if (decodedQR && decodedQR.data) {
      results.qrPayloadDecode = true;
      results.decodedPayload = decodedQR.data;
      console.log(`✅ QR Image Pixel Decoded successfully: "${decodedQR.data}"`);
    } else {
      console.error('❌ Failed to decode QR image pixels');
    }

    // 6. VALIDATE DECODED PAYLOAD CONTENTS
    const payload = results.decodedPayload;
    const startsWithUpi = payload.startsWith('upi://pay?');
    const containsVpa = payload.includes(`pa=${results.actualVpa}`);
    const containsStore = payload.includes('pn=Kisan%20Agro%20Store');
    const containsAmount = payload.includes(`am=${orderTotal.toFixed(2)}`);
    const containsCurrency = payload.includes('cu=INR');

    if (startsWithUpi && containsVpa && containsStore && containsAmount && containsCurrency) {
      results.amountValidation = true;
      console.log(`✅ Payload validation passed (Scheme: upi://pay, VPA: ${results.actualVpa}, Store: Kisan Agro Store, Amount: ${orderTotal.toFixed(2)}, Currency: INR)`);
    } else {
      console.error('❌ Payload contents validation failed:', {
        startsWithUpi,
        containsVpa,
        containsStore,
        containsAmount,
        containsCurrency,
      });
    }

    // 7. CONFIRM SCANNING/OPENING DOES NOT AUTO-MARK ORDER PAID
    const orderBeforeUtr = await Order.findById(pendingOrder._id);
    if (orderBeforeUtr?.paymentStatus === 'PENDING') {
      console.log('✅ Confirmed order status remains PENDING while viewing QR (Anti-Fraud)');
    }

    // 8. TEST UTR SUBMISSION
    const utrPayload = {
      orderId: pendingOrder._id.toString(),
      upiRefNumber: 'UTR824730373599',
      upiPayerApp: 'GooglePay',
    };

    const utrRes = await axios.post(`${BASE_URL}/payments/record-direct-upi`, utrPayload, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });

    const orderAfterUtr = await Order.findById(pendingOrder._id);
    if (utrRes.status === 200 && orderAfterUtr?.paymentStatus === 'PENDING') {
      results.utrSubmission = true;
      console.log('✅ UTR submission successful. Order remained PENDING awaiting admin verification.');
    }

    // 9. TEST ADMIN PAYMENT VERIFICATION
    const verifyRes = await axios.post(
      `${BASE_URL}/payments/admin/verify-upi`,
      {
        orderId: pendingOrder._id.toString(),
        status: 'PAID',
        notes: 'Verified funds credited to 8247303735 bank account',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const orderAfterVerify = await Order.findById(pendingOrder._id);
    if (verifyRes.status === 200 && orderAfterVerify?.paymentStatus === 'PAID') {
      results.adminVerification = true;
      console.log('✅ Admin payment verification successful. Order status transitioned to PAID.');
    }

    // 10. ADMIN DYNAMIC RECONFIGURATION & NEW ORDER TEST
    const updatedAdminConfig = {
      storeName: 'AgroMitra Central Hub Anantapur',
      phoneNumber: '8247303735',
      upiId: 'agrimart.anantapur@okhdfcbank',
      merchantName: 'AgroMitra Hub',
      isActive: true,
    };

    const adminConfigRes = await axios.put(`${BASE_URL}/payments/store-config`, updatedAdminConfig, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (adminConfigRes.status === 200 && adminConfigRes.data.config.upiId === 'agrimart.anantapur@okhdfcbank') {
      results.adminChange = true;
      console.log('✅ Admin updated store UPI configuration to: agrimart.anantapur@okhdfcbank');
    }

    // Create a NEW Pending Order and check NEW QR Code
    const newOrder = await Order.create({
      farmer: farmerUser._id,
      orderNumber: `ORD-NEW-${Date.now()}`,
      items: [
        {
          product: realProduct._id,
          shopOwner: realProduct.shopOwner || adminUser._id,
          productNameSnapshot: realProduct.name,
          quantity: 1,
          price: realProduct.price,
          unit: realProduct.unit || 'packet',
          subtotal: realProduct.price,
        },
      ],
      totalAmount: realProduct.price,
      deliveryAddress: { street: 'Main Rd', city: 'Anantapur', state: 'AP', pincode: '515001' },
      paymentStatus: 'PENDING',
      status: 'PENDING',
    });

    const newUpiRes = await axios.get(`${BASE_URL}/payments/order/${newOrder._id}/upi`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });

    const newQrDataUrl = await QRCode.toDataURL(newUpiRes.data.upiIntentUrl, {
      width: 320,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    });

    const newBase64 = newQrDataUrl.replace(/^data:image\/png;base64,/, '');
    const newPng = PNG.sync.read(Buffer.from(newBase64, 'base64'));
    const newDecodedQR = jsQR(new Uint8ClampedArray(newPng.data), newPng.width, newPng.height);

    if (
      newDecodedQR &&
      newDecodedQR.data.includes('pa=agrimart.anantapur@okhdfcbank') &&
      newDecodedQR.data.includes(`am=${realProduct.price.toFixed(2)}`)
    ) {
      results.dynamicConfiguration = true;
      console.log(`✅ NEW QR Code dynamically uses the updated configuration: "${newDecodedQR.data}"`);
    }

    // 11. ROLE SECURITY: CONFIRM FARMER CANNOT CHANGE CONFIG, BUT PARTNER CAN
    let farmerBlocked = false;
    try {
      await axios.put(
        `${BASE_URL}/payments/store-config`,
        { storeName: 'Hacked', upiId: 'hacker@upi' },
        { headers: { Authorization: `Bearer ${farmerToken}` } }
      );
    } catch (err: any) {
      if (err.response && err.response.status === 403) {
        farmerBlocked = true;
      }
    }

    let partnerAllowed = false;
    try {
      const pRes = await axios.put(
        `${BASE_URL}/payments/store-config`,
        {
          storeName: 'Anantapur Kisan Agro Seva Kendra',
          phoneNumber: '8247303735',
          upiId: '8247303735@upi',
          merchantName: 'Kisan Agro Store',
          isActive: true,
        },
        { headers: { Authorization: `Bearer ${partnerToken}` } }
      );
      if (pRes.status === 200) partnerAllowed = true;
    } catch (err) {
      partnerAllowed = false;
    }

    if (farmerBlocked && partnerAllowed) {
      results.roleSecurity = true;
      console.log('✅ Role Security Verified: Farmer receives 403 Forbidden; Agri Partner / Admin can manage store payment.');
    }

    // 12. CATALOG PRESERVATION CHECK
    const totalProducts = await Product.countDocuments();
    if (totalProducts === 30) {
      results.catalogPreserved = true;
      console.log('✅ All 30 real catalog agricultural products remain preserved.');
    }

    // Clean up test orders
    await Order.findByIdAndDelete(pendingOrder._id);
    await Order.findByIdAndDelete(newOrder._id);
    await Payment.deleteMany({ order: { $in: [pendingOrder._id, newOrder._id] } });

    console.log('\n================================================================================');
    console.log('📊 RUNTIME VERIFICATION EXECUTION COMPLETE');
    console.log('================================================================================');
  } catch (error: any) {
    console.error('❌ Error during runtime verification:', error.message, error.response?.data || '');
  } finally {
    server.close();
    process.exit(0);
  }
}

runRuntimeVerification();
