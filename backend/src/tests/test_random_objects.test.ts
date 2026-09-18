import http from 'http';
import fs from 'fs';
import path from 'path';
import * as jpeg from 'jpeg-js';

function createSolidColorImage(r: number, g: number, b: number, width = 200, height = 200): Buffer {
  const frameData = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    frameData[i * 4] = r;
    frameData[i * 4 + 1] = g;
    frameData[i * 4 + 2] = b;
    frameData[i * 4 + 3] = 255;
  }
  return jpeg.encode({ data: frameData, width, height }, 90).data;
}

// Create synthetic non-plant patterns:
// 1. "Car/Metallic" grey/blue pattern with high contrast lines
function createCarImage(): Buffer {
  const width = 224, height = 224;
  const frameData = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const metallic = (x % 20 < 10 ? 180 : 70) + (y % 15);
      frameData[idx] = Math.min(255, metallic + 10);     // R (silver-blue)
      frameData[idx + 1] = Math.min(255, metallic + 20); // G
      frameData[idx + 2] = Math.min(255, metallic + 50); // B (distinct metallic blue)
      frameData[idx + 3] = 255;
    }
  }
  return jpeg.encode({ data: frameData, width, height }, 90).data;
}

// 2. "Building/Architecture" vertical brick/concrete pattern
function createBuildingImage(): Buffer {
  const width = 224, height = 224;
  const frameData = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const brick = (y % 30 < 3 || x % 50 < 3) ? 220 : 130;
      frameData[idx] = brick + 20;     // R (terracotta/grey)
      frameData[idx + 1] = brick;      // G
      frameData[idx + 2] = brick - 10; // B
      frameData[idx + 3] = 255;
    }
  }
  return jpeg.encode({ data: frameData, width, height }, 90).data;
}

// 3. "Person/Face/Skin-tone" portrait tone pattern
function createPersonImage(): Buffer {
  const width = 224, height = 224;
  const frameData = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      frameData[idx] = 225;     // R
      frameData[idx + 1] = 175; // G
      frameData[idx + 2] = 145; // B
      frameData[idx + 3] = 255;
    }
  }
  return jpeg.encode({ data: frameData, width, height }, 90).data;
}

// 4. "Random Household Object / Phone"
function createRandomObjectImage(): Buffer {
  const width = 224, height = 224;
  const frameData = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      frameData[idx] = 30 + (x % 5);
      frameData[idx + 1] = 30 + (y % 5);
      frameData[idx + 2] = 35;
      frameData[idx + 3] = 255;
    }
  }
  return jpeg.encode({ data: frameData, width, height }, 90).data;
}

async function sendImageBuffer(fileBuffer: Buffer, filename: string): Promise<any> {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(header, 'utf-8'),
    fileBuffer,
    Buffer.from(footer, 'utf-8')
  ]);

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/crop-health/analyze',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('--- Testing Random & Non-Plant Image Rejection ---');

  const cases = [
    { name: 'Person portrait specimen', buffer: createPersonImage(), file: 'person_sample.jpg' },
    { name: 'Automobile vehicle metallic', buffer: createCarImage(), file: 'car_sample.jpg' },
    { name: 'Architecture building concrete', buffer: createBuildingImage(), file: 'building_sample.jpg' },
    { name: 'Random phone electronic device', buffer: createRandomObjectImage(), file: 'phone_device.jpg' },
    { name: 'Blank white overexposed wall', buffer: createSolidColorImage(250, 250, 250), file: 'white_wall.jpg' },
    { name: 'Dark underexposed background', buffer: createSolidColorImage(8, 8, 8), file: 'dark_black.jpg' },
  ];

  for (const c of cases) {
    const res = await sendImageBuffer(c.buffer, c.file);
    console.log(`[HTTP ${res.status}] ${c.name.padEnd(35)} -> isValid=${res.data.isValid}, isSupportedSpecies=${res.data.isSupportedSpecies}, disease=${res.data.disease}, error=${res.data.error}`);
    if (res.status !== 400 || res.data.isValid !== false || res.data.isSupportedSpecies !== false) {
      throw new Error(`Expected HTTP 400 rejection for non-plant ${c.name}, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
    if (res.data.disease !== null && res.data.disease !== undefined) {
      throw new Error(`Expected null disease for non-plant ${c.name}, got ${res.data.disease}`);
    }
  }

  console.log('\n✅ Zero false-positives! All non-plant and random objects strictly rejected with HTTP 400 and disease=null.');
}

run().catch(err => {
  console.error('Random objects test failed:', err);
  process.exit(1);
});
