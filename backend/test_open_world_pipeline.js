const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const API_BASE = 'http://localhost:5000/api/crop-health/analyze';

const testSpecimens = [
  {
    name: 'Vegetable Outside 18 Classes (Squash Powdery Mildew)',
    filePath: path.resolve('d:/Agrimart/ai-service/datasets/PlantDoc/test/Squash Powdery mildew leaf/Powdery-Mildew-on-squash.jpg'),
    expectedSpecies: 'Squash',
    expectedDiagnosisStatus: 'DIAGNOSED',
    expectedDisease: 'Powdery Mildew',
  },
  {
    name: 'Fruit Outside 18 Classes (Guava Healthy Leaf)',
    filePath: path.resolve('d:/Agrimart/ai-service/datasets/open_world_test/guava_leaf_healthy.jpg'),
    expectedSpecies: 'Guava',
    expectedDiagnosisStatus: 'HEALTHY',
    expectedHealthy: true,
  },
  {
    name: 'Herb/Tree Outside 18 Classes (Tulsi Holy Basil)',
    filePath: path.resolve('d:/Agrimart/ai-service/datasets/open_world_test/tulsi_herb_leaf.jpg'),
    expectedSpecies: 'Tulsi',
    expectedDiagnosisStatus: 'HEALTHY',
    expectedHealthy: true,
  },
  {
    name: 'Vegetable Outside 18 Classes (Bell Pepper Leaf)',
    filePath: path.resolve('d:/Agrimart/ai-service/datasets/PlantDoc/test/Bell_pepper leaf/10148582-green-leaf-of-pepper.jpg'),
    expectedSpecies: 'Bell Pepper',
    expectedDiagnosisStatus: 'HEALTHY',
    expectedHealthy: true,
  },
  {
    name: 'Canonical Potato Early Blight (Specialist ONNX Model)',
    filePath: path.resolve('d:/Agrimart/ai-service/datasets/canonical_real_dataset/Potato___Early_blight/base_001187a0-57ab-4329-baff-e7246a9edeb0___RS_Early.B 8178.JPG'),
    expectedSpecies: 'Potato',
    expectedDiagnosisStatus: 'DIAGNOSED',
    expectedDisease: 'Early Blight',
  },
  {
    name: 'Unsupported Wild Foliage (Out-of-Distribution Leaf)',
    filePath: path.resolve('d:/Agrimart/ai-service/datasets/canonical_real_dataset/Unknown___unsupported/base_real_photo_000.jpg'),
    expectedUnknownSpecies: true,
    expectedDiagnosisStatus: 'UNKNOWN_SPECIES',
  },
  {
    name: 'Non-Plant Object (Laptop Computer)',
    filePath: path.resolve('C:/Users/nande/.gemini/antigravity/brain/d49d2dbc-29b5-4e70-89fc-d2b6b7123ce9/scratch/real_specimens/16_laptop_computer.jpg'),
    expectedNonPlant: true,
    expectedDiagnosisStatus: 'NON_PLANT',
  },
];

