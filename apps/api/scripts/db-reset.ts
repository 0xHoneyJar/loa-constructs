/**
 * Database Reset Script
 *
 * Drops and recreates the public schema, then runs migrations.
 * DESTRUCTIVE: This will DELETE ALL DATA.
 *
 * Usage:
 *   pnpm db:reset          # Interactive confirmation
 *   pnpm db:reset --force  # Skip confirmation
 *
 * @see sdd-local-dev-dx.md §3.2 db-reset.ts
 * @see prd-local-dev-dx.md FR-2: Database Reset Script
 */

import 'dotenv/config';
import postgres from 'postgres';
import { execSync } from 'child_process';
import * as readline from 'readline';

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function reset() {
  // Safety: Block production
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: db:reset is BLOCKED in production environment');
    console.error('This command cannot be run with NODE_ENV=production');
    process.exit(1);
  }

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    console.error('Please configure DATABASE_URL in your .env file');
    process.exit(1);
  }

  const force = process.argv.includes('--force');

  // Confirmation
  if (!force) {
    console.log('');
    console.log('⚠️  WARNING: This will DELETE ALL DATA in the database!');
    console.log('');
    console.log('   Database: ' + process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
    console.log('');

    const confirmed = await confirm('Are you sure you want to continue?');
    if (!confirmed) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  console.log('\nDropping schema...');

  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 10,
  });

  try {
    // Drop and recreate public schema
    await sql.unsafe('DROP SCHEMA public CASCADE');
    console.log('✓ Schema dropped');

    await sql.unsafe('CREATE SCHEMA public');
    console.log('✓ Schema recreated');

    // Grant default permissions
    await sql.unsafe('GRANT ALL ON SCHEMA public TO public');
    await sql.unsafe('GRANT ALL ON SCHEMA public TO postgres');
    console.log('✓ Permissions restored');
  } catch (error) {
    console.error('ERROR: Failed to reset schema');
    console.error(error);
    await sql.end();
    process.exit(1);
  }

  await sql.end();

  // Run migrations
  console.log('\nRunning migrations...');
  try {
    execSync('pnpm db:migrate', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✓ Migrations applied');
  } catch (error) {
    console.error('ERROR: Migration failed');
    process.exit(1);
  }

  console.log('\n✅ Database reset complete!');
  console.log('\nNext steps:');
  console.log('  pnpm db:seed:categories  # Seed category data');
  console.log('  pnpm dev                 # Start server');
}

reset().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
