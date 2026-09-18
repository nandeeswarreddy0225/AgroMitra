import fs from 'fs';
import * as jpeg from 'jpeg-js';

const file = 'D:/Agrimart/ai-service/datasets/canonical_real_dataset/Banana___healthy/base_real_photo_000.jpg';
const buf = fs.readFileSync(file);
const decoded = jpeg.decode(buf, { useTArray: true });
const { width, height, data } = decoded;
let count = 0;
let rSum = 0, gSum = 0, bSum = 0;

for (let i = 0; i < width * height; i += 10) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  if (g > b && g > 25 && (2 * g - r - b) > 0 && g >= r * 0.85) {
    count++;
    rSum += r; gSum += g; bSum += b;
  }
}
console.log('Valid olive count in Banana: ' + count + ' / ' + (width * height / 10));
console.log('Avg R: ' + (rSum / count) + ' Avg G: ' + (gSum / count) + ' Avg B: ' + (bSum / count));
