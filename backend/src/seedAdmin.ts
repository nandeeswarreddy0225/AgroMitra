import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/db';
import { User } from './models/User.model';

dotenv.config();

const seedAdmin = async (): Promise<void> => {
  try {
    await connectDB();

    const name = process.env.ADMIN_NAME || 'AgriMart System Admin';
    const email = (process.env.ADMIN_EMAIL || 'admin@agrimart.com').toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
      console.error('❌ [Seed Admin]: ADMIN_PASSWORD environment variable is required to seed an admin account.');
      process.exit(1);
    }

    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      existingAdmin.name = name;
      existingAdmin.password = password; // Pre-save hook will hash it
      existingAdmin.role = 'ADMIN';
      await existingAdmin.save();
      console.log(`✅ [Seed Admin]: Admin account '${email}' successfully updated.`);
    } else {
      const adminUser = new User({
        name,
        email,
        phone: '1234567890',
        password,
        role: 'ADMIN',
        address: {
          street: 'HQ Command Center',
          city: 'AgriTech Central',
          state: 'National',
          pincode: '100001',
        },
      });

      await adminUser.save();
      console.log(`✅ [Seed Admin]: Admin account '${email}' successfully created.`);
    }

    await disconnectDB();
    console.log('✅ [Seed Admin]: Seeding complete. Exiting.');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Seed Admin]: Error during admin seeding:', error);
    process.exit(1);
  }
};

seedAdmin();
