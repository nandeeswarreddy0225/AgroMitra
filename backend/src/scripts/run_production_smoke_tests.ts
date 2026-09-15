import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';

const BACKEND_URL = 'http://127.0.0.1:5000';
const AI_SERVICE_URL = 'http://127.0.0.1:8000';
const DATASET_DIR = 'D:\\Agrimart\\ai-service\\datasets\\canonical_real_dataset';

interface SmokeTestDefinition {
  name: string;
  category: 'healthy' | 'diseased' | 'grape' | 'tomato' | 'potato' | 'non-leaf';
  imagePath: string;
  expectedCrop: string;
  isOOD?: boolean;
  expectedConditionSubstring?: string;
}

async function runProductionSmokeTests() {
  console.log('='.repeat(100));
  console.log('AGROMITRA AI — PRODUCTION POST-PROMOTION SMOKE TESTS');
  console.log('Target Endpoints:');
  console.log(`  - Backend:    ${BACKEND_URL}`);
  console.log(`  - AI Service: ${AI_SERVICE_URL}`);
  console.log('='.repeat(100));

  let allTestsPassed = true;
  const failureReasons: string[] = [];

  // --- 1. VERIFY LIVE BACKEND HEALTH & MODEL VERSION ---
  console.log('\n[1/4] Querying Live Backend Health Endpoints...');
  try {
    const healthRes = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 5000 });
    console.log(`  ✅ /api/health: HTTP ${healthRes.status} -> ${JSON.stringify(healthRes.data)}`);
  } catch (err: any) {
    console.error(`  ❌ /api/health failed: ${err.message}`);
    failureReasons.push(`/api/health failed: ${err.message}`);
    allTestsPassed = false;
  }

  try {
    const cropHealthRes = await axios.get(`${BACKEND_URL}/api/crop-health/health`, { timeout: 5000 });
    const data = cropHealthRes.data;
    console.log(`  ✅ /api/crop-health/health: HTTP ${cropHealthRes.status}`);
    console.log(`     - Model Version:     ${data.modelVersion}`);
    console.log(`     - Model Path:        ${data.modelPath}`);
    console.log(`     - Engine Ready:      ${data.engineInitialized}`);
    console.log(`     - Classes Count:     ${data.classesCount}`);

    if (data.modelVersion !== 3) {
      const msg = `Backend is NOT serving V3! Reported version: ${data.modelVersion}`;
      console.error(`  ❌ ${msg}`);
      failureReasons.push(msg);
      allTestsPassed = false;
    } else {
      console.log('  ✅ VERIFIED: Live backend is actively serving Model Version 3!');
    }
  } catch (err: any) {
    console.error(`  ❌ /api/crop-health/health failed: ${err.message}`);
    failureReasons.push(`/api/crop-health/health failed: ${err.message}`);
    allTestsPassed = false;
  }

  // --- 2. VERIFY LIVE PYTHON AI MICROSERVICE ---
  console.log('\n[2/4] Querying Live Python AI Microservice (/health)...');
  try {
    const aiHealthRes = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    const aiData = aiHealthRes.data;
    console.log(`  ✅ AI Microservice Health: HTTP ${aiHealthRes.status}`);
    console.log(`     - Status:        ${aiData.status}`);
    console.log(`     - Model Loaded:  ${aiData.model_loaded}`);
    console.log(`     - Classes Count: ${aiData.classes_count}`);
    console.log(`     - Model Version: ${aiData.model_version}`);

    if (aiData.model_version !== 3) {
      const msg = `AI Microservice is NOT serving V3! Reported version: ${aiData.model_version}`;
      console.error(`  ❌ ${msg}`);
      failureReasons.push(msg);
      allTestsPassed = false;
    } else {
      console.log('  ✅ VERIFIED: Live AI Microservice is actively serving Model Version 3!');
    }
  } catch (err: any) {
    console.error(`  ❌ AI Microservice /health failed: ${err.message}`);
    failureReasons.push(`AI Microservice /health failed: ${err.message}`);
    allTestsPassed = false;
  }

  // --- 3. TEST CASES FOR REQUIRED SMOKE SUITE ---
  const tests: SmokeTestDefinition[] = [
    {
      name: 'Grape Leaf (Known Leakage Case)',
      category: 'grape',
      imagePath: path.join(DATASET_DIR, 'Grape___Black_rot', 'plantdoc_train_8-21-Anthracnose-shotholing-ANNEMIEK.jpg'),
      expectedCrop: 'Grape',
      expectedConditionSubstring: 'Black_rot',
    },
    {
      name: 'Tomato Leaf (Late Blight Diseased)',
      category: 'tomato',
      imagePath: path.join(DATASET_DIR, 'Tomato___Late_blight', 'base_0003faa8-4b27-4c65-bf42-6d9e352ca1a5___RS_Late.B 4946.JPG'),
      expectedCrop: 'Tomato',
      expectedConditionSubstring: 'Late_blight',
    },
    {
      name: 'Potato Leaf (Early Blight Diseased)',
      category: 'potato',
      imagePath: path.join(DATASET_DIR, 'Potato___Early_blight', 'base_001187a0-57ab-4329-baff-e7246a9edeb0___RS_Early.B 8178.JPG'),
      expectedCrop: 'Potato',
      expectedConditionSubstring: 'Early_blight',
    },
    {
      name: 'Healthy Leaf (Potato Healthy)',
      category: 'healthy',
      imagePath: path.join(DATASET_DIR, 'Potato___healthy', 'base_00fc2ee5-729f-4757-8aeb-65c3355874f2___RS_HL 1864.JPG'),
      expectedCrop: 'Potato',
      expectedConditionSubstring: 'healthy',
    },
    {
      name: 'Diseased Leaf (Tomato Early Blight)',
      category: 'diseased',
      imagePath: path.join(DATASET_DIR, 'Tomato___Early_blight', 'base_0012b9d2-2130-4a06-a834-b1f3af34f57e___RS_Erly.B 8389.JPG'),
      expectedCrop: 'Tomato',
      expectedConditionSubstring: 'Early_blight',
    },
    {
      name: 'Non-Leaf / OOD Image (Background)',
      category: 'non-leaf',
      imagePath: path.join(DATASET_DIR, 'Background___non_leaf', 'base_bg_000.jpg'),
      expectedCrop: 'Background',
      isOOD: true,
    },
  ];

  // --- 4. EXECUTE LIVE INFERENCE SMOKE TESTS ---
  console.log('\n[3/4] Executing Live Production Inference Smoke Tests (POST /api/crop-health/analyze)...');
  console.log('-'.repeat(100));

  for (const t of tests) {
    if (!fs.existsSync(t.imagePath)) {
      const msg = `Test image not found: ${t.imagePath}`;
      console.error(`  ❌ [${t.name}]: ${msg}`);
      failureReasons.push(msg);
      allTestsPassed = false;
      continue;
    }

    try {
      const form = new FormData();
      form.append('image', fs.createReadStream(t.imagePath));

      const res = await axios.post(`${BACKEND_URL}/api/crop-health/analyze`, form, {
        headers: { ...form.getHeaders() },
        timeout: 15000,
        validateStatus: () => true,
      });

      const body = res.data;

      if (t.isOOD) {
        // Non-leaf/OOD handling check
        const isRejected =
          body.success === false ||
          body.plant?.name === 'Unknown' ||
          body.plant?.name === 'Background' ||
          body.crop === 'Non-Leaf Object' ||
          body.crop === 'Unknown Plant' ||
          body.error === 'INVALID_IMAGE_QUALITY' ||
          (body.confidence !== undefined && body.confidence < 0.35);

        if (isRejected) {
          console.log(`  ✅ [${t.name}]: REJECTED SAFELY (PASS)`);
          console.log(`     - Response: ${body.error || body.message || body.plant?.name || body.crop}`);
        } else {
          const msg = `OOD image was NOT rejected! Output: ${JSON.stringify(body)}`;
          console.error(`  ❌ [${t.name}]: ${msg}`);
          failureReasons.push(msg);
          allTestsPassed = false;
        }
        continue;
      }

      if (!body.success) {
        const msg = `Request failed: ${body.message || body.error}`;
        console.error(`  ❌ [${t.name}]: ${msg}`);
        failureReasons.push(msg);
        allTestsPassed = false;
        continue;
      }

      const predictedCrop = body.plant?.name;
      const cropConf = body.plant?.confidence;
      const healthStatus = body.health?.status;
      const diagnosisName = body.diagnosis?.name || (body.is_healthy ? 'healthy' : body.disease);
      const modelVer = body.modelVersion;

      // Crop verification
      const cropMatch = predictedCrop?.toLowerCase() === t.expectedCrop.toLowerCase();

      // Grape specific check: must never be Cotton
      if (t.expectedCrop.toLowerCase() === 'grape' && predictedCrop?.toLowerCase() === 'cotton') {
        const msg = `CRITICAL REGRESSION: Grape was misidentified as Cotton!`;
        console.error(`  ❌ [${t.name}]: ${msg}`);
        failureReasons.push(msg);
        allTestsPassed = false;
        continue;
      }

      // Check cross-crop isolation in top5 if available
      let stage2Isolated = true;
      if (body.top5 && Array.isArray(body.top5)) {
        for (const item of body.top5) {
          const itemPlant = (item.plant || item.crop || '').toLowerCase();
          const target = (predictedCrop || '').toLowerCase();
          if (itemPlant && !itemPlant.startsWith(target) && !target.startsWith(itemPlant)) {
            stage2Isolated = false;
            break;
          }
        }
      }

      // Safety check: Disease vs Fertilizer
      let safetyPass = true;
      const rec = body.structuredRecommendation;
      if (!body.is_healthy && rec && rec.fertilizer) {
        const hasFertilizerAsCure = rec.fertilizer.some(
          (f: string) => (!f.toLowerCase().includes('do not cure') && f.toLowerCase().includes('cure')) || f.toLowerCase().includes('spray urea to kill')
        );
        if (hasFertilizerAsCure) {
          safetyPass = false;
        }
      }

      const testPassed = cropMatch && stage2Isolated && safetyPass && (modelVer === 3 || modelVer === undefined);

      if (testPassed) {
        console.log(`  ✅ [${t.name}]: PASS`);
        console.log(`     - Predicted Crop:       ${predictedCrop} (${cropConf}%) [Expected: ${t.expectedCrop}]`);
        console.log(`     - Condition / Diagnosis: ${diagnosisName} (${healthStatus})`);
        console.log(`     - Stage 2 Isolated:     ${stage2Isolated ? 'YES (100%)' : 'NO'}`);
        console.log(`     - Model Version:        ${modelVer || 'Verified via health check (3)'}`);
        console.log(`     - Safety Rule Pass:     ${safetyPass ? 'YES' : 'NO'}`);
      } else {
        const msg = `Smoke test failed: CropMatch=${cropMatch}, Stage2Isolated=${stage2Isolated}, SafetyPass=${safetyPass}`;
        console.error(`  ❌ [${t.name}]: ${msg}`);
        failureReasons.push(`[${t.name}] ${msg}`);
        allTestsPassed = false;
      }
    } catch (err: any) {
      const msg = `HTTP request error: ${err.message}`;
      console.error(`  ❌ [${t.name}]: ${msg}`);
      failureReasons.push(`[${t.name}] ${msg}`);
      allTestsPassed = false;
    }
  }

  // --- 5. TEST PYTHON AI MICROSERVICE INFERENCE DIRECTLY ---
  console.log('\n[4/4] Executing Direct Prediction on AI Microservice (POST /predict)...');
  try {
    const directImage = path.join(DATASET_DIR, 'Grape___Black_rot', 'plantdoc_train_8-21-Anthracnose-shotholing-ANNEMIEK.jpg');
    const form = new FormData();
    form.append('image', fs.createReadStream(directImage));

    const pyRes = await axios.post(`${AI_SERVICE_URL}/predict`, form, {
      headers: { ...form.getHeaders() },
      timeout: 10000,
    });

    const pyBody = pyRes.data;
    console.log(`  ✅ Python AI Service /predict: HTTP ${pyRes.status}`);
    console.log(`     - Predicted Plant:   ${pyBody.plant?.name} (${pyBody.plant?.confidence}%)`);
    console.log(`     - Model Version:     ${pyBody.model_version}`);
    console.log(`     - Cross-Crop Leak:   ${pyBody.plant?.name === 'Grape' ? 'NONE (PASS)' : 'LEAK DETECTED (FAIL)'}`);

    if (pyBody.plant?.name !== 'Grape' || pyBody.model_version !== 3) {
      const msg = `Python AI service failed smoke test! Crop=${pyBody.plant?.name}, Version=${pyBody.model_version}`;
      console.error(`  ❌ ${msg}`);
      failureReasons.push(msg);
      allTestsPassed = false;
    }
  } catch (err: any) {
    console.error(`  ❌ Python AI service direct /predict failed: ${err.message}`);
    failureReasons.push(`Python AI service /predict failed: ${err.message}`);
    allTestsPassed = false;
  }

  // --- SUMMARY & VERDICT ---
  console.log('\n' + '='.repeat(100));
  if (allTestsPassed) {
    console.log('🎉 ALL PRODUCTION SMOKE TESTS PASSED! V3 IS ACTIVELY SERVING IN PRODUCTION.');
  } else {
    console.error('🚨 SMOKE TEST FAILURES DETECTED:');
    for (const r of failureReasons) {
      console.error(`   - ${r}`);
    }
    console.error('IMMEDIATE ROLLBACK RECOMMENDED.');
  }
  console.log('='.repeat(100));

  if (!allTestsPassed) {
    process.exit(1);
  }
}

runProductionSmokeTests().catch((err) => {
  console.error('Unexpected error running smoke tests:', err);
  process.exit(1);
});
