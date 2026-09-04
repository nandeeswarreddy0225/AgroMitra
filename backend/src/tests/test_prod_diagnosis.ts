import axios from 'axios';

async function testProd() {
  const prodBase = 'https://agromitra-ytqb.onrender.com/api';
  console.log('Testing Production API on Render:', prodBase);

  try {
    const health = await axios.get(`${prodBase}/health`, { timeout: 15000 });
    console.log('\n--- 1. PROD HEALTH CHECK ---');
    console.log(JSON.stringify(health.data, null, 2));
  } catch (e: any) {
    console.log('Health check failed:', e.message);
  }

  try {
    const hydCurrent = await axios.get(`${prodBase}/weather/current?lat=17.3850&lon=78.4867`, { timeout: 15000 });
    console.log('\n--- 2. PROD HYDERABAD CURRENT (lat=17.3850, lon=78.4867) ---');
    console.log('HTTP Status:', hydCurrent.status);
    console.log('Response:', JSON.stringify(hydCurrent.data, null, 2));
  } catch (e: any) {
    console.log('Prod Hyd current error:', e.response?.data || e.message);
  }

  try {
    const hydForecast = await axios.get(`${prodBase}/weather/forecast?lat=17.3850&lon=78.4867`, { timeout: 15000 });
    console.log('\n--- 3. PROD HYDERABAD FORECAST (lat=17.3850, lon=78.4867) ---');
    console.log('HTTP Status:', hydForecast.status);
    console.log('Response:', JSON.stringify(hydForecast.data, null, 2));
  } catch (e: any) {
    console.log('Prod Hyd forecast error:', e.response?.data || e.message);
  }

  try {
    const puneCurrent = await axios.get(`${prodBase}/weather/current?lat=18.5204&lon=73.8567`, { timeout: 15000 });
    console.log('\n--- 4. PROD PUNE CURRENT (lat=18.5204, lon=73.8567) ---');
    console.log('HTTP Status:', puneCurrent.status);
    console.log('Response:', JSON.stringify(puneCurrent.data, null, 2));
  } catch (e: any) {
    console.log('Prod Pune current error:', e.response?.data || e.message);
  }

  try {
    const puneForecast = await axios.get(`${prodBase}/weather/forecast?lat=18.5204&lon=73.8567`, { timeout: 15000 });
    console.log('\n--- 5. PROD PUNE FORECAST (lat=18.5204, lon=73.8567) ---');
    console.log('HTTP Status:', puneForecast.status);
    console.log('Response:', JSON.stringify(puneForecast.data, null, 2));
  } catch (e: any) {
    console.log('Prod Pune forecast error:', e.response?.data || e.message);
  }
}

testProd();
