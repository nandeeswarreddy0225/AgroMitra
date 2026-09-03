import http from 'http';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const BASE_PORT = 5000;

async function testAiScanner() {
  console.log('--- Testing AI Scanner Backend & Microservice ---');

  // 1. Farmer Login
  const loginData = JSON.stringify({
    email: 'nandeeswarreddy2852@gmail.com',
    password: 'Password123',
  });

  const farmerToken = await new Promise<string>((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: BASE_PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          const json = JSON.parse(body);
          if (json.token) resolve(json.token);
          else reject(new Error('Login failed: ' + body));
        });
      }
    );
    req.write(loginData);
    req.end();
  });

  console.log('✅ Logged in as Farmer. Token obtained.');

  // Create a minimal valid 1x1 JPEG in buffer
  const sampleJpgBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x00, 0xff, 0xd9,
  ]);

  // 2. Submit multipart form with image
  const form = new FormData();
  form.append('image', sampleJpgBuffer, {
    filename: 'test-leaf.jpg',
    contentType: 'image/jpeg',
  });

  const response = await new Promise<any>((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: BASE_PORT,
        path: '/api/crop-health/analyze',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${farmerToken}`,
          ...form.getHeaders(),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        });
      }
    );
    form.pipe(req);
  });

  console.log('AI Analysis Response:', JSON.stringify(response, null, 2));
}

testAiScanner().catch(console.error);
