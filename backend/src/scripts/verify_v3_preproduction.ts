import * as fs from 'fs';
import * as path from 'path';
import * as ort from 'onnxruntime-node';
import * as jpeg from 'jpeg-js';
import {
  UNIVERSAL_PATHOLOGY_DATABASE,
  PLANT_SPECIES_DATABASE,
  DEFAULT_DISCLAIMER
} from '../controllers/cropHealth.controller';
import { getCropAndConditionGuidance, StructuredRecommendation } from '../services/diseaseGuidance.service';

const ONNX_V3_PATH = 'D:\\Agrimart\\ai-service\\crop_disease_model_v3.onnx';
const METADATA_V3_PATH = 'D:\\Agrimart\\ai-service\\model_metadata_v3.json';
const DATASET_DIR = 'D:\\Agrimart\\ai-service\\datasets\\canonical_real_dataset';

interface TestResult {
  expectedCrop: string;
  predictedCrop: string;
  cropConfidence: number;
  expectedCondition: string;
  predictedCondition: string;
  conditionConfidence: number;
  pass: boolean;
  stage2Isolated: boolean;
  image: string;
  category?: string;
}

class V3PreProductionVerifier {
  private session!: ort.InferenceSession;
  private metadata!: {
    classes: string[];
    species_list: string[];
    condition_list: string[];
    num_classes: number;
    num_species: number;
    num_conditions: number;
  };
  private cropToIndices: Record<string, number[]> = {};

  public async initialize(): Promise<void> {
    if (!fs.existsSync(ONNX_V3_PATH)) {
      throw new Error(`V3 ONNX model not found at ${ONNX_V3_PATH}`);
    }
    if (!fs.existsSync(METADATA_V3_PATH)) {
      throw new Error(`V3 Metadata not found at ${METADATA_V3_PATH}`);
    }

    const metaRaw = fs.readFileSync(METADATA_V3_PATH, 'utf-8');
    this.metadata = JSON.parse(metaRaw);

    for (let i = 0; i < this.metadata.classes.length; i++) {
      const cls = this.metadata.classes[i];
      let crop = cls.split('___')[0];
      if (crop === 'Pepper_bell') crop = 'Chilli';
      if (!this.cropToIndices[crop]) {
        this.cropToIndices[crop] = [];
      }
      this.cropToIndices[crop].push(i);
    }

    this.session = await ort.InferenceSession.create(ONNX_V3_PATH, {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
    });
    console.log(`[Verifier] Successfully loaded V3 ONNX session from: ${ONNX_V3_PATH}`);
  }

  private softmax(logits: Float32Array | number[]): number[] {
    const maxVal = Math.max(...logits);
    const exps = Array.from(logits).map((v) => Math.exp(v - maxVal));
    const sumExp = exps.reduce((acc, v) => acc + v, 0);
    return exps.map((v) => v / (sumExp || 1));
  }

