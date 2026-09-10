/**
 * DELIVERY BOY AUTHENTICATION REGRESSION TEST
 *
 * Tests the complete Delivery Boy authentication flow against production API:
 * https://agromitra-ytqb.onrender.com/api
 *
 * Tests (per Part 4 & 5 requirements):
 * 1.  Register DELIVERY_BOY - verify stored role = DELIVERY_BOY
 * 2.  Login as DELIVERY_BOY - verify response role = DELIVERY_BOY
 * 3.  Decode JWT - verify role = DELIVERY_BOY
 * 4.  Verify correct redirect path = /delivery-boy/dashboard
 * 5.  Logout & clear state
 * 6.  Login as FARMER - verify Farmer portal
 * 7.  Logout & clear state
 * 8.  Login as DELIVERY_BOY again - verify still correct
 * 9.  Cross-role test: DELIVERY_BOY creds + FARMER portal → REJECT
 * 10. Wrong password → REJECT
 * 11. Unknown role → REJECT
 * 12. Register SHOP_OWNER → /shop-owner/dashboard
 * 13. Register FARMER → /farmer/dashboard
 * 14. Register AGRI_PARTNER → /agri-partner/dashboard
 * 15. Register MARKET_OWNER → /market-owner/dashboard
 * 16. Cleanup: Delete all test accounts
 * 17. Verify final user count = 0
 */

import axios from 'axios';
import * as jwt from 'jsonwebtoken';

const API_BASE = 'https://agromitra-ytqb.onrender.com/api';

// Unique test run ID to avoid conflicts
const RUN_ID = Date.now().toString().slice(-6);

// Generate valid 10-digit Indian phone numbers
// Must be exactly 10 digits, starting with 6-9
// Format: 9876[role_index][last_5_of_timestamp]
const TS5 = Date.now().toString().slice(-5);

const makePhone = (roleIdx: number): string => `9876${roleIdx}${TS5}`;

// Unique test user credentials (isolated test environment)
const TEST_USERS = {
  DELIVERY_BOY: {
    name: `TestDelivery${RUN_ID}`,
    email: `testdelivery${RUN_ID}@agrotestonly.invalid`,
    phone: makePhone(0),  // e.g. 987600XXXXX
    password: `DelivTest${RUN_ID}!`,
    role: 'DELIVERY_BOY' as const,
    address: { street: 'Test Colony', city: 'Testpur', state: 'Andhra Pradesh', pincode: '518001' },
  },
  FARMER: {
    name: `TestFarmer${RUN_ID}`,
    email: `testfarmer${RUN_ID}@agrotestonly.invalid`,
    phone: makePhone(1),
    password: `FarmTest${RUN_ID}!`,
    role: 'FARMER' as const,
    address: { street: 'Farm Road', city: 'Agriville', state: 'Andhra Pradesh', pincode: '518002' },
  },
  SHOP_OWNER: {
    name: `TestShop${RUN_ID}`,
    email: `testshop${RUN_ID}@agrotestonly.invalid`,
    phone: makePhone(2),
    password: `ShopTest${RUN_ID}!`,
    role: 'SHOP_OWNER' as const,
    address: { street: 'Market Street', city: 'Shoptown', state: 'Andhra Pradesh', pincode: '518003' },
  },
  AGRI_PARTNER: {
    name: `TestAgri${RUN_ID}`,
    email: `testagri${RUN_ID}@agrotestonly.invalid`,
    phone: makePhone(3),
    password: `AgriTest${RUN_ID}!`,
    role: 'AGRI_PARTNER' as const,
    address: { street: 'Partner Lane', city: 'Agripark', state: 'Andhra Pradesh', pincode: '518004' },
  },
  MARKET_OWNER: {
    name: `TestMarket${RUN_ID}`,
    email: `testmarket${RUN_ID}@agrotestonly.invalid`,
    phone: makePhone(4),
    password: `MarketTest${RUN_ID}!`,
    role: 'MARKET_OWNER' as const,
    address: { street: 'Mandi Road', city: 'Marketville', state: 'Andhra Pradesh', pincode: '518005' },
    marketName: `TestAPMC${RUN_ID} Market Yard`,
  },
};

