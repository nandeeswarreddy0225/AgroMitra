import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

(async () => {
  try {
    console.log('Connecting with timeout 10s...');
    const conn = await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connected to Atlas:', conn.connection.host);
    const users = await conn.connection.collection('users').find({}).toArray();
    console.log(`Users count in Atlas: ${users.length}`);
    for (const u of users) {
      console.log(`- ${u.email} (${u.role})`);
    }
    await mongoose.disconnect();
  } catch (err: any) {
    console.error('Atlas error:', err.message);
  }
})();
