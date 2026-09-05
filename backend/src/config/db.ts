import dns from 'dns';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';

let mongoMemoryServer: MongoMemoryServer | null = null;

/**
 * Configure standard Anycast DNS servers (Cloudflare & Google)
 * to resolve mongodb+srv records reliably across all platforms (Windows, Linux, Docker, Render).
 */
export const configureDnsResolvers = (): void => {
  try {
    const servers = process.env.DNS_SERVERS
      ? process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean)
      : ['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4'];

    if (servers.length > 0) {
      dns.setServers(servers);
    }
  } catch (err) {
    console.warn('⚠️ [Database]: DNS resolver setup note:', err instanceof Error ? err.message : err);
  }
};

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // Ensure Node c-ares resolver can resolve Atlas SRV records
  configureDnsResolvers();

  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri && mongoUri.trim() !== '') {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 15000,
      });
      console.log(`✅ [Database]: MongoDB Connected successfully to host: ${conn.connection.host}`);
      // Auto-migrate any legacy plaintext passwords safely in background
      import('../utils/migratePasswords')
        .then(({ migratePlaintextPasswords }) => migratePlaintextPasswords())
        .catch((err) => console.warn('⚠️ [Database]: Password migration background check:', err));
      return;
    } catch (error) {
      console.warn(`⚠️  [Database]: Could not connect to configured MONGODB_URI: ${error instanceof Error ? error.message : error}`);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`[Database]: Production MongoDB Atlas connection failed: ${error instanceof Error ? error.message : error}`);
      }
      console.log('🔄 [Database]: Initializing persistent local MongoDB instance for development/test suite...');
    }
  }

  // Persistent local MongoDB for development and test suite
  try {
    const dbDir = path.resolve(__dirname, '../../.mongodb_data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    mongoMemoryServer = await MongoMemoryServer.create({
      instance: {
        dbPath: dbDir,
        storageEngine: 'wiredTiger',
      },
    });
    const uri = mongoMemoryServer.getUri();
    const conn = await mongoose.connect(uri);
    console.log(`✅ [Database]: Persistent Local MongoDB running at ${conn.connection.host} (Storage: ${dbDir})`);
    const { autoSeedDefaultData } = await import('../utils/autoSeed');
    await autoSeedDefaultData();
  } catch (memError) {
    console.error('❌ [Database]: Failed to start persistent MongoDB fallback:', memError);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      mongoMemoryServer = null;
    }
  } catch (err) {
    console.warn('⚠️ [Database]: Disconnect error:', err);
  }
};