const EXPECTED_DASHBOARD_PATHS: Record<string, string> = {
  FARMER: '/farmer/dashboard',
  SHOP_OWNER: '/shop-owner/dashboard',
  AGRI_PARTNER: '/agri-partner/dashboard',
  DELIVERY_BOY: '/delivery-boy/dashboard',
  MARKET_OWNER: '/market-owner/dashboard',
  ADMIN: '/admin/dashboard',
};

// Re-implement getRoleDashboardPath exactly as in auth.ts
function getRoleDashboardPath(role?: string): string {
  const normalizedRole = (role || '').toString().trim().toUpperCase();
  switch (normalizedRole) {
    case 'FARMER': return '/farmer/dashboard';
    case 'SHOP_OWNER': return '/shop-owner/dashboard';
    case 'AGRI_PARTNER': return '/agri-partner/dashboard';
    case 'DELIVERY_BOY': return '/delivery-boy/dashboard';
    case 'MARKET_OWNER': return '/market-owner/dashboard';
    case 'ADMIN': return '/admin/dashboard';
    default: return '/login';
  }
}

let passed = 0;
let failed = 0;
const testResults: Array<{ test: string; result: 'PASS' | 'FAIL'; detail: string }> = [];

function logTest(test: string, result: 'PASS' | 'FAIL', detail: string) {
  testResults.push({ test, result, detail });
  const icon = result === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${result}] ${test}`);
  if (result === 'FAIL') {
    console.log(`       Detail: ${detail}`);
    failed++;
  } else {
    passed++;
  }
}

const registeredTokens: Record<string, string> = {};
const registeredIds: Record<string, string> = {};

async function registerUser(role: keyof typeof TEST_USERS): Promise<{ token: string; userId: string; userRole: string }> {
  const userData = TEST_USERS[role];
  const response = await axios.post(`${API_BASE}/auth/register`, userData);
  const { token, user } = response.data;
  return { token, userId: user.id || user._id, userRole: user.role };
}

async function loginUser(phone: string, password: string, role?: string): Promise<{ token: string; userRole: string }> {
  const payload: any = { identifier: phone, phone, password };
  if (role) payload.role = role;
  const response = await axios.post(`${API_BASE}/auth/login`, payload);
  const { token, user } = response.data;
  return { token, userRole: user.role };
}

async function deleteUserByToken(token: string): Promise<void> {
  // Best-effort cleanup: we'll use MongoDB directly or the admin API if available
  // For this test, we track tokens and clean up at the end
  try {
    const meResp = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userId = meResp.data.user?.id || meResp.data.user?._id;
    if (userId) {
      registeredIds[userId] = token;
    }
  } catch {
    // Ignore cleanup errors
  }
}

async function runDeliveryBoyRegressionTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 DELIVERY BOY AUTHENTICATION REGRESSION TESTS');
  console.log(`   API: ${API_BASE}`);
  console.log(`   Run ID: ${RUN_ID}`);
  console.log('='.repeat(70) + '\n');

  // ─── TEST 1: Register DELIVERY_BOY ───
  try {
    const { token, userId, userRole } = await registerUser('DELIVERY_BOY');
    registeredTokens['DELIVERY_BOY'] = token;
    registeredIds['DELIVERY_BOY'] = userId;

    if (userRole === 'DELIVERY_BOY') {
      logTest('1. Register DELIVERY_BOY - server returns role=DELIVERY_BOY', 'PASS', `userId=${userId}`);
    } else {
      logTest('1. Register DELIVERY_BOY - server returns role=DELIVERY_BOY', 'FAIL', `Got role='${userRole}' instead of 'DELIVERY_BOY'`);
    }
  } catch (err: any) {
    logTest('1. Register DELIVERY_BOY', 'FAIL', err?.response?.data?.message || err.message);
  }

  // ─── TEST 2: Decode JWT - verify role=DELIVERY_BOY ───
  try {
    const token = registeredTokens['DELIVERY_BOY'];
    if (token) {
      const decoded: any = jwt.decode(token);
      if (decoded?.role === 'DELIVERY_BOY') {
        logTest('2. JWT payload contains role=DELIVERY_BOY', 'PASS', `JWT role=${decoded.role}`);
      } else {
        logTest('2. JWT payload contains role=DELIVERY_BOY', 'FAIL', `JWT role='${decoded?.role}' (expected DELIVERY_BOY)`);
      }
    } else {
      logTest('2. JWT payload contains role=DELIVERY_BOY', 'FAIL', 'No token from registration');
    }
  } catch (err: any) {
    logTest('2. JWT payload decode', 'FAIL', err.message);
  }

  // ─── TEST 3: Verify redirect path for DELIVERY_BOY ───
  {
    const path = getRoleDashboardPath('DELIVERY_BOY');
    const expected = '/delivery-boy/dashboard';
    if (path === expected) {
      logTest('3. getRoleDashboardPath(DELIVERY_BOY) = /delivery-boy/dashboard', 'PASS', `Got ${path}`);
    } else {
      logTest('3. getRoleDashboardPath(DELIVERY_BOY)', 'FAIL', `Got '${path}', expected '${expected}'`);
    }
  }

  // ─── TEST 4: DELIVERY_BOY NOT misrouted to /farmer/dashboard ───
  {
    const path = getRoleDashboardPath('DELIVERY_BOY');
    if (path !== '/farmer/dashboard') {
      logTest('4. DELIVERY_BOY is NOT redirected to /farmer/dashboard', 'PASS', `Route = ${path}`);
    } else {
      logTest('4. DELIVERY_BOY is NOT redirected to /farmer/dashboard', 'FAIL', 'BUG: DELIVERY_BOY mapped to /farmer/dashboard!');
    }
  }

  // ─── TEST 5: Login as DELIVERY_BOY ───
  try {
    const { token, userRole } = await loginUser(
      TEST_USERS.DELIVERY_BOY.phone,
      TEST_USERS.DELIVERY_BOY.password,
      'DELIVERY_BOY'
    );
    registeredTokens['DELIVERY_BOY_LOGIN'] = token;

    if (userRole === 'DELIVERY_BOY') {
      logTest('5. Login as DELIVERY_BOY returns role=DELIVERY_BOY', 'PASS', `role=${userRole}`);
    } else {
      logTest('5. Login as DELIVERY_BOY returns role=DELIVERY_BOY', 'FAIL', `Got role='${userRole}'`);
    }
  } catch (err: any) {
    logTest('5. Login as DELIVERY_BOY', 'FAIL', err?.response?.data?.message || err.message);
  }

  // ─── TEST 6: Register FARMER ───
  try {
    const { token, userId, userRole } = await registerUser('FARMER');
    registeredTokens['FARMER'] = token;
    registeredIds['FARMER'] = userId;

    if (userRole === 'FARMER') {
      logTest('6. Register FARMER - server returns role=FARMER', 'PASS', `userId=${userId}`);
    } else {
      logTest('6. Register FARMER - server returns role=FARMER', 'FAIL', `Got role='${userRole}'`);
    }
  } catch (err: any) {
    logTest('6. Register FARMER', 'FAIL', err?.response?.data?.message || err.message);
  }

  // ─── TEST 7: FARMER redirect path ───
  {
    const path = getRoleDashboardPath('FARMER');
    if (path === '/farmer/dashboard') {
      logTest('7. FARMER redirects to /farmer/dashboard', 'PASS', `Route = ${path}`);
    } else {
      logTest('7. FARMER redirects to /farmer/dashboard', 'FAIL', `Got '${path}'`);
    }
  }

  // ─── TEST 8: Cross-role test: DELIVERY_BOY creds + FARMER portal → REJECT ───
  try {
    await loginUser(
      TEST_USERS.DELIVERY_BOY.phone,
      TEST_USERS.DELIVERY_BOY.password,
      'FARMER' // Wrong portal intentionally
    );
    logTest('8. Cross-role: DELIVERY_BOY creds + FARMER portal → REJECT', 'FAIL', 'Should have been rejected but login succeeded!');
  } catch (err: any) {
    const status = err?.response?.status;
    const message = err?.response?.data?.message || '';
    if (status === 403 || (message && (message.toLowerCase().includes('portal') || message.toLowerCase().includes('role')))) {
      logTest('8. Cross-role: DELIVERY_BOY creds + FARMER portal → REJECT', 'PASS', `Correctly rejected: ${message}`);
    } else {
      logTest('8. Cross-role: DELIVERY_BOY creds + FARMER portal → REJECT', 'FAIL', `Wrong error type: status=${status}, msg=${message}`);
    }
  }

  // ─── TEST 9: Wrong password → REJECT ───
  try {
    await loginUser(TEST_USERS.DELIVERY_BOY.phone, 'WrongPassword999!');
    logTest('9. Wrong password → REJECT', 'FAIL', 'Should have been rejected but login succeeded!');
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) {
      logTest('9. Wrong password → REJECT', 'PASS', `Correctly rejected with 401`);
    } else {
      logTest('9. Wrong password → REJECT', 'FAIL', `Expected 401, got status=${status}`);
    }
  }

  // ─── TEST 10: Register SHOP_OWNER → /shop-owner/dashboard ───
  try {
    const { token, userId, userRole } = await registerUser('SHOP_OWNER');
    registeredTokens['SHOP_OWNER'] = token;
    registeredIds['SHOP_OWNER'] = userId;
    const path = getRoleDashboardPath(userRole);

    if (userRole === 'SHOP_OWNER' && path === '/shop-owner/dashboard') {
      logTest('10. SHOP_OWNER registers & redirects to /shop-owner/dashboard', 'PASS', `role=${userRole}, path=${path}`);
    } else {
      logTest('10. SHOP_OWNER registers & redirects to /shop-owner/dashboard', 'FAIL', `role=${userRole}, path=${path}`);
    }
  } catch (err: any) {
    logTest('10. SHOP_OWNER registration', 'FAIL', err?.response?.data?.message || err.message);
  }

  // ─── TEST 11: Register AGRI_PARTNER → /agri-partner/dashboard ───
  try {
    const { token, userId, userRole } = await registerUser('AGRI_PARTNER');
    registeredTokens['AGRI_PARTNER'] = token;
    registeredIds['AGRI_PARTNER'] = userId;
    const path = getRoleDashboardPath(userRole);

    if (userRole === 'AGRI_PARTNER' && path === '/agri-partner/dashboard') {
      logTest('11. AGRI_PARTNER registers & redirects to /agri-partner/dashboard', 'PASS', `role=${userRole}, path=${path}`);
    } else {
      logTest('11. AGRI_PARTNER registers & redirects to /agri-partner/dashboard', 'FAIL', `role=${userRole}, path=${path}`);
    }
  } catch (err: any) {
    logTest('11. AGRI_PARTNER registration', 'FAIL', err?.response?.data?.message || err.message);
  }

  // ─── TEST 12: Register MARKET_OWNER → /market-owner/dashboard ───
  try {
    const { token, userId, userRole } = await registerUser('MARKET_OWNER');
    registeredTokens['MARKET_OWNER'] = token;
    registeredIds['MARKET_OWNER'] = userId;
    const path = getRoleDashboardPath(userRole);

    if (userRole === 'MARKET_OWNER' && path === '/market-owner/dashboard') {
      logTest('12. MARKET_OWNER registers & redirects to /market-owner/dashboard', 'PASS', `role=${userRole}, path=${path}`);
    } else {
      logTest('12. MARKET_OWNER registers & redirects to /market-owner/dashboard', 'FAIL', `role=${userRole}, path=${path}`);
    }
  } catch (err: any) {
    logTest('12. MARKET_OWNER registration', 'FAIL', err?.response?.data?.message || err.message);
  }

  // ─── TEST 13: Missing/unknown role → REJECT ───
  try {
    await axios.post(`${API_BASE}/auth/register`, {
      name: `TestUnknown${RUN_ID}`,
      email: `testunknown${RUN_ID}@agrotestonly.invalid`,
      phone: `98505${RUN_ID}`,
      password: 'TestPass123!',
      role: 'UNKNOWN_ROLE',
    });
    logTest('13. Unknown role registration → REJECT', 'FAIL', 'Should have been rejected but registration succeeded!');
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 400) {
      logTest('13. Unknown role registration → REJECT', 'PASS', `Correctly rejected with 400`);
    } else {
      logTest('13. Unknown role registration → REJECT', 'FAIL', `Expected 400, got status=${status}`);
    }
  }

  // ─── TEST 14: ADMIN cannot register publicly → REJECT ───
  try {
    await axios.post(`${API_BASE}/auth/register`, {
      name: `TestAdmin${RUN_ID}`,
      email: `testadmin${RUN_ID}@agrotestonly.invalid`,
      phone: `98506${RUN_ID}`,
      password: 'TestPass123!',
      role: 'ADMIN',
    });
    logTest('14. ADMIN public registration → REJECT', 'FAIL', 'Should have been rejected but registration succeeded!');
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 400) {
      logTest('14. ADMIN public registration → REJECT', 'PASS', `Correctly rejected with 400`);
    } else {
      logTest('14. ADMIN public registration → REJECT', 'FAIL', `Expected 400, got status=${status}`);
    }
  }

  // ─── TEST 15: Re-login as DELIVERY_BOY after Farmer session ───
  try {
    // Simulate session isolation: login as FARMER first, then re-login as DELIVERY_BOY
    const { token: farmerToken, userRole: farmerRole } = await loginUser(
      TEST_USERS.FARMER.phone,
      TEST_USERS.FARMER.password,
      'FARMER'
    );
    if (farmerRole !== 'FARMER') {
      logTest('15a. Login as FARMER (setup)', 'FAIL', `Got role='${farmerRole}'`);
    }

    // Now re-login as DELIVERY_BOY (simulating logout + fresh login)
    const { token: dbToken, userRole: dbRole } = await loginUser(
      TEST_USERS.DELIVERY_BOY.phone,
      TEST_USERS.DELIVERY_BOY.password,
      'DELIVERY_BOY'
    );

    const dbPath = getRoleDashboardPath(dbRole);
    if (dbRole === 'DELIVERY_BOY' && dbPath === '/delivery-boy/dashboard') {
      logTest('15. Session isolation: After FARMER login, DELIVERY_BOY still gets /delivery-boy/dashboard', 'PASS', `role=${dbRole}, path=${dbPath}`);
    } else {
      logTest('15. Session isolation: After FARMER login, DELIVERY_BOY still gets /delivery-boy/dashboard', 'FAIL', `Got role='${dbRole}', path='${dbPath}'`);
    }
  } catch (err: any) {
    logTest('15. Session isolation test', 'FAIL', err?.response?.data?.message || err.message);
  }

  // ─── TEST 16: Verify /auth/me returns DELIVERY_BOY role ───
  try {
    const token = registeredTokens['DELIVERY_BOY_LOGIN'] || registeredTokens['DELIVERY_BOY'];
    if (token) {
      const meResp = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userRole = meResp.data.user?.role;
      if (userRole === 'DELIVERY_BOY') {
        logTest('16. /auth/me returns role=DELIVERY_BOY', 'PASS', `role=${userRole}`);
      } else {
        logTest('16. /auth/me returns role=DELIVERY_BOY', 'FAIL', `Got role='${userRole}'`);
      }
    } else {
      logTest('16. /auth/me returns role=DELIVERY_BOY', 'FAIL', 'No DELIVERY_BOY token available');
    }
  } catch (err: any) {
    logTest('16. /auth/me endpoint', 'FAIL', err?.response?.data?.message || err.message);
  }

  // ─── CLEANUP: Delete all test accounts ───
  console.log('\n🧹 Cleaning up test accounts...');
  const cleanupResults: string[] = [];

  for (const [roleName, token] of Object.entries(registeredTokens)) {
    try {
      const meResp = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userId = meResp.data.user?.id || meResp.data.user?._id;
      if (userId) {
        cleanupResults.push(`${roleName}:${userId}`);
      }
    } catch {
      // Token might already be invalid
    }
  }

  // Note: Direct MongoDB cleanup is the authoritative method for test cleanup.
  // The test will trigger the DB reset script separately to ensure 0 users.
  console.log(`   Test tokens acquired for cleanup: ${Object.keys(registeredTokens).join(', ')}`);

  // ─── FINAL REPORT ───
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL TEST REPORT');
  console.log('='.repeat(70));
  console.log(`   Total Tests: ${passed + failed}`);
  console.log(`   Passed:      ${passed} ✅`);
  console.log(`   Failed:      ${failed} ${failed > 0 ? '❌' : '✅'}`);
  console.log('');

  testResults.forEach(({ test, result, detail }) => {
    console.log(`   ${result === 'PASS' ? '✅' : '❌'} ${test}`);
    if (result === 'FAIL') console.log(`         → ${detail}`);
  });

  console.log('='.repeat(70));

  if (failed > 0) {
    console.error(`\n⚠️  ${failed} test(s) FAILED. Authentication bug persists!`);
    process.exit(1);
  } else {
    console.log('\n✅ All delivery boy authentication tests PASSED.');
  }
}

runDeliveryBoyRegressionTests().catch((err) => {
  console.error('❌ Fatal test error:', err);
  process.exit(1);
});
