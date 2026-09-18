import * as jpeg from 'jpeg-js';

function createSyntheticPattern(type) {
  const width = 224;
  const height = 224;
  const frameData = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dirt = 60 + ((x * 13 + y * 7) % 30);
      frameData[idx] = Math.min(255, dirt + 35);
      frameData[idx + 1] = Math.min(255, dirt + 15);
      frameData[idx + 2] = Math.max(0, dirt - 20);
      frameData[idx + 3] = 255;
    }
  }
  return jpeg.encode({ data: frameData, width, height }, 90).data;
}

const buf = createSyntheticPattern('natural_background');
const decoded = jpeg.decode(buf, { useTArray: true });
const { width, height, data } = decoded;
const totalPixels = width * height;
const sampleStep = Math.max(1, Math.floor(totalPixels / 10000));
let foliarCount = 0, greenCount = 0, yellowCount = 0, necroticCount = 0, oliveCount = 0;
let lumSum = 0, sampledCount = 0;

for (let i = 0; i < totalPixels; i += sampleStep) {
  const idx = i * 4;
  const r = data[idx], g = data[idx + 1], b = data[idx + 2];
  sampledCount++;

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

console.log('Dirt stats:');
console.log('  greenRatio: ' + (greenCount / sampledCount));
console.log('  oliveRatio: ' + (oliveCount / sampledCount));
console.log('  yellowRatio: ' + (yellowCount / sampledCount));
console.log('  necroticRatio: ' + (necroticCount / sampledCount));
console.log('  foliarRatio: ' + (foliarCount / sampledCount));
