import dotenv from 'dotenv';
dotenv.config();
import { connectDB, disconnectDB } from '../config/db';
import { autoSeedDefaultData } from '../utils/autoSeed';

async function main() {
  await connectDB();
  await autoSeedDefaultData();
  await disconnectDB();
  console.log('Seeding finished successfully!');
}

main();
