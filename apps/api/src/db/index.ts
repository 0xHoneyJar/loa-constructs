import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';
import { mockDb } from './mock.js';

/**
 * Database Client
 * @see sdd-infrastructure-migration.md §3.1 Database Layer Changes
 * @see sdd-local-dev-dx.md §3.4 index.ts Modification
 *
 * Uses postgres-js driver with PgBouncer compatibility settings for Supabase.
 * - prepare: false - Required for PgBouncer transaction mode
 * - max: 10 - Connection pool size matching Railway container resources
 * - idle_timeout: 20 - Seconds before idle connection closed
 * - connect_timeout: 10 - Connection timeout in seconds
 *
 * Mock Mode:
 * Set DEV_MOCK_DB=true to use mock database with static responses.
 * Useful for local development without a real database connection.
 */

// Check for mock mode - checked early before env validation
const useMockDb = process.env.DEV_MOCK_DB === 'true';

// Type for the database - always use the real Drizzle type for type safety
type Database = PostgresJsDatabase<typeof schema>;

// Create the database connection
function createDatabase(): Database {
  if (useMockDb) {
    console.log('[db] Using mock database (DEV_MOCK_DB=true)');
    console.log('[db] Write operations will be logged and ignored');
    // Cast mockDb to match the Drizzle type - mock mode is for development only
    return mockDb as unknown as Database;
  }

  // Create postgres-js client with PgBouncer compatibility
  // In test environment without DATABASE_URL, use a dummy connection that will fail on actual queries
  const connectionString = env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';

  const client = postgres(connectionString, {
    prepare: false, // Required for PgBouncer transaction mode (Supabase pooler)
    max: 10, // Connection pool size
    idle_timeout: 20, // Seconds before idle connection closed
    connect_timeout: 10, // Connection timeout in seconds
  });

  // Create Drizzle ORM instance with schema
  return drizzle(client, { schema });
}

// Export the database instance
export const db = createDatabase();

// Export schema for use in queries
export * from './schema.js';
