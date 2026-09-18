import fs from 'fs';
import path from 'path';
import * as jpeg from 'jpeg-js';

const DATASET_DIR = 'd:/Agrimart/ai-service/datasets/canonical_real_dataset';

function checkQualityOld(decoded) {
  const { data, width, height } = decoded;
  const totalPixels = width * height;
  const sampleStep = Math.max(1, Math.floor(totalPixels / 10000));
  let foliarCount = 0;
  let sampledCount = 0;
  for (let i = 0; i < totalPixels; i += sampleStep) {
    const idx = i * 4;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    sampledCount++;
    const isGreen = g > r * 0.95 && g > b * 1.05 && g > 25;
    const isYellowChlorotic = r > 100 && g > 90 && b < 110 && Math.abs(r - g) < 45 && g > r * 0.88;
    const isNecroticBrown = r > 60 && g > 35 && b < 65 && r > g && g > b;
    const isOlive = g > b && g > 25 && r < 140 && (2 * g - r - b) > -10;
    if (isGreen || isYellowChlorotic || isNecroticBrown || isOlive) foliarCount++;
  }
  return foliarCount / sampledCount;
}

function checkQualityNew(decoded) {
  const { data, width, height } = decoded;
  const totalPixels = width * height;
  const sampleStep = Math.max(1, Math.floor(totalPixels / 10000));
  let foliarCount = 0;
  let sampledCount = 0;
  for (let i = 0; i < totalPixels; i += sampleStep) {
    const idx = i * 4;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    sampledCount++;
    const isGreen = g > r * 0.95 && g > b * 1.05 && g > 25;
    const isYellowChlorotic = r > 100 && g > 90 && b < 110 && Math.abs(r - g) < 45 && g > r * 0.88;
    const isNecroticBrown = r > 50 && r < 165 && g > 30 && g < 135 && b < 80 && r > g && g > b;
    const isOlive = g > b && g > 25 && r < 140 && (2 * g - r - b) > -10;
    if (isGreen || isYellowChlorotic || isNecroticBrown || isOlive) foliarCount++;
  }
  return foliarCount / sampledCount;
}

const dirs = fs.readdirSync(DATASET_DIR);
let affectedLeaves = [];

for (const d of dirs) {
  if (d.startsWith('Background') || d.startsWith('Unknown')) continue;
  const dirPath = path.join(DATASET_DIR, d);
  if (!fs.statSync(dirPath).isDirectory()) continue;
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.jpg') || f.endsWith('.JPG'));
  for (const f of files) {
    try {
      const buf = fs.readFileSync(path.join(dirPath, f));
      const dec = jpeg.decode(buf, { useTArray: true });
      const oldRatio = checkQualityOld(dec);
      const newRatio = checkQualityNew(dec);
      if (oldRatio >= 0.06 && newRatio < 0.06) {
        affectedLeaves.push({ class: d, file: f, oldRatio, newRatio });
      }
    } catch {}
  }
}

console.log('Total affected leaves across ENTIRE dataset: ' + affectedLeaves.length);
affectedLeaves.forEach(a => console.log('  ' + a.class + '/' + a.file + ': old=' + a.oldRatio.toFixed(3) + ' new=' + a.newRatio.toFixed(3)));
