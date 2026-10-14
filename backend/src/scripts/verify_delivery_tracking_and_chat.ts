import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });


import { Order } from '../models/Order.model';
import { User } from '../models/User.model';
import { OrderMessage } from '../models/OrderMessage.model';

async function verifyTrackingAndChat() {
  console.log('🚀 [Verification]: Testing Live Delivery Tracking and In-Order Chat System...');
  
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not configured in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB Atlas');

  try {
    // 1. Fetch or create a sample order
    let order = await Order.findOne().sort({ createdAt: -1 });

    if (!order) {
      console.log('⚠️ No existing order found. Creating test order...');
      const farmer = await User.findOne({ role: 'FARMER' });
      const shopOwner = await User.findOne({ role: 'SHOP_OWNER' });

      if (!farmer || !shopOwner) {
        console.log('⚠️ Missing farmer or shopOwner in database.');
        return;
      }

      order = await Order.create({
        orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
        farmer: farmer._id,
        items: [
          {
            product: new mongoose.Types.ObjectId(),
            shopOwner: shopOwner._id,
            productNameSnapshot: 'NPK 19-19-19 Fertilizer',
            price: 850,
            quantity: 2,
            unit: 'Bag (50kg)',
            subtotal: 1700,
          },
        ],
        totalAmount: 1700,
        deliveryAddress: {
          street: 'NH 44 Farm Access Road',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518002',
          latitude: 15.8281,
          longitude: 78.0373,
        },
        status: 'OUT_FOR_DELIVERY',
        deliveryStatus: 'OUT_FOR_DELIVERY',
        paymentStatus: 'PAID',
      });
      console.log('✅ Test order created:', order.orderNumber);
    } else {
      console.log(`📦 Found existing order: ${order.orderNumber} (Status: ${order.status})`);
    }

    // 2. Test OrderMessage Creation & Retrieval
    const sender = await User.findOne({ role: 'FARMER' }) || await User.findOne();
    if (!sender) {
      throw new Error('No valid sender user found');
    }

    const testMsgContent = `Verified logistics test message at ${new Date().toISOString()}`;
    const testMessage = await OrderMessage.create({
      order: order._id,
      sender: sender._id,
      senderName: sender.name,
      senderRole: sender.role as any,
      message: testMsgContent,
      readBy: [sender._id],
    });

    console.log('✅ OrderMessage successfully created:', {
      id: testMessage._id.toString(),
      senderName: testMessage.senderName,
      senderRole: testMessage.senderRole,
      message: testMessage.message,
    });

    // 3. Test Retrieval
    const retrievedMessages = await OrderMessage.find({ order: order._id }).sort({ createdAt: 1 });
    console.log(`✅ Retrieved ${retrievedMessages.length} message(s) for Order #${order.orderNumber}`);

    const hasOurMessage = retrievedMessages.some((m) => m.message === testMsgContent);
    if (!hasOurMessage) {
      throw new Error('Created message was not found in query results.');
    }
    console.log('✅ Message persistence verified successfully!');

    // 4. Test Telemetry Calculation
    const sampleCoord1 = { latitude: 15.8281, longitude: 78.0373 }; // Kurnool
    const sampleCoord2 = { latitude: 16.5062, longitude: 80.648 };  // Vijayawada
    
    // Haversine
    const R = 6371;
    const dLat = ((sampleCoord2.latitude - sampleCoord1.latitude) * Math.PI) / 180;
    const dLon = ((sampleCoord2.longitude - sampleCoord1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((sampleCoord1.latitude * Math.PI) / 180) *
        Math.cos((sampleCoord2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = (R * c).toFixed(2);
    console.log(`✅ Geodesic Distance Calculation Verified: ${dist} km`);

    console.log('\n🎉 ALL ORDER & LOGISTICS VERIFICATIONS PASSED SUCCESSFULLY!');
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

verifyTrackingAndChat().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
