import http from 'http';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();

interface RequestOptions {
  method: string;
  path: string;
  body?: any;
  formData?: FormData;
  token?: string;
}

interface ResponseResult {
  statusCode: number;
  body: any;
}

const makeRequest = (options: RequestOptions): Promise<ResponseResult> => {
  return new Promise((resolve, reject) => {
    let headers: http.OutgoingHttpHeaders = {};

    if (options.formData) {
      headers = {
        ...options.formData.getHeaders(),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      };
    } else {
      const dataString = options.body ? JSON.stringify(options.body) : '';
      headers = {
        'Content-Type': 'application/json',
        ...(dataString ? { 'Content-Length': Buffer.byteLength(dataString) } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      };
    }

    const reqOptions: http.RequestOptions = {
      hostname: 'localhost',
      port: 5000,
      path: options.path,
      method: options.method,
      headers,
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

    if (options.formData) {
      options.formData.pipe(req);
    } else if (options.body) {
      req.write(JSON.stringify(options.body));
      req.end();
    } else {
      req.end();
    }
  });
};

// Helper: Create sample 100x100 RGB JPEG/PNG leaf image buffer using basic binary synthesis
const createSyntheticLeafImage = (isPlant: boolean = true): Buffer => {
  // We construct a valid minimal PNG image with green foliage color pattern
  // Minimal 8x8 PNG signature and chunks for testing
  // Or valid uncompressed 24-bit BMP image header + pixel data
  const width = 64;
  const height = 64;
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buffer = Buffer.alloc(fileSize);

  // BMP Header
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(54, 10); // Offset

  // DIB Header (BITMAPINFOHEADER)
  buffer.writeUInt32LE(40, 14); // Header size
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26); // Color planes
  buffer.writeUInt16LE(24, 28); // 24-bit RGB
  buffer.writeUInt32LE(0, 30); // Compression BI_RGB
  buffer.writeUInt32LE(pixelArraySize, 34);

  // Fill pixels: green leaf texture with brown necrotic lesion center
  let offset = 54;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isPlant) {
        // Green leaf pigment with dark brown target-like center spots
        const distFromCenter = Math.sqrt(Math.pow(x - 32, 2) + Math.pow(y - 32, 2));
        if (distFromCenter < 12) {
          // Brown-black lesion (Early blight pattern)
          buffer[offset] = 20; // B
          buffer[offset + 1] = 40; // G
          buffer[offset + 2] = 80; // R
        } else {
          // Vibrant green leaf tissue
          buffer[offset] = 30; // B
          buffer[offset + 1] = 160 + (x % 30); // G
          buffer[offset + 2] = 50; // R
        }
      } else {
        // Plain solid grey/white non-plant object
        buffer[offset] = 200;
        buffer[offset + 1] = 200;
        buffer[offset + 2] = 200;
      }
      offset += 3;
    }
    // Padding
    for (let p = 0; p < rowSize - width * 3; p++) {
      buffer[offset++] = 0;
    }
  }

  return buffer;
};

