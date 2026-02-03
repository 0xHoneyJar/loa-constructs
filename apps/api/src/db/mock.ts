/**
 * Mock Database Layer
 *
 * Provides Drizzle-compatible mock implementations for development without a real database.
 * Read operations return static data, write operations log warnings and no-op.
 *
 * Usage: DEV_MOCK_DB=true pnpm dev
 *
 * @see sdd-local-dev-dx.md §3.3 mock.ts
 * @see prd-local-dev-dx.md FR-3: Mock Database Mode
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { generateKeyPairSync } from 'crypto';
import { logger } from '../lib/logger.js';

// =============================================================================
// Static Mock Data
// =============================================================================

const MOCK_CATEGORIES = [
  {
    id: 'security',
    name: 'Security',
    slug: 'security',
    description: 'Security-focused skills and tools',
    sortOrder: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'testing',
    name: 'Testing',
    slug: 'testing',
    description: 'Testing and quality assurance tools',
    sortOrder: 2,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'development',
    name: 'Development',
    slug: 'development',
    description: 'Development workflow tools',
    sortOrder: 3,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'documentation',
    name: 'Documentation',
    slug: 'documentation',
    description: 'Documentation and knowledge tools',
    sortOrder: 4,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];

// Generate a valid mock public key - use env if available, otherwise generate one
const getMockPublicKey = (): string => {
  // Try to use env-provided public key first
  const envKey = process.env.JWT_PUBLIC_KEY;
  if (envKey) {
    try {
      const decoded = Buffer.from(envKey, 'base64').toString('utf8');
      if (decoded.includes('-----BEGIN PUBLIC KEY-----')) {
        return decoded;
      }
    } catch {
      // Fall through to generate a key
    }
  }

  // Generate a valid RSA public key for mock mode
  const { publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return publicKey;
};

const MOCK_PUBLIC_KEY = {
  id: 'mock-key-id',
  keyId: 'key-mock',
  algorithm: 'RS256',
  publicKey: getMockPublicKey(),
  createdAt: new Date('2026-02-01'),
  expiresAt: null,
  revokedAt: null,
  isCurrent: true,
};

// =============================================================================
// Mock Query Builder
// =============================================================================

/**
 * Mock select builder that mimics Drizzle's select API
 */
class MockSelectBuilder {
  private tableName: string = 'unknown';

  from(table: { _: { name: string } } | any) {
    // Extract table name from Drizzle table object
    this.tableName = table?._?.name || table?.name || 'unknown';
    return this;
  }

  where(_condition?: any) {
    return this;
  }

  limit(_count: number) {
    return this;
  }

  orderBy(_column?: any) {
    return this;
  }

  // Make it thenable for async/await
  then<T>(
    resolve: (value: any[]) => T,
    _reject?: (reason: any) => any
  ): Promise<T> {
    const data = this.getData();
    return Promise.resolve(resolve(data));
  }

  private getData(): any[] {
    switch (this.tableName) {
      case 'categories':
        logger.debug({ table: 'categories', count: MOCK_CATEGORIES.length }, 'Mock: returning categories');
        return MOCK_CATEGORIES;
      case 'public_keys':
      case 'publicKeys':
        logger.debug({ table: 'publicKeys' }, 'Mock: returning public key');
        return [MOCK_PUBLIC_KEY];
      default:
        logger.debug({ table: this.tableName }, 'Mock: no data for table, returning empty array');
        return [];
    }
  }
}

/**
 * Mock insert builder - logs warning and no-ops
 */
class MockInsertBuilder {
  private tableName: string = 'unknown';

  into(table: any) {
    this.tableName = table?._?.name || table?.name || 'unknown';
    return this;
  }

  values(_data: any) {
    logger.warn({ table: this.tableName }, 'Mock: INSERT operation ignored (mock mode)');
    return this;
  }

  returning() {
    return Promise.resolve([]);
  }

  onConflictDoNothing() {
    return this;
  }

  onConflictDoUpdate(_config: any) {
    return this;
  }

  then<T>(resolve: (value: any[]) => T): Promise<T> {
    return Promise.resolve(resolve([]));
  }
}

/**
 * Mock update builder - logs warning and no-ops
 */
class MockUpdateBuilder {
  private tableName: string = 'unknown';

  constructor(table: any) {
    this.tableName = table?._?.name || table?.name || 'unknown';
  }

  set(_data: any) {
    logger.warn({ table: this.tableName }, 'Mock: UPDATE operation ignored (mock mode)');
    return this;
  }

  where(_condition: any) {
    return this;
  }

  returning() {
    return Promise.resolve([]);
  }

  then<T>(resolve: (value: any[]) => T): Promise<T> {
    return Promise.resolve(resolve([]));
  }
}

/**
 * Mock delete builder - logs warning and no-ops
 */
class MockDeleteBuilder {
  private tableName: string = 'unknown';

  constructor(table: any) {
    this.tableName = table?._?.name || table?.name || 'unknown';
  }

  where(_condition: any) {
    logger.warn({ table: this.tableName }, 'Mock: DELETE operation ignored (mock mode)');
    return this;
  }

  returning() {
    return Promise.resolve([]);
  }

  then<T>(resolve: (value: any[]) => T): Promise<T> {
    return Promise.resolve(resolve([]));
  }
}

/**
 * Mock transaction - executes callback but write operations are no-ops
 */
async function mockTransaction<T>(callback: (tx: typeof mockDb) => Promise<T>): Promise<T> {
  logger.debug('Mock: transaction started (write operations will be ignored)');
  const result = await callback(mockDb);
  logger.debug('Mock: transaction completed');
  return result;
}

// =============================================================================
// Export Mock Database
// =============================================================================

/**
 * Mock database object with Drizzle-compatible interface
 */
export const mockDb = {
  select: () => new MockSelectBuilder(),
  insert: (table: any) => new MockInsertBuilder().into(table),
  update: (table: any) => new MockUpdateBuilder(table),
  delete: (table: any) => new MockDeleteBuilder(table),
  transaction: mockTransaction,

  // For direct query access (some services use this)
  query: {
    categories: {
      findMany: () => Promise.resolve(MOCK_CATEGORIES),
      findFirst: () => Promise.resolve(MOCK_CATEGORIES[0]),
    },
    publicKeys: {
      findMany: () => Promise.resolve([MOCK_PUBLIC_KEY]),
      findFirst: () => Promise.resolve(MOCK_PUBLIC_KEY),
    },
  },
};

// Type export for consumers
export type MockDatabase = typeof mockDb;
