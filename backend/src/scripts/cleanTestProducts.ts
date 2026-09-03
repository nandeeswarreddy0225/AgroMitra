import dotenv from 'dotenv';
dotenv.config();
import { connectDB, disconnectDB } from '../config/db';
import { Product } from '../models/Product.model';

const cleanTestProducts = async () => {
  await connectDB();
  const delRes = await Product.deleteMany({ name: { $ne: 'Urea Fertilizer' } });
  console.log(`✅ Removed ${delRes.deletedCount} test products.`);

  const remaining = await Product.find({});
  console.log('✅ Remaining real products in MongoDB:', remaining.length);
  remaining.forEach((p) => {
    console.log(` - ID: ${p._id.toString()} | Name: ${p.name} | Brand: ${p.brand} | Price: ₹${p.price} / ${p.unit} | Stock: ${p.stock}`);
  });

  await disconnectDB();
};

cleanTestProducts().catch((e) => {
  console.error(e);
  process.exit(1);
});
