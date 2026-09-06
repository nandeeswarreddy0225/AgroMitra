import axios from 'axios';

async function testAllProdLogins() {
  const prodBase = 'https://agromitra-ytqb.onrender.com/api';
  console.log('Testing Production API login at:', prodBase, '\n');

  const accounts = [
    { role: 'ADMIN', phone: '9876543211', email: 'admin@agrimart.com', password: 'Password123' },
    { role: 'FARMER (1)', phone: '8247303735', email: 'nandeeswarreddy1346@gmail.com', password: 'Password123' },
    { role: 'FARMER (2)', phone: '8519813077', email: 'nandeeswarreddy2852@gmail.com', password: 'Password123' },
    { role: 'AGRI_PARTNER', phone: '9876543299', email: 'agripartner@agrimart.com', password: 'Password123' },
    { role: 'DELIVERY_BOY', phone: '9876543220', email: 'delivery@agrimart.com', password: 'Password123' },
  ];

  console.log('=== TEST A: LOGIN WITH PHONE NUMBER ===');
  for (const acc of accounts) {
    try {
      const res = await axios.post(`${prodBase}/auth/login`, {
        phone: acc.phone,
        password: acc.password,
      });
      console.log(`✅ [${acc.role} - Phone ${acc.phone}] Login SUCCESS -> User: ${res.data.user?.name} (${res.data.user?.role})`);
    } catch (err: any) {
      console.log(`❌ [${acc.role} - Phone ${acc.phone}] Login FAILED:`, err.response?.data?.message || err.message);
    }
  }

  console.log('\n=== TEST B: LOGIN WITH EMAIL ADDRESS ===');
  for (const acc of accounts) {
    try {
      const res = await axios.post(`${prodBase}/auth/login`, {
        email: acc.email,
        password: acc.password,
      });
      console.log(`✅ [${acc.role} - Email ${acc.email}] Login SUCCESS -> User: ${res.data.user?.name} (${res.data.user?.role})`);
    } catch (err: any) {
      console.log(`❌ [${acc.role} - Email ${acc.email}] Login FAILED:`, err.response?.data?.message || err.message);
    }
  }

  console.log('\n=== TEST C: LOGIN WITH +91 PREFIX ===');
  for (const acc of accounts) {
    try {
      const res = await axios.post(`${prodBase}/auth/login`, {
        phone: `+91${acc.phone}`,
        password: acc.password,
      });
      console.log(`✅ [${acc.role} - +91${acc.phone}] Login SUCCESS -> User: ${res.data.user?.name} (${res.data.user?.role})`);
    } catch (err: any) {
      console.log(`❌ [${acc.role} - +91${acc.phone}] Login FAILED:`, err.response?.data?.message || err.message);
    }
  }
}

testAllProdLogins();
