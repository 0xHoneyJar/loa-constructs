import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { initMonitoring, captureMessage } from './lib/monitoring.js';

/**
 * API Server Entry Point
 * @see sdd.md §1.4 System Components - API Server (Hono + Node.js)
 * @see sprint.md T1.2: API Server Setup
 * @see sprint.md T12.6: Monitoring & Alerting
 */

// Initialize monitoring (Sentry, etc.)
initMonitoring();

const server = serve({
  fetch: app.fetch,
  port: env.PORT,
  hostname: env.HOST,
});

logger.info({
  message: 'Server started',
  port: env.PORT,
  host: env.HOST,
  environment: env.NODE_ENV,
});

// Log startup to monitoring
captureMessage('API server started', {
  tags: {
    environment: env.NODE_ENV,
    port: String(env.PORT),
  },
  level: 'info',
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app };
