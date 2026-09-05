import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import app from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';

const TEST_PORT = 5092;
let server: http.Server;

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
      port: TEST_PORT,
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

const runProductionLookupDiagnosisTest = async () => {
  console.log('\n================================================================');
  console.log('   PRODUCTION USER LOOKUP & PHONE NORMALIZATION DIAGNOSTIC TEST ');
  console.log('================================================================\n');

  try {
    await connectDB();
    server = app.listen(TEST_PORT);
    await new Promise((res) => setTimeout(res, 300));

    const timestamp = Date.now();
    const raw10DigitPhone = `98${String(timestamp).slice(-8)}`;
    const legacyPrefixedPhone = `+91${raw10DigitPhone}`;
    const legacySpacedPhone = `+91 ${raw10DigitPhone.slice(0, 5)} ${raw10DigitPhone.slice(5)}`;
    const testEmail = `legacy.farmer.${timestamp}@agrimart.test`;
    const testPassword = 'Password123!';

    // ------------------------------------------------------------------------
    // SETUP: Simulate a legacy production user stored with +91 in MongoDB
    // ------------------------------------------------------------------------
    console.log(`▶ [SETUP]: Simulating existing production document with phone '${legacyPrefixedPhone}'...`);
    // Insert directly bypassing pre-save to replicate un-normalized legacy production record
    await User.collection.insertOne({
      name: 'Legacy Production Farmer',
      email: testEmail,
      phone: legacyPrefixedPhone,
      password: await import('bcryptjs').then((b) => b.hash(testPassword, 10)),
      role: 'FARMER',
      address: { city: 'Kurnool', state: 'Andhra Pradesh' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // ------------------------------------------------------------------------
    // SCENARIO 1: Registration attempts with same email
    // ------------------------------------------------------------------------
    console.log('▶ [SCENARIO 1]: Registration with already registered email...');
    const duplicateEmailReg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Another User',
        phone: `97${String(Date.now()).slice(-8)}`,
        email: testEmail,
        password: 'AnotherPassword123!',
        role: 'FARMER',
      },
    });
    if (duplicateEmailReg.statusCode !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate email, got ${duplicateEmailReg.statusCode}: ${JSON.stringify(duplicateEmailReg.body)}`);
    }
    console.log('  ✅ SCENARIO 1 PASSED: Duplicate email correctly rejected with 409 Conflict.');

    // ------------------------------------------------------------------------
    // SCENARIO 2: Registration attempts with same phone (in 10-digit format)
    // ------------------------------------------------------------------------
    console.log('▶ [SCENARIO 2]: Registration with same phone in 10-digit format...');
    const duplicatePhoneReg = await makeRequest({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Another User',
        phone: raw10DigitPhone,
        email: `new.email.${timestamp}@agrimart.test`,
        password: 'AnotherPassword123!',
        role: 'FARMER',
      },
    });
    if (duplicatePhoneReg.statusCode !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate phone matching legacy +91 record, got ${duplicatePhoneReg.statusCode}: ${JSON.stringify(duplicatePhoneReg.body)}`);
    }
    console.log('  ✅ SCENARIO 2 PASSED: Duplicate phone matching legacy +91 record correctly rejected with 409 Conflict.');

    // ------------------------------------------------------------------------
    // SCENARIO 3: Forgot Password with 10-digit phone
    // ------------------------------------------------------------------------
    console.log('▶ [SCENARIO 3]: Forgot Password request using clean 10-digit phone number...');
    const forgotRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/forgot-password',
      body: { phone: raw10DigitPhone },
    });
    if (forgotRes.statusCode !== 200 || !forgotRes.body.resetToken) {
      throw new Error(`Forgot password failed for legacy record: ${forgotRes.statusCode}: ${JSON.stringify(forgotRes.body)}`);
    }
    console.log('  ✅ SCENARIO 3 PASSED: Reset token generated successfully for legacy +91 record via 10-digit phone.');

    // ------------------------------------------------------------------------
    // SCENARIO 4: Login with 10-digit phone & Password
    // ------------------------------------------------------------------------
    console.log('▶ [SCENARIO 4]: Login using clean 10-digit phone + Password...');
    const loginRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: raw10DigitPhone,
        password: testPassword,
      },
    });
    if (loginRes.statusCode !== 200 || !loginRes.body.token) {
      throw new Error(`Login failed for legacy record: ${loginRes.statusCode}: ${JSON.stringify(loginRes.body)}`);
    }
    console.log(`  ✅ SCENARIO 4 PASSED: Login succeeded. User role: ${loginRes.body.user.role}. Phone auto-normalized.`);

    // ------------------------------------------------------------------------
    // SCENARIO 5: Login with email entered into phone field
    // ------------------------------------------------------------------------
    console.log('▶ [SCENARIO 5]: Login using email entered in phone input...');
    const emailInPhoneRes = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: testEmail,
        password: testPassword,
      },
    });
    if (emailInPhoneRes.statusCode !== 200 || !emailInPhoneRes.body.token) {
      throw new Error(`Email-in-phone login failed: ${emailInPhoneRes.statusCode}: ${JSON.stringify(emailInPhoneRes.body)}`);
    }
    console.log('  ✅ SCENARIO 5 PASSED: Email passed into phone identifier authenticated successfully.');

    // ------------------------------------------------------------------------
    // SCENARIO 6: Re-test login with +91 format after auto-migration
    // ------------------------------------------------------------------------
    console.log('▶ [SCENARIO 6]: Login using +91 formatted phone string...');
    const plus91Login = await makeRequest({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        phone: legacySpacedPhone,
        password: testPassword,
      },
    });
    if (plus91Login.statusCode !== 200 || !plus91Login.body.token) {
      throw new Error(`+91 login failed: ${plus91Login.statusCode}: ${JSON.stringify(plus91Login.body)}`);
    }
    console.log('  ✅ SCENARIO 6 PASSED: Formatted phone with +91 and spaces authenticated successfully.');

    // Cleanup test record
    await User.deleteOne({ email: testEmail });

    console.log('\n================================================================');
    console.log('  🎉 ALL PRODUCTION LOOKUP & NORMALIZATION SCENARIOS PASSED!    ');
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ Production Lookup Diagnostic Test Failed:', error);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
};

runProductionLookupDiagnosisTest();
