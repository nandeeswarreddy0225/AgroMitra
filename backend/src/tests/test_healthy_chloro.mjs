import fs from 'fs';
import path from 'path';
import * as jpeg from 'jpeg-js';

const DATASET_DIR = 'd:/Agrimart/ai-service/datasets/canonical_real_dataset';

function checkChlorophyll(decoded) {
  const { data, width, height } = decoded;
  const totalPixels = width * height;
  const sampleStep = Math.max(1, Math.floor(totalPixels / 5000));
  let chloroCount = 0;
  let sampledCount = 0;

  for (let i = 0; i < totalPixels; i += sampleStep) {
    const idx = i * 4;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    sampledCount++;

    const isGreen = g > r * 0.95 && g > b * 1.05 && g > 25;
    const isOlive = g > b * 1.10 && g > 25 && r < 140 && g > r * 0.85 && (2 * g - r - b) > 0;

    if (isGreen || isOlive) chloroCount++;
  }
  return chloroCount / sampledCount;
}

const dirs = fs.readdirSync(DATASET_DIR);
let zeroChloroHealthy = 0;
let totalHealthy = 0;

for (const d of dirs) {
  if (!d.endsWith('___healthy')) continue;
  const dirPath = path.join(DATASET_DIR, d);
  if (!fs.statSync(dirPath).isDirectory()) continue;
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.jpg') || f.endsWith('.JPG')).slice(0, 5);
  for (const f of files) {
    totalHealthy++;
    try {
      const buf = fs.readFileSync(path.join(dirPath, f));
      const dec = jpeg.decode(buf, { useTArray: true });
      const c = checkChlorophyll(dec);
      if (c < 0.03) {
        zeroChloroHealthy++;
        console.log('Low chloro: ' + d + '/' + f + ' chloro=' + (c * 100).toFixed(2) + '%');
      }
    } catch {}
  }
}
console.log('Done checking healthy leaves');
