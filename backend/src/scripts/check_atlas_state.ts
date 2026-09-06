import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function main() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to Atlas DB:', conn.connection.name);

    const users = await conn.connection.collection('users').find({}).toArray();
    console.log('\n================ USERS IN ATLAS ================');
    for (const u of users) {
      console.log(`User ID: ${u._id}`);
      console.log(`  Name: ${u.name}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Phone: "${u.phone}"`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Has Password: ${!!u.password}`);
      console.log(`  ShopName: "${u.shopName || ''}"`);
      console.log(`  UpiId: "${u.upiId || ''}"`);
    }

    const storeConfigs = await conn.connection.collection('storepaymentconfigs').find({}).toArray();
    console.log('\n================ STORE CONFIGS ================');
    console.log(JSON.stringify(storeConfigs, null, 2));

    const deliveryBoys = await conn.connection.collection('deliveryboys').find({}).toArray();
    console.log('\n================ DELIVERY BOYS ================');
    console.log(JSON.stringify(deliveryBoys, null, 2));

    const productsCount = await conn.connection.collection('products').countDocuments();
    console.log('\nProducts count in Atlas:', productsCount);

    const orders = await conn.connection.collection('orders').find({}).limit(5).toArray();
    console.log('\nOrders sample in Atlas (count = ' + (await conn.connection.collection('orders').countDocuments()) + '):');
    for (const o of orders) {
      console.log(`Order ${o._id}: total=${o.totalAmount}, status=${o.status}, paymentStatus=${o.paymentStatus}`);
    }

    await mongoose.disconnect();
  } catch (err: any) {
    console.error('Atlas check error:', err.message);
  }
}

main();
