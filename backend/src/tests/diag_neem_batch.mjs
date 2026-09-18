import fs from 'fs';
import jpeg from 'jpeg-js';
import path from 'path';

const DIR = 'D:/Agrimart/ai-service/datasets/canonical_real_dataset/Neem___leaf_spot_blight';
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.jpg')).slice(0, 10);

for (const f of files) {
  const buf = fs.readFileSync(path.join(DIR, f));
  const raw = jpeg.decode(buf, { useTArray: true });
  const {data, width, height} = raw;
  const total = width * height;
  const step = Math.max(1, Math.floor(total/10000));
  let foliar=0, sampled=0, lumSum=0;
  for (let i=0; i<total; i+=step) {
    const idx=i*4, r=data[idx], g=data[idx+1], b=data[idx+2];
    const lum = 0.299*r+0.587*g+0.114*b;
    lumSum+=lum; sampled++;
    const isGreen = g>r*0.95 && g>b*1.05 && g>25;
    const isYC = r>100&&g>90&&b<110&&Math.abs(r-g)<45&&g>r*0.88;
    const isNB = r>60&&g>35&&b<65&&r>g&&g>b;
    const isOl = g>b&&g>25&&r<140&&(2*g-r-b)>-10;
    if(isGreen||isYC||isNB||isOl) foliar++;
  }
  const foliarRatio = foliar/sampled;
  const meanLum = lumSum/sampled;
  const passes = foliarRatio >= 0.06;
  console.log(f+': '+width+'x'+height+' foliar='+foliarRatio.toFixed(3)+' meanLum='+meanLum.toFixed(0)+' '+(passes?'PASS':'FAIL'));
}
