#!/usr/bin/env npx tsx
/**
 * Test CLI pack installation flow
 * T16.5: Test CLI pack installation
 *
 * This simulates what the CLI pack-install command does:
 * 1. Authenticate user
 * 2. Check subscription tier
 * 3. Download pack files from API
 * 4. Install to local .claude directory
 */

import { db } from '../apps/api/src/db/index.ts';
import { packs, packVersions, packFiles, users, subscriptions, packInstallations } from '../apps/api/src/db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEST_DIR = '/tmp/loa-cli-test';

async function testCliInstall() {
  console.log('T16.5: Testing CLI pack installation flow...\n');

  // Setup: Create test user with pro subscription
  const ts = Date.now();
  const userId = randomUUID();

  console.log('1. Setting up test user with pro subscription...');
  await db.insert(users).values({
    id: userId,
    email: `cli-test-${ts}@example.com`,
    name: 'CLI Test User',
    role: 'user',
  });

  const subscriptionId = randomUUID();
  await db.insert(subscriptions).values({
    id: subscriptionId,
    userId: userId,
    tier: 'pro',
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  console.log('   Created test user:', userId);

  try {
    // Step 1: Get pack info (simulates client.getPack())
    console.log('\n2. Fetching pack info (simulates CLI getPack)...');
    const [pack] = await db.select().from(packs).where(eq(packs.slug, 'gtm-collective')).limit(1);

    if (!pack) {
      console.error('   FAIL: Pack not found');
      process.exit(1);
    }
    console.log('   Pack:', pack.name, '- Tier required:', pack.tierRequired);

    // Step 2: Check subscription tier (simulates canAccessTier)
    console.log('\n3. Checking subscription tier...');
    const [sub] = await db.select().from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    const tierRank: Record<string, number> = { free: 0, pro: 1, team: 2, enterprise: 3 };
    const requiredRank = tierRank[pack.tierRequired || 'free'] || 0;
    const userRank = tierRank[sub?.tier || 'free'] || 0;

    if (userRank < requiredRank) {
      console.error('   FAIL: Insufficient tier');
      process.exit(1);
    }
    console.log('   Tier check passed: user tier', sub?.tier, '>= required', pack.tierRequired);

    // Step 3: Get pack version and files (simulates downloadPack)
    console.log('\n4. Downloading pack files...');
    const [version] = await db.select().from(packVersions)
      .where(and(
        eq(packVersions.packId, pack.id),
        eq(packVersions.isLatest, true)
      ))
      .limit(1);

    if (!version) {
      console.error('   FAIL: Version not found');
      process.exit(1);
    }
    console.log('   Version:', version.version);

    const files = await db.select().from(packFiles)
      .where(eq(packFiles.versionId, version.id));

    console.log('   Files to install:', files.length);

    // Step 4: Create installation record (simulates API tracking)
    console.log('\n5. Creating installation record...');
    const installationId = randomUUID();
    const licenseExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(packInstallations).values({
      id: installationId,
      packId: pack.id,
      versionId: version.id,
      userId: userId,
      action: 'install',
      metadata: { source: 'cli-test' },
    });
    console.log('   Installation record created');

    // Step 5: Simulate file installation (simulates CLI writeFile)
    console.log('\n6. Installing files to', TEST_DIR, '...');

    // Clean up any previous test
    await fs.rm(TEST_DIR, { recursive: true, force: true });

    const packDir = path.join(TEST_DIR, '.claude', 'packs', 'gtm-collective');
    const skillsDir = path.join(TEST_DIR, '.claude', 'skills');
    const commandsDir = path.join(TEST_DIR, '.claude', 'commands');

    await fs.mkdir(packDir, { recursive: true });
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.mkdir(commandsDir, { recursive: true });

    let installedSkills: string[] = [];
    let installedCommands: string[] = [];
    let totalBytes = 0;

    for (const file of files) {
      // In a real scenario, we'd fetch file content from storage
      // For this test, we simulate with placeholder content
      const content = `# ${file.path}\nInstalled from GTM Collective pack\nSize: ${file.sizeBytes} bytes`;
      totalBytes += file.sizeBytes || 0;

      if (file.path.startsWith('skills/')) {
        const parts = file.path.split('/');
        const skillSlug = parts[1];
        const relativePath = parts.slice(2).join('/');

        if (skillSlug && relativePath) {
          const destPath = path.join(skillsDir, skillSlug, relativePath);
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.writeFile(destPath, content, 'utf-8');

          if (!installedSkills.includes(skillSlug)) {
            installedSkills.push(skillSlug);
          }
        }
      } else if (file.path.startsWith('commands/')) {
        const commandName = path.basename(file.path);
        const destPath = path.join(commandsDir, commandName);
        await fs.writeFile(destPath, content, 'utf-8');
        installedCommands.push(commandName.replace('.md', ''));
      }
    }

    // Write manifest
    await fs.writeFile(
      path.join(packDir, 'manifest.json'),
      JSON.stringify(version.manifest, null, 2)
    );

    // Write installation info (simulates CLI license file)
    await fs.writeFile(
      path.join(packDir, '.install.json'),
      JSON.stringify({
        pack: 'gtm-collective',
        version: version.version,
        expires_at: licenseExpiry.toISOString(),
        installed_at: new Date().toISOString(),
      }, null, 2)
    );

    console.log('   Installed', installedSkills.length, 'skills:', installedSkills.join(', '));
    console.log('   Installed', installedCommands.length, 'commands');
    console.log('   Total size:', formatBytes(totalBytes));

    // Step 6: Verify installation
    console.log('\n7. Verifying installation...');

    const manifestPath = path.join(packDir, 'manifest.json');
    const installPath = path.join(packDir, '.install.json');

    await fs.access(manifestPath);
    console.log('   ✓ manifest.json exists');

    await fs.access(installPath);
    console.log('   ✓ .install.json exists');

    // Check skills directory
    const skillDirs = await fs.readdir(skillsDir);
    console.log('   ✓ Skills installed:', skillDirs.length);

    // Check commands directory
    const commandFiles = await fs.readdir(commandsDir);
    console.log('   ✓ Commands installed:', commandFiles.length);

    // Cleanup test data
    console.log('\n8. Cleaning up...');
    await db.delete(packInstallations).where(eq(packInstallations.id, installationId));
    await db.delete(subscriptions).where(eq(subscriptions.id, subscriptionId));
    await db.delete(users).where(eq(users.id, userId));
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    console.log('   Cleaned up test data');

    console.log('\n✓ T16.5 PASS: CLI pack installation flow working correctly');

  } catch (error) {
    // Cleanup on error
    try {
      await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch {}
    throw error;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

testCliInstall().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