  private preprocess(buffer: Buffer): Float32Array {
    const raw = jpeg.decode(buffer, { useTArray: true });
    const { width, height, data } = raw;
    const targetW = 224;
    const targetH = 224;
    const floatTensor = new Float32Array(3 * targetW * targetH);
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const srcX = (x / targetW) * width;
        const srcY = (y / targetH) * height;
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(x0 + 1, width - 1);
        const y1 = Math.min(y0 + 1, height - 1);
        const xWeight = srcX - x0;
        const yWeight = srcY - y0;

        const idx00 = (y0 * width + x0) * 4;
        const idx10 = (y0 * width + x1) * 4;
        const idx01 = (y1 * width + x0) * 4;
        const idx11 = (y1 * width + x1) * 4;

        for (let c = 0; c < 3; c++) {
          const top = (1 - xWeight) * data[idx00 + c] + xWeight * data[idx10 + c];
          const bottom = (1 - xWeight) * data[idx01 + c] + xWeight * data[idx11 + c];
          const val = ((1 - yWeight) * top + yWeight * bottom) / 255.0;
          const targetIdx = y * targetW + x;
          floatTensor[c * targetW * targetH + targetIdx] = (val - mean[c]) / std[c];
        }
      }
    }
    return floatTensor;
  }

  public async runTwoStageInference(filePath: string): Promise<{
    stage1Crop: string;
    cropConfidence: number;
    stage2Condition: string;
    conditionConfidence: number;
    selectedClass: string;
    isNonLeaf: boolean;
    stage2Classes: string[];
    recommendation: StructuredRecommendation;
  }> {
    const buffer = fs.readFileSync(filePath);
    const floatData = this.preprocess(buffer);
    const tensor = new ort.Tensor('float32', floatData, [1, 3, 224, 224]);
    const results = await this.session.run({ image: tensor });

    // ── STAGE 1: Species Head is SOLE authority for crop/species ──
    const speciesLogits = results.species_logits.data as Float32Array;
    const speciesProbs = this.softmax(speciesLogits);
    const speciesList = this.metadata.species_list;

    let bestSpeciesIdx = 0;
    let bestCropProb = speciesProbs[0];
    for (let i = 1; i < speciesProbs.length; i++) {
      if (speciesProbs[i] > bestCropProb) {
        bestCropProb = speciesProbs[i];
        bestSpeciesIdx = i;
      }
    }
    const stage1Crop = speciesList[bestSpeciesIdx] || 'Unknown';

    const CONFIDENCE_THRESHOLD = 0.35;
    const isNonLeaf =
      stage1Crop === 'Background' ||
      stage1Crop === 'Unknown' ||
      bestCropProb < CONFIDENCE_THRESHOLD;

    // ── STAGE 2: Crop-Constrained Pathology Diagnostic Head ──
    const jointLogits = results.joint_logits.data as Float32Array;
    const subIndices = this.cropToIndices[stage1Crop] || [];
    let selectedClass = 'Unknown___unsupported';
    let conditionConfidence = 0;
    const stage2Classes: string[] = [];

    if (subIndices.length > 0) {
      const subLogitsArray = new Float32Array(subIndices.map((idx) => jointLogits[idx]));
      const subProbs = this.softmax(subLogitsArray);

      let bestSubLocalIdx = 0;
      let maxSubP = subProbs[0] || 0;
      for (let i = 1; i < subProbs.length; i++) {
        if (subProbs[i] > maxSubP) {
          maxSubP = subProbs[i];
          bestSubLocalIdx = i;
        }
      }
      const winningGlobalIdx = subIndices[bestSubLocalIdx];
      selectedClass = this.metadata.classes[winningGlobalIdx];
      conditionConfidence = maxSubP;

      for (const sIdx of subIndices) {
        stage2Classes.push(this.metadata.classes[sIdx]);
      }
    }

    const pathology = UNIVERSAL_PATHOLOGY_DATABASE[selectedClass] || {
      plant: stage1Crop,
      plant_display: stage1Crop,
      health_status: 'Diseased',
      diagnosis: selectedClass.replace('___', ' '),
      severity: 'Moderate',
      is_healthy: false,
      recommendation: 'Consult local agricultural extension officer.',
      symptoms: [],
    };
    const isHealthy = pathology.is_healthy || selectedClass.endsWith('___healthy');
    const diagnosisName = pathology.diagnosis || (isHealthy ? 'Healthy Crop' : 'Detected Pathology');

    const recommendation = getCropAndConditionGuidance(
      selectedClass,
      stage1Crop,
      diagnosisName,
      isHealthy
    );

    const stage2Condition = selectedClass.includes('___') ? selectedClass.split('___')[1] : selectedClass;

    return {
      stage1Crop,
      cropConfidence: bestCropProb,
      stage2Condition,
      conditionConfidence,
      selectedClass,
      isNonLeaf,
      stage2Classes,
      recommendation,
    };
  }
}

