import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../config/db';
import authRouter from '../routes/auth.routes';
import productRouter from '../routes/product.routes';
import cartRouter from '../routes/cart.routes';
import orderRouter from '../routes/order.routes';
import paymentRouter from '../routes/payment.routes';
import { deliveryBoyRouter } from '../routes/deliveryBoy.routes';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { Cart } from '../models/Cart.model';
import { Order } from '../models/Order.model';
import { Payment } from '../models/Payment.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';
import { StorePaymentConfig } from '../models/StorePaymentConfig.model';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/delivery', deliveryBoyRouter);

const TEST_PORT = 5128;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;

async function runCompleteOrderToDeliveryE2EVerification() {
  console.log('================================================================================');
  console.log('🌾 AgriMart — COMPLETE ORDER TO DELIVERY END-TO-END (E2E) VERIFICATION');
  console.log('================================================================================\n');

  let passedPhases = 0;
  let failedPhases = 0;
  let server: http.Server | null = null;

  // Cleanup tracking variables
  let tempProductId: string | null = null;
  const tempOrderIds: string[] = [];
  const tempUserIds: string[] = [];

  try {
    await connectDB();

    server = app.listen(TEST_PORT, () => {
      console.log(`📡 E2E Verification Express Server listening on port ${TEST_PORT}\n`);
    });

    const jwtSecret = process.env.JWT_SECRET || 'secret';

    // 1. Locate Admin User
    const adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) throw new Error('ADMIN user not found in database.');

    const adminToken = jwt.sign(
      { id: adminUser._id.toString(), role: adminUser.role, email: adminUser.email },
      jwtSecret
    );
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 2. Create or find Test Farmer
    let farmerUser = await User.findOne({ email: 'e2e_farmer_test@agrimart.test' });
    if (!farmerUser) {
      farmerUser = await User.create({
        name: 'Ramesh Patel (Test Farmer)',
        email: 'e2e_farmer_test@agrimart.test',
        phone: '9844112233',
        password: 'password123',
        role: 'FARMER',
        address: { street: 'Main Bypass Road', city: 'Anantapur', state: 'Andhra Pradesh', pincode: '515001' },
      });
      tempUserIds.push(farmerUser._id.toString());
    }

    const farmerToken = jwt.sign(
      { id: farmerUser._id.toString(), role: farmerUser.role, email: farmerUser.email },
      jwtSecret
    );
    const farmerHeaders = { headers: { Authorization: `Bearer ${farmerToken}` } };

    // 3. Create or find Test Delivery Partner
    let deliveryUser = await User.findOne({ email: 'e2e_delivery_test@agrimart.test' });
    if (!deliveryUser) {
      deliveryUser = await User.create({
        name: 'Suresh Express (Delivery Partner)',
        email: 'e2e_delivery_test@agrimart.test',
        phone: '9855667788',
        password: 'password123',
        role: 'DELIVERY_BOY',
        address: { street: 'Subhash Nagar', city: 'Anantapur', state: 'Andhra Pradesh', pincode: '515001' },
      });
      tempUserIds.push(deliveryUser._id.toString());
    }

    // Ensure DeliveryBoy profile document exists
    let deliveryProfile = await DeliveryBoy.findOne({ user: deliveryUser._id });
    if (!deliveryProfile) {
      deliveryProfile = await DeliveryBoy.create({
        user: deliveryUser._id,
        shopOwner: adminUser._id,
        name: deliveryUser.name,
        phone: deliveryUser.phone,
        email: deliveryUser.email,
        vehicleType: 'TVS Heavy Duty Motorcycle',
        deliveryArea: 'Anantapur Rural & Market Yard',
        isAvailable: true,
        activeOrdersCount: 0,
      });
    }

    const deliveryToken = jwt.sign(
      { id: deliveryUser._id.toString(), role: deliveryUser.role, email: deliveryUser.email },
      jwtSecret
    );
    const deliveryHeaders = { headers: { Authorization: `Bearer ${deliveryToken}` } };

    // ============================================================================
    // PHASE 1 — PRODUCT
    // ============================================================================
    console.log('--- PHASE 1: PRODUCT (Admin Creation & Marketplace Visibility) ---');
    const createProductPayload = {
      name: 'Temporary E2E Test Agro Hybrid Seed',
      brand: 'AgroMitra Test Labs',
      category: 'Seeds',
      description: 'Temporary high-yield seed created strictly for complete order to delivery verification.',
      price: 799,
      stock: 25,
      unit: 'packet',
      images: ['https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600'],
      location: {
        street: 'Gooty Road, Kamalanagar, Anantapur Market Yard',
        city: 'Anantapur',
        state: 'Andhra Pradesh',
        pincode: '515001',
      },
      isActive: true,
    };

    const resCreateProd = await axios.post(`${BASE_URL}/products`, createProductPayload, adminHeaders);
    tempProductId = resCreateProd.data.product.id || resCreateProd.data.product._id;

    // Verify in MongoDB
    const prodInDb = await Product.findById(tempProductId);

    // Verify in Marketplace
    const resMarketplace = await axios.get(`${BASE_URL}/products`);
    const foundInMarketplace = resMarketplace.data.products.some((p: any) => (p.id || p._id) === tempProductId);

    // Verify Search
    const resSearch = await axios.get(`${BASE_URL}/products?search=Temporary+E2E`);
    const foundInSearch = resSearch.data.products.some((p: any) => (p.id || p._id) === tempProductId);

    // Verify Category Filter
    const resCat = await axios.get(`${BASE_URL}/products?category=Seeds`);
    const foundInCat = resCat.data.products.some((p: any) => (p.id || p._id) === tempProductId);

    // Verify Price Sorting
    const resSortAsc = await axios.get(`${BASE_URL}/products?sort=price_asc`);
    const isSortedAsc = resSortAsc.data.products.every(
      (val: any, i: number, arr: any[]) => i === 0 || arr[i - 1].price <= val.price
    );

    if (
      resCreateProd.status === 201 &&
      prodInDb &&
      prodInDb.price === 799 &&
      prodInDb.stock === 25 &&
      foundInMarketplace &&
      foundInSearch &&
      foundInCat &&
      isSortedAsc
    ) {
      console.log('✅ Phase 1 Passed: Temporary product created, verified in MongoDB, search, category, and sorting.');
      passedPhases++;
    } else {
      console.error('❌ Phase 1 Failed:', { foundInMarketplace, foundInSearch, foundInCat, isSortedAsc });
      failedPhases++;
    }

    // ============================================================================
    // PHASE 2 — FARMER SHOPPING
    // ============================================================================
    console.log('\n--- PHASE 2: FARMER SHOPPING (Viewing, Cart & Price Immunity) ---');
    // Clear farmer cart initially
    await Cart.deleteOne({ farmer: farmerUser._id });

    // Farmer views product
    const resViewProd = await axios.get(`${BASE_URL}/products/${tempProductId}`, farmerHeaders);

    // Farmer adds 2 units to cart
    const resAddToCart = await axios.post(
      `${BASE_URL}/cart/items`,
      { productId: tempProductId, quantity: 2 },
      farmerHeaders
    );

    // Farmer changes quantity to 3
    const resUpdateCart = await axios.put(
      `${BASE_URL}/cart/items/${tempProductId}`,
      { quantity: 3 },
      farmerHeaders
    );

    const cartTotal = resUpdateCart.data.cart.total ?? resUpdateCart.data.cart.subtotal;
    const expectedCartTotal = 3 * 799; // 2,397

    // Security check: Farmer attempts to modify product price to ₹1 (must be 403 Forbidden)
    let farmerPriceTamperBlocked = false;
    try {
      await axios.put(`${BASE_URL}/products/${tempProductId}`, { price: 1 }, farmerHeaders);
    } catch (err: any) {
      if (err.response?.status === 403) {
        farmerPriceTamperBlocked = true;
      }
    }

    if (
      resViewProd.status === 200 &&
      resAddToCart.status === 200 &&
      resUpdateCart.status === 200 &&
      cartTotal === expectedCartTotal &&
      farmerPriceTamperBlocked
    ) {
      console.log(`✅ Phase 2 Passed: Farmer cart calculated correctly (3 × ₹799 = ₹${cartTotal}). Farmer price tampering rejected (HTTP 403).`);
      passedPhases++;
    } else {
      console.error('❌ Phase 2 Failed:', { cartTotal, expectedCartTotal, farmerPriceTamperBlocked });
      failedPhases++;
    }

    // ============================================================================
    // PHASE 3 — CHECKOUT
    // ============================================================================
    console.log('\n--- PHASE 3: CHECKOUT (Server Validation & Address Security) ---');
    // Backend cart verification
    const resGetCart = await axios.get(`${BASE_URL}/cart`, farmerHeaders);
    const cartItems = resGetCart.data.cart.items;
    const itemStockValid = cartItems.every((item: any) => item.product.stock >= item.quantity);
    const serverVerifiedPrice = cartItems[0].product.price === 799;
    const getCartTotal = resGetCart.data.cart.total ?? resGetCart.data.cart.subtotal;

    if (itemStockValid && serverVerifiedPrice && getCartTotal === 2397) {
      console.log('✅ Phase 3 Passed: Checkout server validation confirmed; stock availability and authoritative backend price verified.');
      passedPhases++;
    } else {
      console.error('❌ Phase 3 Failed:', resGetCart.data);
      failedPhases++;
    }

    // ============================================================================
    // PHASE 4 — ORDER CREATION
    // ============================================================================
    console.log('\n--- PHASE 4: ORDER CREATION (Database Integrity & Order Snapshot) ---');
    const orderCreatePayload = {
      deliveryAddress: {
        street: 'Main Bypass Road, Near Kisan Mandi',
        city: 'Anantapur',
        state: 'Andhra Pradesh',
        pincode: '515001',
      },
      paymentMethod: 'UPI_QR',
    };

    const resCreateOrder = await axios.post(`${BASE_URL}/orders`, orderCreatePayload, farmerHeaders);
    const createdOrder = resCreateOrder.data.order;
    tempOrderIds.push(createdOrder.id || createdOrder._id);

    const dbOrder = await Order.findById(createdOrder.id || createdOrder._id);

    const validOrderNumber = /^AGM-\d{6}-\d{4}$/.test(createdOrder.orderNumber);
    const validFarmerAttached = dbOrder?.farmer.toString() === farmerUser._id.toString();
    const validProductAttached = dbOrder?.items[0].product.toString() === tempProductId;
    const validQuantity = dbOrder?.items[0].quantity === 3;
    const validTotal = dbOrder?.totalAmount === 2397;
    const initialStatusPending = dbOrder?.status === 'PENDING' && dbOrder?.paymentStatus === 'PENDING';

    if (validOrderNumber && validFarmerAttached && validProductAttached && validQuantity && validTotal && initialStatusPending) {
      console.log(`✅ Phase 4 Passed: Order #${createdOrder.orderNumber} created in MongoDB (Total: ₹${createdOrder.totalAmount}, Status: PENDING).`);
      passedPhases++;
    } else {
      console.error('❌ Phase 4 Failed:', {
        validOrderNumber,
        validFarmerAttached,
        validProductAttached,
        validQuantity,
        validTotal,
        initialStatusPending,
      });
      failedPhases++;
    }

    // ============================================================================
    // PHASE 5 — PAYMENT (Razorpay & Dynamic Direct UPI)
    // ============================================================================
    console.log('\n--- PHASE 5: PAYMENT (Razorpay Gateway & Direct Store Partner UPI) ---');
    // 1. Configure Admin Store UPI
    await axios.put(
      `${BASE_URL}/payments/store-config`,
      {
        storeName: 'AgroMitra Super Store Yard',
        upiId: 'agromitra.anantapur@icici',
        merchantName: 'AgroMitra Verified Retail Partner',
        phoneNumber: '9876543210',
        isActive: true,
      },
      adminHeaders
    );

    // 2. Fetch server-validated UPI details for this order (₹2,397)
    const resUpiDetails = await axios.get(`${BASE_URL}/payments/order/${dbOrder!._id}/upi`, farmerHeaders);
    const upiIntentUri = resUpiDetails.data.upiIntentUrl || '';
    const correctUpiId = resUpiDetails.data.upiId === 'agromitra.anantapur@icici';
    const correctAmountInUri = upiIntentUri.includes('am=2397.00') && resUpiDetails.data.totalAmount === 2397;

    // 3. Opening QR does NOT mark order as PAID
    const orderCheckAfterQr = await Order.findById(dbOrder!._id);
    const qrDoesNotMarkPaid = orderCheckAfterQr?.paymentStatus === 'PENDING';

    // 4. Customer submits 12-digit UTR reference
    const sampleUtr = '554433221100';
    const resRecordUpi = await axios.post(
      `${BASE_URL}/payments/direct-upi`,
      {
        orderId: dbOrder!._id.toString(),
        upiRefNumber: sampleUtr,
        upiPayerApp: 'PhonePe',
      },
      farmerHeaders
    );

    const orderCheckAfterUtr = await Order.findById(dbOrder!._id);
    const utrDoesNotMarkPaid = orderCheckAfterUtr?.paymentStatus === 'PENDING';

    // 5. Admin locates in payment verification queue
    const resAdminPayments = await axios.get(`${BASE_URL}/payments/admin/all`, adminHeaders);
    const foundInAdminQueue = resAdminPayments.data.payments.some(
      (p: any) => p.orderId === dbOrder!._id.toString() && p.transactionId === sampleUtr
    );

    // 6. Admin verifies payment and marks PAID
    const resAdminVerify = await axios.post(
      `${BASE_URL}/payments/admin/verify-upi`,
      {
        orderId: dbOrder!._id.toString(),
        status: 'PAID',
        notes: 'Verified against ICICI merchant statement',
      },
      adminHeaders
    );

    const orderAfterVerification = await Order.findById(dbOrder!._id);
    const verifiedAsPaid = orderAfterVerification?.paymentStatus === 'PAID';

    if (
      correctUpiId &&
      correctAmountInUri &&
      qrDoesNotMarkPaid &&
      utrDoesNotMarkPaid &&
      foundInAdminQueue &&
      verifiedAsPaid
    ) {
      console.log('✅ Phase 5 Passed: Dynamic UPI QR generated for exact order amount (₹2,397.00). Anti-fraud PENDING state enforced; Admin verified payment to PAID.');
      passedPhases++;
    } else {
      console.error('❌ Phase 5 Failed:', {
        correctUpiId,
        correctAmountInUri,
        qrDoesNotMarkPaid,
        utrDoesNotMarkPaid,
        foundInAdminQueue,
        verifiedAsPaid,
      });
      failedPhases++;
    }

    // ============================================================================
    // PHASE 6 — ADMIN ORDER MANAGEMENT
    // ============================================================================
    console.log('\n--- PHASE 6: ADMIN ORDER MANAGEMENT (Order Lifecycle & Progression) ---');
    // Admin progresses order: PENDING -> ACCEPTED -> PREPARING -> READY_FOR_DELIVERY
    const resAccept = await axios.put(
      `${BASE_URL}/orders/${dbOrder!._id}/status`,
      { status: 'ACCEPTED' },
      adminHeaders
    );

    const resPreparing = await axios.put(
      `${BASE_URL}/orders/${dbOrder!._id}/status`,
      { status: 'PREPARING' },
      adminHeaders
    );

    const resReady = await axios.put(
      `${BASE_URL}/orders/${dbOrder!._id}/status`,
      { status: 'READY_FOR_DELIVERY' },
      adminHeaders
    );

    // Test rejection of invalid status
    let invalidStatusRejected = false;
    try {
      await axios.put(
        `${BASE_URL}/orders/${dbOrder!._id}/status`,
        { status: 'FAKE_STATUS_NAME' },
        adminHeaders
      );
    } catch (err: any) {
      if (err.response?.status === 400) {
        invalidStatusRejected = true;
      }
    }

    const orderLifecycleDb = await Order.findById(dbOrder!._id);

    if (
      resAccept.status === 200 &&
      resPreparing.status === 200 &&
      resReady.status === 200 &&
      orderLifecycleDb?.status === 'READY_FOR_DELIVERY' &&
      invalidStatusRejected
    ) {
      console.log('✅ Phase 6 Passed: Order lifecycle progressed through ACCEPTED -> PREPARING -> READY_FOR_DELIVERY; invalid status rejected.');
      passedPhases++;
    } else {
      console.error('❌ Phase 6 Failed:', {
        status: orderLifecycleDb?.status,
        invalidStatusRejected,
      });
      failedPhases++;
    }

    // ============================================================================
    // PHASE 7 — DELIVERY PARTNER WORKFLOW
    // ============================================================================
    console.log('\n--- PHASE 7: DELIVERY PARTNER WORKFLOW ---');
    // 1. Admin assigns delivery partner to order
    const resAssign = await axios.post(
      `${BASE_URL}/delivery/assign-order`,
      {
        orderId: dbOrder!._id.toString(),
        deliveryBoyId: deliveryProfile!._id.toString(),
      },
      adminHeaders
    );

    // 2. Delivery partner views assigned orders
    const resDeliveryOrders = await axios.get(`${BASE_URL}/delivery/assigned-orders`, deliveryHeaders);
    const orderInDeliveryList = resDeliveryOrders.data.orders.some((o: any) => o._id === dbOrder!._id.toString());

    // 3. Delivery partner accepts assignment
    const resRespond = await axios.post(
      `${BASE_URL}/delivery/orders/${dbOrder!._id}/respond`,
      { action: 'ACCEPT' },
      deliveryHeaders
    );

    // 4. Delivery partner updates delivery status: PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED
    await axios.patch(
      `${BASE_URL}/delivery/orders/${dbOrder!._id}/status`,
      { status: 'PICKED_UP', note: 'Collected package from store warehouse' },
      deliveryHeaders
    );

    await axios.patch(
      `${BASE_URL}/delivery/orders/${dbOrder!._id}/status`,
      { status: 'OUT_FOR_DELIVERY', note: 'Heading to farmer location' },
      deliveryHeaders
    );

    const resDelivered = await axios.patch(
      `${BASE_URL}/delivery/orders/${dbOrder!._id}/status`,
      { status: 'DELIVERED', note: 'Handed over directly to farmer' },
      deliveryHeaders
    );

    // 5. Delivery partner security check: cannot modify product prices or verify payments
    let deliveryPartnerBlockedFromPrice = false;
    let deliveryPartnerBlockedFromPayment = false;

    try {
      await axios.put(`${BASE_URL}/products/${tempProductId}`, { price: 50 }, deliveryHeaders);
    } catch (err: any) {
      if (err.response?.status === 403) deliveryPartnerBlockedFromPrice = true;
    }

    try {
      await axios.post(
        `${BASE_URL}/payments/admin/verify-upi`,
        { orderId: dbOrder!._id.toString(), status: 'PAID' },
        deliveryHeaders
      );
    } catch (err: any) {
      if (err.response?.status === 403) deliveryPartnerBlockedFromPayment = true;
    }

    const orderAfterDelivery = await Order.findById(dbOrder!._id);

    if (
      resAssign.status === 200 &&
      orderInDeliveryList &&
      resRespond.status === 200 &&
      resDelivered.status === 200 &&
      orderAfterDelivery?.status === 'DELIVERED' &&
      orderAfterDelivery?.deliveryStatus === 'DELIVERED' &&
      deliveryPartnerBlockedFromPrice &&
      deliveryPartnerBlockedFromPayment
    ) {
      console.log('✅ Phase 7 Passed: Delivery partner accepted assignment, updated to PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED, and role restrictions verified.');
      passedPhases++;
    } else {
      console.error('❌ Phase 7 Failed:', {
        orderInDeliveryList,
        status: orderAfterDelivery?.status,
        deliveryStatus: orderAfterDelivery?.deliveryStatus,
        deliveryPartnerBlockedFromPrice,
        deliveryPartnerBlockedFromPayment,
      });
      failedPhases++;
    }

    // ============================================================================
    // PHASE 8 — CUSTOMER DELIVERY TRACKING
    // ============================================================================
    console.log('\n--- PHASE 8: CUSTOMER DELIVERY TRACKING ---');
    const resFarmerTracking = await axios.get(`${BASE_URL}/orders/${dbOrder!._id}`, farmerHeaders);
    const trackedOrder = resFarmerTracking.data.order;

    const trackingStatusDelivered = trackedOrder.status === 'DELIVERED';
    const trackingPaymentPaid = trackedOrder.paymentStatus === 'PAID';
    const trackingDeliveryPartnerNamed = trackedOrder.deliveryBoyName?.includes('Suresh');
    const hasFullTimeline = trackedOrder.statusTimeline && trackedOrder.statusTimeline.length >= 4;

    if (trackingStatusDelivered && trackingPaymentPaid && trackingDeliveryPartnerNamed && hasFullTimeline) {
      console.log(`✅ Phase 8 Passed: Farmer tracking verified (Status: DELIVERED, Payment: PAID, Delivery Partner: ${trackedOrder.deliveryBoyName}, Timeline entries: ${trackedOrder.statusTimeline.length}).`);
      passedPhases++;
    } else {
      console.error('❌ Phase 8 Failed:', {
        trackingStatusDelivered,
        trackingPaymentPaid,
        trackingDeliveryPartnerNamed,
        hasFullTimeline,
      });
      failedPhases++;
    }

    // ============================================================================
    // PHASE 9 — STOCK MANAGEMENT & ATOMIC INTEGRITY
    // ============================================================================
    console.log('\n--- PHASE 9: STOCK MANAGEMENT (Decrement, Overselling Protection & Non-Negative) ---');
    // Product started with stock 25, purchased 3 -> Remaining stock in MongoDB must be 22
    const currentProductDb = await Product.findById(tempProductId);
    const stockDecrementedCorrectly = currentProductDb?.stock === 22;

    // Attempting to checkout 30 units (more than 22) must be rejected
    await Cart.deleteOne({ farmer: farmerUser._id });
    await axios.post(`${BASE_URL}/cart/items`, { productId: tempProductId, quantity: 22 }, farmerHeaders);

    // Now attempt to update quantity to 25 (exceeding stock)
    let oversellBlockedInCart = false;
    try {
      await axios.put(`${BASE_URL}/cart/items/${tempProductId}`, { quantity: 25 }, farmerHeaders);
    } catch (err: any) {
      if (err.response?.status === 400) oversellBlockedInCart = true;
    }

    // Attempt to directly create an order exceeding stock
    await Product.findByIdAndUpdate(tempProductId, { stock: 0 });
    let outOfStockOrderBlocked = false;
    try {
      await axios.post(`${BASE_URL}/orders`, orderCreatePayload, farmerHeaders);
    } catch (err: any) {
      if (err.response?.status === 400) outOfStockOrderBlocked = true;
    }

    // Restore stock for clean state
    await Product.findByIdAndUpdate(tempProductId, { stock: 22 });

    if (stockDecrementedCorrectly && oversellBlockedInCart && outOfStockOrderBlocked) {
      console.log('✅ Phase 9 Passed: Stock decremented from 25 to 22; overselling and out-of-stock purchases strictly prevented.');
      passedPhases++;
    } else {
      console.error('❌ Phase 9 Failed:', {
        stockDecrementedCorrectly,
        stock: currentProductDb?.stock,
        oversellBlockedInCart,
        outOfStockOrderBlocked,
      });
      failedPhases++;
    }

    // ============================================================================
    // PHASE 10 — SECURITY & ROLE ISOLATION
    // ============================================================================
    console.log('\n--- PHASE 10: SECURITY & ROLE ISOLATION ---');
    // 1. Unauthenticated request rejected (401)
    let unauthRejected = false;
    try {
      await axios.get(`${BASE_URL}/orders`);
    } catch (err: any) {
      if (err.response?.status === 401) unauthRejected = true;
    }

    // 2. Farmer cannot view all shop orders (403)
    let farmerShopOrdersBlocked = false;
    try {
      await axios.get(`${BASE_URL}/orders/shop-owner`, farmerHeaders);
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.data?.orders?.length === 0) {
        farmerShopOrdersBlocked = true;
      }
    }

    // 3. Farmer cannot modify store UPI settings (403)
    let farmerUpiConfigBlocked = false;
    try {
      await axios.put(`${BASE_URL}/payments/store-config`, { upiId: 'farmer@upi' }, farmerHeaders);
    } catch (err: any) {
      if (err.response?.status === 403) farmerUpiConfigBlocked = true;
    }

    if (unauthRejected && farmerShopOrdersBlocked && farmerUpiConfigBlocked) {
      console.log('✅ Phase 10 Passed: Role isolation verified (401 Unauthenticated & 403 Forbidden across all protected resources).');
      passedPhases++;
    } else {
      console.error('❌ Phase 10 Failed:', { unauthRejected, farmerShopOrdersBlocked, farmerUpiConfigBlocked });
      failedPhases++;
    }

    // ============================================================================
    // PHASE 11 — CLEANUP
    // ============================================================================
    console.log('\n--- PHASE 11: CLEANUP ---');
    // Delete temporary product
    if (tempProductId) {
      await Product.findByIdAndDelete(tempProductId);
    }

    // Delete temporary orders & payments
    if (tempOrderIds.length > 0) {
      await Order.deleteMany({ _id: { $in: tempOrderIds } });
      await Payment.deleteMany({ order: { $in: tempOrderIds } });
    }

    // Clean cart
    await Cart.deleteOne({ farmer: farmerUser._id });

    // Clean temporary test UPI config
    await StorePaymentConfig.deleteMany({});
    await User.findByIdAndUpdate(adminUser._id, { upiId: '' });

    // Verify remaining catalog products
    const finalProductCount = await Product.countDocuments();
    const finalOrderCount = await Order.countDocuments();

    if (finalProductCount === 30) {
      console.log(`✅ Phase 11 Passed: Temporary test product and orders deleted. Exactly 30 real catalog products permanently preserved.`);
      passedPhases++;
    } else {
      console.error(`❌ Phase 11 Failed: Product count mismatch (Expected 30, Got ${finalProductCount}).`);
      failedPhases++;
    }

    console.log('\n================================================================================');
    console.log(`🏁 E2E VERIFICATION SUITE RESULTS: ${passedPhases}/11 TEST PHASES PASSED, ${failedPhases} FAILED`);
    console.log('================================================================================\n');

    if (server) server.close();
    await disconnectDB();
    process.exit(failedPhases > 0 ? 1 : 0);
  } catch (err) {
    console.error('E2E Test Execution Error:', err);
    if (server) server.close();
    await disconnectDB();
    process.exit(1);
  }
}

runCompleteOrderToDeliveryE2EVerification();
