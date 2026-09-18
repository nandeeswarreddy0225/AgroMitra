import fs from 'fs';
import path from 'path';
import * as ort from 'onnxruntime-node';
import * as jpeg from 'jpeg-js';

const MODEL_PATH = 'D:/Agrimart/backend/crop_disease_model.onnx';
const METADATA_PATH = 'D:/Agrimart/backend/model_metadata.json';

function createSyntheticPattern(type) {
  const width = 224;
  const height = 224;
  const frameData = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (type === 'food') {
        const toast = 150 + ((x * y) % 40);
        frameData[idx] = toast + 40;
        frameData[idx + 1] = toast;
        frameData[idx + 2] = 40;
      }
      frameData[idx + 3] = 255;
    }
  }
  return jpeg.encode({ data: frameData, width, height }, 90).data;
}

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

function softmax(arr) {
  const m = Math.max(...arr);
  const exp = arr.map(x => Math.exp(x - m));
  const s = exp.reduce((a, b) => a + b, 0);
  return exp.map(x => x / s);
}

function bilinearResize(rawPixels, srcW, srcH, dstW, dstH) {
  const out = new Float32Array(dstW * dstH * 3);
  const xScale = srcW / dstW, yScale = srcH / dstH;
  for (let oy = 0; oy < dstH; oy++) {
    for (let ox = 0; ox < dstW; ox++) {
      const sx = ox * xScale, sy = oy * yScale;
      const x0 = Math.min(Math.floor(sx), srcW - 1), x1 = Math.min(x0 + 1, srcW - 1);
      const y0 = Math.min(Math.floor(sy), srcH - 1), y1 = Math.min(y0 + 1, srcH - 1);
      const fx = sx - x0, fy = sy - y0;
      for (let c = 0; c < 3; c++) {
        const p00 = rawPixels[(y0 * srcW + x0) * 4 + c] / 255.0;
        const p10 = rawPixels[(y0 * srcW + x1) * 4 + c] / 255.0;
        const p01 = rawPixels[(y1 * srcW + x0) * 4 + c] / 255.0;
        const p11 = rawPixels[(y1 * srcW + x1) * 4 + c] / 255.0;
        const v = p00 * (1 - fx) * (1 - fy) + p10 * fx * (1 - fy) + p01 * (1 - fx) * fy + p11 * fx * fy;
        out[(oy * dstW + ox) * 3 + c] = (v - MEAN[c]) / STD[c];
      }
    }
  }
  return out;
}

function toNchw(hwc, w, h) {
  const nchw = new Float32Array(3 * h * w);
  for (let c = 0; c < 3; c++)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        nchw[c * h * w + y * w + x] = hwc[(y * w + x) * 3 + c];
  return nchw;
}

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
  const oliveRatio = sampledCount > 0 ? oliveCount / sampledCount : 0;

  return {
    meanLum,
    stdLum,
    foliarRatio,
    greenRatio,
    yellowRatio,
    necroticRatio,
    oliveRatio,
    sampledCount
  };
}

async function run() {
  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
  const session = await ort.InferenceSession.create(MODEL_PATH);

  const foodJpeg = createSyntheticPattern('food');
  const decoded = jpeg.decode(foodJpeg, { useTArray: true });

  console.log('=== 1. IMAGE QUALITY CHECKS (FOOD) ===');
  const q = checkQuality(decoded);
  console.log(JSON.stringify(q, null, 2));

  const resized = bilinearResize(decoded.data, decoded.width, decoded.height, 224, 224);
  const nchw = toNchw(resized, 224, 224);
  const tensor = new ort.Tensor('float32', nchw, [1, 3, 224, 224]);
  const results = await session.run({ image: tensor });

  const speciesLogits = results.species_logits.data;
  const speciesProbs = softmax(Array.from(speciesLogits));
  const speciesList = metadata.species_list;

  const bgIdx = speciesList.indexOf('Background');
  const unkIdx = speciesList.indexOf('Unknown');

  console.log('\n=== 2. BACKGROUND PROBABILITY ===');
  console.log('Background prob: ' + (speciesProbs[bgIdx] * 100).toFixed(4) + '%');

  console.log('\n=== 3. UNKNOWN PROBABILITY ===');
  console.log('Unknown prob: ' + (speciesProbs[unkIdx] * 100).toFixed(4) + '%');

  console.log('\n=== 4. SPECIES SOFTMAX (Top 5) ===');
  const sortedSpecies = speciesProbs
    .map((p, i) => ({ species: speciesList[i], prob: p }))
    .sort((a, b) => b.prob - a.prob);

  sortedSpecies.slice(0, 5).forEach(x => {
    console.log('  ' + x.species.padEnd(12) + ': ' + (x.prob * 100).toFixed(2) + '%');
  });

  const top1 = sortedSpecies[0];
  const top2 = sortedSpecies[1];

  console.log('\n=== 5. TOP-1 AND TOP-2 SPECIES ===');
  console.log('Top-1: ' + top1.species + ' (' + (top1.prob * 100).toFixed(2) + '%)');
  console.log('Top-2: ' + top2.species + ' (' + (top2.prob * 100).toFixed(2) + '%)');

  console.log('\n=== 6. CONFIDENCE MARGIN ===');
  const margin = top1.prob - top2.prob;
  console.log('Margin: ' + (margin * 100).toFixed(2) + '%');

  console.log('\n=== 7. JOINT-HEAD PREDICTION (Top 5) ===');
  const jointLogits = results.joint_logits.data;
  const jointProbs = softmax(Array.from(jointLogits));
  const jointClasses = metadata.classes;
  const sortedJoint = jointProbs
    .map((p, i) => ({ cls: jointClasses[i], prob: p }))
    .sort((a, b) => b.prob - a.prob);

  sortedJoint.slice(0, 5).forEach(x => {
    console.log('  ' + x.cls.padEnd(30) + ': ' + (x.prob * 100).toFixed(2) + '%');
  });

  const topJoint = sortedJoint[0];
  const topJointCrop = topJoint.cls.split('___')[0];

  console.log('\n=== 8. SPECIES / JOINT AGREEMENT ===');
  console.log('Species Top-1 Crop : ' + top1.species);
  console.log('Joint Top-1 Crop   : ' + topJointCrop + ' (' + topJoint.cls + ')');
  console.log('Strict Agreement   : ' + (top1.species === topJointCrop));
}

run().catch(e => { console.error(e); process.exit(1); });
