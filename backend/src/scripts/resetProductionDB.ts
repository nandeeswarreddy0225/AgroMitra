/**
 * AgroMitra Production Database Reset Script
 * 
 * Explicitly authorized by the application owner.
 * 
 * This script:
 * 1. Connects to the production MongoDB Atlas database
 * 2. Drops all application data collections
 * 3. Verifies the database is empty
 * 4. Reports final user count = 0
 * 
 * WARNING: This is DESTRUCTIVE and IRREVERSIBLE.
 * 
 * Usage:
 *   npx ts-node src/scripts/resetProductionDB.ts
 *   OR
 *   node dist/scripts/resetProductionDB.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const COLLECTIONS_TO_CLEAR = [
  'users',
  'deliveryboys',
  'carts',
  'orders',
  'payments',
  'products',
  'notifications',
  'markets',
  'marketprices',
  'priceaudits',
  'commodities',
  'cropanalysises',
  'cropplans',
  'schemes',
  'storepaymentconfigs',
];

async function resetProductionDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable not set. Aborting.');
    process.exit(1);
  }

  // Safety check - confirm this is the AgroMitra production URI
  const isAtlasUri = mongoUri.includes('mongodb.net') || mongoUri.includes('mongodb+srv');
  const isAgroMitraDB = mongoUri.toLowerCase().includes('agrimart') || mongoUri.toLowerCase().includes('agromitra');

  console.log('🔍 Target MongoDB URI (redacted): ' + mongoUri.replace(/\/\/[^@]+@/, '//***:***@'));
  console.log(`🔍 Is Atlas (cloud) URI: ${isAtlasUri}`);
  console.log(`🔍 Is AgroMitra DB: ${isAgroMitraDB}`);

  if (!isAtlasUri || !isAgroMitraDB) {
    console.warn('⚠️  URI does not appear to be the AgroMitra Atlas database. Double-check before proceeding.');
  }

  console.log('\n🔌 Connecting to MongoDB...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log('✅ Connected to MongoDB Atlas.');

  const db = mongoose.connection.db;
  if (!db) {
    console.error('❌ Failed to get database handle. Aborting.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // List current collections
  const existingCollections = await db.listCollections().toArray();
  const collectionNames = existingCollections.map((c) => c.name);
  console.log(`\n📋 Collections found in database: ${collectionNames.join(', ') || '(none)'}`);

  // Count documents before reset
  console.log('\n📊 Document counts BEFORE reset:');
  const preResetCounts: Record<string, number> = {};
  for (const collName of collectionNames) {
    const count = await db.collection(collName).countDocuments();
    preResetCounts[collName] = count;
    console.log(`   ${collName}: ${count} documents`);
  }

  // Perform deletion
  console.log('\n🗑️  Beginning production database reset...');
  const deletionReport: Record<string, number> = {};

  for (const collName of COLLECTIONS_TO_CLEAR) {
    if (collectionNames.includes(collName)) {
      const result = await db.collection(collName).deleteMany({});
      deletionReport[collName] = result.deletedCount;
      console.log(`   ✅ Cleared '${collName}': ${result.deletedCount} documents deleted`);
    } else {
      console.log(`   ⏭️  Skipped '${collName}': collection does not exist`);
    }
  }

  // Also clear any collections not in our explicit list (catch-all for any runtime-created collections)
  for (const collName of collectionNames) {
    if (!COLLECTIONS_TO_CLEAR.includes(collName)) {
      // Only clear application data collections, not system collections
      if (!collName.startsWith('system.') && !collName.startsWith('fs.')) {
        const result = await db.collection(collName).deleteMany({});
        deletionReport[collName] = result.deletedCount;
        console.log(`   ✅ Cleared additional collection '${collName}': ${result.deletedCount} documents deleted`);
      }
    }
  }

  // Post-reset verification
  console.log('\n📊 Document counts AFTER reset:');
  let totalDocumentsRemaining = 0;
  for (const collName of collectionNames) {
    const count = await db.collection(collName).countDocuments();
    totalDocumentsRemaining += count;
    console.log(`   ${collName}: ${count} documents`);
  }

  // Final user count
  const userCount = collectionNames.includes('users')
    ? await db.collection('users').countDocuments()
    : 0;

  console.log('\n' + '='.repeat(60));
  console.log('🏁 PRODUCTION DATABASE RESET COMPLETE');
  console.log('='.repeat(60));
  console.log(`   Database: agrimart (MongoDB Atlas)`);
  console.log(`   Users remaining: ${userCount}`);
  console.log(`   Total documents remaining: ${totalDocumentsRemaining}`);
  console.log(`   Reset status: ${userCount === 0 && totalDocumentsRemaining === 0 ? '✅ CLEAN (0 documents)' : '⚠️  Some documents may remain'}`);
  console.log('='.repeat(60));

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB.');
  process.exit(0);
}

resetProductionDatabase().catch((err) => {
  console.error('❌ Fatal error during DB reset:', err);
  process.exit(1);
});
