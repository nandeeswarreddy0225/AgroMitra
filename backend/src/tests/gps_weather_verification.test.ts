import axios from 'axios';
import app from '../app';
import { Server } from 'http';

async function testWeather() {
  const PORT = 5099;
  const server: Server = app.listen(PORT);
  const BASE_URL = `http://localhost:${PORT}/api`;

  try {

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
  const isCoordDistinct =
    hydCurrent.data.location.latitude !== puneCurrent.data.location.latitude;

  console.log(
    'Hyderabad != Pune City:',
    isCityDistinct,
    `("${hydCurrent.data.location.city}" vs "${puneCurrent.data.location.city}")`
  );
  console.log('Hyderabad != Pune Coords:', isCoordDistinct);

  if (!isCityDistinct || !isCoordDistinct) {
    throw new Error('Coordinate isolation failed! Both returned the same location.');
  }

  console.log(
    '\n=== TEST 4: GPS Overrides Extraneous Query City (lat/lon = Bengaluru, query city = Nagpur) ==='
  );

  const bngOverridden = await axios.get(
    `${BASE_URL}/weather/current?lat=12.9716&lon=77.5946&city=Nagpur`
  );

  console.log(
    'Resolved Location:',
    JSON.stringify(bngOverridden.data.location)
  );

  if (bngOverridden.data.location.city.toLowerCase() === 'nagpur') {
    throw new Error(
      'FAILURE: GPS coordinates were overridden by query city parameter!'
    );
  }

  console.log(
    'Passed: Resolved to genuine GPS location:',
    bngOverridden.data.location.city
  );

  console.log(
    '\n=== TEST 5: Andhra Pradesh GPS Coordinates (lat=15.8281, lon=78.0373 -> Kurnool) ==='
  );

  const knlCurrent = await axios.get(
    `${BASE_URL}/weather/current?lat=15.8281&lon=78.0373`
  );

  console.log(
    'Kurnool Location:',
    JSON.stringify(knlCurrent.data.location)
  );

  console.log(
    `Kurnool Temp: ${knlCurrent.data.temperature}°C, Rain: ${knlCurrent.data.rainProbability}%`
  );

  if (!knlCurrent.data.location.city.toLowerCase().includes('kurnool')) {
    throw new Error(
      'FAILURE: Expected Kurnool for coordinates 15.8281, 78.0373'
    );
  }

  console.log(
    '\n=== TEST 6: User Production Coordinates (lat=13.284643749274364, lon=77.59594301752281) ==='
  );

  const prodCurrent = await axios.get(
    `${BASE_URL}/weather?lat=13.284643749274364&lon=77.59594301752281`
  );

  console.log('Production Coords Resolved Location:', JSON.stringify(prodCurrent.data.location));
  console.log(`Production Coords Temp: ${prodCurrent.data.temperature}°C, Condition: ${prodCurrent.data.condition}`);

  if (prodCurrent.data.location.city.toLowerCase() === 'nagpur') {
    throw new Error(
      'FAILURE: User coordinates (13.28, 77.59) were incorrectly forced to Nagpur!'
    );
  }

  console.log(
    'Passed: Resolved to genuine GPS location (NOT Nagpur):',
    prodCurrent.data.location.city,
    prodCurrent.data.location.state
  );

  console.log('\n====================================================');
  console.log('  🎉 GPS WEATHER & FORECAST VERIFICATION PASSED!     ');
  console.log('====================================================\n');
  } finally {
    server.close();
  }
}

testWeather().catch((err) => {
  console.error(
    'Weather Test Failed:',
    err.response?.data || err.message
  );
  process.exit(1);
});
