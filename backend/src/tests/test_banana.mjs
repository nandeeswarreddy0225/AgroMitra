import fs from 'fs';
import path from 'path';
import * as jpeg from 'jpeg-js';

const file = 'D:/Agrimart/ai-service/datasets/canonical_real_dataset/Banana___healthy/base_real_photo_000.jpg';
const buf = fs.readFileSync(file);
const decoded = jpeg.decode(buf, { useTArray: true });
const { width, height, data } = decoded;
const totalPixels = width * height;
const sampleStep = Math.max(1, Math.floor(totalPixels / 10000));
let foliarCount = 0, greenCount = 0, yellowCount = 0, necroticCount = 0, oliveCount = 0;
let lumSum = 0, lumSqSum = 0, sampledCount = 0;

for (let i = 0; i < totalPixels; i += sampleStep) {
  const idx = i * 4;
  const r = data[idx], g = data[idx + 1], b = data[idx + 2];
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  lumSum += lum; lumSqSum += lum * lum; sampledCount++;

  const isGreen = g > r * 0.95 && g > b * 1.05 && g > 25;
  const isYellowChlorotic = r > 100 && g > 90 && b < 110 && Math.abs(r - g) < 45 && g > r * 0.88;
  const isNecroticBrown = r > 50 && r < 155 && g > 30 && g < 120 && b < 70 && r > g && g > b;
  const isOlive = g > b && g > 25 && r < 140 && (2 * g - r - b) > -10;

  if (isGreen) greenCount++;
  if (isYellowChlorotic) yellowCount++;
  if (isNecroticBrown) necroticCount++;
  if (isOlive) oliveCount++;
  if (isGreen || isYellowChlorotic || isNecroticBrown || isOlive) foliarCount++;
}

console.log('Banana healthy stats:');
console.log('  greenRatio: ' + (greenCount / sampledCount));
console.log('  foliarRatio: ' + (foliarCount / sampledCount));
console.log('  oliveRatio: ' + (oliveCount / sampledCount));
console.log('  yellowRatio: ' + (yellowCount / sampledCount));
console.log('  meanLum: ' + (lumSum / sampledCount));
