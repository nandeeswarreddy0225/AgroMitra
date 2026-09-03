import axios from 'axios';

async function main() {
  try {
    const res = await axios.get('http://localhost:8000/health');
    console.log('AI Microservice Status:', JSON.stringify(res.data));
  } catch (err: any) {
    console.error('AI Microservice error:', err.message);
  }
}

main();
