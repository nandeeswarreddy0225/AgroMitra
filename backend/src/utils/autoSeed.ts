/**
 * autoSeed.ts
 *
 * POLICY: This file MUST NOT create any demo/test users.
 * The seedAccounts array is intentionally empty.
 * No automatic user accounts are created on server startup.
 *
 * Only non-user reference data is seeded:
 * - Government schemes (public reference data, not user data)
 */

import { Scheme } from '../models/Scheme.model';
import { OFFICIAL_INDIAN_SCHEMES } from '../data/officialSchemes';

export const autoSeedDefaultData = async (): Promise<void> => {
  try {
    // Synchronize official Andhra Pradesh and Telangana Government Schemes (read-only reference data)
    // This does NOT create any user accounts.
    const schemeCount = await Scheme.countDocuments();
    if (schemeCount === 0) {
      await Scheme.insertMany(OFFICIAL_INDIAN_SCHEMES);
      console.log(`🏛️  [Database]: Synchronized ${OFFICIAL_INDIAN_SCHEMES.length} verified AP & Telangana government schemes.`);
    }

    // IMPORTANT: No user accounts, demo accounts, or test accounts are seeded here.
    // User count must remain 0 on a fresh database.
    console.log('[Database]: Auto-seed complete. No user accounts created.');
  } catch (error) {
    console.error('⚠️ [Database]: Auto-seed error (non-fatal):', error);
  }
};
