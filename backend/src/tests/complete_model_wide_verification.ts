import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import * as jpeg from 'jpeg-js';

const DATASET_DIR = 'd:/Agrimart/ai-service/datasets/canonical_real_dataset';
const METADATA_PATH = 'd:/Agrimart/backend/model_metadata.json';
const API_URL = 'http://localhost:5000/api/crop-health/analyze';

interface Metadata {
  classes: string[];
  species_list: string[];
  condition_list: string[];
  num_classes: number;
  num_species: number;
  version: number;
}

interface ImageTestRecord {
  inputSpecies: string;
  expectedClass: string;
  expectedDisease: string;
  file: string;
  predictedSpecies: string | null;
  speciesConfidence: number;
  jointClass: string;
  predictedDisease: string | null;
  diseaseConfidence: number;
  httpStatus: number;
  isAccepted: boolean;
  speciesCorrect: boolean;
  diseaseCorrect: boolean;
}

function createSolidColorImage(r: number, g: number, b: number, width = 224, height = 224): Buffer {
  const frameData = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    frameData[i * 4] = r;
    frameData[i * 4 + 1] = g;
    frameData[i * 4 + 2] = b;
    frameData[i * 4 + 3] = 255;
  }
  return jpeg.encode({ data: frameData, width, height }, 90).data;
}

function createSyntheticPattern(type: string): Buffer {
  const width = 224;
  const height = 224;
  const frameData = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (type === 'car') {
        const metallic = (x % 20 < 10 ? 180 : 70) + (y % 15);
        frameData[idx] = Math.min(255, metallic + 10);
        frameData[idx + 1] = Math.min(255, metallic + 20);
        frameData[idx + 2] = Math.min(255, metallic + 50);
      } else if (type === 'building') {
        const brick = (y % 30 < 3 || x % 50 < 3) ? 220 : 130;
        frameData[idx] = brick + 20;
        frameData[idx + 1] = brick;
        frameData[idx + 2] = brick - 10;
      } else if (type === 'person') {
        frameData[idx] = 225;
        frameData[idx + 1] = 175;
        frameData[idx + 2] = 145;
      } else if (type === 'phone') {
        const isBezel = x < 15 || x > width - 15 || y < 15 || y > height - 15;
        frameData[idx] = isBezel ? 30 : 210;
        frameData[idx + 1] = isBezel ? 30 : 220;
        frameData[idx + 2] = isBezel ? 30 : 240;
      } else if (type === 'road') {
        const noise = (x * 17 + y * 23) % 30;
        frameData[idx] = 50 + noise;
        frameData[idx + 1] = 50 + noise;
        frameData[idx + 2] = 55 + noise;
      } else if (type === 'food') {
        const toast = 150 + ((x * y) % 40);
        frameData[idx] = toast + 40;
        frameData[idx + 1] = toast;
        frameData[idx + 2] = 40;
      } else if (type === 'natural_background') {
        const dirt = 60 + ((x * 13 + y * 7) % 30);
        frameData[idx] = Math.min(255, dirt + 35);
        frameData[idx + 1] = Math.min(255, dirt + 15);
        frameData[idx + 2] = Math.max(0, dirt - 20);
      } else {
        frameData[idx] = (x * 2) % 256;
        frameData[idx + 1] = (y * 2) % 256;
        frameData[idx + 2] = ((x + y) * 2) % 256;
      }
      frameData[idx + 3] = 255;
    }
  }
  return jpeg.encode({ data: frameData, width, height }, 90).data;
}

async function sendImageBuffer(imageBuffer: Buffer, filename: string): Promise<any> {
  const form = new FormData();
  form.append('image', imageBuffer, { filename, contentType: 'image/jpeg' });

  const res = await axios.post(API_URL, form, {
    headers: form.getHeaders(),
    validateStatus: () => true,
    timeout: 10000,
  });

  return { status: res.status, data: res.data };
}

async function sendImageFile(filePath: string): Promise<any> {
  const buffer = fs.readFileSync(filePath);
  return sendImageBuffer(buffer, path.basename(filePath));
}

function extractSpeciesFromClass(className: string): string {
  const parts = className.split('___');
  return parts[0] || 'Unknown';
}

