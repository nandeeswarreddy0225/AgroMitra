import fs from 'fs';
import jpeg from 'jpeg-js';

const file = 'D:/Agrimart/ai-service/datasets/canonical_real_dataset/Neem___leaf_spot_blight/base_real_photo_000.jpg';
const buf = fs.readFileSync(file);
const raw = jpeg.decode(buf, { useTArray: true });
const { data, width, height } = raw;
const totalPixels = width * height;
const sampleStep = Math.max(1, Math.floor(totalPixels / 10000));

let foliarCount = 0, greenCount = 0, lumSum = 0, lumSqSum = 0, sampledCount = 0;

for (let i = 0; i < totalPixels; i += sampleStep) {
  const idx = i * 4;
  const r = data[idx], g = data[idx+1], b = data[idx+2];
  const lum = 0.299*r + 0.587*g + 0.114*b;
  lumSum += lum; lumSqSum += lum*lum; sampledCount++;
  const isGreen = g > r*0.95 && g > b*1.05 && g > 25;
  const isYellowChlorotic = r > 100 && g > 90 && b < 110 && Math.abs(r-g) < 45 && g > r*0.88;
  const isNecroticBrown = r > 60 && g > 35 && b < 65 && r > g && g > b;
  const isOlive = g > b && g > 25 && r < 140 && (2*g - r - b) > -10;
  if (isGreen) greenCount++;
  if (isGreen || isYellowChlorotic || isNecroticBrown || isOlive) foliarCount++;
}

const meanLum = lumSum / sampledCount;
const stdLum = Math.sqrt(lumSqSum/sampledCount - meanLum*meanLum);
const foliarRatio = foliarCount / sampledCount;
const greenRatio = greenCount / sampledCount;

console.log('Image: '+width+'x'+height+' total='+totalPixels+' step='+sampleStep+' sampled='+sampledCount);
console.log('meanLum='+meanLum.toFixed(2)+' stdLum='+stdLum.toFixed(2));
console.log('foliarRatio='+foliarRatio.toFixed(4)+' greenRatio='+greenRatio.toFixed(4));
console.log('foliarCount='+foliarCount);

// Lap check
const targetW = 224, targetH = 224;
const gray = new Float32Array(targetW*targetH);
for (let y = 0; y < targetH; y++) {
  const srcY = Math.floor(y*(height/targetH));
  for (let x = 0; x < targetW; x++) {
    const srcX = Math.floor(x*(width/targetW));
    const idx2 = (srcY*width+srcX)*4;
    gray[y*targetW+x] = 0.299*data[idx2] + 0.587*data[idx2+1] + 0.114*data[idx2+2];
  }
}
let lapSum=0, lapSqSum=0, lapCount=0;
for (let y=1; y<targetH-1; y++) for (let x=1; x<targetW-1; x++) {
  const gC=gray[y*targetW+x], gU=gray[(y-1)*targetW+x], gD=gray[(y+1)*targetW+x];
  const gL=gray[y*targetW+(x-1)], gR=gray[y*targetW+(x+1)];
  const lap = gU+gD+gL+gR - 4*gC;
  lapSum+=lap; lapSqSum+=lap*lap; lapCount++;
}
const lapVar = lapSqSum/lapCount - Math.pow(lapSum/lapCount, 2);
console.log('lapVar='+lapVar.toFixed(2)+' (threshold: 15.0)');
console.log('FAILS LAP?'+(lapVar < 15.0));
console.log('FAILS FOLIAR?'+(foliarRatio < 0.06));
