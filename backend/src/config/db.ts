import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'path';
import fs from 'fs';

let mongoMemoryServer: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri && mongoUri.trim() !== '') {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`✅ [Database]: MongoDB Connected successfully to URI: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.warn(`⚠️  [Database]: Could not connect to configured MONGODB_URI: ${error instanceof Error ? error.message : error}`);
      console.log('🔄 [Database]: Initializing persistent local MongoDB instance for seamless data retention...');
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
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};
