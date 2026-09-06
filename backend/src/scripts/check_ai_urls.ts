import axios from 'axios';

async function checkRenderUrls() {
  const candidates = [
    'https://agromitra-ai.onrender.com',
    'https://agromitra-ai-service.onrender.com',
    'https://agromitra-python.onrender.com',
    'https://agromitra-fastapi.onrender.com',
    'https://agromitra-ai-ytqb.onrender.com',
    'https://agromitra-ai.hf.space',
    'https://agromitra-backend.onrender.com',
  ];

  for (const url of candidates) {
    try {
      const res = await axios.get(`${url}/health`, { timeout: 4000 });
      console.log(`✅ FOUND ACTIVE AI URL: ${url} ->`, res.data);
    } catch (e: any) {
      console.log(`❌ ${url}:`, e.message);
    }
  }
}

checkRenderUrls();
