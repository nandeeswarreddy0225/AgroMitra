import fs from 'fs';
import path from 'path';
import * as jpeg from 'jpeg-js';

const DATASET_DIR = 'd:/Agrimart/ai-service/datasets/canonical_real_dataset';

const testClasses = [
  'Corn___Northern_Leaf_Blight',
  'Potato___Late_blight',
  'Strawberry___Leaf_scorch',
  'Rice___Brown_Spot',
  'Tomato___Yellow_Leaf_Curl_Virus',
  'Neem___healthy',
  'Neem___leaf_spot_blight',
  'Apple___healthy'
];

function checkQuality(decoded) {
  const { data, width, height } = decoded;
  const totalPixels = width * height;
  const sampleStep = Math.max(1, Math.floor(totalPixels / 10000));
  let foliarCount = 0;
  let greenCount = 0;
  let yellowCount = 0;
  let necroticCount = 0;
  let oliveCount = 0;
  let lumSum = 0;
  let lumSqSum = 0;
  let sampledCount = 0;

  for (let i = 0; i < totalPixels; i += sampleStep) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lumSum += lum;
    lumSqSum += lum * lum;
    sampledCount++;

    const isGreen = g > r * 0.95 && g > b * 1.05 && g > 25;
    const isYellowChlorotic = r > 100 && g > 90 && b < 110 && Math.abs(r - g) < 45 && g > r * 0.88;
    const isNecroticBrown = r > 60 && g > 35 && b < 65 && r > g && g > b;
    const isOlive = g > b && g > 25 && r < 140 && (2 * g - r - b) > -10;

    if (isGreen) greenCount++;
    if (isYellowChlorotic) yellowCount++;
    if (isNecroticBrown) necroticCount++;
    if (isOlive) oliveCount++;
    if (isGreen || isYellowChlorotic || isNecroticBrown || isOlive) {
      foliarCount++;
    }
  }

  const meanLum = sampledCount > 0 ? lumSum / sampledCount : 128;
  const varLum = sampledCount > 0 ? (lumSqSum / sampledCount) - (meanLum * meanLum) : 100;
  const stdLum = Math.sqrt(Math.max(0, varLum));
  const foliarRatio = sampledCount > 0 ? foliarCount / sampledCount : 0;
  const greenRatio = sampledCount > 0 ? greenCount / sampledCount : 0;
  const yellowRatio = sampledCount > 0 ? yellowCount / sampledCount : 0;
  const necroticRatio = sampledCount > 0 ? necroticCount / sampledCount : 0;

  return { meanLum, stdLum, foliarRatio, greenRatio, yellowRatio, necroticRatio };
}

for (const cls of testClasses) {
  const dir = path.join(DATASET_DIR, cls);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg') || f.endsWith('.JPG')).slice(0, 3);
  console.log('=== ' + cls + ' ===');
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    try {
      const decoded = jpeg.decode(buf, { useTArray: true });
      const q = checkQuality(decoded);
      console.log('  ' + f.slice(0, 25) + ': green=' + (q.greenRatio*100).toFixed(1) + '% foliar=' + (q.foliarRatio*100).toFixed(1) + '% yellow=' + (q.yellowRatio*100).toFixed(1) + '% necrotic=' + (q.necroticRatio*100).toFixed(1) + '% lum=' + q.meanLum.toFixed(0) + ' std=' + q.stdLum.toFixed(0));
    } catch (e) {
      console.log('  ' + f + ': decode error ' + e.message);
    }
  }
}
