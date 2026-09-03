import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Order } from '../models/Order.model';

async function check() {
  await connectDB();
  const shops = await User.find({ role: 'SHOP_OWNER' });
  console.log('--- ALL SHOP OWNERS ---');
  for (const s of shops) {
    console.log(`ID: ${s._id} | Name: ${s.name} | ShopName: ${s.shopName} | Email: ${s.email} | UPI: "${s.upiId}" | Phone: ${s.phone}`);
  }

  const orders = await Order.find().sort({ createdAt: -1 }).limit(5).populate('items.shopOwner', 'name shopName email upiId');
  console.log('\n--- RECENT 5 ORDERS ---');
  for (const o of orders) {
    const firstShop = o.items?.[0]?.shopOwner as any;
    console.log(`Order: ${o.orderNumber} | Amount: ${o.totalAmount} | Status: ${o.status} | PayStatus: ${o.paymentStatus} | Shop: ${firstShop?.shopName || firstShop?.name} | ShopUPI: "${firstShop?.upiId}"`);
  }
  await disconnectDB();
  process.exit(0);
}

check();
