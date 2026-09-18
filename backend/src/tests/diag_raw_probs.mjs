import fs from 'fs';
import path from 'path';
import * as ort from 'onnxruntime-node';
import jpeg from 'jpeg-js';

const MODEL_PATH = 'D:/Agrimart/backend/crop_disease_model.onnx';
const META_PATH = 'D:/Agrimart/backend/model_metadata.json';

const IMAGES = [
  { label: 'Grape___Black_rot', file: 'D:/Agrimart/ai-service/datasets/canonical_real_dataset/Grape___Black_rot/base_00090b0f-c140-4e77-8d20-d39f67b75fcc___FAM_B.Rot 0376.JPG' },
  { label: 'Cotton___Bacterial_Blight', file: 'D:/Agrimart/ai-service/datasets/canonical_real_dataset/Cotton___Bacterial_Blight/base_real_cotton_b_002.jpg' },
  { label: 'Citrus___healthy', file: 'D:/Agrimart/ai-service/datasets/canonical_real_dataset/Citrus___healthy/base_real_photo_000.jpg' },
  { label: 'Banana___Black_Sigatoka', file: 'D:/Agrimart/ai-service/datasets/canonical_real_dataset/Banana___Black_Sigatoka/base_real_photo_001.jpg' },
  { label: 'Chilli___Bacterial_spot', file: 'D:/Agrimart/ai-service/datasets/canonical_real_dataset/Chilli___Bacterial_spot/base_006adb74-934f-448f-a14f-62181742127b___JR_B.Spot 3395.JPG' },
  { label: 'Neem___leaf_spot_blight', file: 'D:/Agrimart/ai-service/datasets/canonical_real_dataset/Neem___leaf_spot_blight/base_real_photo_000.jpg' },
];

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

function softmax(arr) {
  const m = Math.max(...arr);
  const exp = arr.map(x => Math.exp(x - m));
  const s = exp.reduce((a,b)=>a+b,0);
  return exp.map(x => x/s);
}

function bilinearResize(rawPixels, srcW, srcH, dstW, dstH) {
  const out = new Float32Array(dstW * dstH * 3);
  const xScale = srcW / dstW, yScale = srcH / dstH;
  for (let oy = 0; oy < dstH; oy++) {
    for (let ox = 0; ox < dstW; ox++) {
      const sx = ox * xScale, sy = oy * yScale;
      const x0 = Math.min(Math.floor(sx), srcW-1), x1 = Math.min(x0+1, srcW-1);
      const y0 = Math.min(Math.floor(sy), srcH-1), y1 = Math.min(y0+1, srcH-1);
      const fx = sx - x0, fy = sy - y0;
      for (let c = 0; c < 3; c++) {
        const p00 = rawPixels[(y0*srcW+x0)*4+c]/255.0;
        const p10 = rawPixels[(y0*srcW+x1)*4+c]/255.0;
        const p01 = rawPixels[(y1*srcW+x0)*4+c]/255.0;
        const p11 = rawPixels[(y1*srcW+x1)*4+c]/255.0;
        const v = p00*(1-fx)*(1-fy) + p10*fx*(1-fy) + p01*(1-fx)*fy + p11*fx*fy;
        out[(oy*dstW+ox)*3+c] = (v - MEAN[c]) / STD[c];
      }
    }
  }
  return out;
}

function toNchw(hwc, w, h) {
  const nchw = new Float32Array(3*h*w);
  for (let c = 0; c < 3; c++)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        nchw[c*h*w + y*w + x] = hwc[(y*w+x)*3+c];
  return nchw;
}

async function main() {
  const session = await ort.InferenceSession.create(MODEL_PATH);
  const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
  const speciesList = meta.species_list;
  const classes = meta.classes;

  for (const img of IMAGES) {
    if (!fs.existsSync(img.file)) { console.log(img.label + ': FILE NOT FOUND'); continue; }
    const buf = fs.readFileSync(img.file);
    const raw = jpeg.decode(buf, { useTArray: true });
    const resized = bilinearResize(raw.data, raw.width, raw.height, 224, 224);
    const nchw = toNchw(resized, 224, 224);
    const tensor = new ort.Tensor('float32', nchw, [1,3,224,224]);
    const results = await session.run({ image: tensor });
    
    const spProbs = softmax(Array.from(results.species_logits.data));
    const jProbs = softmax(Array.from(results.joint_logits.data));
    
    const topSp = spProbs.map((p,i)=>({s:speciesList[i],p})).sort((a,b)=>b.p-a.p).slice(0,5);
    const topJt = jProbs.map((p,i)=>({c:classes[i],p})).sort((a,b)=>b.p-a.p).slice(0,5);
    
    const best = topSp[0], second = topSp[1];
    const margin = best.p - second.p;
    
    // Crop→joint mass for best species
    const cropJointMass = jProbs.reduce((sum,p,i) => {
      if (classes[i] && classes[i].startsWith(best.s+'___')) return sum+p; return sum;
    }, 0);
    
    const bgI = speciesList.indexOf('Background'), unI = speciesList.indexOf('Unknown');
    const rejProb = (bgI>=0?spProbs[bgI]:0)+(unI>=0?spProbs[unI]:0);
    
    const bestJtCrop = topJt[0].c.split('___')[0];
    const headAgree = best.s === bestJtCrop;
    
    console.log('\n=== '+img.label+' ===');
    console.log('Species Top5:');
    topSp.forEach(x => console.log('  '+x.s+': '+(x.p*100).toFixed(1)+'%'));
    console.log('Joint Top5:');
    topJt.forEach(x => console.log('  '+x.c+': '+(x.p*100).toFixed(1)+'%'));
    console.log('Best: '+best.s+' conf='+( best.p*100).toFixed(1)+'% margin='+(margin*100).toFixed(1)+'%');
    console.log('Joint mass for '+best.s+': '+(cropJointMass*100).toFixed(1)+'%');
    console.log('Head agree: '+headAgree+' (sp='+best.s+' jt='+bestJtCrop+')');
    console.log('rejectionProb: '+(rejProb*100).toFixed(1)+'%');
    
    const passes = headAgree && best.p >= 0.45 && (best.p >= 0.60 || margin >= 0.12) && cropJointMass >= 0.25 && rejProb < 0.35;
    console.log('WOULD PASS CURRENT GATE: '+passes);
  }
}
main().catch(e=>{console.error(e);process.exit(1);});