async function runTests() {
  console.log('========================================================================');
  console.log('AGROMITRA OPEN-WORLD AGRICULTURAL AI SCANNER — END-TO-END VERIFICATION');
  console.log('========================================================================\n');

  const reportRows = [];
  let allPass = true;

  for (const test of testSpecimens) {
    console.log(`Testing: ${test.name}`);
    console.log(`File: ${test.filePath}`);

    if (!fs.existsSync(test.filePath)) {
      console.error(`❌ File not found: ${test.filePath}`);
      allPass = false;
      continue;
    }

    const form = new FormData();
    form.append('image', fs.createReadStream(test.filePath), {
      filename: path.basename(test.filePath),
      contentType: 'image/jpeg',
    });
    // Add sample coordinates for nearby shop calculation (Kurnool / AP agricultural region)
    form.append('latitude', '15.8281');
    form.append('longitude', '78.0373');

    try {
      const res = await axios.post(API_BASE, form, {
        headers: form.getHeaders(),
        validateStatus: () => true, // capture 400 errors as valid responses
      });

      const data = res.data;
      const status = res.status;

      console.log(`HTTP Status: ${status}`);
      console.log(`Response Success: ${data.success}`);
      console.log(`Identified Species: ${data.species || 'None'}`);
      console.log(`Species Source: ${data.speciesSource || 'None'}`);
      console.log(`Species Confidence: ${data.speciesConfidence}`);
      console.log(`Disease: ${data.disease || 'None'}`);
      console.log(`Diagnosis Status: ${data.diagnosisStatus}`);
      console.log(`Products Count: ${data.products?.length || 0}`);
      console.log(`Nearby Shops Count: ${data.nearbyShops?.length || 0}`);

      let rowPass = true;

      if (test.expectedNonPlant) {
        if (data.diagnosisStatus !== 'NON_PLANT' && data.error !== 'NON_PLANT' && status !== 400) {
          console.error(`❌ Expected NON_PLANT rejection, got status ${status} / ${data.diagnosisStatus}`);
          rowPass = false;
        } else {
          console.log(`✅ Correctly rejected non-plant object without forcing into Tomato/Potato/Neem.`);
        }
      } else if (test.expectedUnknownSpecies) {
        if (data.diagnosisStatus !== 'UNKNOWN_SPECIES' && data.error !== 'UNKNOWN_SPECIES' && status !== 400) {
          console.error(`❌ Expected UNKNOWN_SPECIES rejection, got status ${status} / ${data.diagnosisStatus}`);
          rowPass = false;
        } else {
          console.log(`✅ Correctly rejected unsupported plant foliage without forcing into Tomato/Potato/Neem.`);
        }
      } else {
        if (status !== 200) {
          console.error(`❌ Expected 200, got ${status}: ${JSON.stringify(data)}`);
          rowPass = false;
        }
        if (test.expectedSpecies && data.species !== test.expectedSpecies) {
          console.error(`❌ Expected species ${test.expectedSpecies}, got ${data.species}`);
          rowPass = false;
        }
        if (test.expectedDiagnosisStatus && data.diagnosisStatus !== test.expectedDiagnosisStatus) {
          console.error(`❌ Expected diagnosisStatus ${test.expectedDiagnosisStatus}, got ${data.diagnosisStatus}`);
          rowPass = false;
        }
        if (test.expectedDisease && !String(data.disease).toLowerCase().includes(test.expectedDisease.toLowerCase())) {
          console.error(`❌ Expected disease containing '${test.expectedDisease}', got ${data.disease}`);
          rowPass = false;
        }
        if (data.is_tomato && data.species !== 'Tomato') {
          console.error(`❌ Flagged is_tomato on non-tomato species!`);
          rowPass = false;
        }
      }

      const reportRow = {
        image: path.basename(test.filePath),
        identifiedSpecies: data.species || (data.diagnosisStatus === 'NON_PLANT' ? 'NON_PLANT' : 'UNKNOWN'),
        speciesConfidence: data.speciesConfidence ? `${(data.speciesConfidence * 100).toFixed(1)}%` : 'N/A',
        disease: data.disease || (data.isHealthy ? 'Healthy Leaf' : 'None'),
        diseaseConfidence: data.diseaseConfidence ? `${(data.diseaseConfidence * 100).toFixed(1)}%` : 'N/A',
        finalStatus: data.diagnosisStatus || (data.isValid ? 'VALID' : 'REJECTED'),
        pass: rowPass,
      };

      reportRows.push(reportRow);
      if (!rowPass) allPass = false;
      console.log(rowPass ? '✅ Specimen Test PASSED\n' : '❌ Specimen Test FAILED\n');
    } catch (err) {
      console.error(`❌ Request Error: ${err.message}\n`);
      allPass = false;
    }
  }

  console.log('========================================================================');
  console.log('EXACT TEST RESULTS MATRIX:');
  console.log('IMAGE -> IDENTIFIED SPECIES -> CONFIDENCE -> DISEASE -> CONFIDENCE -> FINAL STATUS');
  console.log('========================================================================');
  for (const r of reportRows) {
    console.log(
      `${r.image} -> ${r.identifiedSpecies} -> ${r.speciesConfidence} -> ${r.disease} -> ${r.diseaseConfidence} -> ${r.finalStatus} [${r.pass ? 'PASS' : 'FAIL'}]`
    );
  }
  console.log('========================================================================');

  if (allPass) {
    console.log('\n🎉 ALL OPEN-WORLD AND SPECIALIST SPECIMENS PASSED VERIFICATION!');
    process.exit(0);
  } else {
    console.error('\n⚠️ SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests();
