import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runPartnerProfilePersistenceTests() {
  console.log('\n====================================================');
  console.log('  AGRIMART STORE PARTNER PROFILE PERSISTENCE SUITE  ');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // TEST 1: Login as Existing Store Partner
    // ----------------------------------------------------
    console.log('▶ [TEST 1]: Logging in as Agri Store Partner (Nandeeswar)...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'nandeeswarreddy1346@gmail.com',
      password: 'Password123',
    });

    if (!loginRes.data.success || !loginRes.data.token) {
      throw new Error('Partner login failed');
    }
    const partnerToken = loginRes.data.token;
    const partnerId = loginRes.data.user._id || loginRes.data.user.id;
    console.log(`  ✅ Store Partner Logged In: ${loginRes.data.user.name} (${loginRes.data.user.email})`);
    console.log(`     Role: ${loginRes.data.user.role}, ID: ${partnerId}`);

    // ----------------------------------------------------
    // TEST 2: Fetch Current Profile (GET /api/auth/me)
    // ----------------------------------------------------
    console.log('\n▶ [TEST 2]: Fetching Current Profile from MongoDB (GET /api/auth/me)...');
    const initialProfileRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${partnerToken}` },
    });
    console.log(`  ✅ Initial Profile Retrieved:`);
    console.log(`     - Shop Name: "${initialProfileRes.data.user.shopName || '(empty)'}"`);
    console.log(`     - UPI ID: "${initialProfileRes.data.user.upiId || '(empty)'}"`);
    console.log(`     - Phone: "${initialProfileRes.data.user.phone}"`);
    console.log(`     - City/State: "${initialProfileRes.data.user.address?.city}, ${initialProfileRes.data.user.address?.state}"`);

    // ----------------------------------------------------
    // TEST 3: Update Profile with Unique Test Values
    // ----------------------------------------------------
    const uniqueTag = Date.now().toString().slice(-4);
    const updatedShopName = `Sri Balaji Agri Kendra ${uniqueTag}`;
    const updatedUpiId = `balaji${uniqueTag}@oksbi`;
    const updatedPhone = `98480${uniqueTag.padStart(5, '0')}`;
    const updatedStreet = `Shop #${uniqueTag}, APMC Commercial Complex`;
    const updatedCity = 'Kurnool';
    const updatedState = 'Andhra Pradesh';
    const updatedPincode = '518002';

    console.log('\n▶ [TEST 3]: Updating Store Partner Profile (PUT /api/auth/profile)...');
    console.log(`     → Setting Shop Name: "${updatedShopName}"`);
    console.log(`     → Setting UPI ID: "${updatedUpiId}"`);
    console.log(`     → Setting Phone: "${updatedPhone}"`);
    console.log(`     → Setting Address: "${updatedStreet}, ${updatedCity}, ${updatedState} - ${updatedPincode}"`);

    const updateRes = await axios.put(
      `${BASE_URL}/auth/profile`,
      {
        shopName: updatedShopName,
        upiId: updatedUpiId,
        phone: updatedPhone,
        address: {
          street: updatedStreet,
          city: updatedCity,
          state: updatedState,
          pincode: updatedPincode,
        },
      },
      {
        headers: { Authorization: `Bearer ${partnerToken}` },
      }
    );

    if (!updateRes.data.success || !updateRes.data.user) {
      throw new Error(`Profile update failed: ${JSON.stringify(updateRes.data)}`);
    }
    console.log('  ✅ Profile Updated Successfully via Backend PUT.');

    // ----------------------------------------------------
    // TEST 4: Page Reload / Re-query Verification (GET /api/auth/me)
    // ----------------------------------------------------
    console.log('\n▶ [TEST 4]: Simulating Page Reload / Re-opening Portal (GET /api/auth/me)...');
    const freshProfileRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${partnerToken}` },
    });

    const savedUser = freshProfileRes.data.user;
    if (savedUser.shopName !== updatedShopName) {
      throw new Error(`shopName mismatch! Expected "${updatedShopName}", got "${savedUser.shopName}"`);
    }
    if (savedUser.upiId !== updatedUpiId) {
      throw new Error(`upiId mismatch! Expected "${updatedUpiId}", got "${savedUser.upiId}"`);
    }
    if (savedUser.phone !== updatedPhone) {
      throw new Error(`phone mismatch! Expected "${updatedPhone}", got "${savedUser.phone}"`);
    }
    if (savedUser.address?.street !== updatedStreet) {
      throw new Error(`address.street mismatch! Expected "${updatedStreet}", got "${savedUser.address?.street}"`);
    }
    if (savedUser.address?.city !== updatedCity) {
      throw new Error(`address.city mismatch! Expected "${updatedCity}", got "${savedUser.address?.city}"`);
    }
    if (savedUser.address?.state !== updatedState) {
      throw new Error(`address.state mismatch! Expected "${updatedState}", got "${savedUser.address?.state}"`);
    }
    if (savedUser.address?.pincode !== updatedPincode) {
      throw new Error(`address.pincode mismatch! Expected "${updatedPincode}", got "${savedUser.address?.pincode}"`);
    }

    console.log('  ✅ Server-side Persistence Verified from MongoDB:');
    console.log(`     - Shop Name: ${savedUser.shopName}`);
    console.log(`     - UPI ID: ${savedUser.upiId}`);
    console.log(`     - Phone: ${savedUser.phone}`);
    console.log(`     - Street: ${savedUser.address?.street}`);
    console.log(`     - City/State/Pin: ${savedUser.address?.city}, ${savedUser.address?.state} - ${savedUser.address?.pincode}`);

    // ----------------------------------------------------
    // TEST 5: Re-login Persistence Verification
    // ----------------------------------------------------
    console.log('\n▶ [TEST 5]: Simulating Full Logout & Re-login as Same Partner...');
    const reLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'nandeeswarreddy1346@gmail.com',
      password: 'Password123',
    });

    const reLoggedUser = reLoginRes.data.user;
    if (reLoggedUser.shopName !== updatedShopName || reLoggedUser.upiId !== updatedUpiId) {
      throw new Error(`Re-login profile mismatch! Values reverted.`);
    }
    console.log('  ✅ Re-login Persistence PASSED: Profile values intact across new session.');

    // ----------------------------------------------------
    // TEST 6: User / Partner Isolation Test
    // ----------------------------------------------------
    console.log('\n▶ [TEST 6]: Verifying Partner Profile Isolation...');
    const partnerBEmail = `partner.b.${Date.now()}@agrimart.in`;
    const registerBRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Rao Agri Solutions',
      email: partnerBEmail,
      phone: '9848123456',
      password: 'Password123',
      role: 'SHOP_OWNER',
      address: {
        street: 'Main Bazaar',
        city: 'Guntur',
        state: 'Andhra Pradesh',
        pincode: '522001',
      },
    });

    const partnerBToken = registerBRes.data.token;
    const profileBRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${partnerBToken}` },
    });

    // Verify Partner B does NOT see Partner A's shopName or UPI
    if (profileBRes.data.user.shopName === updatedShopName || profileBRes.data.user.upiId === updatedUpiId) {
      throw new Error('Partner isolation failure! Partner B saw Partner A details.');
    }
    console.log(`  ✅ Partner B Profile is completely isolated:`);
    console.log(`     - Partner B Name: "${profileBRes.data.user.name}"`);
    console.log(`     - Partner B City: "${profileBRes.data.user.address?.city}"`);
    console.log(`     - Partner B UPI ID: "${profileBRes.data.user.upiId || '(empty)'}"`);

    // Partner B updates their own profile
    await axios.put(
      `${BASE_URL}/auth/profile`,
      {
        shopName: 'Rao Fertilizers & Seeds',
        upiId: 'rao.seeds@icici',
      },
      {
        headers: { Authorization: `Bearer ${partnerBToken}` },
      }
    );

    // Verify Partner A's profile remains untouched
    const recheckARes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${partnerToken}` },
    });
    if (recheckARes.data.user.shopName !== updatedShopName) {
      throw new Error("Partner A's profile was modified by Partner B's action!");
    }
    console.log("  ✅ Partner Isolation Confirmed: Partner B updates do not affect Partner A.");

    console.log('\n====================================================');
    console.log('  🎉 ALL STORE PARTNER PROFILE TESTS PASSED!       ');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ Profile Persistence Test Failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runPartnerProfilePersistenceTests();
