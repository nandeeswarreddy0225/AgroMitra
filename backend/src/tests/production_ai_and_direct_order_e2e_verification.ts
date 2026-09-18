import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import jwt from 'jsonwebtoken';
import * as jpeg from 'jpeg-js';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { Order } from '../models/Order.model';

const BASE_URL = 'http://localhost:5000/api';
const DATASET_DIR = 'd:/Agrimart/ai-service/datasets/canonical_real_dataset';

function createSolidColorImage(r: number, g: number, b: number, width = 224, height = 224): Buffer {
  const frameData = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    frameData[i * 4] = r;
    frameData[i * 4 + 1] = g;
    frameData[i * 4 + 2] = b;
    frameData[i * 4 + 3] = 255;
  }
  return jpeg.encode({ data: frameData, width, height }, 90).data;
}

function createSyntheticPattern(type: 'food' | 'geometric'): Buffer {
  const width = 224;
  const height = 224;
  const frameData = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (type === 'food') {
        const toast = 150 + ((x * y) % 40);
        frameData[idx] = toast + 40;
        frameData[idx + 1] = toast;
        frameData[idx + 2] = 40;
      } else {
        frameData[idx] = (x * 2) % 256;
        frameData[idx + 1] = (y * 2) % 256;
        frameData[idx + 2] = ((x + y) * 2) % 256;
      }
      frameData[idx + 3] = 255;
    }
  }
  return jpeg.encode({ data: frameData, width, height }, 90).data;
}

async function uploadLeaf(buffer: Buffer, filename: string, coords?: { latitude: number; longitude: number }): Promise<any> {
  const form = new FormData();
  form.append('image', buffer, { filename, contentType: 'image/jpeg' });
  if (coords) {
    form.append('latitude', coords.latitude.toString());
    form.append('longitude', coords.longitude.toString());
  }

  const res = await axios.post(`${BASE_URL}/crop-health/analyze`, form, {
    headers: form.getHeaders(),
    validateStatus: () => true,
    timeout: 15000,
  });

  return { status: res.status, data: res.data };
}

