import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '../config/env.js';
import * as schema from './schema.js';

/**
 * Database client — libSQL (Turso managed edge / file:./local.db)
 * @see sdd.md §4 Technology stack
 * @see sdd.md §6.5 Secrets management
 *
 * Prod: TURSO_DATABASE_URL=libsql://<db>-<org>.turso.io + TURSO_AUTH_TOKEN
 * Dev:  TURSO_DATABASE_URL=file:./local.db (no auth token required)
 *
 * [[sovereign-stack]] — libSQL protocol is identical whether edge-hosted or
 * self-hosted, so future migration to sqld on Freeside ECS is zero schema work.
 */

type Database = LibSQLDatabase<typeof schema>;

function createDatabase(): Database {
  const url = env.TURSO_DATABASE_URL || 'file:./local.db';
  const authToken = env.TURSO_AUTH_TOKEN;

  const client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });

  return drizzle(client, { schema });
}

export const db = createDatabase();

export * from './schema.js';
