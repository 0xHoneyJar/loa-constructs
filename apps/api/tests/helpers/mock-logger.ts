/**
 * Shared Logger Mock Factory
 *
 * Creates a mock logger matching the pino-style API used across the app.
 * Eliminates duplicated logger mocks in every test file.
 *
 * Usage:
 *   vi.mock('../lib/logger.js', () => getMockLoggerModule());
 *   // or from tests/contract/:
 *   vi.mock('../../src/lib/logger.js', () => getMockLoggerModule());
 */

import { vi } from 'vitest';

export function createMockLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

/**
 * Get the full vi.mock() payload for the lib/logger module.
 */
export function getMockLoggerModule() {
  return {
    logger: createMockLogger(),
  };
}
