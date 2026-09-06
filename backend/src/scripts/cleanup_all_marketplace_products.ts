import dotenv from 'dotenv';
import path from 'path';

// Load backend environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB, disconnectDB } from '../config/db';
import { Product } from '../models/Product.model';
import { Cart } from '../models/Cart.model';

async function runMarketplaceProductCleanup() {
  console.log('================================================================');
  console.log('   AGRIMART — SAFE MARKETPLACE PRODUCT CLEANUP SCRIPT          ');
  console.log('================================================================');

  try {
    await connectDB();

    // 1. Audit products before cleanup
    const allProductsBefore = await Product.find({});
    const countBefore = allProductsBefore.length;

    console.log(`\n📊 [AUDIT BEFORE CLEANUP]:`);
    console.log(`   - Total Products Found in Database: ${countBefore}`);

    if (countBefore > 0) {
      console.log('\n📦 [PRODUCTS TO BE REMOVED]:');
      allProductsBefore.forEach((p, idx) => {
        console.log(`   ${idx + 1}. [${p._id}] "${p.name}" | Category: "${p.category}" | Brand: "${p.brand}" | Price: ₹${p.price} / ${p.unit} | Stock: ${p.stock}`);
      });
    } else {
      console.log('   - No products currently exist in database.');
    }

    // 2. Perform deletion of all products
    const deleteResult = await Product.deleteMany({});
    console.log(`\n🧹 [CLEANUP]: Successfully deleted ${deleteResult.deletedCount} products from database.`);

    // 3. Clear any orphaned items in carts
    try {
      const cartResult = await Cart.updateMany({}, { $set: { items: [] } });
      console.log(`🧹 [CLEANUP]: Cleared cart items across ${cartResult.modifiedCount} cart document(s).`);
    } catch {
      // Non-fatal if Cart collection is empty
    }

    // 4. Verify post-cleanup state
    const countAfter = await Product.countDocuments({});
    console.log(`\n📊 [AUDIT AFTER CLEANUP]:`);
    console.log(`   - Remaining Products in Database: ${countAfter}`);

    if (countAfter === 0) {
      console.log('\n✅ [VERIFICATION PASSED]: Database contains exactly 0 products.');
      console.log('✅ [VERIFICATION PASSED]: Marketplace catalog is clean and ready for new products.');
    } else {
      console.error(`\n❌ [VERIFICATION FAILED]: Unexpected remaining products count: ${countAfter}`);
    }

  } catch (error) {
    console.error('❌ [ERROR]: Marketplace product cleanup encountered an error:', error instanceof Error ? error.message : error);
  } finally {
    await disconnectDB();
    console.log('\n================================================================');
  }
}

runMarketplaceProductCleanup();
