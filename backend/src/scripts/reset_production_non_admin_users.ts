import dotenv from 'dotenv';
import path from 'path';

// Load backend environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User.model';
import { DeliveryBoy } from '../models/DeliveryBoy.model';

async function runSafeAccountReset() {
  console.log('================================================================');
  console.log('   AGRIMART — SAFE NON-ADMIN USER ACCOUNT CLEANUP SCRIPT        ');
  console.log('================================================================');

  try {
    await connectDB();

    // 1. Audit user counts before cleanup
    const totalBefore = await User.countDocuments({});
    const adminBefore = await User.countDocuments({ role: 'ADMIN' });
    const farmerBefore = await User.countDocuments({ role: 'FARMER' });
    const agriPartnerBefore = await User.countDocuments({ role: 'AGRI_PARTNER' });
    const shopOwnerBefore = await User.countDocuments({ role: 'SHOP_OWNER' });
    const deliveryBoyBefore = await User.countDocuments({ role: 'DELIVERY_BOY' });
    const nonAdminBefore = farmerBefore + agriPartnerBefore + shopOwnerBefore + deliveryBoyBefore;

    console.log('\n📊 [AUDIT BEFORE RESET]:');
    console.log(`   - Total Registered Users:    ${totalBefore}`);
    console.log(`   - ADMIN Accounts:            ${adminBefore}`);
    console.log(`   - FARMER Accounts:           ${farmerBefore}`);
    console.log(`   - AGRI_PARTNER Accounts:     ${agriPartnerBefore}`);
    console.log(`   - SHOP_OWNER Accounts:       ${shopOwnerBefore}`);
    console.log(`   - DELIVERY_BOY Accounts:     ${deliveryBoyBefore}`);
    console.log(`   - Total Non-Admin to Remove: ${nonAdminBefore}`);

    if (adminBefore === 0) {
      console.warn('⚠️ WARNING: No ADMIN accounts detected in database! Preserving integrity.');
    }

    // 2. Identify DELIVERY_BOY user IDs to safely clean up associated DeliveryBoy profiles only
    const deliveryBoyUsers = await User.find({ role: 'DELIVERY_BOY' }).select('_id');
    const deliveryBoyUserIds = deliveryBoyUsers.map(u => u._id);

    if (deliveryBoyUserIds.length > 0) {
      const dbDeleteResult = await DeliveryBoy.deleteMany({ user: { $in: deliveryBoyUserIds } });
      console.log(`\n🧹 [CLEANUP]: Removed ${dbDeleteResult.deletedCount} associated DeliveryBoy profiles.`);
    } else {
      console.log('\n🧹 [CLEANUP]: No associated DeliveryBoy profiles to remove.');
    }

    // 3. Perform deletion of non-admin user accounts only
    const nonAdminRoles = ['FARMER', 'AGRI_PARTNER', 'SHOP_OWNER', 'DELIVERY_BOY'];
    const deleteResult = await User.deleteMany({ role: { $in: nonAdminRoles } });
    console.log(`🧹 [CLEANUP]: Successfully removed ${deleteResult.deletedCount} non-admin user accounts.`);

    // Note: ADMIN user accounts are completely untouched (no updates or token invalidations on ADMIN records).

    // 4. Verify post-cleanup state
    const totalAfter = await User.countDocuments({});
    const adminAfter = await User.countDocuments({ role: 'ADMIN' });
    const farmerAfter = await User.countDocuments({ role: 'FARMER' });
    const agriPartnerAfter = await User.countDocuments({ role: 'AGRI_PARTNER' });
    const shopOwnerAfter = await User.countDocuments({ role: 'SHOP_OWNER' });
    const deliveryBoyAfter = await User.countDocuments({ role: 'DELIVERY_BOY' });
    const nonAdminAfter = farmerAfter + agriPartnerAfter + shopOwnerAfter + deliveryBoyAfter;

    console.log('\n📊 [AUDIT AFTER RESET]:');
    console.log(`   - Remaining Total Users:     ${totalAfter}`);
    console.log(`   - ADMIN Accounts Kept:       ${adminAfter}`);
    console.log(`   - FARMER Accounts:           ${farmerAfter}`);
    console.log(`   - AGRI_PARTNER Accounts:     ${agriPartnerAfter}`);
    console.log(`   - SHOP_OWNER Accounts:       ${shopOwnerAfter}`);
    console.log(`   - DELIVERY_BOY Accounts:     ${deliveryBoyAfter}`);
    console.log(`   - Total Non-Admin Count:     ${nonAdminAfter}`);

    if (nonAdminAfter === 0 && adminAfter === adminBefore) {
      console.log('\n✅ [VERIFICATION PASSED]: Non-admin accounts successfully reset to 0.');
      console.log('✅ [VERIFICATION PASSED]: All ADMIN accounts intact and untouched.');
    } else {
      console.error('\n❌ [VERIFICATION FAILED]: Unexpected user count mismatch!');
    }

  } catch (error) {
    console.error('❌ [ERROR]: Database reset operation encountered an error:', error instanceof Error ? error.message : error);
  } finally {
    await disconnectDB();
    console.log('\n================================================================');
  }
}

runSafeAccountReset();
