import * as dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import app from '../app';
import { connectDB, disconnectDB } from '../config/db';

const TEST_PORT = 5013;
let server: http.Server;

interface TestCase {
  label: string;
  expectedCategory: 'SUPPORTED_SPECIALIST' | 'OPEN_WORLD_UNSUPPORTED' | 'NON_PLANT' | 'INVALID_IMAGE';
  expectedSpecies: string | null;
  expectedDisease: string | null;
  expectedStatus: string;
  filePath: string;
}

const testCases: TestCase[] = [
  {
    label: '1. Mango (Specialist Supported Crop)',
    expectedCategory: 'SUPPORTED_SPECIALIST',
    expectedSpecies: 'Mango',
    expectedDisease: 'Healthy',
    expectedStatus: 'HEALTHY',
    filePath: 'd:/Agrimart/ai-service/datasets/canonical_real_dataset/Mango___healthy/base_real_mango_h_000.jpg',
  },
  {
    label: '2. Guava (Open-World Unsupported Crop)',
    expectedCategory: 'OPEN_WORLD_UNSUPPORTED',
    expectedSpecies: 'Guava',
    expectedDisease: null,
    expectedStatus: 'DISEASE_UNCERTAIN',
    filePath: 'd:/Agrimart/ai-service/datasets/open_world_test/guava_leaf_healthy.jpg',
  },
  {
    label: '3. Okra (Open-World Unsupported Crop)',
    expectedCategory: 'OPEN_WORLD_UNSUPPORTED',
    expectedSpecies: 'Okra',
    expectedDisease: null,
    expectedStatus: 'DISEASE_UNCERTAIN',
    filePath: 'd:/Agrimart/ai-service/datasets/open_world_test/okra_leaf_real.jpg',
  },
  {
    label: '4. Papaya (Open-World Unsupported Crop)',
    expectedCategory: 'OPEN_WORLD_UNSUPPORTED',
    expectedSpecies: 'Papaya',
    expectedDisease: null,
    expectedStatus: 'DISEASE_UNCERTAIN',
    filePath: 'd:/Agrimart/ai-service/datasets/open_world_test/papaya_leaf_real.jpg',
  },
  {
    label: '5. Coconut (Open-World Unsupported Crop)',
    expectedCategory: 'OPEN_WORLD_UNSUPPORTED',
    expectedSpecies: 'Coconut',
    expectedDisease: null,
    expectedStatus: 'DISEASE_UNCERTAIN',
    filePath: 'd:/Agrimart/ai-service/datasets/open_world_test/coconut_leaf_real.jpg',
  },
  {
    label: '6. Brinjal (Open-World Unsupported Crop)',
    expectedCategory: 'OPEN_WORLD_UNSUPPORTED',
    expectedSpecies: 'Brinjal',
    expectedDisease: null,
    expectedStatus: 'DISEASE_UNCERTAIN',
    filePath: 'd:/Agrimart/ai-service/datasets/open_world_test/brinjal_leaf_real.jpg',
  },
  {
    label: '7. Tomato (Specialist Supported Crop)',
    expectedCategory: 'SUPPORTED_SPECIALIST',
    expectedSpecies: 'Tomato',
    expectedDisease: 'Early Blight',
    expectedStatus: 'DIAGNOSED',
    filePath: 'd:/Agrimart/ai-service/datasets/canonical_real_dataset/Tomato___Early_blight/base_0012b9d2-2130-4a06-a834-b1f3af34f57e___RS_Erly.B 8389.JPG',
  },
  {
    label: '8. Potato (Specialist Supported Crop)',
    expectedCategory: 'SUPPORTED_SPECIALIST',
    expectedSpecies: 'Potato',
    expectedDisease: 'Early Blight',
    expectedStatus: 'DIAGNOSED',
    filePath: 'd:/Agrimart/ai-service/datasets/canonical_real_dataset/Potato___Early_blight/base_001187a0-57ab-4329-baff-e7246a9edeb0___RS_Early.B 8178.JPG',
  },
  {
    label: '9. Rice (Specialist Supported Crop)',
    expectedCategory: 'SUPPORTED_SPECIALIST',
    expectedSpecies: 'Rice',
    expectedDisease: 'Brown Spot',
    expectedStatus: 'DIAGNOSED',
    filePath: 'd:/Agrimart/ai-service/datasets/canonical_real_dataset/Rice___Brown_Spot/base_real_rice_s_000.jpg',
  },
  {
    label: '10. Grape (Specialist Supported Crop)',
    expectedCategory: 'SUPPORTED_SPECIALIST',
    expectedSpecies: 'Grape',
    expectedDisease: 'Black Rot',
    expectedStatus: 'DIAGNOSED',
    filePath: 'd:/Agrimart/ai-service/datasets/canonical_real_dataset/Grape___Black_rot/plantdoc_train_8-21-Anthracnose-shotholing-ANNEMIEK.jpg',
  },
  {
    label: '11. Non-Plant Object (Non-Foliar Background)',
    expectedCategory: 'NON_PLANT',
    expectedSpecies: null,
    expectedDisease: null,
    expectedStatus: 'NON_PLANT',
    filePath: 'd:/Agrimart/ai-service/datasets/canonical_real_dataset/Background___non_leaf/base_bg_000.jpg',
  },
  {
    label: '12. Poor-Quality Degraded Image',
    expectedCategory: 'INVALID_IMAGE',
    expectedSpecies: null,
    expectedDisease: null,
    expectedStatus: 'INVALID_IMAGE',
    filePath: 'd:/Agrimart/ai-service/datasets/open_world_test/poor_quality_leaf.jpg',
  },
];

