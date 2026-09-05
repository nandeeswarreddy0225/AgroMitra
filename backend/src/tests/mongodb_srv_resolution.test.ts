import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB, disconnectDB, configureDnsResolvers } from '../config/db';

const runDnsAndDatabaseDiagnostic = async (): Promise<void> => {
  console.log('\n================================================================');
  console.log('   AGRIMART — MONGODB ATLAS SRV DNS RESOLUTION & DB TEST        ');
  console.log('================================================================\n');

  try {
    // 1. Verify DNS Resolver Configuration
    console.log('▶ [STEP 1]: Configuring DNS resolvers for Node c-ares...');
    configureDnsResolvers();
    const activeServers = dns.getServers();
    console.log(`  ✅ Active DNS Servers in Node: [${activeServers.join(', ')}]`);

    if (!activeServers.some((s) => s === '1.1.1.1' || s === '8.8.8.8' || s === '1.0.0.1')) {
      throw new Error('DNS resolvers were not properly configured with public fallback servers.');
    }

    // 2. Test Direct SRV Resolution
    console.log('\n▶ [STEP 2]: Testing direct SRV record resolution for MongoDB Atlas...');
    const mongoUri = process.env.MONGODB_URI || '';
    if (!mongoUri.startsWith('mongodb+srv://')) {
      console.log('  ℹ️ MONGODB_URI is not an SRV connection string; skipping direct SRV lookup.');
    } else {
      // Extract hostname without exposing credentials
      const hostMatch = mongoUri.match(/@([a-zA-Z0-9.\-_]+)\/?/);
      const atlasHost = hostMatch ? hostMatch[1] : '';
      if (!atlasHost) {
        throw new Error('Unable to parse Atlas cluster hostname from MONGODB_URI format.');
      }

      const srvRecordName = `_mongodb._tcp.${atlasHost}`;
      console.log(`  🔍 Querying SRV records for: ${srvRecordName}`);

      const srvRecords = await new Promise<dns.SrvRecord[]>((resolve, reject) => {
        dns.resolveSrv(srvRecordName, (err, records) => {
          if (err) return reject(err);
          resolve(records);
        });
      });

      if (!srvRecords || srvRecords.length === 0) {
        throw new Error(`No SRV records returned for ${srvRecordName}`);
      }

      console.log(`  ✅ Successfully resolved ${srvRecords.length} MongoDB Atlas SRV shard records.`);
      srvRecords.forEach((rec, idx) => {
        console.log(`     → Shard ${idx + 1}: ${rec.name}:${rec.port} (Priority: ${rec.priority}, Weight: ${rec.weight})`);
      });
    }

    // 3. Connect via Mongoose using connectDB()
    console.log('\n▶ [STEP 3]: Connecting to MongoDB via backend connectDB()...');
    await connectDB();

    if (mongoose.connection.readyState !== 1) {
      throw new Error(`MongoDB connection readyState is not 1 (connected). Current: ${mongoose.connection.readyState}`);
    }

    const connectedHost = mongoose.connection.host;
    console.log(`  ✅ Mongoose connection established. Connected Host: ${connectedHost}`);

    // Verify a lightweight ping query
    const adminDb = mongoose.connection.db?.admin();
    if (adminDb) {
      const pingResult = await adminDb.ping();
      console.log(`  ✅ MongoDB Database Ping response: ok=${pingResult?.ok}`);
    }

    console.log('\n================================================================');
    console.log('  🎉 MONGODB ATLAS SRV RESOLUTION & CONNECTION TEST PASSED!      ');
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ MongoDB SRV / DB Diagnostic Failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

runDnsAndDatabaseDiagnostic();
