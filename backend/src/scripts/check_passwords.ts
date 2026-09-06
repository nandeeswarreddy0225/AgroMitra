import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function checkPasswords() {
  const conn = await mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 10000 });
  const users = await conn.connection.collection('users').find({}).toArray();

  const candidatePasswords = [
    'Password123',
    'admin123',
    'Admin@123',
    'Admin123',
    'admin1234',
    '123456',
    '12345678',
    'AgriMart@2026',
    'AgroMitra@2026',
    'nandeesh',
    'nandeesh123',
    'Nandeesh@123',
    'Farmer@123',
    'farmer123',
    '8247303735',
    '9876543211',
    'agrimart123',
  ];

  for (const u of users) {
    console.log(`\nUser: ${u.email} (${u.role}), phone: ${u.phone}`);
    console.log('Password hash:', u.password);
    let found = false;
    for (const cand of candidatePasswords) {
      if (u.password) {
        const isMatch = await bcrypt.compare(cand, u.password);
        if (isMatch) {
          console.log(`  >>> FOUND MATCHING PASSWORD: "${cand}"`);
          found = true;
          break;
        }
      }
    }
    if (!found) {
      console.log('  >>> No match among common test passwords');
    }
  }

  await mongoose.disconnect();
}

checkPasswords();
