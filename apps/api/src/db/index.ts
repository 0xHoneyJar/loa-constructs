import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '../config/env.js';
import * as schema from './schema.js';

/**
 * Database Client
 * @see sdd.md §3.1 Database Technology - Neon serverless
 */

// Create Neon SQL client
// In test environment without DATABASE_URL, use a dummy connection that will fail on actual queries
const sql = neon(env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy');

// Create Drizzle ORM instance with schema
export const db = drizzle(sql, { schema });

// Export schema for use in queries
export * from './schema.js';
