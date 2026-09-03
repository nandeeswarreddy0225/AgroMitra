import dotenv from 'dotenv';
dotenv.config();
import { connectDB, disconnectDB } from '../config/db';
import { Product } from '../models/Product.model';
import { Order } from '../models/Order.model';

async function main() {
  try {
    await connectDB();

    const allProducts = await Product.find({});
    console.log(`\nFound ${allProducts.length} total products in database:`);
    
    for (const p of allProducts) {
      console.log(`- [${p._id}] "${p.name}" | Category: "${p.category}" | Brand: "${p.brand}" | Price: ₹${p.price}`);
    }

    const allOrders = await Order.find({});
    console.log(`\nFound ${allOrders.length} total orders in database.`);

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
