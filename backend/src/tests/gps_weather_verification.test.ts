import axios from 'axios';

async function testWeather() {
  const BASE_URL = 'http://localhost:5000/api';

  console.log('=== TEST 1: Hyderabad Coordinates (lat=17.3850, lon=78.4867) ===');
  const hydCurrent = await axios.get(`${BASE_URL}/weather/current?lat=17.3850&lon=78.4867`);
  console.log('Hyderabad Current Status:', hydCurrent.status);
  console.log('Hyderabad Location:', JSON.stringify(hydCurrent.data.location));
  console.log(
    `Hyderabad Temp: ${hydCurrent.data.temperature}°C, Rain Chance: ${hydCurrent.data.rainProbability}%, Condition: ${hydCurrent.data.condition}`
  );
  console.log('Hyderabad Cached:', hydCurrent.data.weather?.cached);

  const hydForecast = await axios.get(`${BASE_URL}/weather/forecast?lat=17.3850&lon=78.4867`);
  console.log('Hyderabad Forecast Days Count:', hydForecast.data.forecast?.length);
  console.log('Hyderabad Day 1:', JSON.stringify(hydForecast.data.forecast?.[0]));

  console.log('\n=== TEST 2: Pune Coordinates (lat=18.5204, lon=73.8567) ===');
  const puneCurrent = await axios.get(`${BASE_URL}/weather/current?lat=18.5204&lon=73.8567`);
  console.log('Pune Current Status:', puneCurrent.status);
  console.log('Pune Location:', JSON.stringify(puneCurrent.data.location));
  console.log(
    `Pune Temp: ${puneCurrent.data.temperature}°C, Rain Chance: ${puneCurrent.data.rainProbability}%, Condition: ${puneCurrent.data.condition}`
  );
  console.log('Pune Cached:', puneCurrent.data.weather?.cached);

  const puneForecast = await axios.get(`${BASE_URL}/weather/forecast?lat=18.5204&lon=73.8567`);
  console.log('Pune Forecast Days Count:', puneForecast.data.forecast?.length);
  console.log('Pune Day 1:', JSON.stringify(puneForecast.data.forecast?.[0]));

  console.log('\n=== TEST 3: Coordinate Isolation & Distinct Caching ===');
  const isCityDistinct = hydCurrent.data.location.city !== puneCurrent.data.location.city;
  const isCoordDistinct = hydCurrent.data.location.latitude !== puneCurrent.data.location.latitude;
  console.log('Hyderabad != Pune City:', isCityDistinct, `("${hydCurrent.data.location.city}" vs "${puneCurrent.data.location.city}")`);
  console.log('Hyderabad != Pune Coords:', isCoordDistinct);

  if (!isCityDistinct || !isCoordDistinct) {
    throw new Error('Coordinate isolation failed! Both returned the same location.');
  }

  console.log('\n====================================================');
  console.log('  🎉 GPS WEATHER & FORECAST VERIFICATION PASSED!     ');
  console.log('====================================================\n');
}

testWeather().catch((err) => {
  console.error('Weather Test Failed:', err.response?.data || err.message);
  process.exit(1);
});
