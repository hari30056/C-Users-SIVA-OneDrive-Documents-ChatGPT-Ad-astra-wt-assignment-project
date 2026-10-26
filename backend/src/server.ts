import { createApp } from './app';
import { config } from './config/environment';
import { initDatabase, closeDatabase } from './config/database';
import { initRedis } from './config/redis';
import { startAllWorkers, stopAllWorkers } from './workers';
import { seedDatabase } from './utils/seed';

const startServer = async () => {
  console.log('🚀 Starting Multi-Tenant Event & Ticket Reservation System...');

  // Initialize DB and Cache
  await initDatabase();
  await initRedis();

  // Run seed data if database is fresh
  try {
    await seedDatabase();
  } catch (err) {
    console.warn('Seed notice:', err);
  }

  // Initialize background workers
  await startAllWorkers();

  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`\n======================================================`);
    console.log(`🎟️ Event Ticketing Backend running on port ${config.port}`);
    console.log(`📡 REST API Endpoint: http://localhost:${config.port}/api`);
    console.log(`🩺 Health Check: http://localhost:${config.port}/api/health`);
    console.log(`======================================================\n`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await stopAllWorkers();
      await closeDatabase();
      console.log('✅ Server stopped cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}
