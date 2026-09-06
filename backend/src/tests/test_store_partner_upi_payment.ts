import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../config/db';
import paymentRouter from '../routes/payment.routes';
import orderRouter from '../routes/order.routes';
import { User } from '../models/User.model';
import { Order } from '../models/Order.model';
import { Product } from '../models/Product.model';
import { StorePaymentConfig } from '../models/StorePaymentConfig.model';
import { Payment } from '../models/Payment.model';

const app = express();
app.use(express.json());
app.use('/api/payments', paymentRouter);
app.use('/api/orders', orderRouter);

const TEST_PORT = 5122;
const BASE_PAYMENT_URL = `http://localhost:${TEST_PORT}/api/payments`;
const BASE_ORDER_URL = `http://localhost:${TEST_PORT}/api/orders`;

async function runUpiPaymentVerificationTests() {
  console.log('🧪 Starting Store Partner Dynamic UPI QR & Payment Verification Test Suite...\n');
  let passed = 0;
  let failed = 0;
  let server: http.Server | null = null;

  try {
    await connectDB();

    server = app.listen(TEST_PORT, () => {
      console.log(`Test Express server listening on port ${TEST_PORT}`);
    });

    // 1. Locate Admin and Farmer users
    const adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) throw new Error('Admin user not found.');

    let farmerUser = await User.findOne({ role: 'FARMER' });
    if (!farmerUser) {
      farmerUser = await User.create({
        name: 'Test Farmer Verifier',
        email: `testfarmer_${Date.now()}@agrimart.test`,
        phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        password: 'password123',
        role: 'FARMER',
        address: { street: 'Main Rd', city: 'Anantapur', state: 'Andhra Pradesh', pincode: '515001' },
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const adminToken = jwt.sign(
      { id: adminUser._id.toString(), role: adminUser.role, email: adminUser.email },
      jwtSecret
    );
    const farmerToken = jwt.sign(
      { id: farmerUser._id.toString(), role: farmerUser.role, email: farmerUser.email },
      jwtSecret
    );

    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    const farmerHeaders = { headers: { Authorization: `Bearer ${farmerToken}` } };

    // TEST 1: No UPI configured -> returns configured: false with warning message
    console.log('--- TEST 1: Unconfigured / Inactive Store UPI Behavior ---');
    await StorePaymentConfig.deleteMany({});
    await User.findByIdAndUpdate(adminUser._id, { upiId: '' });

    const resUnconf = await axios.get(`${BASE_PAYMENT_URL}/store-config`);
    if (
      resUnconf.status === 200 &&
      resUnconf.data.success &&
      resUnconf.data.configured === false &&
      resUnconf.data.message?.includes('not configured a UPI ID')
    ) {
      console.log(`✅ Passed: Correctly reported unconfigured UPI status with safety warning.`);
      passed++;
    } else {
      console.error(`❌ Failed: Expected configured: false, received:`, resUnconf.data);
      failed++;
    }

    // TEST 2: Farmer cannot modify UPI settings (403 Forbidden)
    console.log('\n--- TEST 2: Role-Based Authorization Protection (Farmer Rejected) ---');
    try {
      await axios.put(
        `${BASE_PAYMENT_URL}/store-config`,
        { storeName: 'Hacked Store', upiId: 'attacker@upi' },
        farmerHeaders
      );
      console.error(`❌ Failed: Farmer was able to modify UPI settings.`);
      failed++;
    } catch (err: any) {
      if (err.response?.status === 403) {
        console.log(`✅ Passed: Farmer request was rejected with HTTP 403 Forbidden.`);
        passed++;
      } else {
        console.error(`❌ Failed: Expected HTTP 403, received ${err.response?.status}`);
        failed++;
      }
    }

    // TEST 3: Admin configures valid Store UPI ID & Settings
    console.log('\n--- TEST 3: Admin Configures Store Payment Details ---');
    const testConfigData = {
      storeName: 'AgroMitra Anantapur Store Yard',
      upiId: 'agromitra.anantapur@icici',
      merchantName: 'AgroMitra Verified Retail Partner',
      phoneNumber: '9876543210',
      isActive: true,
    };

    const resConfigUpdate = await axios.put(
      `${BASE_PAYMENT_URL}/store-config`,
      testConfigData,
      adminHeaders
    );

    if (
      resConfigUpdate.status === 200 &&
      resConfigUpdate.data.success &&
      resConfigUpdate.data.config.upiId === 'agromitra.anantapur@icici' &&
      resConfigUpdate.data.config.storeName === 'AgroMitra Anantapur Store Yard'
    ) {
      console.log(`✅ Passed: Admin successfully saved Store UPI settings in MongoDB.`);
      passed++;
    } else {
      console.error(`❌ Failed: Unexpected update response:`, resConfigUpdate.data);
      failed++;
    }

    // TEST 4: Configured UPI status becomes available to clients
    console.log('\n--- TEST 4: Verification of Active Store UPI Availability ---');
    const resConfActive = await axios.get(`${BASE_PAYMENT_URL}/store-config`);
    if (
      resConfActive.status === 200 &&
      resConfActive.data.success &&
      resConfActive.data.configured === true &&
      resConfActive.data.config?.upiId === 'agromitra.anantapur@icici'
    ) {
      console.log(`✅ Passed: Store UPI is active and available.`);
      passed++;
    } else {
      console.error(`❌ Failed active check:`, resConfActive.data);
      failed++;
    }

    // TEST 5 & 6: Dynamic UPI URI Generation for different order amounts
    console.log('\n--- TEST 5 & 6: Server-Validated Dynamic UPI URI & Order Amounts ---');
    // Create two test orders for the farmer with different totals
    const sampleProduct = await Product.findOne({ isActive: true });
    if (!sampleProduct) throw new Error('No active product found for testing orders.');

    const order1 = await Order.create({
      orderNumber: `AGM-TEST-1-${Date.now().toString().slice(-4)}`,
      farmer: farmerUser._id,
      items: [
        {
          product: sampleProduct._id,
          shopOwner: sampleProduct.shopOwner,
          productNameSnapshot: sampleProduct.name,
          price: 850,
          quantity: 1,
          unit: 'packet',
          subtotal: 850,
        },
      ],
      totalAmount: 850,
      deliveryAddress: { street: 'Gooty Rd', city: 'Anantapur', state: 'AP', pincode: '515001' },
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'UPI_QR',
    });

    const order2 = await Order.create({
      orderNumber: `AGM-TEST-2-${Date.now().toString().slice(-4)}`,
      farmer: farmerUser._id,
      items: [
        {
          product: sampleProduct._id,
          shopOwner: sampleProduct.shopOwner,
          productNameSnapshot: sampleProduct.name,
          price: 1550,
          quantity: 1,
          unit: 'bag',
          subtotal: 1550,
        },
      ],
      totalAmount: 1550,
      deliveryAddress: { street: 'Gooty Rd', city: 'Anantapur', state: 'AP', pincode: '515001' },
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'UPI_QR',
    });

    // Check Order 1 UPI Details
    const resUpiOrder1 = await axios.get(`${BASE_PAYMENT_URL}/order/${order1._id}/upi`, farmerHeaders);
    // Check Order 2 UPI Details
    const resUpiOrder2 = await axios.get(`${BASE_PAYMENT_URL}/order/${order2._id}/upi`, farmerHeaders);

    const intent1 = resUpiOrder1.data.upiIntentUrl || '';
    const intent2 = resUpiOrder2.data.upiIntentUrl || '';

    const hasCorrectUpi1 = intent1.includes('pa=agromitra.anantapur%40icici');
    const hasCorrectAmount1 = intent1.includes('am=850.00');
    const hasCorrectRef1 = intent1.includes(`tr=${order1.orderNumber}`);

    const hasCorrectUpi2 = intent2.includes('pa=agromitra.anantapur%40icici');
    const hasCorrectAmount2 = intent2.includes('am=1550.00');
    const hasCorrectRef2 = intent2.includes(`tr=${order2.orderNumber}`);

    if (hasCorrectUpi1 && hasCorrectAmount1 && hasCorrectRef1 && hasCorrectUpi2 && hasCorrectAmount2 && hasCorrectRef2) {
      console.log(`✅ Passed: Order 1 (₹850) generated: ${intent1}`);
      console.log(`✅ Passed: Order 2 (₹1,550) generated: ${intent2}`);
      passed += 2;
    } else {
      console.error(`❌ Failed dynamic URI generation:`, { intent1, intent2 });
      failed += 2;
    }

    // TEST 7: Customer Submits UTR & Payment Status remains PENDING (cannot be marked PAID by customer)
    console.log('\n--- TEST 7: Customer UTR Submission & Anti-Fraud PENDING Enforcement ---');
    const testUtr = '426789123456';
    const resRecordUpi = await axios.post(
      `${BASE_PAYMENT_URL}/direct-upi`,
      {
        orderId: order1._id.toString(),
        upiRefNumber: testUtr,
        upiPayerApp: 'PhonePe',
      },
      farmerHeaders
    );

    const checkOrderAfterUtr = await Order.findById(order1._id);
    const checkPaymentDoc = await Payment.findOne({ order: order1._id });

    if (
      resRecordUpi.status === 200 &&
      checkOrderAfterUtr?.paymentStatus === 'PENDING' &&
      checkPaymentDoc?.upiTransactionId === testUtr &&
      checkPaymentDoc?.status === 'AUTHORIZED'
    ) {
      console.log(`✅ Passed: UTR recorded (${testUtr}). Order payment status securely held at PENDING.`);
      passed++;
    } else {
      console.error(`❌ Failed: Unexpected payment status after UTR submission:`, {
        orderPaymentStatus: checkOrderAfterUtr?.paymentStatus,
        paymentDoc: checkPaymentDoc,
      });
      failed++;
    }

    // TEST 8: Admin Payment Verification Queue & Marking PAID
    console.log('\n--- TEST 8: Admin Payment Verification Workflow ---');
    // 1. Admin gets all payments
    const resAdminPayments = await axios.get(`${BASE_PAYMENT_URL}/admin/all`, adminHeaders);
    const order1Record = resAdminPayments.data.payments.find((p: any) => p.orderId === order1._id.toString());

    if (!order1Record || order1Record.transactionId !== testUtr) {
      console.error(`❌ Failed: Order not found in Admin verification queue with transaction ID ${testUtr}`);
      failed++;
    } else {
      console.log(`  • Order #${order1.orderNumber} located in Admin queue with UTR ${testUtr}.`);

      // 2. Admin verifies and marks PAID
      const resVerify = await axios.post(
        `${BASE_PAYMENT_URL}/admin/verify-upi`,
        {
          orderId: order1._id.toString(),
          status: 'PAID',
          notes: 'Bank statement matched reference 426789123456',
        },
        adminHeaders
      );

      const order1Verified = await Order.findById(order1._id);
      const payment1Verified = await Payment.findOne({ order: order1._id });

      if (
        resVerify.status === 200 &&
        order1Verified?.paymentStatus === 'PAID' &&
        payment1Verified?.status === 'CAPTURED'
      ) {
        console.log(`✅ Passed: Admin verified payment; Order #${order1.orderNumber} successfully transitioned to PAID.`);
        passed++;
      } else {
        console.error(`❌ Failed verification transition:`, {
          orderPaymentStatus: order1Verified?.paymentStatus,
          paymentStatus: payment1Verified?.status,
        });
        failed++;
      }
    }

    // TEST 9: Admin Deactivates Store UPI
    console.log('\n--- TEST 9: Admin Deactivates / Clears Store UPI ---');
    const resDeleteConfig = await axios.delete(`${BASE_PAYMENT_URL}/store-config`, adminHeaders);
    const resConfigAfterDelete = await axios.get(`${BASE_PAYMENT_URL}/store-config`);

    if (
      resDeleteConfig.status === 200 &&
      resConfigAfterDelete.data.configured === false
    ) {
      console.log(`✅ Passed: Store UPI configuration successfully deactivated.`);
      passed++;
    } else {
      console.error(`❌ Failed deactivating config:`, resConfigAfterDelete.data);
      failed++;
    }

    // TEST 10: Razorpay Route Integrity & Order Retrieval
    console.log('\n--- TEST 10: Existing Razorpay & Order Endpoints Functionality ---');
    const resOrderInfo = await axios.get(`${BASE_ORDER_URL}/${order1._id}`, farmerHeaders);
    if (resOrderInfo.status === 200 && resOrderInfo.data.success && resOrderInfo.data.order?.orderNumber === order1.orderNumber) {
      console.log(`✅ Passed: Order retrieval and structure intact.`);
      passed++;
    } else {
      console.error(`❌ Failed order retrieval:`, resOrderInfo.data);
      failed++;
    }

    // Clean up test orders
    await Order.deleteMany({ _id: { $in: [order1._id, order2._id] } });
    await Payment.deleteMany({ order: { $in: [order1._id, order2._id] } });

    console.log(`\n========================================`);
    console.log(`🏁 TEST RESULTS: ${passed}/10 PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (server) server.close();
    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    if (server) server.close();
    await disconnectDB();
    process.exit(1);
  }
}

runUpiPaymentVerificationTests();
