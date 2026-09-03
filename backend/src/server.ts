import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  // Connect to MongoDB
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 [Server]: AgriMart Backend running on http://localhost:${PORT}`);
    console.log(`🩺 [Server]: Health check available at http://localhost:${PORT}/api/health`);
  });
};

startServer().catch((error) => {
  console.error('❌ [Server]: Fatal server startup error:', error);
  process.exit(1);
});
