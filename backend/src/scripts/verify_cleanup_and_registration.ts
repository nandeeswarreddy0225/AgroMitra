import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { configureDnsResolvers } from '../config/db';

const API_BASE = 'https://agromitra-ytqb.onrender.com/api';

async function verifyState() {
  configureDnsResolvers();
  await mongoose.connect(process.env.MONGODB_URI || '');

  const totalUsers = await mongoose.connection.collection('users').countDocuments({});
  const adminUsers = await mongoose.connection.collection('users').countDocuments({ role: 'ADMIN' });
  const farmerUsers = await mongoose.connection.collection('users').countDocuments({ role: 'FARMER' });
  const partnerUsers = await mongoose.connection.collection('users').countDocuments({ role: { $in: ['AGRI_PARTNER', 'SHOP_OWNER'] } });
  const deliveryUsers = await mongoose.connection.collection('users').countDocuments({ role: 'DELIVERY_BOY' });
  const productsCount = await mongoose.connection.collection('products').countDocuments({});
  const storeConfigCount = await mongoose.connection.collection('storepaymentconfigs').countDocuments({});

  console.log('--- DATABASE STATE IN ATLAS ---');
  console.log('Total Users:', totalUsers);
  console.log('Admin Users:', adminUsers);
  console.log('Farmer Users:', farmerUsers);
  console.log('Agri Partner Users:', partnerUsers);
  console.log('Delivery Boy Users:', deliveryUsers);
  console.log('Products Count:', productsCount);
  console.log('Store Config Count:', storeConfigCount);

  // Test Admin Login via Live Production API
  const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    phone: '9876543211',
    password: 'Password123',
  });
  console.log('\n--- LIVE PRODUCTION API TEST ---');
  console.log('Admin Login Status:', adminLoginRes.status === 200 ? 'HTTP 200 OK (PASS)' : 'FAILED');
  console.log('Admin User Name:', adminLoginRes.data.user?.name);
  console.log('Admin Role:', adminLoginRes.data.user?.role);

  // Test Fresh Farmer Registration and subsequent Login via Live API
  const testPhone = '9999900001';
  const testEmail = 'freshfarmer@agromitra.test';
  const regRes = await axios.post(`${API_BASE}/auth/register`, {
    name: 'Fresh Verification Farmer',
    phone: testPhone,
    email: testEmail,
    password: 'Password123',
    role: 'FARMER',
  });
  console.log('\nFresh Farmer Registration Status:', regRes.status === 201 ? 'HTTP 201 CREATED (PASS)' : 'FAILED');

  const newLoginRes = await axios.post(`${API_BASE}/auth/login`, {
    phone: testPhone,
    password: 'Password123',
  });
  console.log('Fresh Farmer Login Status:', newLoginRes.status === 200 ? 'HTTP 200 OK (PASS)' : 'FAILED');

  // Clean up the temporary test registration user so database stays completely pristine
  await mongoose.connection.collection('users').deleteOne({ phone: testPhone });
  console.log('Cleaned up temporary verification farmer account.');

  const finalFarmerCount = await mongoose.connection.collection('users').countDocuments({ role: 'FARMER' });
  const finalTotal = await mongoose.connection.collection('users').countDocuments({});
  console.log('Final Total Users:', finalTotal);
  console.log('Final Farmer Count:', finalFarmerCount);

  await mongoose.disconnect();
}

verifyState().catch(err => console.error(err));
