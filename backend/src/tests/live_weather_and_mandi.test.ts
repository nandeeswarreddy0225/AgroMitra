import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('  AGRIMART — LIVE WEATHER & REAL MARKET PRICES TESTS');
  console.log('====================================================\n');

  // TEST 1: Current Weather with Nagpur, Maharashtra
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

  // TEST 3: Default Weather Route (/api/weather)
  console.log('\n▶ [TEST 3]: Testing GET /api/weather?city=Nagpur&state=Maharashtra...');
  const weatherRoot = await axios.get(`${BASE_URL}/weather?city=Nagpur&state=Maharashtra`);
  if (weatherRoot.status !== 200 || !weatherRoot.data.weather) {
    throw new Error(`Test 3 Failed: ${JSON.stringify(weatherRoot.data)}`);
  }
  console.log(`  ✅ Root /api/weather PASSED: Temperature ${weatherRoot.data.weather.temperature}°C`);

  // TEST 4: Real Market Prices from AGMARKNET / data.gov.in (/api/market-prices)
  console.log('\n▶ [TEST 4]: Testing GET /api/market-prices...');
  const marketPrices = await axios.get(`${BASE_URL}/market-prices?limit=5`);
  if (marketPrices.status !== 200 || !marketPrices.data.success || !marketPrices.data.records) {
    throw new Error(`Test 4 Failed: ${JSON.stringify(marketPrices.data)}`);
  }
  console.log('  ✅ Real Market Prices PASSED:');
  console.log(`     - Source: ${marketPrices.data.source}`);
  console.log(`     - Total Records: ${marketPrices.data.totalRecords}`);
  console.log(`     - Sample Commodity: ${marketPrices.data.records[0]?.commodity} (₹${marketPrices.data.records[0]?.modalPrice}/Quintal at ${marketPrices.data.records[0]?.market}, ${marketPrices.data.records[0]?.state})`);

  // TEST 5: Location-Aware Market Prices for Maharashtra
  console.log('\n▶ [TEST 5]: Testing GET /api/market-prices?state=Maharashtra...');
  const mahaPrices = await axios.get(`${BASE_URL}/market-prices?state=Maharashtra&limit=5`);
  if (mahaPrices.status !== 200 || !mahaPrices.data.records) {
    throw new Error(`Test 5 Failed: ${JSON.stringify(mahaPrices.data)}`);
  }
  console.log(`  ✅ Maharashtra Market Prices PASSED (${mahaPrices.data.records.length} records retrieved):`);
  mahaPrices.data.records.forEach((r: any) => {
    console.log(`     - ${r.commodity} (${r.variety || 'Standard'}): Modal ₹${r.modalPrice}/Q at ${r.market}, ${r.district} [Date: ${r.priceDate}]`);
  });

  console.log('\n====================================================');
  console.log('  🎉 ALL WEATHER & MARKET PRICE VERIFICATIONS PASSED!');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution error:', err.response?.data || err.message);
  process.exit(1);
});
