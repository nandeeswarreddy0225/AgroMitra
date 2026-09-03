import dotenv from 'dotenv';
dotenv.config();
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { Order } from '../models/Order.model';

const linkRealShopOwner = async () => {
  await connectDB();

  const realShopOwner = await User.findOne({ email: 'nandeeswarreddy1346@gmail.com' });
  if (!realShopOwner) {
    console.log('Real shop owner nandeeswarreddy1346@gmail.com not found');
    await disconnectDB();
    return;
  }

  console.log(`Linking to real shop owner: ${realShopOwner.name} (${realShopOwner._id})`);

  // Update product Urea Fertilizer
  const prodRes = await Product.updateMany(
    { name: 'Urea Fertilizer' },
    { $set: { shopOwner: realShopOwner._id } }
  );
  console.log(`Updated products: ${prodRes.modifiedCount}`);

  // Update existing orders containing Urea Fertilizer
  const orderRes = await Order.updateMany(
    { 'items.productNameSnapshot': 'Urea Fertilizer' },
    { $set: { 'items.$[elem].shopOwner': realShopOwner._id } },
    { arrayFilters: [{ 'elem.productNameSnapshot': 'Urea Fertilizer' }] }
  );
  console.log(`Updated order items: ${orderRes.modifiedCount}`);

  // Verify
  const orders = await Order.find({ 'items.shopOwner': realShopOwner._id });
  console.log(`Verified: Found ${orders.length} order(s) for ${realShopOwner.name}`);
  orders.forEach((o) => {
    console.log(` - Order Number: ${o.orderNumber}, Status: ${o.status}, Total: ₹${o.totalAmount}`);
  });

  await disconnectDB();
};

linkRealShopOwner().catch((e) => {
  console.error(e);
  process.exit(1);
});
