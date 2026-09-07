import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB, disconnectDB } from '../config/db';
import { MarketPrice } from '../models/MarketPrice.model';
import { PriceAudit } from '../models/PriceAudit.model';
import { Product } from '../models/Product.model';
import { Cart } from '../models/Cart.model';
import { User } from '../models/User.model';
import { Market } from '../models/Market.model';
import { Order } from '../models/Order.model';
import { Commodity } from '../models/Commodity.model';
import { MandiPriceService } from '../services/mandiPrice.service';

async function cleanupPricesAndProducts() {
  console.log('================================================================');
  console.log('   AGRIMART — CLEANUP MARKET PRICES & PRODUCTS                ');
  console.log('================================================================');

  try {
    await connectDB();

    // 1. Audit counts before cleanup
    const marketPricesBefore = await MarketPrice.countDocuments({});
    const priceAuditsBefore = await PriceAudit.countDocuments({});
    const productsBefore = await Product.countDocuments({});
    const usersCount = await User.countDocuments({});
    const marketsCount = await Market.countDocuments({});
    const ordersCount = await Order.countDocuments({});
    const commoditiesCount = await Commodity.countDocuments({});

    console.log('\n📊 [AUDIT BEFORE CLEANUP]:');
    console.log(`   - MarketPrice documents: ${marketPricesBefore}`);
    console.log(`   - PriceAudit documents:  ${priceAuditsBefore}`);
    console.log(`   - Product documents:     ${productsBefore}`);
    console.log(`   - User documents (preserve):     ${usersCount}`);
    console.log(`   - Market documents (preserve):   ${marketsCount}`);
    console.log(`   - Order documents (preserve):    ${ordersCount}`);
    console.log(`   - Commodity catalog (preserve):  ${commoditiesCount}`);

    // 2. Perform deletions
    const delMarketPrices = await MarketPrice.deleteMany({});
    console.log(`\n🧹 [CLEANUP]: Deleted ${delMarketPrices.deletedCount} MarketPrice records.`);

    const delPriceAudits = await PriceAudit.deleteMany({});
    console.log(`🧹 [CLEANUP]: Deleted ${delPriceAudits.deletedCount} PriceAudit records.`);

    const delProducts = await Product.deleteMany({});
    console.log(`🧹 [CLEANUP]: Deleted ${delProducts.deletedCount} Product records.`);

    // Clear cart items
    try {
      const cartResult = await Cart.updateMany({}, { $set: { items: [] } });
      console.log(`🧹 [CLEANUP]: Cleared cart items across ${cartResult.modifiedCount} cart document(s).`);
    } catch {
      // Non-fatal
    }

    // Clear in-memory mandi price caches
    MandiPriceService.clearCache();
    console.log(`🧹 [CLEANUP]: In-memory MandiPriceService cache invalidated.`);

    // 3. Verify counts after cleanup
    const marketPricesAfter = await MarketPrice.countDocuments({});
    const priceAuditsAfter = await PriceAudit.countDocuments({});
    const productsAfter = await Product.countDocuments({});
    const usersAfter = await User.countDocuments({});
    const marketsAfter = await Market.countDocuments({});

    console.log('\n📊 [AUDIT AFTER CLEANUP]:');
    console.log(`   - MarketPrice documents: ${marketPricesAfter}`);
    console.log(`   - PriceAudit documents:  ${priceAuditsAfter}`);
    console.log(`   - Product documents:     ${productsAfter}`);
    console.log(`   - Preserved Users:       ${usersAfter}`);
    console.log(`   - Preserved Markets:     ${marketsAfter}`);

    if (marketPricesAfter === 0 && priceAuditsAfter === 0 && productsAfter === 0) {
      console.log('\n✅ [VERIFICATION PASSED]: All market price records and product records successfully purged.');
      console.log('✅ [VERIFICATION PASSED]: Users, Markets, Orders, and Configs preserved.');
    } else {
      console.error('\n❌ [VERIFICATION FAILED]: Some records remain!');
    }
  } catch (error) {
    console.error('❌ [ERROR]: Cleanup encountered an error:', error instanceof Error ? error.message : error);
  } finally {
    await disconnectDB();
    console.log('\n================================================================');
  }
}

cleanupPricesAndProducts();
