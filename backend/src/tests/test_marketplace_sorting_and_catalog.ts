import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http';
import axios from 'axios';
import { connectDB, disconnectDB } from '../config/db';
import productRoutes from '../routes/product.routes';
import { Product } from '../models/Product.model';
import { User } from '../models/User.model';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/products', productRoutes);

const TEST_PORT = 5119;
const BASE_URL = `http://localhost:${TEST_PORT}/api/products`;

async function runTests() {
  console.log('🧪 Starting Marketplace Sorting & Real Catalog Verification Test Suite...\n');
  let passed = 0;
  let failed = 0;

  let server: http.Server | null = null;

  try {
    await connectDB();

    server = app.listen(TEST_PORT, () => {
      console.log(`Test Express server listening on port ${TEST_PORT}`);
    });

    const adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) {
      throw new Error('No ADMIN user found for testing.');
    }
    const adminToken = jwt.sign(
      { id: adminUser._id.toString(), role: adminUser.role, email: adminUser.email },
      process.env.JWT_SECRET || 'secret'
    );

    const authHeaders = {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    };

    // TEST 1: Total products count
    console.log('\n--- TEST 1: Total Catalog Products Count ---');
    const resAll = await axios.get(BASE_URL);
    if (resAll.status === 200 && resAll.data.success && resAll.data.count === 30) {
      console.log(`✅ Passed: Total 30 products found across catalog in MongoDB.`);
      passed++;
    } else {
      console.error(`❌ Failed: Expected 30 products, received status ${resAll.status} count ${resAll.data.count}`);
      failed++;
    }

    // TEST 2: Verify 10 distinct categories with 3 products each
    console.log('\n--- TEST 2: Category Breakdown (10 Categories x 3 Products) ---');
    const categories = [
      'Seeds',
      'Fertilizers',
      'Bio-Fertilizers',
      'Soil Conditioners',
      'Growth Promoters',
      'Pesticides',
      'Insecticides',
      'Fungicides',
      'Herbicides',
      'Bio Products',
    ];

    let allCategoriesOk = true;
    for (const cat of categories) {
      const resCat = await axios.get(`${BASE_URL}?category=${encodeURIComponent(cat)}`);
      if (resCat.status === 200 && resCat.data.success && resCat.data.count === 3) {
        console.log(`  • Category "${cat}": 3 products verified.`);
      } else {
        console.error(`  ❌ Category "${cat}": expected 3, got ${resCat.data?.count}`);
        allCategoriesOk = false;
      }
    }
    if (allCategoriesOk) {
      console.log('✅ Passed: All 10 categories contain exactly 3 products.');
      passed++;
    } else {
      console.error('❌ Failed: Category distribution mismatch.');
      failed++;
    }

    // TEST 3: Sorting - price_asc (Low to High)
    console.log('\n--- TEST 3: Sorting price_asc (Low to High) ---');
    const resPriceAsc = await axios.get(`${BASE_URL}?sort=price_asc`);
    const pricesAsc = resPriceAsc.data.products.map((p: any) => p.price);
    let isAsc = true;
    for (let i = 1; i < pricesAsc.length; i++) {
      if (pricesAsc[i] < pricesAsc[i - 1]) {
        isAsc = false;
        break;
      }
    }
    if (resPriceAsc.status === 200 && isAsc && pricesAsc.length === 30) {
      console.log(`✅ Passed: price_asc sorted correctly from ₹${pricesAsc[0]} to ₹${pricesAsc[pricesAsc.length - 1]}`);
      passed++;
    } else {
      console.error(`❌ Failed: price_asc not monotonically increasing:`, pricesAsc);
      failed++;
    }

    // TEST 4: Sorting - price_desc (High to Low)
    console.log('\n--- TEST 4: Sorting price_desc (High to Low) ---');
    const resPriceDesc = await axios.get(`${BASE_URL}?sort=price_desc`);
    const pricesDesc = resPriceDesc.data.products.map((p: any) => p.price);
    let isDesc = true;
    for (let i = 1; i < pricesDesc.length; i++) {
      if (pricesDesc[i] > pricesDesc[i - 1]) {
        isDesc = false;
        break;
      }
    }
    if (resPriceDesc.status === 200 && isDesc && pricesDesc.length === 30) {
      console.log(`✅ Passed: price_desc sorted correctly from ₹${pricesDesc[0]} to ₹${pricesDesc[pricesDesc.length - 1]}`);
      passed++;
    } else {
      console.error(`❌ Failed: price_desc not monotonically decreasing:`, pricesDesc);
      failed++;
    }

    // TEST 5: Sorting - newest (Created Date Descending)
    console.log('\n--- TEST 5: Sorting newest ---');
    const resNewest = await axios.get(`${BASE_URL}?sort=newest`);
    if (resNewest.status === 200 && resNewest.data.products.length === 30) {
      console.log(`✅ Passed: newest sorting returned all ${resNewest.data.products.length} products.`);
      passed++;
    } else {
      console.error(`❌ Failed: newest sorting unexpected output.`);
      failed++;
    }

    // TEST 6: Search Functionality
    console.log('\n--- TEST 6: Keyword Search ---');
    const resSearchKaveri = await axios.get(`${BASE_URL}?search=Kaveri`);
    const resSearchIFFCO = await axios.get(`${BASE_URL}?search=IFFCO`);
    const resSearchUPL = await axios.get(`${BASE_URL}?search=UPL`);

    if (
      resSearchKaveri.data.count === 3 &&
      resSearchIFFCO.data.count >= 10 &&
      resSearchUPL.data.count >= 9
    ) {
      console.log(`✅ Passed: Search filters verified (Kaveri: ${resSearchKaveri.data.count}, IFFCO: ${resSearchIFFCO.data.count}, UPL: ${resSearchUPL.data.count}).`);
      passed++;
    } else {
      console.error(`❌ Failed search results: Kaveri=${resSearchKaveri.data.count}, IFFCO=${resSearchIFFCO.data.count}, UPL=${resSearchUPL.data.count}`);
      failed++;
    }

    // TEST 7: Dynamic Admin Price Update & Real-Time Sort Reflection
    console.log('\n--- TEST 7: Dynamic Admin Price Modification & Real-Time Sort Reflection ---');
    const sampleProduct = await Product.findOne({ name: 'Kaveri ATM Cotton Hybrid Seed' });
    if (!sampleProduct) throw new Error('Target test product not found.');

    const originalPrice = sampleProduct.price;
    const testNewPrice = 99; // Set lower than the lowest product price (₹180)

    // Admin updates price to ₹99
    const updateRes = await axios.put(
      `${BASE_URL}/${sampleProduct._id}`,
      { price: testNewPrice },
      authHeaders
    );

    if (updateRes.status === 200 && updateRes.data.product.price === testNewPrice) {
      // Check marketplace price_asc sort - it should be the 1st product now
      const sortAscAfterUpdate = await axios.get(`${BASE_URL}?sort=price_asc`);
      const firstProduct = sortAscAfterUpdate.data.products[0];
      const firstProdId = (firstProduct.id || firstProduct._id)?.toString();

      if (firstProdId === sampleProduct._id.toString() && firstProduct.price === testNewPrice) {
        console.log(`✅ Passed: Dynamic price update to ₹${testNewPrice} immediately re-ranked product "${firstProduct.name}" to rank #1 in price_asc.`);
        passed++;
      } else {
        console.error(`❌ Failed: Product did not rank #1 after price drop. Top product was: ${firstProduct.name} (₹${firstProduct.price}) ID: ${firstProdId}`);
        failed++;
      }

      // Restore original price
      await axios.put(
        `${BASE_URL}/${sampleProduct._id}`,
        { price: originalPrice },
        authHeaders
      );
      console.log(`  • Restored original price of ₹${originalPrice} for "${sampleProduct.name}".`);
    } else {
      console.error(`❌ Failed: Admin price update request failed with status ${updateRes.status}`);
      failed++;
    }

    // TEST 8: Visibility & Active Toggle
    console.log('\n--- TEST 8: Product Availability / Active Toggle ---');
    // Disable product
    await axios.put(
      `${BASE_URL}/${sampleProduct._id}`,
      { isActive: false },
      authHeaders
    );

    const resDisabled = await axios.get(BASE_URL);
    const containsDisabled = resDisabled.data.products.some((p: any) => (p.id || p._id).toString() === sampleProduct._id.toString());

    // Re-enable product
    await axios.put(
      `${BASE_URL}/${sampleProduct._id}`,
      { isActive: true },
      authHeaders
    );

    const resReEnabled = await axios.get(BASE_URL);
    const containsReEnabled = resReEnabled.data.products.some((p: any) => (p.id || p._id).toString() === sampleProduct._id.toString());

    if (!containsDisabled && containsReEnabled && resDisabled.data.count === 29 && resReEnabled.data.count === 30) {
      console.log(`✅ Passed: Disabled product is hidden from marketplace (count: 29); re-enabled product returns to marketplace (count: 30).`);
      passed++;
    } else {
      console.error(`❌ Failed: Active toggle visibility test failed. Disabled contains: ${containsDisabled}, ReEnabled contains: ${containsReEnabled}`);
      failed++;
    }

    console.log(`\n========================================`);
    console.log(`🏁 TEST RESULTS: ${passed}/8 PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit(1);
  }
}

runTests();
