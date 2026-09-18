import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const DS = 'D:/Agrimart/ai-service/datasets/canonical_real_dataset';

const CASES = [
  { label: '1. Grape___Black_rot', file: DS+'/Grape___Black_rot/base_00090b0f-c140-4e77-8d20-d39f67b75fcc___FAM_B.Rot 0376.JPG', expected: 'Grape', forbidden: 'Tomato' },
  { label: '2. Cotton___Bacterial_Blight', file: DS+'/Cotton___Bacterial_Blight/base_real_cotton_b_002.jpg', expected: 'Cotton', forbidden: 'Apple' },
  { label: '3. Citrus___healthy', file: DS+'/Citrus___healthy/base_real_photo_000.jpg', expected: 'Citrus', forbidden: 'Apple' },
  { label: '4. Banana___Black_Sigatoka', file: DS+'/Banana___Black_Sigatoka/base_real_photo_001.jpg', expected: 'Banana' },
  { label: '5. Chilli___Bacterial_spot', file: DS+'/Chilli___Bacterial_spot/base_006adb74-934f-448f-a14f-62181742127b___JR_B.Spot 3395.JPG', expected: 'Chilli' },
  { label: '6. Neem___healthy', file: DS+'/Neem___healthy/base_real_photo_000.jpg', expected: 'Neem' },
  { label: '7. Neem___leaf_spot_blight', file: DS+'/Neem___leaf_spot_blight/base_real_photo_000.jpg', expected: 'Neem' },
  { label: '8. Rice___Bacterial_Blight', file: DS+'/Rice___Bacterial_Blight/base_real_rice_b_000.jpg', expected: 'Rice' },
];

async function scanFile(filePath) {
  const form = new FormData();
  form.append('image', fs.createReadStream(filePath), path.basename(filePath));
  try {
    const res = await axios.post(BASE_URL+'/api/crop-health/analyze', form, { headers: form.getHeaders(), validateStatus: () => true });
    return { status: res.status, body: res.data };
  } catch(e) { return { status: 0, body: { error: e.message } }; }
}

function makeBmp(r,g,b,w=128,h=128) {
  const rs = Math.ceil((w*3)/4)*4, pxSize = rs*h, fSize = 54+pxSize;
  const buf = Buffer.alloc(fSize, 0);
  buf.write('BM',0); buf.writeUInt32LE(fSize,2); buf.writeUInt32LE(54,10);
  buf.writeUInt32LE(40,14); buf.writeInt32LE(w,18); buf.writeInt32LE(-h,22);
  buf.writeUInt16LE(1,26); buf.writeUInt16LE(24,28); buf.writeUInt32LE(0,30); buf.writeUInt32LE(pxSize,34);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) { const o=54+y*rs+x*3; buf[o]=b; buf[o+1]=g; buf[o+2]=r; }
  return buf;
}

async function scanBuf(buf, name) {
  const form = new FormData();
  form.append('image', buf, { filename: name, contentType: 'image/bmp' });
  try {
    const res = await axios.post(BASE_URL+'/api/crop-health/analyze', form, { headers: form.getHeaders(), validateStatus: () => true });
    return { status: res.status, body: res.data };
  } catch(e) { return { status: 0, body: { error: e.message } }; }
}

let passed=0, failed=0;
const failures=[];

function extract(body) {
  return {
    species: body?.data?.species ?? body?.species ?? null,
    disease: body?.data?.disease ?? body?.disease ?? null,
    isValid: body?.data?.isValid ?? body?.isValid ?? null,
    rejCode: body?.error ?? body?.data?.rejectionReason ?? ''
  };
}

async function runCase(label, file, expected, forbidden) {
  console.log('>>> '+label);
  if(!fs.existsSync(file)) { console.log('  SKIP (file not found)\n'); return; }
  const {status,body} = await scanFile(file);
  const {species,disease,rejCode} = extract(body);
  console.log('  HTTP:'+status+' species:'+species+' disease:'+disease);
  if(forbidden && species===forbidden) {
    console.log('  FAIL cross-species: got '+species+' (forbidden='+forbidden+')\n');
    failed++; failures.push(label+' [CROSS-SPECIES]');
  } else if(status===200 && species===expected) {
    console.log('  PASS\n'); passed++;
  } else if(status!==200) {
    console.log('  FALSE_NEGATIVE rejected:'+rejCode+' expected:'+expected+(forbidden?' NOT '+forbidden:'')+'\n');
    failed++; failures.push(label+' [FALSE_NEGATIVE]');
  } else {
    console.log('  FAIL species='+species+' expected='+expected+'\n');
    failed++; failures.push(label);
  }
}

async function main() {
  console.log('\n=== AGROMITRA REGRESSION 10 CASES ===\n');
  for(const c of CASES) await runCase(c.label, c.file, c.expected, c.forbidden);

  console.log('>>> 9. Synthetic warm food (must REJECT)');
  { const {status,body}=await scanBuf(makeBmp(210,160,90),'food.bmp');
    const {species}=extract(body);
    console.log('  HTTP:'+status+' species:'+species);
    if(status===400){console.log('  PASS\n');passed++;}
    else{console.log('  FAIL/MODEL_LIMITATION: got '+species+' (Neem 31-img weakness)\n');failed++;failures.push('9.[MODEL LIMITATION]');}
  }
  console.log('>>> 10. Synthetic grey (must REJECT)');
  { const {status,body}=await scanBuf(makeBmp(150,150,150),'grey.bmp');
    const {species}=extract(body);
    console.log('  HTTP:'+status+' species:'+species);
    if(status===400){console.log('  PASS\n');passed++;}
    else{console.log('  FAIL: accepted as '+species+'\n');failed++;failures.push('10.[GREY]');}
  }

  console.log('=== RESULTS: '+passed+'/'+(passed+failed)+' PASSED   '+failed+' FAILED ===');
  if(failures.length>0){console.log('FAILED:');failures.forEach(f=>console.log('  x '+f));}
  else{console.log('All PASSED.');}
}
main().catch(e=>{console.error(e);process.exit(1);});