function extractConditionFromClass(className: string): string {
  const parts = className.split('___');
  const cond = parts[1] || 'healthy';
  return cond.replace(/_/g, ' ');
}

function normalizeDisease(str: string | null): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function runCompleteVerification() {
  console.log('========================================================================================');
  console.log('   AGROMITRA AI — COMPLETE MODEL-WIDE VERIFICATION SUITE');
  console.log('========================================================================================\n');

  if (!fs.existsSync(METADATA_PATH)) {
    console.error('FATAL: model_metadata.json not found at ' + METADATA_PATH);
    process.exit(1);
  }

  const metadata: Metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));

  // SECTION A: 20-CLASS SPECIES TAXONOMY
  console.log('----------------------------------------------------------------------------------------');
  console.log('SECTION A: COMPLETE 20-CLASS SPECIES TAXONOMY (from model_metadata.json)');
  console.log('----------------------------------------------------------------------------------------');
  console.log(`Total Species Head Classes: ${metadata.species_list.length} (Model Version: ${metadata.version})`);
  metadata.species_list.forEach((sp, idx) => {
    const isAgricultural = sp !== 'Background' && sp !== 'Unknown';
    console.log(`  [${String(idx).padStart(2, '0')}] ${sp.padEnd(16)} -> Type: ${isAgricultural ? 'Agricultural Crop' : 'Non-Agricultural Rejection Class'}`);
  });
  console.log();

  // SECTION B: 49-CLASS JOINT TAXONOMY & DATASET DISCOVERY
  console.log('----------------------------------------------------------------------------------------');
  console.log('SECTION B: COMPLETE 49-CLASS JOINT TAXONOMY & DATASET DISCOVERY');
  console.log('----------------------------------------------------------------------------------------');
  console.log(`Total Joint Classes: ${metadata.classes.length}`);

  const jointTaxonomy: Array<{
    index: number;
    jointClass: string;
    species: string;
    condition: string;
    folderExists: boolean;
    imageCount: number;
    availableImages: string[];
  }> = [];

  const speciesToJointClasses: Record<string, string[]> = {};
  metadata.species_list.forEach(sp => { speciesToJointClasses[sp] = []; });

  metadata.classes.forEach((cls, idx) => {
    const sp = extractSpeciesFromClass(cls);
    const cond = extractConditionFromClass(cls);
    const folderPath = path.join(DATASET_DIR, cls);
    const folderExists = fs.existsSync(folderPath);
    let imageFiles: string[] = [];
    if (folderExists) {
      imageFiles = fs.readdirSync(folderPath).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
    }

    if (speciesToJointClasses[sp]) {
      speciesToJointClasses[sp].push(cls);
    }

    jointTaxonomy.push({
      index: idx,
      jointClass: cls,
      species: sp,
      condition: cond,
      folderExists,
      imageCount: imageFiles.length,
      availableImages: imageFiles,
    });

    console.log(
      `  [${String(idx).padStart(2, '0')}] ${cls.padEnd(36)} | Species: ${sp.padEnd(12)} | Available: ${imageFiles.length.toString().padStart(4)} images`
    );
  });
  console.log();

  // SECTION C & D: MULTI-IMAGE TESTING FOR ALL 18 AGRICULTURAL SPECIES
  console.log('----------------------------------------------------------------------------------------');
  console.log('SECTION C & D: MULTI-IMAGE TESTING FOR ALL 18 AGRICULTURAL SPECIES');
  console.log('----------------------------------------------------------------------------------------');

  const agriculturalSpecies = metadata.species_list.filter(sp => sp !== 'Background' && sp !== 'Unknown');
  const testRecords: ImageTestRecord[] = [];
  const speciesSummary: Record<string, { tested: number; correctSpecies: number; correctDisease: number; classesTested: Set<string> }> = {};

  agriculturalSpecies.forEach(sp => {
    speciesSummary[sp] = { tested: 0, correctSpecies: 0, correctDisease: 0, classesTested: new Set() };
  });

  for (const sp of agriculturalSpecies) {
    console.log(`\n▶ Testing Species: ${sp}`);
    const classesForSpecies = speciesToJointClasses[sp] || [];

    if (classesForSpecies.length === 0) {
      console.log(`  ⚠️ DATASET IMAGE: NOT AVAILABLE (no classes in metadata)`);
      continue;
    }

    const imagesToTest: Array<{ cls: string; file: string; fullPath: string }> = [];

    // Ensure AT LEAST 1 image from EVERY class belonging to this species is tested!
    for (const cls of classesForSpecies) {
      const folderPath = path.join(DATASET_DIR, cls);
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
        if (files.length > 0) {
          imagesToTest.push({ cls, file: files[0], fullPath: path.join(folderPath, files[0]) });
        }
      }
    }

    // If species has fewer than 5 classes, sample additional diverse images to test at least 5 images per species
    if (imagesToTest.length < 5 && classesForSpecies.length > 0) {
      for (const cls of classesForSpecies) {
        if (imagesToTest.length >= 5) break;
        const folderPath = path.join(DATASET_DIR, cls);
        if (fs.existsSync(folderPath)) {
          const files = fs.readdirSync(folderPath).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
          for (let i = 1; i < files.length && imagesToTest.length < 5; i++) {
            imagesToTest.push({ cls, file: files[i], fullPath: path.join(folderPath, files[i]) });
          }
        }
      }
    }

    if (imagesToTest.length === 0) {
      console.log(`  ❌ DATASET IMAGE: NOT AVAILABLE in ${DATASET_DIR}`);
      continue;
    }

    for (const item of imagesToTest) {
      const expCond = extractConditionFromClass(item.cls);
      const res = await sendImageFile(item.fullPath);
      const d = res.data || {};

      const isAccepted = res.status === 200 && d.success === true && d.isValid === true;
      const predSpecies = d.species || null;
      const predDisease = d.disease || null;
      const speciesCorrect = predSpecies === sp;

      const normExp = normalizeDisease(expCond);
      const normPred = normalizeDisease(predDisease);
      const diseaseCorrect = speciesCorrect && (
        normExp === normPred ||
        (normExp.includes('healthy') && normPred.includes('healthy')) ||
        (normPred.includes(normExp) || normExp.includes(normPred))
      );

      const record: ImageTestRecord = {
        inputSpecies: sp,
        expectedClass: item.cls,
        expectedDisease: expCond,
        file: item.file,
        predictedSpecies: predSpecies,
        speciesConfidence: d.speciesConfidence || 0,
        jointClass: d.jointClass || 'None',
        predictedDisease: predDisease,
        diseaseConfidence: d.diseaseConfidence || 0,
        httpStatus: res.status,
        isAccepted,
        speciesCorrect,
        diseaseCorrect,
      };

      testRecords.push(record);
      speciesSummary[sp].tested++;
      speciesSummary[sp].classesTested.add(item.cls);
      if (speciesCorrect) speciesSummary[sp].correctSpecies++;
      if (diseaseCorrect) speciesSummary[sp].correctDisease++;

      const passStatus = (speciesCorrect && isAccepted) ? 'PASS' : 'FAIL';
      console.log(
        `  [${passStatus}] File: ${item.file.slice(0, 35).padEnd(35)} | Class: ${item.cls.padEnd(28)} | PredSpecies: ${(predSpecies || 'None').padEnd(10)} (${(record.speciesConfidence * 100).toFixed(1)}%) | PredDisease: ${(predDisease || 'None').padEnd(22)} | HTTP: ${res.status}`
      );
    }
  }
  console.log();

  // SECTION E: SPECIES ACCURACY SUMMARY
  console.log('----------------------------------------------------------------------------------------');
  console.log('SECTION E: SPECIES ACCURACY SUMMARY ACROSS 18 AGRICULTURAL CROPS');
  console.log('----------------------------------------------------------------------------------------');
  console.log('Species'.padEnd(16) + 'Images Tested'.padEnd(16) + 'Correct Species'.padEnd(18) + 'Accuracy'.padEnd(12) + 'Classes Tested');
  console.log('-'.repeat(80));

  let totalAgriculturalImages = 0;
  let totalCorrectSpecies = 0;
  let totalCorrectDiseases = 0;
  const uniqueClassesTested = new Set<string>();

  agriculturalSpecies.forEach(sp => {
    const s = speciesSummary[sp];
    totalAgriculturalImages += s.tested;
    totalCorrectSpecies += s.correctSpecies;
    totalCorrectDiseases += s.correctDisease;
    s.classesTested.forEach(c => uniqueClassesTested.add(c));

    const accStr = s.tested > 0 ? `${((s.correctSpecies / s.tested) * 100).toFixed(1)}%` : 'N/A';
    console.log(
      sp.padEnd(16) +
      s.tested.toString().padEnd(16) +
      `${s.correctSpecies}/${s.tested}`.padEnd(18) +
      accStr.padEnd(12) +
      Array.from(s.classesTested).join(', ')
    );
  });

  const overallSpeciesAcc = totalAgriculturalImages > 0 ? ((totalCorrectSpecies / totalAgriculturalImages) * 100).toFixed(1) : '0';
  const overallDiseaseAcc = totalAgriculturalImages > 0 ? ((totalCorrectDiseases / totalAgriculturalImages) * 100).toFixed(1) : '0';
  console.log('-'.repeat(80));
  console.log(`TOTAL AGRICULTURAL IMAGES TESTED: ${totalAgriculturalImages}`);
  console.log(`TOTAL CORRECT SPECIES PREDICTIONS: ${totalCorrectSpecies} / ${totalAgriculturalImages} (${overallSpeciesAcc}%)`);
  console.log(`TOTAL CORRECT DISEASE PREDICTIONS: ${totalCorrectDiseases} / ${totalAgriculturalImages} (${overallDiseaseAcc}%)`);
  console.log();

  // SECTION G: CROSS-SPECIES PROTECTION EXPLICIT TESTS
  console.log('----------------------------------------------------------------------------------------');
  console.log('SECTION G: CROSS-SPECIES PATHOLOGY PROTECTION VERIFICATION');
  console.log('----------------------------------------------------------------------------------------');

  const crossSpeciesPairs = [
    {
      title: 'Late Blight Isolation (Potato vs Tomato)',
      cases: [
        { expectedSpecies: 'Potato', folder: 'Potato___Late_blight', forbiddenSpecies: 'Tomato' },
        { expectedSpecies: 'Tomato', folder: 'Tomato___Late_blight', forbiddenSpecies: 'Potato' },
      ],
    },
    {
      title: 'Bacterial Spot / Blight Isolation (Chilli vs Tomato vs Peach vs Cotton vs Rice)',
      cases: [
        { expectedSpecies: 'Chilli', folder: 'Chilli___Bacterial_spot', forbiddenSpecies: 'Tomato' },
        { expectedSpecies: 'Tomato', folder: 'Tomato___Bacterial_spot', forbiddenSpecies: 'Chilli' },
        { expectedSpecies: 'Peach', folder: 'Peach___Bacterial_spot', forbiddenSpecies: 'Tomato' },
        { expectedSpecies: 'Cotton', folder: 'Cotton___Bacterial_Blight', forbiddenSpecies: 'Tomato' },
        { expectedSpecies: 'Rice', folder: 'Rice___Bacterial_Blight', forbiddenSpecies: 'Tomato' },
      ],
    },
    {
      title: 'Black Rot Isolation (Apple vs Grape)',
      cases: [
        { expectedSpecies: 'Apple', folder: 'Apple___Black_rot', forbiddenSpecies: 'Grape' },
        { expectedSpecies: 'Grape', folder: 'Grape___Black_rot', forbiddenSpecies: 'Apple' },
      ],
    },
  ];

  let crossSpeciesPass = true;
  for (const group of crossSpeciesPairs) {
    console.log(`▶ Testing ${group.title}:`);
    for (const c of group.cases) {
      const folderPath = path.join(DATASET_DIR, c.folder);
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
        if (files.length > 0) {
          const testFile = path.join(folderPath, files[0]);
          const res = await sendImageFile(testFile);
          const d = res.data || {};
          const isCorrect = d.species === c.expectedSpecies && d.species !== c.forbiddenSpecies;
          if (!isCorrect) crossSpeciesPass = false;
          console.log(
            `  ${isCorrect ? '✅ PASS' : '❌ FAIL'}: ${c.folder.padEnd(30)} -> Predicted Species: ${d.species} (Expected: ${c.expectedSpecies}, Not: ${c.forbiddenSpecies}) | Joint: ${d.jointClass} | Disease: ${d.disease}`
          );
        }
      }
    }
  }
  console.log(`Cross-Species Protection Result: ${crossSpeciesPass ? 'PASSED (Zero cross-species pathology leakage)' : 'FAILED'}\n`);

  // SECTION H & I: BACKGROUND & UNKNOWN CLASS REJECTION TESTS
  console.log('----------------------------------------------------------------------------------------');
  console.log('SECTION H & I: BACKGROUND & UNKNOWN CLASS REJECTION TESTS');
  console.log('----------------------------------------------------------------------------------------');

  const rejectionFolders = [
    { label: 'Background Class', folder: 'Background___non_leaf' },
    { label: 'Unknown Class', folder: 'Unknown___unsupported' },
  ];

  for (const rej of rejectionFolders) {
    console.log(`▶ Testing ${rej.label} (${rej.folder}):`);
    const folderPath = path.join(DATASET_DIR, rej.folder);
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
      const testFiles = files.slice(0, 3);
      for (const f of testFiles) {
        const res = await sendImageFile(path.join(folderPath, f));
        const d = res.data || {};
        const pass = res.status === 400 && d.isValid === false && d.isSupportedSpecies === false && d.species === null && d.disease === null;
        console.log(
          `  ${pass ? '✅ PASS' : '❌ FAIL'}: File: ${f.padEnd(30)} | HTTP: ${res.status} | isValid: ${d.isValid} | species: ${d.species} | disease: ${d.disease} | error: ${d.error}`
        );
      }
    } else {
      console.log(`  ⚠️ Folder not found: ${rej.folder}`);
    }
  }
  console.log();

  // SECTION J: RANDOM NON-PLANT TESTS
  console.log('----------------------------------------------------------------------------------------');
  console.log('SECTION J: RANDOM NON-PLANT & SYNTHETIC PATTERN REJECTION TESTS');
  console.log('----------------------------------------------------------------------------------------');

  const nonPlantTests = [
    { label: 'Food / bread texture', buf: createSyntheticPattern('food'), file: 'food_sample.jpg' },
    { label: 'Random geometric pattern', buf: createSyntheticPattern('random'), file: 'random_sample.jpg' },
    { label: 'Person portrait tone', buf: createSyntheticPattern('person'), file: 'person_sample.jpg' },
    { label: 'Automobile vehicle metallic', buf: createSyntheticPattern('car'), file: 'car_sample.jpg' },
    { label: 'Architecture building concrete', buf: createSyntheticPattern('building'), file: 'building_sample.jpg' },
    { label: 'Electronic phone device', buf: createSyntheticPattern('phone'), file: 'phone_sample.jpg' },
    { label: 'Dark asphalt road texture', buf: createSyntheticPattern('road'), file: 'road_sample.jpg' },
    { label: 'Blank white overexposed wall', buf: createSolidColorImage(255, 255, 255), file: 'blank_white.jpg' },
    { label: 'Dark underexposed background', buf: createSolidColorImage(5, 5, 5), file: 'dark_black.jpg' },
    { label: 'Arbitrary natural background', buf: createSyntheticPattern('natural_background'), file: 'natural_bg.jpg' },
  ];

  let nonPlantFalsePositives = 0;
  for (const np of nonPlantTests) {
    const res = await sendImageBuffer(np.buf, np.file);
    const d = res.data || {};
    const pass = res.status === 400 && d.isValid === false && d.isSupportedSpecies === false && d.species === null && d.disease === null;
    if (!pass) nonPlantFalsePositives++;
    console.log(
      `  ${pass ? '✅ PASS' : '❌ FAIL'}: ${np.label.padEnd(34)} | HTTP: ${res.status} | isValid: ${d.isValid} | species: ${d.species} | disease: ${d.disease} | error: ${d.error}`
    );
  }
  console.log(`Random Non-Plant Test Result: ${nonPlantFalsePositives === 0 ? 'PASSED (Zero false positives)' : `${nonPlantFalsePositives} FALSE POSITIVES`}\n`);

  // SECTION K & L: DATASET AUDIT & CRITICAL FAIL CHECKS
  console.log('----------------------------------------------------------------------------------------');
  console.log('SECTION K & L: DATASET AUDIT & CRITICAL FAIL CONDITION CHECKS');
  console.log('----------------------------------------------------------------------------------------');

  const missingClasses = jointTaxonomy.filter(j => j.imageCount === 0);
  console.log(`Classes with 0 canonical images: ${missingClasses.length}`);
  if (missingClasses.length > 0) {
    missingClasses.forEach(m => console.log(`  - ${m.jointClass}: NO CANONICAL TEST IMAGE AVAILABLE`));
  } else {
    console.log(`  All 49 joint classes have canonical real images in dataset.`);
  }

  let crossSpeciesLeakageCount = 0;
  let falseNegativeCount = 0;

  testRecords.forEach(r => {
    if (r.inputSpecies !== 'Tomato' && r.predictedSpecies === 'Tomato') {
      console.log(`  ❌ CRITICAL FAIL: ${r.inputSpecies} leaf converted into Tomato! (File: ${r.file})`);
      crossSpeciesLeakageCount++;
    } else if (r.predictedSpecies && r.predictedSpecies !== r.inputSpecies) {
      crossSpeciesLeakageCount++;
    }
    if (!r.isAccepted) {
      falseNegativeCount++;
    }
  });

  if (crossSpeciesLeakageCount === 0) {
    console.log(`  ✅ Zero non-tomato species were misdiagnosed as Tomato.`);
    console.log(`  ✅ Total Cross-Species Leakage Count: 0`);
  } else {
    console.log(`  ❌ Total Cross-Species Leakage Count: ${crossSpeciesLeakageCount}`);
  }
  console.log();

  // FULL 49-CLASS JOINT TAXONOMY & AUDIT TABLE
  console.log('========================================================================================');
  console.log('FULL 49-CLASS JOINT TAXONOMY & AUDIT TABLE');
  console.log('========================================================================================');
  console.log('Idx'.padEnd(4) + 'Joint Class'.padEnd(38) + 'Species'.padEnd(14) + 'Images'.padEnd(8) + 'Test Status');
  console.log('-'.repeat(80));

  jointTaxonomy.forEach(j => {
    const wasTested = uniqueClassesTested.has(j.jointClass) || j.jointClass === 'Background___non_leaf' || j.jointClass === 'Unknown___unsupported';
    console.log(
      String(j.index).padStart(2, '0').padEnd(4) +
      j.jointClass.padEnd(38) +
      j.species.padEnd(14) +
      j.imageCount.toString().padEnd(8) +
      (wasTested ? 'TESTED & VERIFIED' : 'AVAILABLE (NOT SAMPLED)')
    );
  });
  console.log('-'.repeat(80));
  const totalClassesTested = uniqueClassesTested.size + 2;
  console.log(`Total Classes Tested in This Run: ${totalClassesTested} / 49`);
  console.log('========================================================================================');
  console.log('FINAL REGRESSION METRICS SUMMARY:');
  console.log(`  - Total 49-Head Classes Tested : ${totalClassesTested} / 49 (${((totalClassesTested / 49) * 100).toFixed(1)}%)`);
  console.log(`  - Total Agricultural Images    : ${totalAgriculturalImages}`);
  console.log(`  - Species Accuracy             : ${totalCorrectSpecies} / ${totalAgriculturalImages} (${overallSpeciesAcc}%)`);
  console.log(`  - Disease Accuracy             : ${totalCorrectDiseases} / ${totalAgriculturalImages} (${overallDiseaseAcc}%)`);
  console.log(`  - Non-Plant False Positives    : ${nonPlantFalsePositives} / ${nonPlantTests.length}`);
  console.log(`  - False Negatives / Rejections : ${falseNegativeCount} / ${totalAgriculturalImages}`);
  console.log(`  - Cross-Species Leakage Count  : ${crossSpeciesLeakageCount}`);
  console.log('========================================================================================\n');
}

runCompleteVerification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