export async function runPartAVerification() {
  console.log('========================================================================');
  console.log('  PART A — OPEN-WORLD AI PLANT SCANNER COMPLETE END-TO-END VERIFICATION');
  console.log('========================================================================\n');

  process.env.NODE_ENV = 'test';
  delete process.env.MONGODB_URI;
  await connectDB();

  server = app.listen(TEST_PORT);
  console.log(`🧪 Test Server running on http://127.0.0.1:${TEST_PORT}\n`);

  let passed = 0;
  let failed = 0;
  const recordedResults: any[] = [];

  try {
    for (const tc of testCases) {
      console.log(`------------------------------------------------------------------------`);
      console.log(`RUNNING: ${tc.label}`);
      console.log(`Image: ${tc.filePath}`);

      if (!fs.existsSync(tc.filePath)) {
        console.error(`❌ File not found: ${tc.filePath}`);
        failed++;
        continue;
      }

      const form = new FormData();
      form.append('image', fs.createReadStream(tc.filePath));
      form.append('latitude', '15.8281');
      form.append('longitude', '78.0373');

      let responseData: any = null;
      let statusCode = 200;

      try {
        const res = await axios.post(`http://127.0.0.1:${TEST_PORT}/api/crop-health/analyze`, form, {
          headers: form.getHeaders(),
          timeout: 45000,
        });
        responseData = res.data;
        statusCode = res.status;
      } catch (err: any) {
        if (err.response) {
          responseData = err.response.data;
          statusCode = err.response.status;
        } else {
          console.error(`❌ Network error: ${err.message}`);
          failed++;
          continue;
        }
      }

      const record = {
        inputImage: path.basename(tc.filePath),
        label: tc.label,
        httpStatus: statusCode,
        provider: responseData?.speciesSource || 'N/A',
        species: responseData?.species || responseData?.crop || null,
        confidence: responseData?.speciesConfidence,
        diseaseResult: responseData?.disease || null,
        healthStatus: responseData?.healthStatus,
        diagnosisStatus: responseData?.diagnosisStatus,
        recommendationsCount: (responseData?.recommendations || []).length,
        fullResponse: responseData,
      };

      recordedResults.push(record);

      console.log(`  HTTP STATUS: ${statusCode}`);
      console.log(`  PROVIDER: ${record.provider}`);
      console.log(`  SPECIES: ${record.species}`);
      console.log(`  SPECIES CONFIDENCE: ${record.confidence !== null && record.confidence !== undefined ? (record.confidence * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`  DISEASE: ${record.diseaseResult}`);
      console.log(`  HEALTH STATUS: ${record.healthStatus}`);
      console.log(`  DIAGNOSIS STATUS: ${record.diagnosisStatus}`);

      // Evaluate match against expectations
      let testPassed = false;
      if (tc.expectedCategory === 'SUPPORTED_SPECIALIST') {
        const speciesMatch = record.species === tc.expectedSpecies;
        const statusMatch = record.diagnosisStatus === tc.expectedStatus;
        const diseaseMatch = tc.expectedDisease ? (record.diseaseResult && record.diseaseResult.includes(tc.expectedDisease)) : true;
        testPassed = speciesMatch && statusMatch && Boolean(diseaseMatch);
      } else if (tc.expectedCategory === 'OPEN_WORLD_UNSUPPORTED') {
        const speciesMatch = record.species === tc.expectedSpecies;
        const statusMatch = record.diagnosisStatus === 'DISEASE_UNCERTAIN';
        const diseaseUncertain = record.diseaseResult === null && record.healthStatus === 'Uncertain';
        const isSafeSpeciesUncertain = statusCode === 400 && (record.diagnosisStatus === 'SPECIES_UNCERTAIN' || record.fullResponse?.error === 'SPECIES_UNCERTAIN');
        testPassed = (speciesMatch && statusMatch && diseaseUncertain) || isSafeSpeciesUncertain;
      } else if (tc.expectedCategory === 'NON_PLANT') {
        testPassed = record.diagnosisStatus === 'NON_PLANT' && statusCode === 400;
      } else if (tc.expectedCategory === 'INVALID_IMAGE') {
        testPassed = record.diagnosisStatus === 'INVALID_IMAGE' && statusCode === 400;
      }

      if (testPassed) {
        console.log(`  RESULT: ✅ PASS`);
        passed++;
      } else {
        console.log(`  RESULT: ❌ FAIL (Expected: ${tc.expectedSpecies}, status: ${tc.expectedStatus})`);
        failed++;
      }
    }
  } catch (err: any) {
    console.error('Fatal error during test run:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();

    console.log('\n========================================================================');
    console.log(`  PART A SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${testCases.length})`);
    console.log('========================================================================\n');

    // Save full JSON log of all recorded test responses
    const logPath = path.resolve('d:/Agrimart/backend/part_a_recorded_results.json');
    fs.writeFileSync(logPath, JSON.stringify(recordedResults, null, 2));
    console.log(`Recorded results saved to: ${logPath}`);

    process.exit(failed > 0 ? 1 : 0);
  }
}

if (require.main === module) {
  runPartAVerification();
}
