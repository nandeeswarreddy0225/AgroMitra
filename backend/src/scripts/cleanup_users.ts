import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { configureDnsResolvers } from '../config/db';
import { User } from '../models/User.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';
import { Cart } from '../models/Cart.model';

async function cleanupDatabaseUsers() {
  console.log('====================================================');
  console.log('🧹 AGROMITRA PRODUCTION USER DATABASE CLEANUP');
  console.log('====================================================\n');

  configureDnsResolvers();

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment.');
    process.exit(1);
  }

  console.log('Connecting to configured MongoDB database...');
  await mongoose.connect(mongoUri);
  console.log(`✅ Connected to database: ${mongoose.connection.name} on host ${mongoose.connection.host}`);

  const initialCount = await User.countDocuments({});
  console.log(`Initial User count: ${initialCount}`);

  const deleteResult = await User.deleteMany({});
  console.log(`Deleted ${deleteResult.deletedCount} users.`);

  // Clean up delivery boy profiles linked to users
  const dbDeleteResult = await DeliveryBoy.deleteMany({});
  console.log(`Cleaned ${dbDeleteResult.deletedCount} delivery boy records.`);

  // Clean up carts
  const cartDeleteResult = await Cart.deleteMany({});
  console.log(`Cleaned ${cartDeleteResult.deletedCount} cart records.`);

  const finalCount = await User.countDocuments({});
  console.log(`\nFinal User count in MongoDB: ${finalCount}`);

  if (finalCount === 0) {
    console.log('✅ VERIFICATION PASSED: Authentication user collection contains EXACTLY 0 users.');
  } else {
    console.error(`❌ VERIFICATION FAILED: Final count is ${finalCount}`);
    process.exit(1);
  }

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

cleanupDatabaseUsers().catch((err) => {
  console.error('Error during database cleanup:', err);
  process.exit(1);
});
