import axios from 'axios';
import jwt from 'jsonwebtoken';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('  AGRIMART GPS WEATHER, MANDI & SESSION LIFECYCLE');
  console.log('====================================================\n');

  // TEST 1: Current Weather with Nagpur, Maharashtra (District Compatibility)
  console.log('▶ [TEST 1]: Testing GET /api/weather/current?district=Nagpur&state=Maharashtra...');
  const weatherCurrent = await axios.get(`${BASE_URL}/weather/current?district=Nagpur&state=Maharashtra`);
  if (weatherCurrent.status !== 200 || !weatherCurrent.data.success) {
    throw new Error(`Test 1 Failed: ${JSON.stringify(weatherCurrent.data)}`);
  }
  console.log('  ✅ Current Weather PASSED:');
  console.log(`     - Location: ${weatherCurrent.data.location?.city}, ${weatherCurrent.data.location?.state}`);
  console.log(`     - Temperature: ${weatherCurrent.data.temperature}°C (Feels like: ${weatherCurrent.data.feelsLike}°C)`);
  console.log(`     - Humidity: ${weatherCurrent.data.humidity}% | Wind: ${weatherCurrent.data.windSpeed} km/h`);
  console.log(`     - Rain Probability: ${weatherCurrent.data.rainProbability}% | Condition: ${weatherCurrent.data.condition}`);

  // TEST 2: Weather Forecast with Nagpur, Maharashtra
  console.log('\n▶ [TEST 2]: Testing GET /api/weather/forecast?district=Nagpur&state=Maharashtra...');
  const weatherForecast = await axios.get(`${BASE_URL}/weather/forecast?district=Nagpur&state=Maharashtra`);
  if (weatherForecast.status !== 200 || !weatherForecast.data.success || !weatherForecast.data.forecast) {
    throw new Error(`Test 2 Failed: ${JSON.stringify(weatherForecast.data)}`);
  }
  console.log('  ✅ Weather Forecast PASSED:');
  console.log(`     - Forecast Days count: ${weatherForecast.data.forecast.length}`);
  weatherForecast.data.forecast.forEach((f: any) => {
    console.log(`       → ${f.day} (${f.date}): Max ${f.maxTemp}°C / Min ${f.minTemp}°C | Rain: ${f.rainProbability}% | ${f.condition}`);
  });

  // TEST 3: GPS Coordinate-based Weather for Hyderabad (GPS: 17.3850, 78.4867)
  console.log('\n▶ [TEST 3]: Testing GPS Coordinate Weather for Hyderabad (lat=17.3850, lon=78.4867)...');
  const hydWeather = await axios.get(`${BASE_URL}/weather/current?lat=17.3850&lon=78.4867`);
  if (hydWeather.status !== 200 || !hydWeather.data.success) {
    throw new Error(`Test 3 Failed: ${JSON.stringify(hydWeather.data)}`);
  }
  console.log('  ✅ Hyderabad GPS Weather PASSED:');
  console.log(`     - Location: ${hydWeather.data.location?.city}, ${hydWeather.data.location?.state}`);
  console.log(`     - Coordinates: [${hydWeather.data.location?.latitude}, ${hydWeather.data.location?.longitude}]`);
  console.log(`     - Temperature: ${hydWeather.data.temperature}°C | Rain Probability: ${hydWeather.data.rainProbability}%`);
  if (hydWeather.data.location?.city === 'Nagpur') {
    throw new Error('Coordinate weather incorrectly defaulted to Nagpur for Hyderabad GPS coordinates!');
  }

  // TEST 4: GPS Coordinate-based Weather for Pune (GPS: 18.5204, 73.8567)
  console.log('\n▶ [TEST 4]: Testing GPS Coordinate Weather for Pune (lat=18.5204&lng=73.8567)...');
  const puneWeather = await axios.get(`${BASE_URL}/weather/current?lat=18.5204&lng=73.8567`);
  if (puneWeather.status !== 200 || !puneWeather.data.success) {
    throw new Error(`Test 4 Failed: ${JSON.stringify(puneWeather.data)}`);
  }
  console.log('  ✅ Pune GPS Weather PASSED:');
  console.log(`     - Location: ${puneWeather.data.location?.city}, ${puneWeather.data.location?.state}`);
  console.log(`     - Temperature: ${puneWeather.data.temperature}°C`);
  if (puneWeather.data.location?.city === 'Nagpur') {
    throw new Error('Coordinate weather incorrectly defaulted to Nagpur for Pune GPS coordinates!');
  }

  // TEST 5: Coordinates Priority over District/State
  console.log('\n▶ [TEST 5]: Testing Coordinate Priority when both coordinates and district are provided...');
  const priorityWeather = await axios.get(
    `${BASE_URL}/weather/current?lat=17.3850&lon=78.4867&district=Nagpur&state=Maharashtra`
  );
  if (priorityWeather.status !== 200 || !priorityWeather.data.success) {
    throw new Error(`Priority weather test failed: ${JSON.stringify(priorityWeather.data)}`);
  }
  console.log(`  ✅ Priority test PASSED: Resolved to "${priorityWeather.data.location?.city}" with coords [${priorityWeather.data.location?.latitude}, ${priorityWeather.data.location?.longitude}]`);
  if (priorityWeather.data.location?.latitude !== 17.385) {
    throw new Error('Coordinates did not take priority over district parameter!');
  }

  // TEST 6: Real Market Prices from AGMARKNET / data.gov.in (/api/market-prices)
  console.log('\n▶ [TEST 6]: Testing GET /api/market-prices...');
  const marketPrices = await axios.get(`${BASE_URL}/market-prices?limit=5`);
  if (marketPrices.status !== 200 || !marketPrices.data.success || !marketPrices.data.records) {
    throw new Error(`Test 6 Failed: ${JSON.stringify(marketPrices.data)}`);
  }
  console.log('  ✅ Real Market Prices PASSED:');
  console.log(`     - Source: ${marketPrices.data.source}`);
  console.log(`     - Total Records: ${marketPrices.data.totalRecords}`);
  console.log(`     - Sample Commodity: ${marketPrices.data.records[0]?.commodity} (₹${marketPrices.data.records[0]?.modalPrice}/Quintal at ${marketPrices.data.records[0]?.market}, ${marketPrices.data.records[0]?.state})`);

  // TEST 7: JWT Session Expiration Claim Verification (7-Day Validity)
  console.log('\n▶ [TEST 7]: Verifying JWT Token Lifetime (7 days exp claim)...');
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'nandeeswarreddy2852@gmail.com',
    password: 'Password123',
  });
  if (loginRes.status !== 200 || !loginRes.data.token) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
  }
  const token = loginRes.data.token;
  const decoded: any = jwt.decode(token);
  const tokenDurationSec = decoded.exp - decoded.iat;
  const tokenDurationDays = tokenDurationSec / (24 * 3600);
  console.log('  ✅ Token decoded successfully:');
  console.log(`     - Issued at: ${new Date(decoded.iat * 1000).toISOString()}`);
  console.log(`     - Expires at: ${new Date(decoded.exp * 1000).toISOString()}`);
  console.log(`     - Duration: ${tokenDurationDays} days (${tokenDurationSec} seconds)`);
  if (tokenDurationDays < 6.9 || tokenDurationDays > 7.1) {
    throw new Error(`Invalid token expiration! Expected 7 days, got ${tokenDurationDays} days`);
  }

  // TEST 8: /api/auth/me Profile Retrieval with Bearer Token
  console.log('\n▶ [TEST 8]: Verifying GET /api/auth/me with Bearer token...');
  const meRes = await axios.get(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (meRes.status !== 200 || !meRes.data.user) {
    throw new Error(`GET /auth/me failed: ${JSON.stringify(meRes.data)}`);
  }
  console.log(`  ✅ /api/auth/me PASSED: Authenticated user is "${meRes.data.user.name}" (${meRes.data.user.role})`);

  console.log('\n====================================================');
  console.log('  🎉 ALL WEATHER, MARKET PRICE & AUTH TESTS PASSED!');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution error:', err.response?.data || err.message);
  process.exit(1);
});
