import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import * as jpeg from 'jpeg-js';

const API_URL = 'http://localhost:5000/api/crop-health/analyze';
const DATASET_DIR = 'd:/Agrimart/ai-service/datasets/canonical_real_dataset';

function createSyntheticPattern(type) {
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
      } else if (type === 'blank') {
        frameData[idx] = 255;
        frameData[idx + 1] = 255;
        frameData[idx + 2] = 255;
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

async function sendBuffer(buf, filename) {
  const form = new FormData();
  form.append('image', buf, { filename, contentType: 'image/jpeg' });
  try {
    const res = await axios.post(API_URL, form, { headers: form.getHeaders(), validateStatus: () => true });
    return { status: res.status, data: res.data };
  } catch (e) {
    return { status: 0, data: { error: e.message } };
  }
}

async function run() {
  console.log('=== TARGETED TEST SUITE ===');

  const nonPlants = ['food', 'geometric', 'person', 'car', 'building', 'phone', 'road', 'blank'];
  console.log('\n--- 1. NON-PLANT SPECIMENS (MUST REJECT HTTP 400) ---');
  for (const t of nonPlants) {
    const buf = createSyntheticPattern(t);
    const { status, data } = await sendBuffer(buf, t + '.jpg');
    const species = data?.data?.species ?? null;
    const disease = data?.data?.disease ?? null;
    const err = data?.error ?? data?.data?.rejectionReason ?? '';
    const passed = status === 400;
    console.log('  ' + t.padEnd(12) + ': HTTP ' + status + ' | species: ' + species + ' | disease: ' + disease + ' | err: ' + err + ' | [' + (passed ? 'PASS' : 'FAIL') + ']');
  }

  const realSamples = [
    { species: 'Tomato', file: path.join(DATASET_DIR, 'Tomato___Yellow_Leaf_Curl_Virus', 'base_00139ae8-d881-4edb-925f-46584b0bd68c___YLCV_NREC 2944.JPG'), label: 'Tomato (Yellow Leaf Curl - yellow)' },
    { species: 'Potato', file: path.join(DATASET_DIR, 'Potato___Late_blight', 'base_0051e5e8-d1c4-4a84-bf3a-a426cdad6285___RS_LB 4640.JPG'), label: 'Potato (Late Blight - brown/necrotic)' },
    { species: 'Corn', file: path.join(DATASET_DIR, 'Corn___Northern_Leaf_Blight', 'base_005318c8-a5fa-4420-843b-23bdda7322c2___RS_NLB 3853 copy.jpg'), label: 'Corn (Northern Leaf Blight - tan/brown lesions)' },
    { species: 'Rice', file: path.join(DATASET_DIR, 'Rice___Brown_Spot', 'base_real_rice_s_000.jpg'), label: 'Rice (Brown Spot - brown spots)' },
    { species: 'Apple', file: path.join(DATASET_DIR, 'Apple___healthy', 'base_0055dd26-23a7-4415-ac61-e0b44ebfaf80___RS_HL 5672.JPG'), label: 'Apple (Healthy green)' },
  ];

  console.log('\n--- 2. REAL AGRICULTURAL LEAVES (MUST ACCEPT HTTP 200) ---');
  for (const s of realSamples) {
    if (!fs.existsSync(s.file)) {
      console.log('  ' + s.label + ': FILE NOT FOUND');
      continue;
    }
    const buf = fs.readFileSync(s.file);
    const { status, data } = await sendBuffer(buf, path.basename(s.file));
    const species = data?.data?.species ?? null;
    const disease = data?.data?.disease ?? null;
    const passed = status === 200 && species === s.species;
    console.log('  ' + s.label.padEnd(50) + ': HTTP ' + status + ' | species: ' + species + ' | disease: ' + disease + ' | [' + (passed ? 'PASS' : 'FAIL') + ']');
  }
}

run().catch(e => { console.error(e); process.exit(1); });
