import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

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
      hostname: 'localhost',
      port: 5000,
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

    req.on('error', (e) => reject(e));

    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
};

const runStage7APTelanganaTests = async () => {
  console.log('====================================================');
  console.log('  AGRIMART STAGE 7 — AP + TELANGANA FARMER SCHEMES  ');
  console.log('====================================================\n');

  // Test 1: Fetch Andhra Pradesh Schemes
  console.log('▶ [TEST 1]: Fetching verified Andhra Pradesh agriculture schemes (GET /api/schemes?state=Andhra%20Pradesh)...');
  const apRes = await makeRequest({ method: 'GET', path: '/api/schemes?state=Andhra%20Pradesh' });

  if (apRes.statusCode !== 200 || !apRes.body.success || !Array.isArray(apRes.body.schemes)) {
    throw new Error(`Failed to fetch AP schemes: ${JSON.stringify(apRes.body)}`);
  }

  if (apRes.body.count < 8) {
    throw new Error(`Expected at least 8 verified AP schemes, got: ${apRes.body.count}`);
  }

  console.log(`  ✅ Successfully retrieved ${apRes.body.count} verified Andhra Pradesh Schemes:`);
  for (const s of apRes.body.schemes) {
    console.log(`     - [${s.code}] ${s.name} (${s.category}) | Benefit: ${s.subsidyDetails}`);
  }

  // Verify key AP Schemes present
  const apCodes = apRes.body.schemes.map((s: any) => s.code);
  const requiredAPCodes = [
    'AP-ANNADATHA-SUKHIBHAVA',
    'APMIP-DRIP-SPRINKLER',
    'AP-SUBSIDIZED-SEEDS',
    'AP-FARM-MECHANIZATION',
    'AP-FREE-CROP-INSURANCE',
    'AP-NATURAL-FARMING',
    'AP-SOIL-HEALTH',
    'AP-CROP-LOSS-RELIEF',
  ];
  for (const code of requiredAPCodes) {
    if (!apCodes.includes(code)) {
      throw new Error(`Missing verified AP scheme code: ${code}`);
    }
  }
  console.log('  ✅ All mandatory Andhra Pradesh schemes verified in database.');

  // Test 2: Fetch Telangana Schemes
  console.log('\n▶ [TEST 2]: Fetching verified Telangana agriculture schemes (GET /api/schemes?state=Telangana)...');
  const tgRes = await makeRequest({ method: 'GET', path: '/api/schemes?state=Telangana' });

  if (tgRes.statusCode !== 200 || !tgRes.body.success || !Array.isArray(tgRes.body.schemes)) {
    throw new Error(`Failed to fetch Telangana schemes: ${JSON.stringify(tgRes.body)}`);
  }

  if (tgRes.body.count < 8) {
    throw new Error(`Expected at least 8 verified Telangana schemes, got: ${tgRes.body.count}`);
  }

  console.log(`  ✅ Successfully retrieved ${tgRes.body.count} verified Telangana Schemes:`);
  for (const s of tgRes.body.schemes) {
    console.log(`     - [${s.code}] ${s.name} (${s.category}) | Benefit: ${s.subsidyDetails}`);
  }

  // Verify key Telangana Schemes present
  const tgCodes = tgRes.body.schemes.map((s: any) => s.code);
  const requiredTGCodes = [
    'TG-RYTHU-BHAROSA',
    'TG-RYTHU-BIMA',
    'TG-FARM-MECHANIZATION',
    'TG-SUBSIDIZED-SEEDS',
    'TG-TSMIP-MICRO-IRRIGATION',
    'TG-CROP-INSURANCE',
    'TG-SOIL-HEALTH',
    'TG-RKVY-INFRASTRUCTURE',
    'TG-CROP-LOSS-ASSISTANCE',
  ];
  for (const code of requiredTGCodes) {
    if (!tgCodes.includes(code)) {
      throw new Error(`Missing verified Telangana scheme code: ${code}`);
    }
  }
  console.log('  ✅ All mandatory Telangana schemes verified in database.');

  // Test 3: Search Query Filter (e.g. "Rythu Bharosa" and "Annadatha")
  console.log('\n▶ [TEST 3]: Testing Scheme Keyword Search...');
  const searchTG = await makeRequest({ method: 'GET', path: '/api/schemes?search=Rythu%20Bharosa' });
  if (searchTG.statusCode !== 200 || !searchTG.body.schemes.some((s: any) => s.code === 'TG-RYTHU-BHAROSA')) {
    throw new Error(`Search for Rythu Bharosa failed: ${JSON.stringify(searchTG.body)}`);
  }
  console.log(`  ✅ Search for 'Rythu Bharosa' PASSED: Found ${searchTG.body.schemes[0].name}`);

  const searchAP = await makeRequest({ method: 'GET', path: '/api/schemes?search=Annadatha' });
  if (searchAP.statusCode !== 200 || !searchAP.body.schemes.some((s: any) => s.code === 'AP-ANNADATHA-SUKHIBHAVA')) {
    throw new Error(`Search for Annadatha failed: ${JSON.stringify(searchAP.body)}`);
  }
  console.log(`  ✅ Search for 'Annadatha' PASSED: Found ${searchAP.body.schemes[0].name}`);

  // Test 4: Category Filtering for AP and Telangana
  console.log('\n▶ [TEST 4]: Testing Category Filtering (Irrigation for AP & Telangana)...');
  const apIrrigation = await makeRequest({ method: 'GET', path: '/api/schemes?state=Andhra%20Pradesh&category=Irrigation' });
  if (apIrrigation.statusCode !== 200 || !apIrrigation.body.schemes.some((s: any) => s.code === 'APMIP-DRIP-SPRINKLER')) {
    throw new Error('AP Irrigation filtering failed to return APMIP!');
  }
  console.log(`  ✅ AP Irrigation filtering PASSED: Retrieved APMIP Drip & Sprinkler.`);

  const tgIrrigation = await makeRequest({ method: 'GET', path: '/api/schemes?state=Telangana&category=Irrigation' });
  if (tgIrrigation.statusCode !== 200 || !tgIrrigation.body.schemes.some((s: any) => s.code === 'TG-TSMIP-MICRO-IRRIGATION')) {
    throw new Error('Telangana Irrigation filtering failed to return TSMIP!');
  }
  console.log(`  ✅ Telangana Irrigation filtering PASSED: Retrieved TSMIP Micro Irrigation.`);

  // Test 5: Single Scheme Retrieval with Official Government Links
  console.log('\n▶ [TEST 5]: Verifying Single Scheme details and official government portals...');
  const sukhibhavaRes = await makeRequest({ method: 'GET', path: '/api/schemes/AP-ANNADATHA-SUKHIBHAVA' });
  if (sukhibhavaRes.statusCode !== 200 || !sukhibhavaRes.body.scheme.officialPortalUrl.includes('.gov.in')) {
    throw new Error(`Invalid Annadatha Sukhibhava portal URL: ${sukhibhavaRes.body.scheme?.officialPortalUrl}`);
  }
  console.log(`  ✅ AP Scheme: ${sukhibhavaRes.body.scheme.name}`);
  console.log(`     - Official Portal: ${sukhibhavaRes.body.scheme.officialPortalUrl}`);
  console.log(`     - Who can apply: ${sukhibhavaRes.body.scheme.whoCanApply}`);

  const rythuBimaRes = await makeRequest({ method: 'GET', path: '/api/schemes/TG-RYTHU-BIMA' });
  if (rythuBimaRes.statusCode !== 200 || !rythuBimaRes.body.scheme.officialPortalUrl.includes('telangana.gov.in')) {
    throw new Error(`Invalid Rythu Bima portal URL: ${rythuBimaRes.body.scheme?.officialPortalUrl}`);
  }
  console.log(`  ✅ TG Scheme: ${rythuBimaRes.body.scheme.name}`);
  console.log(`     - Official Portal: ${rythuBimaRes.body.scheme.officialPortalUrl}`);
  console.log(`     - Who can apply: ${rythuBimaRes.body.scheme.whoCanApply}`);

  console.log('\n====================================================');
  console.log('  🎉 ALL AP + TELANGANA STAGE 7 TESTS PASSED!       ');
  console.log('====================================================\n');
};

runStage7APTelanganaTests().catch((err) => {
  console.error('\n❌ Stage 7 AP + Telangana Tests Failed:', err);
  process.exit(1);
});
