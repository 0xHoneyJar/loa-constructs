import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration for libSQL (Turso managed / file:./local.db)
 * @see sdd.md §4 Technology stack
 * @see sdd.md §5 Migration strategy
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  verbose: true,
  strict: true,
});
