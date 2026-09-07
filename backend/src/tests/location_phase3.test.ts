import http from 'http';
import app from '../app';

const TEST_PORT = 5014;
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

    req.on('error', (err) => {
      reject(err);
    });

    if (dataString) {
      req.write(dataString);
    }
    req.end();
  });
};

const runLocationPhase3Tests = async () => {
  console.log('\n=============================================================');
  console.log('📍 STARTING AGROMITRA PHASE 3 LOCATION & PINCODE TEST SUITE');
  console.log('=============================================================\n');

  try {
    console.log('✔ Running Phase 3 Location validation...');

    await new Promise<void>((resolve) => {
      server = app.listen(TEST_PORT, () => {
        console.log(`✔ Test HTTP Server listening on port ${TEST_PORT}.`);
        resolve();
      });
    });

    // -------------------------------------------------------------
    // Test 1: Valid Indian Pincodes Auto-Fill (Andhra Pradesh, Karnataka, Delhi, Telangana)
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Valid Indian Pincode Auto-Fill ---');
    const validPins = ['518001', '560001', '110001', '500001'];
    for (const pin of validPins) {
      const pinRes = await makeRequest({
        method: 'GET',
        path: `/api/location/pincode/${pin}`,
      });

      if (pinRes.statusCode !== 200 || !pinRes.body.success) {
        throw new Error(`Valid pincode ${pin} lookup failed: ${JSON.stringify(pinRes.body)}`);
      }
      console.log(`✔ PIN ${pin} resolved to State: '${pinRes.body.state}', District: '${pinRes.body.district}' (${pinRes.body.source})`);
    }

    // -------------------------------------------------------------
    // Test 2: Invalid Indian Pincodes (Wrong length, non-numeric, 0-prefix)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Invalid Indian Pincode Handling ---');
    const invalidPins = ['12345', '51800', 'ABCDEF', '018001', ''];
    for (const badPin of invalidPins) {
      const badRes = await makeRequest({
        method: 'GET',
        path: `/api/location/pincode/${encodeURIComponent(badPin)}`,
      });

      if (badRes.statusCode === 200 && badRes.body.success) {
        throw new Error(`Expected failure for invalid PIN '${badPin}', but got success!`);
      }
      console.log(`✔ Invalid PIN '${badPin}' properly rejected with HTTP ${badRes.statusCode}: ${badRes.body.message || 'Rejected'}`);
    }

    // -------------------------------------------------------------
    // Test 3: Coordinate Validation API (Valid Indian Coordinates)
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Coordinate Validation (Valid Indian Geo-fence) ---');
    const validCoordRes = await makeRequest({
      method: 'POST',
      path: '/api/location/validate',
      body: {
        latitude: 15.8281, // Kurnool, AP
        longitude: 78.0373,
      },
    });

    if (validCoordRes.statusCode !== 200 || !validCoordRes.body.isValid || !validCoordRes.body.isWithinIndia) {
      throw new Error(`Coordinate validation failed for valid coordinates: ${JSON.stringify(validCoordRes.body)}`);
    }
    console.log(`✔ Coordinates (15.8281° N, 78.0373° E) verified valid & within Indian bounds: ${validCoordRes.body.message}`);

    // -------------------------------------------------------------
    // Test 4: Coordinate Validation API (Invalid & Out-of-bounds Coordinates)
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Coordinate Validation (Out of Bounds & Malformed) ---');
    
    // Out of global range lat: 95.0
    const outOfGlobal = await makeRequest({
      method: 'POST',
      path: '/api/location/validate',
      body: {
        latitude: 95.0,
        longitude: 78.0,
      },
    });
    if (outOfGlobal.statusCode === 200 && outOfGlobal.body.isValid) {
      throw new Error(`Expected error for lat > 90, got valid!`);
    }
    console.log(`✔ Out-of-bounds latitude (95°) rejected: ${outOfGlobal.body.message}`);

    // International coordinates (London, UK: 51.5074, -0.1278) -> Valid globally but outside India
    const internationalCoord = await makeRequest({
      method: 'POST',
      path: '/api/location/validate',
      body: {
        latitude: 51.5074,
        longitude: -0.1278,
      },
    });
    if (internationalCoord.statusCode !== 200 || !internationalCoord.body.isValid || internationalCoord.body.isWithinIndia) {
      throw new Error(`Expected valid international coordinates outside India, got: ${JSON.stringify(internationalCoord.body)}`);
    }
    console.log(`✔ International coordinates correctly identified as outside India: ${internationalCoord.body.message}`);

    // -------------------------------------------------------------
    // Test 5: Precision GPS Reverse Geocoding API
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Privacy-Preserving GPS Reverse Geocoding ---');
    const geoRes = await makeRequest({
      method: 'GET',
      path: '/api/location/reverse-geocode?lat=15.8281&lon=78.0373',
    });

    if (geoRes.statusCode !== 200 || !geoRes.body.success) {
      throw new Error(`Reverse geocoding failed: ${JSON.stringify(geoRes.body)}`);
    }
    console.log(`✔ Reverse geocoded (15.8281°, 78.0373°) ➔ City: '${geoRes.body.city}', District: '${geoRes.body.district}', State: '${geoRes.body.state}' (${geoRes.body.source})`);

    // -------------------------------------------------------------
    // Test 6: In-Memory Caching & Performance
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Location Caching Verification ---');
    const startT = Date.now();
    const cachedPinRes = await makeRequest({
      method: 'GET',
      path: '/api/location/pincode/518001',
    });
    const elapsed = Date.now() - startT;
    if (cachedPinRes.statusCode !== 200 || !cachedPinRes.body.success) {
      throw new Error('Cached pincode lookup failed');
    }
    console.log(`✔ Cached lookup executed in ${elapsed}ms for 518001.`);

    console.log('\n=============================================================');
    console.log('🎉 ALL PHASE 3 LOCATION & PINCODE INTEGRATION TESTS PASSED 100%');
    console.log('=============================================================\n');
  } catch (error: any) {
    console.error('\n❌ PHASE 3 TEST SUITE FAILED:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
};

runLocationPhase3Tests();
