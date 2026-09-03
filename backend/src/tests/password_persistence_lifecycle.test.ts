import http from 'http';

const BASE_PORT = 5000;

interface RequestOptions {
  method: string;
  path: string;
  body?: any;
  token?: string;
}

interface ResponseResult {
  statusCode: number;
  body: any;
}

const makeRequest = (options: RequestOptions): Promise<ResponseResult> => {
  return new Promise((resolve, reject) => {
    const dataString = options.body ? JSON.stringify(options.body) : '';

    const reqOptions: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: BASE_PORT,
      path: options.path,
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...(dataString ? { 'Content-Length': Buffer.byteLength(dataString) } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        let parsed: any;
        try {
          parsed = JSON.parse(responseBody);
        } catch {
          parsed = responseBody;
        }
        resolve({
          statusCode: res.statusCode || 500,
          body: parsed,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
};

const runPersistenceTests = async () => {
  console.log('\n================================================================');
  console.log('   AGRIMART — PASSWORD PERSISTENCE & LIFECYCLE TEST SUITE       ');
  console.log('================================================================\n');

  try {
    const testEmail = 'nandeeswarreddy2852@gmail.com';
    let currentPassword = 'Password123';

    // 1. Initial Login
    console.log('▶ [TEST 1]: Login with initial credentials...');
    const login1 = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: testEmail, password: currentPassword },
    });
    if (login1.statusCode !== 200 || !login1.body.token) {
      throw new Error(`Initial login failed: ${JSON.stringify(login1.body)}`);
    }
    console.log(`  ✅ TEST 1 PASSED: Initial login succeeded for '${login1.body.user.name}' (${login1.body.user.role}).`);

    // 2. Session Persistence / Token verification (simulates browser refresh)
    console.log('\n▶ [TEST 2]: Browser Refresh Simulation (/api/auth/me)...');
    const refreshRes = await makeRequest({
      method: 'GET',
      path: '/api/auth/me',
      token: login1.body.token,
    });
    if (refreshRes.statusCode === 200 && refreshRes.body.user?.email === testEmail) {
      console.log(`  ✅ TEST 2 PASSED: Session restored on refresh. User: '${refreshRes.body.user.name}'.`);
    } else {
      throw new Error(`Refresh test failed: ${JSON.stringify(refreshRes.body)}`);
    }

    // 3. Logout & Login again with SAME password (no reset)
    console.log('\n▶ [TEST 3]: Logout & Immediate Re-login with SAME password (no reset)...');
    const login2 = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: testEmail, password: currentPassword },
    });
    if (login2.statusCode === 200 && login2.body.token) {
      console.log('  ✅ TEST 3 PASSED: Second login with SAME password succeeded without reset.');
    } else {
      throw new Error(`Second login failed: ${JSON.stringify(login2.body)}`);
    }

    // 4. Reset Password ONCE
    console.log('\n▶ [TEST 4]: Resetting Password ONCE via Forgot/Reset flow...');
    const forgotRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/forgot-password',
      body: { email: testEmail },
    });
    if (forgotRes.statusCode !== 200 || !forgotRes.body.resetToken) {
      throw new Error(`Forgot password failed: ${JSON.stringify(forgotRes.body)}`);
    }
    const resetToken = forgotRes.body.resetToken;
    const updatedNewPassword = 'PermanentFarmerPass2026!';

    const resetRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/reset-password',
      body: { token: resetToken, newPassword: updatedNewPassword },
    });
    if (resetRes.statusCode !== 200 || !resetRes.body.success) {
      throw new Error(`Reset password failed: ${JSON.stringify(resetRes.body)}`);
    }
    currentPassword = updatedNewPassword;
    console.log(`  ✅ TEST 4 PASSED: Password reset successfully once to '${updatedNewPassword}'.`);

    // 5. Login with the NEW password
    console.log('\n▶ [TEST 5]: Login with the NEW password...');
    const loginNew1 = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: testEmail, password: currentPassword },
    });
    if (loginNew1.statusCode === 200 && loginNew1.body.token) {
      console.log('  ✅ TEST 5 PASSED: Login with new password succeeded.');
    } else {
      throw new Error(`Login with new password failed: ${JSON.stringify(loginNew1.body)}`);
    }

    // 6. Old password must be rejected
    console.log('\n▶ [TEST 6]: Verify old password is permanently invalid...');
    const loginOld = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: testEmail, password: 'Password123' },
    });
    if (loginOld.statusCode === 401) {
      console.log('  ✅ TEST 6 PASSED: Old password rejected with HTTP 401.');
    } else {
      throw new Error(`Old password unexpectedly accepted!`);
    }

    // 7. Re-login multiple times with the new password
    console.log('\n▶ [TEST 7]: Repeated logins with new password (3 cycles)...');
    for (let i = 1; i <= 3; i++) {
      const repeatLogin = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: testEmail, password: currentPassword },
      });
      if (repeatLogin.statusCode !== 200) {
        throw new Error(`Repeat login cycle ${i} failed.`);
      }
      console.log(`  → Cycle ${i}: Login succeeded (Token: ${repeatLogin.body.token.slice(0, 15)}...).`);
    }
    console.log('  ✅ TEST 7 PASSED: Multiple sequential logins succeed without requiring reset.');

    // 8. Test Store Partner account login
    console.log('\n▶ [TEST 8]: Store Partner Account Persistence Test...');
    const shopLogin = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: 'nandeeswarreddy1346@gmail.com', password: 'Password123' },
    });
    if (shopLogin.statusCode === 200 && shopLogin.body.user?.role === 'SHOP_OWNER') {
      console.log(`  ✅ TEST 8 PASSED: Store Partner login succeeded for '${shopLogin.body.user.name}' (${shopLogin.body.user.shopName}).`);
    } else {
      throw new Error(`Store partner login failed: ${JSON.stringify(shopLogin.body)}`);
    }

    // 9. Wrong password rejection (verify clean 401 and NOT network error)
    console.log('\n▶ [TEST 9]: Wrong Password Test (Auth 401, NOT Network Error)...');
    const wrongPassRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: { email: testEmail, password: 'CompletelyWrongPassword123!' },
    });
    if (wrongPassRes.statusCode === 401 && wrongPassRes.body.message === 'Invalid email or password.') {
      console.log(`  ✅ TEST 9 PASSED: Proper auth error returned: "${wrongPassRes.body.message}"`);
    } else {
      throw new Error(`Expected 401, got ${wrongPassRes.statusCode}: ${JSON.stringify(wrongPassRes.body)}`);
    }

    console.log('\n================================================================');
    console.log('  🎉 ALL PASSWORD PERSISTENCE & REPEAT LOGIN TESTS PASSED!      ');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ Password Persistence Test Failed:', err);
    process.exit(1);
  }
};

runPersistenceTests();