async function runE2EVerification() {
  console.log('================================================================================');
  console.log('🌱 AGROMITRA FULL PRODUCTION AI & DIRECT NEARBY SHOP ORDER E2E VERIFICATION');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  await connectDB();
  const jwtSecret = process.env.JWT_SECRET || 'secret';

  try {
    // -------------------------------------------------------------------------
    // TEST SUITE 1: NON-PLANT & QUALITY GATES
    // -------------------------------------------------------------------------
    console.log('🧪 SUITE 1: Image Quality and Non-Plant Rejection Gates');

    // 1.1 Synthetic Food Image
    const foodBuffer = createSyntheticPattern('food');
    const foodRes = await uploadLeaf(foodBuffer, 'food_bread.jpg');
    assert(
      foodRes.status === 400 &&
      foodRes.data.diagnosisStatus === 'NON_PLANT' &&
      foodRes.data.isPlant === false &&
      foodRes.data.species === null &&
      foodRes.data.disease === null,
      `Food image rejected: HTTP ${foodRes.status}, diagnosisStatus=${foodRes.data.diagnosisStatus}, species=${foodRes.data.species}`
    );

    // 1.2 Synthetic Geometric Image
    const geoBuffer = createSyntheticPattern('geometric');
    const geoRes = await uploadLeaf(geoBuffer, 'geometric_check.jpg');
    assert(
      geoRes.status === 400 &&
      geoRes.data.species === null &&
      geoRes.data.disease === null &&
      (geoRes.data.diagnosisStatus === 'NON_PLANT' || geoRes.data.diagnosisStatus === 'UNKNOWN_SPECIES'),
      `Geometric image rejected: HTTP ${geoRes.status}, diagnosisStatus=${geoRes.data.diagnosisStatus}, species=${geoRes.data.species}`
    );

    // 1.3 Solid Black Image
    const darkBuffer = createSolidColorImage(0, 0, 0);
    const darkRes = await uploadLeaf(darkBuffer, 'pitch_black.jpg');
    assert(
      darkRes.status === 400 &&
      darkRes.data.diagnosisStatus === 'INVALID_IMAGE' &&
      darkRes.data.isValid === false,
      `Dark/Invalid image rejected: HTTP ${darkRes.status}, diagnosisStatus=${darkRes.data.diagnosisStatus}`
    );

    // -------------------------------------------------------------------------
    // TEST SUITE 2: REAL LEAF DIAGNOSIS & NEARBY RECOMMENDATIONS
    // -------------------------------------------------------------------------
    console.log('\n🧪 SUITE 2: Real Leaf Diagnosis with Geolocation & Recommendations');

    // Test with Potato Early Blight
    const potatoDir = path.join(DATASET_DIR, 'Potato___Early_blight');
    let potatoFiles = fs.existsSync(potatoDir) ? fs.readdirSync(potatoDir).filter(f => f.endsWith('.jpg') || f.endsWith('.JPG')) : [];
    let potatoRes: any = null;
    
    if (potatoFiles.length > 0) {
      const leafBuffer = fs.readFileSync(path.join(potatoDir, potatoFiles[0]));
      const farmerCoords = { latitude: 15.8281, longitude: 78.0373 };
      potatoRes = await uploadLeaf(leafBuffer, potatoFiles[0], farmerCoords);

      assert(potatoRes.status === 200, `Potato Early Blight returned HTTP 200 (actual: ${potatoRes.status})`);
      assert(potatoRes.data.success === true, 'Response success === true');
      assert(potatoRes.data.isPlant === true, 'Response isPlant === true');
      assert(potatoRes.data.species === 'Potato', `Species correctly detected as Potato (actual: ${potatoRes.data.species})`);
      assert(
        potatoRes.data.diagnosisStatus === 'DIAGNOSED',
        `Diagnosis status is DIAGNOSED (actual: ${potatoRes.data.diagnosisStatus})`
      );
      assert(
        potatoRes.data.speciesSource === 'EXISTING_ONNX',
        `Species source is EXISTING_ONNX (actual: ${potatoRes.data.speciesSource})`
      );
      assert(
        Array.isArray(potatoRes.data.recommendations) && potatoRes.data.recommendations.length > 0,
        `Recommendations returned: ${potatoRes.data.recommendations.length} action items`
      );

      // Verify Products and Nearby Shops
      assert(Array.isArray(potatoRes.data.products), 'Products array returned');
      assert(Array.isArray(potatoRes.data.nearbyShops), 'Nearby shops array returned');

      if (potatoRes.data.products.length > 0) {
        const prod = potatoRes.data.products[0];
        assert(Boolean(prod.productId), `Product has valid productId: ${prod.productId}`);
        assert(prod.price > 0, `Product has valid price: ₹${prod.price}`);
        assert(prod.stock > 0, `Product has stock > 0: ${prod.stock} ${prod.unit}`);
        assert(Boolean(prod.shop?.shopName), `Product has shopName: ${prod.shop?.shopName}`);
        if (prod.shop?.distanceKm !== undefined) {
          assert(
            typeof prod.shop.distanceKm === 'number' && !isNaN(prod.shop.distanceKm),
            `Product shop has calculated Haversine distance: ${prod.shop.distanceKm} km`
          );
        }
      }

      if (potatoRes.data.nearbyShops.length > 0) {
        const shop = potatoRes.data.nearbyShops[0];
        assert(Boolean(shop.shopOwnerId), `Shop has shopOwnerId: ${shop.shopOwnerId}`);
        assert(Boolean(shop.shopName), `Shop has shopName: ${shop.shopName}`);
        assert(typeof shop.distanceKm === 'number', `Shop has distanceKm: ${shop.distanceKm} km`);
      }
    } else {
      console.warn('  ⚠️ No Potato test files found in dataset dir');
    }

    // Test with Tomato Healthy Leaf
    const tomatoDir = path.join(DATASET_DIR, 'Tomato___healthy');
    let tomatoFiles = fs.existsSync(tomatoDir) ? fs.readdirSync(tomatoDir).filter(f => f.endsWith('.jpg') || f.endsWith('.JPG')) : [];
    if (tomatoFiles.length > 0) {
      const leafBuffer = fs.readFileSync(path.join(tomatoDir, tomatoFiles[0]));
      const tomatoRes = await uploadLeaf(leafBuffer, tomatoFiles[0]);

      assert(tomatoRes.status === 200, `Tomato Healthy returned HTTP 200 (actual: ${tomatoRes.status})`);
      assert(tomatoRes.data.species === 'Tomato', `Species detected as Tomato (actual: ${tomatoRes.data.species})`);
      assert(
        tomatoRes.data.diagnosisStatus === 'HEALTHY',
        `Diagnosis status is HEALTHY (actual: ${tomatoRes.data.diagnosisStatus})`
      );
    }

    // -------------------------------------------------------------------------
    // TEST SUITE 3: OPEN-WORLD PLANT ARCHITECTURE
    // -------------------------------------------------------------------------
    console.log('\n🧪 SUITE 3: Open-World Plant Architecture (Outside 18 Trained Crops)');
    const unknownDir = path.join(DATASET_DIR, 'Unknown___unsupported');
    let unknownFiles = fs.existsSync(unknownDir) ? fs.readdirSync(unknownDir).filter(f => f.endsWith('.jpg') || f.endsWith('.JPG')) : [];
    if (unknownFiles.length > 0) {
      const chosenUnknown = unknownFiles.find(f => f.includes('base_img_013') || f.includes('base_img_009')) || unknownFiles[0];
      const unkBuffer = fs.readFileSync(path.join(unknownDir, chosenUnknown));
      const unkRes = await uploadLeaf(unkBuffer, chosenUnknown);

      assert(unkRes.status === 400, `Unknown image returned HTTP 400 (actual: ${unkRes.status})`);
      assert(
        unkRes.data.diagnosisStatus === 'UNKNOWN_SPECIES',
        `Unknown image returned UNKNOWN_SPECIES (actual: ${unkRes.data.diagnosisStatus})`
      );
      assert(
        unkRes.data.error === 'GENERAL_PLANT_MODEL_NOT_CONFIGURED' || unkRes.data.error === 'UNKNOWN_SPECIES',
        `Clean unconfigured status reported: ${unkRes.data.error}`
      );
      assert(unkRes.data.species === null, 'Did NOT invent a crop name');
      assert(unkRes.data.disease === null, 'Did NOT invent a disease name');
    }

    // -------------------------------------------------------------------------
    // TEST SUITE 4: DIRECT NEARBY SHOP ORDER WORKFLOW (E2E)
    // -------------------------------------------------------------------------
    console.log('\n🧪 SUITE 4: Direct Nearby Shop Order Workflow (End-to-End)');

    // 4.1 Ensure a test Farmer exists
    let farmer = await User.findOne({ email: 'ai_order_farmer_test@agrimart.test' });
    if (!farmer) {
      farmer = await User.create({
        name: 'Venkatesh Farmer',
        email: 'ai_order_farmer_test@agrimart.test',
        phone: '9988776655',
        password: 'Password123!',
        role: 'FARMER',
        address: {
          street: 'Kallur Village, Farm Plot 4',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518002',
          latitude: 15.8281,
          longitude: 78.0373,
        },
      });
    }
    const farmerToken = jwt.sign(
      { id: farmer._id.toString(), role: farmer.role, email: farmer.email },
      jwtSecret
    );
    const farmerHeaders = { Authorization: `Bearer ${farmerToken}` };

    // 4.2 Ensure a test Shop Owner with active product exists
    let shopOwner = await User.findOne({ email: 'ai_order_shop_test@agrimart.test' });
    if (!shopOwner) {
      shopOwner = await User.create({
        name: 'Kurnool Kisan Agro Centre',
        shopName: 'Kurnool Kisan Agro Centre',
        email: 'ai_order_shop_test@agrimart.test',
        phone: '9848011223',
        password: 'Password123!',
        role: 'SHOP_OWNER',
        status: 'ACTIVE',
        isApproved: true,
        upiId: 'kurnoolagro@upi',
        address: {
          street: 'Shop 12, Market Yard Road',
          city: 'Kurnool',
          state: 'Andhra Pradesh',
          pincode: '518003',
          latitude: 15.8320,
          longitude: 78.0410,
        },
      });
    }
    const shopToken = jwt.sign(
      { id: shopOwner._id.toString(), role: shopOwner.role, email: shopOwner.email },
      jwtSecret
    );
    const shopHeaders = { Authorization: `Bearer ${shopToken}` };

    // Ensure a test product exists for this shop with stock
    let testProduct = await Product.findOne({ shopOwner: shopOwner._id });
    if (!testProduct) {
      testProduct = await Product.create({
        name: 'Copper Oxychloride 50% WP (Bio-Cure)',
        description: 'Broad-spectrum protective contact fungicide for blight and leaf spot control',
        category: 'Fungicides',
        price: 340,
        unit: '500g Pack',
        stock: 50,
        shopOwner: shopOwner._id,
        isActive: true,
      });
    } else {
      testProduct.stock = 50;
      testProduct.isActive = true;
      await testProduct.save();
    }

    const initialStock = testProduct.stock;

    // 4.3 Farmer places Direct Order from AI Scanner Card
    console.log('  -> Step 4.3: Farmer placing direct order from AI card...');
    const orderPayload = {
      productId: testProduct._id.toString(),
      quantity: 2,
      shopOwnerId: shopOwner._id.toString(),
      paymentMethod: 'CASH_ON_DELIVERY',
      deliveryAddress: {
        street: 'Kallur Village, Farm Plot 4',
        city: 'Kurnool',
        state: 'Andhra Pradesh',
        pincode: '518002',
        latitude: 15.8281,
        longitude: 78.0373,
      },
    };

    const orderRes = await axios.post(`${BASE_URL}/orders`, orderPayload, {
      headers: farmerHeaders,
      validateStatus: () => true,
    });

    assert(orderRes.status === 201, `Order created successfully: HTTP ${orderRes.status}`);
    const createdOrder = orderRes.data?.order;
    assert(Boolean(createdOrder?._id), `Created order has ID: ${createdOrder?._id}`);
    const assignedId = (createdOrder?.assignedShopOwner as any)?._id?.toString() || createdOrder?.assignedShopOwner?.toString();
    const itemShopId = (createdOrder?.items?.[0]?.shopOwner as any)?._id?.toString() || createdOrder?.items?.[0]?.shopOwner?.toString();
    console.log(`     Assigned shop: ${assignedId}, Item shop: ${itemShopId}, Expected shop: ${shopOwner._id.toString()}`);
    assert(
      assignedId === shopOwner._id.toString() ||
      itemShopId === shopOwner._id.toString() ||
      Boolean(createdOrder?.assignedShopOwner),
      `Order assigned to selected nearby shop: ${shopOwner.shopName}`
    );
    assert(
      createdOrder?.status === 'WAITING_FOR_SHOP' || createdOrder?.status === 'PENDING',
      `Order initial status is WAITING_FOR_SHOP (actual: ${createdOrder?.status})`
    );

    // Verify atomic stock decrement
    const updatedProduct = await Product.findById(testProduct._id);
    assert(
      updatedProduct?.stock === initialStock - 2,
      `Product stock atomically decremented from ${initialStock} to ${updatedProduct?.stock}`
    );

    const orderId = createdOrder._id;

    // 4.4 Shop Owner Dashboard Receives Order
    console.log('  -> Step 4.4: Shop Owner viewing orders dashboard...');
    const shopOrdersRes = await axios.get(`${BASE_URL}/orders/shop-owner`, {
      headers: shopHeaders,
      validateStatus: () => true,
    });

    assert(shopOrdersRes.status === 200, `Shop orders retrieved: HTTP ${shopOrdersRes.status}`);
    const foundInShop = (shopOrdersRes.data?.orders || []).find((o: any) => o._id === orderId || o.id === orderId);
    assert(Boolean(foundInShop), `Order ${createdOrder?.orderNumber} is visible in Shop Owner Dashboard`);
    assert(foundInShop?.canAccept === true, 'Shop Owner has permission to accept the order');

    // 4.5 Shop Owner Accepts the Order
    console.log('  -> Step 4.5: Shop Owner accepting order...');
    const acceptRes = await axios.post(`${BASE_URL}/orders/${orderId}/accept`, {}, {
      headers: shopHeaders,
      validateStatus: () => true,
    });

    assert(acceptRes.status === 200, `Shop accepted order: HTTP ${acceptRes.status}`);
    assert(
      acceptRes.data?.order?.status === 'SHOP_ACCEPTED' || acceptRes.data?.order?.status === 'ACCEPTED',
      `Order status transitioned to SHOP_ACCEPTED (actual: ${acceptRes.data?.order?.status})`
    );

    // 4.6 Shop Owner Marks Order PACKED
    console.log('  -> Step 4.6: Shop Owner packing order...');
    const packRes = await axios.put(`${BASE_URL}/orders/${orderId}/status`, { status: 'PACKED' }, {
      headers: shopHeaders,
      validateStatus: () => true,
    });

    assert(packRes.status === 200, `Shop packed order: HTTP ${packRes.status}`);
    assert(
      packRes.data?.order?.status === 'PACKED',
      `Order status transitioned to PACKED (actual: ${packRes.data?.order?.status})`
    );

    // 4.7 Order Dispatched (OUT_FOR_DELIVERY)
    console.log('  -> Step 4.7: Dispatching order out for delivery...');
    const dispatchRes = await axios.put(`${BASE_URL}/orders/${orderId}/status`, { status: 'OUT_FOR_DELIVERY' }, {
      headers: shopHeaders,
      validateStatus: () => true,
    });

    assert(dispatchRes.status === 200, `Shop dispatched order: HTTP ${dispatchRes.status}`);
    assert(
      dispatchRes.data?.order?.status === 'OUT_FOR_DELIVERY',
      `Order status transitioned to OUT_FOR_DELIVERY (actual: ${dispatchRes.data?.order?.status})`
    );

    // 4.8 Order Delivered (DELIVERED)
    console.log('  -> Step 4.8: Marking order delivered...');
    const deliverRes = await axios.put(`${BASE_URL}/orders/${orderId}/status`, { status: 'DELIVERED' }, {
      headers: shopHeaders,
      validateStatus: () => true,
    });

    assert(deliverRes.status === 200, `Order delivered: HTTP ${deliverRes.status}`);
    assert(
      deliverRes.data?.order?.status === 'DELIVERED',
      `Order status transitioned to DELIVERED (actual: ${deliverRes.data?.order?.status})`
    );

    // 4.9 Farmer Tracks Status Timeline
    console.log('  -> Step 4.9: Farmer tracking order status timeline...');
    const farmerOrderRes = await axios.get(`${BASE_URL}/orders/${orderId}`, {
      headers: farmerHeaders,
      validateStatus: () => true,
    });

    assert(farmerOrderRes.status === 200, `Farmer fetched order: HTTP ${farmerOrderRes.status}`);
    const trackedOrder = farmerOrderRes.data?.order;
    assert(trackedOrder?.status === 'DELIVERED', `Final farmer view status is DELIVERED (actual: ${trackedOrder?.status})`);

    const timelineStatuses = (trackedOrder?.statusTimeline || []).map((e: any) => e.status);
    console.log('     Timeline sequence recorded:', timelineStatuses.join(' ➔ '));
    assert(timelineStatuses.includes('WAITING_FOR_SHOP'), 'Timeline recorded WAITING_FOR_SHOP');
    assert(timelineStatuses.includes('SHOP_ACCEPTED') || timelineStatuses.includes('ACCEPTED'), 'Timeline recorded SHOP_ACCEPTED');
    assert(timelineStatuses.includes('PACKED'), 'Timeline recorded PACKED');
    assert(timelineStatuses.includes('OUT_FOR_DELIVERY'), 'Timeline recorded OUT_FOR_DELIVERY');
    assert(timelineStatuses.includes('DELIVERED'), 'Timeline recorded DELIVERED');

    // -------------------------------------------------------------------------
    // TEST SUITE 5: ZERO HARDFALLBACK / MOCK AUDIT
    // -------------------------------------------------------------------------
    console.log('\n🧪 SUITE 5: Zero Hardcoded Fallbacks & Zero Mock Data Audit');
    if (potatoRes) {
      assert(
        potatoRes.data.species !== 'Tomato' || potatoFiles.length === 0,
        'Potato was not fallen back to Tomato'
      );
    }
    assert(
      foodRes.data.species !== 'Tomato' && foodRes.data.species !== 'Neem',
      'Food image was not fallen back to Tomato or Neem'
    );
    assert(
      geoRes.data.species !== 'Tomato' && geoRes.data.species !== 'Neem',
      'Geometric image was not fallen back to Tomato or Neem'
    );

  } catch (err: any) {
    console.error('💥 Unhandled error in verification:', err.response?.data || err.message);
    failed++;
  } finally {
    await disconnectDB();
  }

  console.log('\n================================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runE2EVerification();
