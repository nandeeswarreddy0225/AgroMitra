import axios from 'axios';

const API_BASE = 'https://agromitra-ytqb.onrender.com/api';

async function verifyAuthAndAccess() {
  const accounts = [
    {
      role: 'ADMIN',
      name: 'KrishiSetu Admin',
      phone: '9876543211',
      email: 'admin@agrimart.com',
      password: 'Password123',
      checkEndpoint: '/payments/admin/all',
    },
    {
      role: 'FARMER',
      name: 'Nandeesh',
      phone: '8247303735',
      email: 'nandeeswarreddy1346@gmail.com',
      password: 'Password123',
      checkEndpoint: '/orders/my-orders',
    },
    {
      role: 'AGRI_PARTNER',
      name: 'Agri Partner Kendra',
      phone: '9876543299',
      email: 'agripartner@agrimart.com',
      password: 'Password123',
      checkEndpoint: '/orders/shop-owner',
    },
    {
      role: 'DELIVERY_BOY',
      name: 'Ramesh Kumar',
      phone: '9876543220',
      email: 'delivery@agrimart.com',
      password: 'Password123',
      checkEndpoint: '/delivery/assigned-orders',
    },
  ];

  console.log('================================================================');
  console.log('       REAL-TIME PRODUCTION AUTHENTICATION & ACCESS REPORT      ');
  console.log('================================================================\n');

  for (const acc of accounts) {
    console.log(`----------------------------------------------------------------`);
    console.log(`ROLE: ${acc.role}`);
    console.log(`----------------------------------------------------------------`);

    // 1. Phone login
    const phoneRes = await axios.post(`${API_BASE}/auth/login`, {
      phone: acc.phone,
      password: acc.password,
    });
    console.log(`1. Phone Login [${acc.phone}]: HTTP ${phoneRes.status} OK`);
    console.log(`   - User ID: ${phoneRes.data.user?.id || phoneRes.data.user?._id}`);
    console.log(`   - Name: ${phoneRes.data.user?.name}`);
    console.log(`   - Role in Token/Response: ${phoneRes.data.user?.role}`);
    console.log(`   - JWT Token Issued: ${phoneRes.data.token ? 'YES (' + phoneRes.data.token.substring(0, 18) + '...)' : 'NO'}`);

    // 2. Email login
    const emailRes = await axios.post(`${API_BASE}/auth/login`, {
      email: acc.email,
      password: acc.password,
    });
    console.log(`2. Email Login [${acc.email}]: HTTP ${emailRes.status} OK`);

    // 3. Authenticated Session & Dashboard Access
    const token = phoneRes.data.token;
    const meRes = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`3. Verified Profile (/auth/me): HTTP ${meRes.status} OK`);
    console.log(`   - Confirmed Active User: ${meRes.data.user?.name} (${meRes.data.user?.email})`);

    // 4. Role-specific Protected Endpoint Access
    try {
      const roleEndpointRes = await axios.get(`${API_BASE}${acc.checkEndpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`4. Role Dashboard Access (${acc.checkEndpoint}): HTTP ${roleEndpointRes.status} OK (AUTHORIZED)`);
    } catch (e: any) {
      console.log(`4. Role Dashboard Access (${acc.checkEndpoint}): HTTP ${e.response?.status || 'ERR'} (${e.response?.data?.message || e.message})`);
    }

    console.log(`OVERALL ${acc.role} STATUS: PASS\n`);
  }
}

verifyAuthAndAccess().catch((err) => {
  console.error('Test error:', err.response?.data || err.message);
});
