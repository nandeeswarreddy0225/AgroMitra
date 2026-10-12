import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore
}
import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  // Connect to MongoDB
  await connectDB();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 [Server]: AgriMart Backend running on http://0.0.0.0:${PORT}`);
    console.log(`🩺 [Server]: Health check available at http://0.0.0.0:${PORT}/api/health`);
  });
};

startServer().catch((error) => {
  console.error('❌ [Server]: Fatal server startup error:', error);
  process.exit(1);
});
