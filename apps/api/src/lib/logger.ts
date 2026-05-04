import pinoFactory from 'pino';
import { env } from '../config/env.js';

/**
 * Structured logger configuration
 * @see sdd.md §6.4 Logging Strategy
 */
const pino = (pinoFactory as unknown as typeof pinoFactory & { default?: typeof pinoFactory })
  .default ?? pinoFactory;

export const logger = pino({
  level: env.LOG_LEVEL,
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  // Pretty print in development
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
      },
    },
  }),
});

/**
 * Create a child logger with additional context
 */
export function createLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
