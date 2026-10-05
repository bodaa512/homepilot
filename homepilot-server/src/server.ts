import http from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { scheduleMaintenanceCheck } from './jobs/maintenanceCheck';
import { seedPlans } from './jobs/seedPlans';
import { syncAllIndexes } from './jobs/syncIndexes';
import { initSocket } from './config/socket';

async function bootstrap(): Promise<void> {
  await connectDB();

  const app = createApp();
  // Runs after createApp() so every model has been imported (and therefore
  // registered with Mongoose) by the time we reconcile indexes — this is
  // also what makes a schema index change in code (like removing an invalid
  // compound index) apply automatically to an already-running database.
  await syncAllIndexes();
  await seedPlans();

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  scheduleMaintenanceCheck();

  const server = httpServer.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] HomePilot API listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[server] received ${signal}, shutting down gracefully`);
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[server] failed to start:', error);
  process.exit(1);
});
