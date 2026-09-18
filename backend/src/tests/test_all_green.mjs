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
    if (isGreen || isYellowChlorotic || isNecroticBrown || isOlive) {
      foliarCount++;
    }
  }
  return {
    foliarRatio: sampledCount > 0 ? foliarCount / sampledCount : 0,
    greenRatio: sampledCount > 0 ? greenCount / sampledCount : 0
  };
}

const dirs = fs.readdirSync(DATASET_DIR);
let zeroGreenLeaves = 0;
let totalChecked = 0;

for (const d of dirs) {
  if (d.startsWith('Background') || d.startsWith('Unknown')) continue;
  const dirPath = path.join(DATASET_DIR, d);
  if (!fs.statSync(dirPath).isDirectory()) continue;
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.jpg') || f.endsWith('.JPG')).slice(0, 5);
  for (const f of files) {
    totalChecked++;
    try {
      const buf = fs.readFileSync(path.join(dirPath, f));
      const dec = jpeg.decode(buf, { useTArray: true });
      const q = checkQuality(dec);
      if (q.greenRatio < 0.01 && q.foliarRatio > 0.06) {
        zeroGreenLeaves++;
        console.log('Low green leaf: ' + d + '/' + f + ' green=' + (q.greenRatio*100).toFixed(2) + '% foliar=' + (q.foliarRatio*100).toFixed(2) + '%');
      }
    } catch {}
  }
}
console.log('Done: ' + zeroGreenLeaves + ' / ' + totalChecked + ' leaves had < 1% green with > 6% foliar');
