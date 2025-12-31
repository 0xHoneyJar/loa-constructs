import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit Configuration
 * @see sdd.md §3.4 Migration Strategy
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
});
