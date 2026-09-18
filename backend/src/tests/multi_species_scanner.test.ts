import * as fs from 'fs';
import * as path from 'path';
import { onnxPathologyEngine } from '../services/onnxInference.service';
import {
  UNIVERSAL_PATHOLOGY_DATABASE,
  PLANT_SPECIES_DATABASE,
} from '../controllers/cropHealth.controller';

const CANONICAL_DATASET_DIR = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'ai-service',
  'datasets',
  'canonical_real_dataset'
);

// Helper to pick first image in a class directory
function getFirstImageInClass(clsName: string): { buffer: Buffer; filename: string } | null {
  const clsDir = path.join(CANONICAL_DATASET_DIR, clsName);
  if (!fs.existsSync(clsDir)) return null;

  const files = fs.readdirSync(clsDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
  if (files.length === 0) return null;

  const fullPath = path.join(clsDir, files[0]);
  return {
    buffer: fs.readFileSync(fullPath),
    filename: files[0],
  };
}

async function runMultiSpeciesTests() {
  console.log('================================================================');
  console.log('  AGROMITRA AI — MULTI-SPECIES VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  // Initialize ONNX Engine
  console.log('▶ [INITIALIZATION]: Initializing ONNX Pathology Engine...');
  const initOk = await onnxPathologyEngine.initialize();
  if (!initOk) {
    throw new Error('Failed to initialize ONNX Engine');
  }
  const modelInfo = onnxPathologyEngine.getModelInfo();
  console.log(`  ✅ ONNX Engine initialized: v${modelInfo.version} (${modelInfo.numClasses} classes)\n`);

  // PART 1: Verify Taxonomy & Class Completeness
  console.log('▶ [PART 1]: Verifying Taxonomy Coverage for All 49 Model Classes...');
  const metaPath = modelInfo.metaPath;
  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const speciesList: string[] = metadata.species_list;
  const classList: string[] = metadata.classes;

  console.log(`  - Total species in species_list: ${speciesList.length}`);
  console.log(`  - Total joint classes: ${classList.length}`);

  const supportedAgriculturalSpecies = speciesList.filter(
    (s) => s !== 'Background' && s !== 'Unknown'
  );
  console.log(`  - Supported Agricultural Species (${supportedAgriculturalSpecies.length}): ${supportedAgriculturalSpecies.join(', ')}`);

  // Check PLANT_SPECIES_DATABASE coverage
  for (const sp of supportedAgriculturalSpecies) {
    if (!PLANT_SPECIES_DATABASE[sp]) {
      throw new Error(`Missing species in PLANT_SPECIES_DATABASE: ${sp}`);
    }
  }
  console.log('  ✅ All 18 supported agricultural species are present in PLANT_SPECIES_DATABASE');

  // Check UNIVERSAL_PATHOLOGY_DATABASE coverage
  for (const cls of classList) {
    if (!UNIVERSAL_PATHOLOGY_DATABASE[cls]) {
      throw new Error(`Missing class in UNIVERSAL_PATHOLOGY_DATABASE: ${cls}`);
    }
  }
  console.log('  ✅ All 49 classes are covered in UNIVERSAL_PATHOLOGY_DATABASE\n');

  // PART 2: Test Identification on Real Images for ALL Supported Species
  console.log('▶ [PART 2]: Testing Real Leaf Images for Supported Species...');

  const speciesToTestFolder: Record<string, string> = {
    Apple: 'Apple___healthy',
    Banana: 'Banana___healthy',
    Blueberry: 'Blueberry___healthy',
    Cherry: 'Cherry___healthy',
    Chilli: 'Chilli___healthy',
    Citrus: 'Citrus___healthy',
    Corn: 'Corn___healthy',
    Cotton: 'Cotton___healthy',
    Grape: 'Grape___healthy',
    Mango: 'Mango___healthy',
    Neem: 'Neem___healthy',
    Peach: 'Peach___healthy',
    Potato: 'Potato___healthy',
    Raspberry: 'Raspberry___healthy',
    Rice: 'Rice___healthy',
    Soybean: 'Soybean___healthy',
    Strawberry: 'Strawberry___healthy',
    Tomato: 'Tomato___healthy',
  };

  let speciesPassCount = 0;

  for (const [speciesName, folderName] of Object.entries(speciesToTestFolder)) {
    const imgData = getFirstImageInClass(folderName);
    if (!imgData) {
      console.warn(`  ⚠️ No test image available for ${folderName}, skipping.`);
      continue;
    }

    const result = await onnxPathologyEngine.predict(imgData.buffer, imgData.filename, 'image/jpeg');
    if (!result) {
      throw new Error(`Prediction returned null for ${speciesName}`);
    }

    if (!result.success || !result.isValid || !result.isSupportedSpecies) {
      throw new Error(
        `Expected valid supported species for ${speciesName} (${folderName}), but got rejected: ${JSON.stringify(result)}`
      );
    }

    // Crucial check: species must NEVER be forced to Tomato!
    if (speciesName !== 'Tomato' && result.species === 'Tomato') {
      throw new Error(
        `🚨 CRITICAL FAILURE: Non-tomato species ${speciesName} was misclassified as Tomato!`
      );
    }

    console.log(
      `  ✅ [${speciesName.padEnd(10)}]: species=${result.species}, confidence=${((result.speciesConfidence || 0) * 100).toFixed(1)}%, disease=${result.disease}, jointClass=${result.jointClass}`
    );
    speciesPassCount++;
  }

  console.log(`\n  ✅ Successfully verified real images across supported species (${speciesPassCount} tested)\n`);

  // PART 3: Cross-Species Pathology Protection Check
  console.log('▶ [PART 3]: Testing Cross-Species Pathology Protection (e.g. Late Blight)...');

  // Test Potato Late Blight: MUST remain Potato, NEVER become Tomato!
  const potatoLateBlightImg = getFirstImageInClass('Potato___Late_blight');
  if (potatoLateBlightImg) {
    const potatoRes = await onnxPathologyEngine.predict(
      potatoLateBlightImg.buffer,
      potatoLateBlightImg.filename,
      'image/jpeg'
    );
    if (!potatoRes || !potatoRes.success) {
      throw new Error(`Potato Late Blight prediction failed: ${JSON.stringify(potatoRes)}`);
    }

    if (potatoRes.species !== 'Potato') {
      throw new Error(`🚨 Cross-species leak: Expected species Potato, got ${potatoRes.species}`);
    }
    if (potatoRes.is_tomato === true) {
      throw new Error('🚨 Cross-species leak: is_tomato was true for Potato Late Blight!');
    }
    if (!potatoRes.jointClass?.startsWith('Potato___')) {
      throw new Error(`🚨 Cross-species leak: jointClass was ${potatoRes.jointClass}`);
    }
    console.log(`  ✅ Potato Late Blight: species=${potatoRes.species} (NOT Tomato!), disease=${potatoRes.disease}, jointClass=${potatoRes.jointClass}`);
  }

  // Test Tomato Late Blight:
  const tomatoLateBlightImg = getFirstImageInClass('Tomato___Late_blight');
  if (tomatoLateBlightImg) {
    const tomatoRes = await onnxPathologyEngine.predict(
      tomatoLateBlightImg.buffer,
      tomatoLateBlightImg.filename,
      'image/jpeg'
    );
    if (!tomatoRes || !tomatoRes.success) {
      throw new Error(`Tomato Late Blight prediction failed: ${JSON.stringify(tomatoRes)}`);
    }
    if (tomatoRes.species !== 'Tomato') {
      throw new Error(`Expected species Tomato, got ${tomatoRes.species}`);
    }
    console.log(`  ✅ Tomato Late Blight: species=${tomatoRes.species}, disease=${tomatoRes.disease}, jointClass=${tomatoRes.jointClass}\n`);
  }

  // PART 4: Non-Plant / Background / Unsupported Rejection
  console.log('▶ [PART 4]: Testing Non-Plant / Background / Unsupported Rejection...');

  // Test 4a: Background non-leaf image from dataset
  const bgImg = getFirstImageInClass('Background___non_leaf');
  if (bgImg) {
    const bgRes = await onnxPathologyEngine.predict(bgImg.buffer, bgImg.filename, 'image/jpeg');
    if (!bgRes) throw new Error('Background test returned null');

    if (bgRes.success || bgRes.isValid || bgRes.isSupportedSpecies) {
      throw new Error(`Expected Background non-leaf image to be REJECTED, but got success: ${JSON.stringify(bgRes)}`);
    }
    if (bgRes.disease !== null) {
      throw new Error(`Expected null disease for rejected background image, got: ${bgRes.disease}`);
    }
    console.log(`  ✅ Background non-leaf: rejected with error=${bgRes.error}, isSupportedSpecies=${bgRes.isSupportedSpecies}, disease=${bgRes.disease}`);
  }

  // Test 4b: Unknown unsupported foliage
  const unkImg = getFirstImageInClass('Unknown___unsupported');
  if (unkImg) {
    const unkRes = await onnxPathologyEngine.predict(unkImg.buffer, unkImg.filename, 'image/jpeg');
    if (!unkRes) throw new Error('Unknown test returned null');

    if (unkRes.success || unkRes.isValid || unkRes.isSupportedSpecies) {
      throw new Error(`Expected Unknown unsupported leaf to be REJECTED, but got success: ${JSON.stringify(unkRes)}`);
    }
    console.log(`  ✅ Unknown unsupported leaf: rejected with error=${unkRes.error}, isSupportedSpecies=${unkRes.isSupportedSpecies}, disease=${unkRes.disease}`);
  }

  // Test 4c: Blank white / overexposed image (Stage 0 check)
  const blankBuf = Buffer.alloc(100 * 100 * 4, 255); // 100x100 white RGBA raw
  const jpeg = require('jpeg-js');
  const whiteJpeg = jpeg.encode({ data: blankBuf, width: 100, height: 100 }, 90);
  const blankRes = await onnxPathologyEngine.predict(whiteJpeg.data, 'blank_white.jpg', 'image/jpeg');
  if (!blankRes) throw new Error('Blank image test returned null');
  if (blankRes.success || blankRes.isValid) {
    throw new Error(`Expected blank image to be REJECTED, got success: ${JSON.stringify(blankRes)}`);
  }
  console.log(`  ✅ Blank overexposed image: rejected with error=${blankRes.error}, isValid=${blankRes.isValid}, disease=${blankRes.disease}`);

  console.log('\n================================================================');
  console.log('  🎉 ALL MULTI-SPECIES VERIFICATION TESTS PASSED SUCCESSFULLY!  ');
  console.log('================================================================\n');
}

runMultiSpeciesTests().catch((err) => {
  console.error('\n❌ MULTI-SPECIES TESTS FAILED:', err);
  process.exit(1);
});
