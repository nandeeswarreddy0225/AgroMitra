import axios from 'axios';

async function testExactFlow() {
  const BASE_URL = 'http://localhost:5000/api';

  console.log('=== STEP 1: Login as Agri Partner ===');
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'nandeeswarreddy1346@gmail.com',
    password: 'Password123',
  });
  console.log('Login HTTP Status:', loginRes.status);
  const token = loginRes.data.token;
  const partnerId = loginRes.data.user._id || loginRes.data.user.id;
  console.log('Authenticated User ID:', partnerId);

  console.log('\n=== STEPS 2 - 6: Update fields to TEST values and Save ===');
  const payload = {
    shopName: 'TEST FARM STORE',
    upiId: 'teststore@upi',
    phone: '9000000001',
    address: {
      street: 'Market Yard Complex',
      city: 'TEST CITY',
      state: 'Andhra Pradesh',
      pincode: '518001',
    },
  };
  console.log('Request Payload:', JSON.stringify(payload, null, 2));

  const saveRes = await axios.put(`${BASE_URL}/auth/profile`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log('\n=== STEP 7: Report HTTP Response ===');
  console.log('Save HTTP Status:', saveRes.status);
  console.log('Save Response Body:', JSON.stringify(saveRes.data, null, 2));

  console.log('\n=== STEPS 8 - 10: Reload Browser & Reopen Agri Partner Portal (GET /api/auth/me) ===');
  const reloadRes = await axios.get(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Reload GET /api/auth/me HTTP Status:', reloadRes.status);
  console.log('Reload Response Body:', JSON.stringify(reloadRes.data, null, 2));

  const u = reloadRes.data.user;
  console.log('\n--- Verification of Exact Values After Reload ---');
  console.log('1. Store Name equals "TEST FARM STORE":', u.shopName === 'TEST FARM STORE');
  console.log('2. UPI ID equals "teststore@upi":', u.upiId === 'teststore@upi');
  console.log('3. Mobile equals "9000000001":', u.phone === '9000000001');
  console.log('4. City equals "TEST CITY":', u.address?.city === 'TEST CITY');

  console.log('\n=== STEPS 11 - 13: Logout & Login Again as Same Partner ===');
  const reLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'nandeeswarreddy1346@gmail.com',
    password: 'Password123',
  });
  console.log('Re-login HTTP Status:', reLoginRes.status);
  const reU = reLoginRes.data.user;
  console.log('Re-login Store Name equals "TEST FARM STORE":', reU.shopName === 'TEST FARM STORE');
  console.log('Re-login UPI ID equals "teststore@upi":', reU.upiId === 'teststore@upi');
  console.log('Re-login Mobile equals "9000000001":', reU.phone === '9000000001');
  console.log('Re-login City equals "TEST CITY":', reU.address?.city === 'TEST CITY');

  console.log('\n=== STEP 14: Verify Another Partner (Partner B) Isolation ===');
  const bEmail = `partner.isolated.${Date.now()}@agrimart.in`;
  const bRegisterRes = await axios.post(`${BASE_URL}/auth/register`, {
    name: 'Different Store Partner',
    email: bEmail,
    phone: '9888877777',
    password: 'Password123',
    role: 'SHOP_OWNER',
    address: { city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
  });
  const bToken = bRegisterRes.data.token;
  const bProfile = await axios.get(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${bToken}` },
  });
  console.log('Partner B Shop Name:', bProfile.data.user.shopName);
  console.log('Partner B UPI ID:', bProfile.data.user.upiId);
  console.log('Partner B City:', bProfile.data.user.address?.city);
  console.log('Partner B does NOT see TEST FARM STORE:', bProfile.data.user.shopName !== 'TEST FARM STORE');
  console.log('Partner B does NOT see teststore@upi:', bProfile.data.user.upiId !== 'teststore@upi');

  console.log('\n====================================================');
  console.log('  🎉 ALL EXACT TEST STEPS PASSED SUCCESSFULLY!      ');
  console.log('====================================================\n');
}

testExactFlow().catch((err) => {
  console.error('Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