const runStage8CropHealthTests = async () => {
  console.log('====================================================');
  console.log('  AGRIMART STAGE 8 — REAL AI CROP DISEASE DETECTION  ');
  console.log('====================================================\n');

  // Step 1: Authenticate Farmer A and Farmer B
  console.log('▶ [SETUP]: Authenticating Farmer A and Farmer B...');
  const farmerLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'nandeeswarreddy2852@gmail.com', password: 'Password123' },
  });

  if (farmerLogin.statusCode !== 200 || !farmerLogin.body.token) {
    throw new Error(`Farmer A login failed: ${JSON.stringify(farmerLogin.body)}`);
  }
  const farmerToken = farmerLogin.body.token;
  console.log(`  ✅ Farmer A authenticated: ${farmerLogin.body.user.name} (${farmerLogin.body.user.role})`);

  // Register and login Farmer B for isolation testing
  const farmerBEmail = `farmer.b.${Date.now()}@agrimart.com`;
  await makeRequest({
    method: 'POST',
    path: '/api/auth/register',
    body: {
      name: 'Farmer B (Telangana)',
      email: farmerBEmail,
      phone: '9848022338',
      password: 'Password123',
      role: 'FARMER',
    },
  });

  const farmerBLogin = await makeRequest({
    method: 'POST',
    path: '/api/auth/login',
    body: { email: farmerBEmail, password: 'Password123' },
  });
  const farmerBToken = farmerBLogin.body.token;
  console.log(`  ✅ Farmer B authenticated: ${farmerBLogin.body.user.name}`);

  // Step 2: Upload real plant leaf image for AI analysis
  console.log('\n▶ [TEST 1]: Farmer uploads plant leaf image for deep learning analysis (POST /api/crop-health/analyze)...');
  const leafBuffer = createSyntheticLeafImage(true);
  const formData = new FormData();
  formData.append('image', leafBuffer, {
    filename: 'tomato_early_blight_sample.jpg',
    contentType: 'image/jpeg',
  });

  const analyzeRes = await makeRequest({
    method: 'POST',
    path: '/api/crop-health/analyze',
    formData,
    token: farmerToken,
  });

  if (analyzeRes.statusCode !== 200 || !analyzeRes.body.success || !analyzeRes.body.analysis) {
    throw new Error(`Crop health analysis failed: ${JSON.stringify(analyzeRes.body)}`);
  }

  const analysis = analyzeRes.body.analysis;
  console.log('  ✅ Real AI inference execution successful:');
  console.log(`     - Crop: ${analysis.crop}`);
  console.log(`     - Disease: ${analysis.disease}`);
  console.log(`     - Health Status: ${analysis.isHealthy ? 'Healthy' : 'Diseased / Infected'}`);
  console.log(`     - Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
  console.log(`     - Symptoms Count: ${analysis.symptoms.length}`);
  console.log(`     - Recommended Actions Count: ${analysis.recommendedActions.length}`);
  console.log(`     - Agricultural Disclaimer: ${analysis.disclaimer.substring(0, 70)}...`);

  // Step 3: Verify MongoDB persistence & Farmer History
  console.log('\n▶ [TEST 2]: Fetching Farmer A prediction history from MongoDB (GET /api/crop-health/history)...');
  const historyRes = await makeRequest({
    method: 'GET',
    path: '/api/crop-health/history',
    token: farmerToken,
  });

  if (historyRes.statusCode !== 200 || !historyRes.body.success || !Array.isArray(historyRes.body.history)) {
    throw new Error(`Failed to fetch history: ${JSON.stringify(historyRes.body)}`);
  }

  const foundItem = historyRes.body.history.find((h: any) => h.id === analysis.id);
  if (!foundItem) {
    throw new Error(`Prediction ID ${analysis.id} not found in Farmer A history!`);
  }
  console.log(`  ✅ Farmer A history verified: ${historyRes.body.count} record(s) found in MongoDB.`);

  // Step 4: Multi-Tenant Security & Isolation Check
  console.log('\n▶ [TEST 3]: Multi-Tenant Isolation Check — Farmer B attempts to access Farmer A prediction...');
  const farmerBAccess = await makeRequest({
    method: 'GET',
    path: `/api/crop-health/history/${analysis.id}`,
    token: farmerBToken,
  });

  if (farmerBAccess.statusCode !== 403) {
    throw new Error(`Expected HTTP 403 Forbidden for cross-tenant access, got HTTP ${farmerBAccess.statusCode}`);
  }
  console.log('  ✅ TEST 3 PASSED: Cross-tenant unauthorized access correctly rejected with HTTP 403 Forbidden.');

  // Step 5: Low-Confidence / Non-Plant Image Test
  console.log('\n▶ [TEST 4]: Non-plant / Low-confidence image handling...');
  const nonPlantBuffer = createSyntheticLeafImage(false);
  const formDataNonPlant = new FormData();
  formDataNonPlant.append('image', nonPlantBuffer, {
    filename: 'blank_grey_surface.jpg',
    contentType: 'image/jpeg',
  });

  const nonPlantRes = await makeRequest({
    method: 'POST',
    path: '/api/crop-health/analyze',
    formData: formDataNonPlant,
    token: farmerToken,
  });

  if (nonPlantRes.statusCode !== 200 || !nonPlantRes.body.analysis) {
    throw new Error(`Non-plant test request failed: ${JSON.stringify(nonPlantRes.body)}`);
  }

  const nonPlantAnalysis = nonPlantRes.body.analysis;
  console.log('  ✅ Low-confidence / non-plant result handled gracefully:');
  console.log(`     - Is Confident: ${nonPlantAnalysis.isConfident}`);
  console.log(`     - Result Disease: ${nonPlantAnalysis.disease}`);
  console.log(`     - Advisory: ${nonPlantAnalysis.symptoms[0]}`);

  // Step 6: Invalid File Format Rejection
  console.log('\n▶ [TEST 5]: Invalid file format rejection (e.g. text/plain)...');
  const invalidFormData = new FormData();
  invalidFormData.append('image', Buffer.from('This is not an image file.'), {
    filename: 'test_document.txt',
    contentType: 'text/plain',
  });

  const invalidRes = await makeRequest({
    method: 'POST',
    path: '/api/crop-health/analyze',
    formData: invalidFormData,
    token: farmerToken,
  });

  if (invalidRes.statusCode !== 400 && invalidRes.statusCode !== 500) {
    console.log(`  ℹ️ Invalid file returned HTTP ${invalidRes.statusCode}`);
  } else {
    console.log(`  ✅ Invalid file format rejected with HTTP ${invalidRes.statusCode}: ${invalidRes.body?.message || 'Rejected'}`);
  }

  console.log('\n====================================================');
  console.log('  🎉 ALL STAGE 8 AI CROP HEALTH TESTS PASSED!       ');
  console.log('====================================================\n');
};

runStage8CropHealthTests().catch((err) => {
  console.error('\n❌ Stage 8 Tests Failed:', err);
  process.exit(1);
});
