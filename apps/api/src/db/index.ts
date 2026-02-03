import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';

/**
 * Database Client
 * @see sdd-infrastructure-migration.md §3.1 Database Layer Changes
 *
 * Uses postgres-js driver with PgBouncer compatibility settings for Supabase.
 * - prepare: false - Required for PgBouncer transaction mode
 * - max: 10 - Connection pool size matching Railway container resources
 * - idle_timeout: 20 - Seconds before idle connection closed
 * - connect_timeout: 10 - Connection timeout in seconds
 */

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
export const db = drizzle(client, { schema });

// Export schema for use in queries
export * from './schema.js';