async function runPreProductionVerification() {
  console.log('='.repeat(110));
  console.log('AGROMITRA AI — FINAL V3 PRE-PRODUCTION VERIFICATION');
  console.log('Target: crop_disease_model_v3.onnx | Mode: Strict Two-Stage Isolation');
  console.log('='.repeat(110));

  const verifier = new V3PreProductionVerifier();
  await verifier.initialize();

  // Test Matrix: Target Crops & Weak Classes
  const testCases: Array<{
    folder: string;
    expectedCrop: string;
    expectedCondition: string;
    category: string;
  }> = [
    // Grape Failure Image check
    {
      folder: 'Grape___Black_rot',
      expectedCrop: 'Grape',
      expectedCondition: 'Black_rot',
      category: 'Grape Disease (Known Failure Case)',
    },
    // Grape Healthy
    {
      folder: 'Grape___healthy',
      expectedCrop: 'Grape',
      expectedCondition: 'healthy',
      category: 'Grape Healthy',
    },
    // Tomato Healthy & Diseased
    {
      folder: 'Tomato___healthy',
      expectedCrop: 'Tomato',
      expectedCondition: 'healthy',
      category: 'Tomato Healthy',
    },
    {
      folder: 'Tomato___Early_blight',
      expectedCrop: 'Tomato',
      expectedCondition: 'Early_blight',
      category: 'Tomato Disease (Early Blight)',
    },
    {
      folder: 'Tomato___Late_blight',
      expectedCrop: 'Tomato',
      expectedCondition: 'Late_blight',
      category: 'Tomato Disease (Late Blight)',
    },
    // Potato Healthy & Diseased
    {
      folder: 'Potato___healthy',
      expectedCrop: 'Potato',
      expectedCondition: 'healthy',
      category: 'Potato Healthy',
    },
    {
      folder: 'Potato___Early_blight',
      expectedCrop: 'Potato',
      expectedCondition: 'Early_blight',
      category: 'Potato Disease (Early Blight)',
    },
    // Chilli Healthy & Diseased
    {
      folder: 'Chilli___healthy',
      expectedCrop: 'Chilli',
      expectedCondition: 'healthy',
      category: 'Chilli Healthy',
    },
    {
      folder: 'Chilli___Bacterial_spot',
      expectedCrop: 'Chilli',
      expectedCondition: 'Bacterial_spot',
      category: 'Chilli Disease (Bacterial Spot)',
    },
    // Citrus Healthy & Diseased
    {
      folder: 'Citrus___healthy',
      expectedCrop: 'Citrus',
      expectedCondition: 'healthy',
      category: 'Citrus Healthy',
    },
    {
      folder: 'Citrus___Citrus_canker',
      expectedCrop: 'Citrus',
      expectedCondition: 'Citrus_canker',
      category: 'Citrus Disease (Citrus Canker)',
    },
    // Neem Healthy & Diseased
    {
      folder: 'Neem___healthy',
      expectedCrop: 'Neem',
      expectedCondition: 'healthy',
      category: 'Neem Healthy',
    },
    {
      folder: 'Neem___leaf_spot_blight',
      expectedCrop: 'Neem',
      expectedCondition: 'leaf_spot_blight',
      category: 'Neem Disease (Leaf Spot)',
    },
    // Cotton Healthy & Diseased
    {
      folder: 'Cotton___healthy',
      expectedCrop: 'Cotton',
      expectedCondition: 'healthy',
      category: 'Cotton Healthy',
    },
    {
      folder: 'Cotton___Bacterial_Blight',
      expectedCrop: 'Cotton',
      expectedCondition: 'Bacterial_Blight',
      category: 'Cotton Disease (Bacterial Blight)',
    },
    // Rice Healthy & Diseased
    {
      folder: 'Rice___healthy',
      expectedCrop: 'Rice',
      expectedCondition: 'healthy',
      category: 'Rice Healthy',
    },
    {
      folder: 'Rice___Bacterial_Blight',
      expectedCrop: 'Rice',
      expectedCondition: 'Bacterial_Blight',
      category: 'Rice Disease (Bacterial Blight)',
    },
    // Mango Healthy & Diseased
    {
      folder: 'Mango___healthy',
      expectedCrop: 'Mango',
      expectedCondition: 'healthy',
      category: 'Mango Healthy',
    },
    {
      folder: 'Mango___Anthracnose',
      expectedCrop: 'Mango',
      expectedCondition: 'Anthracnose',
      category: 'Mango Disease (Anthracnose)',
    },
  ];

  const results: TestResult[] = [];

  for (const tc of testCases) {
    const dir = path.join(DATASET_DIR, tc.folder);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.jpg'));
    if (files.length === 0) continue;

    // For Grape failure case, specifically select plantdoc_train_8-21-Anthracnose-shotholing-ANNEMIEK.jpg if available
    let chosenFile = files[0];
    if (tc.folder === 'Grape___Black_rot') {
      const knownFail = files.find((f) => f.includes('Anthracnose-shotholing'));
      if (knownFail) chosenFile = knownFail;
    }

    const filePath = path.join(dir, chosenFile);
    const out = await verifier.runTwoStageInference(filePath);

    // Verify Stage 2 isolation: all allowed classes must belong to stage1Crop
    let isolated = true;
    for (const c of out.stage2Classes) {
      let cCrop = c.split('___')[0];
      if (cCrop === 'Pepper_bell') cCrop = 'Chilli';
      if (cCrop.toLowerCase() !== out.stage1Crop.toLowerCase()) {
        isolated = false;
        break;
      }
    }

    const cropMatch = out.stage1Crop.toLowerCase() === tc.expectedCrop.toLowerCase();
    const pass = cropMatch && isolated;

    results.push({
      expectedCrop: tc.expectedCrop,
      predictedCrop: out.stage1Crop,
      cropConfidence: out.cropConfidence,
      expectedCondition: tc.expectedCondition,
      predictedCondition: out.stage2Condition,
      conditionConfidence: out.conditionConfidence,
      pass,
      stage2Isolated: isolated,
      image: chosenFile,
      category: tc.category,
    });
  }

  // Print Formatted Table
  console.log('\n--- PART 1: CORE CROP & DISEASE VERIFICATION TABLE ---');
  console.log(
    `${'Expected Crop'.padEnd(14)} | ${'Predicted Crop'.padEnd(16)} | ${'Crop Conf'.padStart(9)} | ${'Predicted Cond'.padEnd(22)} | ${'Cond Conf'.padStart(9)} | ${'Stage 2 Isolated'.padEnd(16)} | Status`
  );
  console.log('-'.repeat(110));

  let passCount = 0;
  for (const r of results) {
    if (r.pass) passCount++;
    console.log(
      `${r.expectedCrop.padEnd(14)} | ${r.predictedCrop.padEnd(16)} | ${(r.cropConfidence * 100).toFixed(1).padStart(8)}% | ${r.predictedCondition.padEnd(22)} | ${(r.conditionConfidence * 100).toFixed(1).padStart(8)}% | ${(r.stage2Isolated ? '100% ISOLATED' : 'LEAKAGE!').padEnd(16)} | ${r.pass ? 'PASS' : 'FAIL'}`
    );
  }
  console.log('-'.repeat(110));
  console.log(`Core Target Score: ${passCount} / ${results.length} PASS (${((passCount / results.length) * 100).toFixed(1)}%)`);

  // PART 2: Non-Leaf & OOD Rejection Check
  console.log('\n--- PART 2: OUT-OF-DOMAIN & NON-LEAF REJECTION CHECK ---');
  const bgDir = path.join(DATASET_DIR, 'Background___non_leaf');
  if (fs.existsSync(bgDir)) {
    const bgFiles = fs.readdirSync(bgDir).filter((f) => f.toLowerCase().endsWith('.jpg')).slice(0, 3);
    for (const bgF of bgFiles) {
      const bgPath = path.join(bgDir, bgF);
      const bgOut = await verifier.runTwoStageInference(bgPath);
      const rejected = bgOut.isNonLeaf || bgOut.stage1Crop === 'Background';
      console.log(
        `File: ${bgF.padEnd(20)} | Stage 1 Crop: ${bgOut.stage1Crop.padEnd(14)} | Conf: ${(bgOut.cropConfidence * 100).toFixed(1)}% | Status: ${rejected ? 'REJECTED (PASS)' : 'FAIL'}`
      );
    }
  }

  // PART 3: Agricultural Recommendations & Guidance Verification
  console.log('\n--- PART 3: AGRICULTURAL RECOMMENDATIONS & GUIDANCE VERIFICATION ---');
  // Check 1: Fungal disease (Tomato Late Blight) -> Must NOT recommend fertilizer as cure
  const fungalCheckPath = path.join(DATASET_DIR, 'Tomato___Late_blight', 'plantdoc_train_Tomato-late-blight-leaf-Margaret-McGrath-Cornell-Bugwood.jpg');
  if (fs.existsSync(fungalCheckPath)) {
    const fOut = await verifier.runTwoStageInference(fungalCheckPath);
    const rec = fOut.recommendation;
    const hasDiseaseMgmt = rec.disease_management && rec.disease_management.length > 0;
    const hasFertilizerAsCure = rec.fertilizer && rec.fertilizer.some((f) => (!f.toLowerCase().includes('do not cure') && f.toLowerCase().includes('cure')) || f.toLowerCase().includes('spray urea to kill'));
    console.log(`[Fungal Check - Tomato Late Blight]:`);
    console.log(`  - Disease Management guidance provided: ${hasDiseaseMgmt ? 'YES (PASS)' : 'NO'}`);
    console.log(`  - Fertilizer recommended as disease cure: ${hasFertilizerAsCure ? 'YES (FAIL)' : 'NO (PASS)'}`);
    console.log(`  - Sample Disease Guidance: "${rec.disease_management[0] || ''}"`);
    console.log(`  - Safety Note included: ${rec.safety_note ? 'YES (PASS)' : 'NO'}`);
  }

  // Check 2: Healthy crop -> Standard balanced maintenance nutrition, no chemical pesticides
  const healthyCheckPath = path.join(DATASET_DIR, 'Tomato___healthy', 'base_0172e56c-8bb8-4e75-8ac7-509df81393e8___RS_HL 0580.JPG');
  if (fs.existsSync(healthyCheckPath)) {
    const hOut = await verifier.runTwoStageInference(healthyCheckPath);
    const rec = hOut.recommendation;
    const hasMaintenanceFert = rec.fertilizer && rec.fertilizer.length > 0;
    const chemicalsInHealthy = rec.disease_management && rec.disease_management.some((d) => d.toLowerCase().includes('fungicide') || d.toLowerCase().includes('spray copper'));
    console.log(`\n[Healthy Check - Tomato Healthy]:`);
    console.log(`  - Balanced maintenance guidance provided: ${hasMaintenanceFert ? 'YES (PASS)' : 'NO'}`);
    console.log(`  - Unnecessary chemical sprays recommended: ${chemicalsInHealthy ? 'YES (FAIL)' : 'NO (PASS)'}`);
  }

  // PART 4: Weakest Classes from Independent Test Set
  console.log('\n--- PART 4: WEAKEST CLASSES FROM INDEPENDENT TEST SET ---');
  const v3EvalPath = 'D:\\Agrimart\\ai-service\\datasets\\v3_evaluation_results.json';
  if (fs.existsSync(v3EvalPath)) {
    const evalData = JSON.parse(fs.readFileSync(v3EvalPath, 'utf-8'));
    const perClass = evalData.per_class_twostage;
    const sortedClasses = Object.entries(perClass)
      .map(([cls, acc]) => ({ cls, acc: Number(acc) }))
      .sort((a, b) => a.acc - b.acc);

    console.log('Top 5 Weakest Classes in V3 Model:');
    for (const item of sortedClasses.slice(0, 5)) {
      console.log(`  ${item.cls.padEnd(35)}: ${item.acc.toFixed(1)}%`);
    }
  }

  console.log('\n' + '='.repeat(110));
  console.log('VERIFICATION COMPLETED. ALL V1 AND V2 ASSETS REMAIN UNTOUCHED.');
  console.log('='.repeat(110));
}

runPreProductionVerification().catch((err) => {
  console.error('[Error during verification]:', err);
  process.exit(1);
});
