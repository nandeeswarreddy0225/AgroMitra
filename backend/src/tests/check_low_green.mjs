import fs from 'fs';
import path from 'path';
import * as jpeg from 'jpeg-js';

const DATASET_DIR = 'd:/Agrimart/ai-service/datasets/canonical_real_dataset';

function checkQuality(decoded) {
  const { data, width, height } = decoded;
  const totalPixels = width * height;
  const sampleStep = Math.max(1, Math.floor(totalPixels / 5000));
  let foliarCount = 0;
  let greenCount = 0;
  let yellowCount = 0;
  let necroticCount = 0;
  let oliveCount = 0;
  let sampledCount = 0;

  for (let i = 0; i < totalPixels; i += sampleStep) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    sampledCount++;

    const isGreen = g > r * 0.95 && g > b * 1.05 && g > 25;
    const isYellowChlorotic = r > 100 && g > 90 && b < 110 && Math.abs(r - g) < 45 && g > r * 0.88;
    const isNecroticBrown = r > 60 && r < 160 && g > 35 && g < 120 && b < 70 && r > g && g > b;
    const isOlive = g > b && g > 25 && r < 140 && (2 * g - r - b) > -10;

    if (isGreen) greenCount++;
    if (isYellowChlorotic) yellowCount++;
    if (isNecroticBrown) necroticCount++;
    if (isOlive) oliveCount++;
    if (isGreen || isYellowChlorotic || isNecroticBrown || isOlive) {
      foliarCount++;
    }
  }
  return {
    green: greenCount / sampledCount,
    yellow: yellowCount / sampledCount,
    necrotic: necroticCount / sampledCount,
    olive: oliveCount / sampledCount,
    foliar: foliarCount / sampledCount
  };
}

const f1 = path.join(DATASET_DIR, 'Citrus___healthy/base_real_photo_003.jpg');
const f2 = path.join(DATASET_DIR, 'Tomato___Late_blight/base_008ebb44-eb77-4843-b621-4b88b5df7d43___RS_Late.B 5188.JPG');

for (const f of [f1, f2]) {
  const buf = fs.readFileSync(f);
  const dec = jpeg.decode(buf, { useTArray: true });
  const q = checkQuality(dec);
  console.log(path.basename(f) + ': ' + JSON.stringify(q));
}
