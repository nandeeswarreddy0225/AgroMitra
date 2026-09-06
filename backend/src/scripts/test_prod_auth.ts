import axios from 'axios';

async function testAllProdLogins() {
  const prodBase = 'https://agromitra-ytqb.onrender.com/api';
  console.log('Testing Production API login at:', prodBase);

  const accounts = [
    { role: 'ADMIN', phone: '9876543211', email: 'admin@agrimart.com', password: 'Password123' },
    { role: 'FARMER (1)', phone: '8247303735', email: 'nandeeswarreddy1346@gmail.com', password: 'Password123' },
    { role: 'FARMER (2)', phone: '8519813077', email: 'nandeeswarreddy2852@gmail.com', password: 'Password123' },
    { role: 'AGRI_PARTNER', phone: '9876543299', email: 'agripartner@agrimart.com', password: 'Password123' },
    { role: 'DELIVERY_BOY', phone: '9876543220', email: 'delivery@agrimart.com', password: 'Password123' },
  ];

  for (const acc of accounts) {
    try {
      const res = await axios.post(`${prodBase}/auth/login`, {
        phone: acc.phone,
        password: acc.password,
      });
      console.log(`✅ [${acc.role}] Login SUCCESS! User: ${res.data.user?.name} | Role: ${res.data.user?.role} | Phone: ${res.data.user?.phone} | Token: ${res.data.token?.substring(0, 15)}...`);
    } catch (err: any) {
      console.log(`❌ [${acc.role}] Login FAILED:`, err.response?.data?.message || err.message);
    }
  }
}

testAllProdLogins();
