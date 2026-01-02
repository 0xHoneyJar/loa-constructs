#!/usr/bin/env npx tsx
/**
 * GTM Collective Import Script
 * @see sprint-v2.md T14.1: GTM Skill Migration
 * @see sprint.md T16.1: Direct DB Import
 *
 * Imports the GTM Collective pack (8 skills, 14 commands) into the registry.
 *
 * Usage:
 *   npx tsx scripts/import-gtm-collective.ts          # Generate payload only
 *   npx tsx scripts/import-gtm-collective.ts --import # Import directly to DB
 *
 * Prerequisites:
 *   - DATABASE_URL environment variable set
 *   - R2 storage configured (optional, files stored in DB if not)
 *   - Admin user exists in database (or set ADMIN_USER_ID)
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';

// Import from the API package
const API_PATH = join(process.cwd(), 'apps/api/src');

// Configuration
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '';
const IMPORT_TO_DB = process.argv.includes('--import');

interface ImportPayload {
  pack: {
    name: string;
    slug: string;
    description: string;
    long_description: string;
    pricing: {
      type: string;
      tier_required: string;
    };
    thj_bypass: boolean;
  };
  version: {
    version: string;
    changelog: string;
    manifest: Record<string, unknown>;
    min_loa_version: string;
  };
  files: Array<{
    path: string;
    content: string; // base64
    mime_type: string;
  }>;
}

async function main() {
  console.log('GTM Collective Import Script');
  console.log('============================\n');

  // Paths - files are in the archive directory
  const ARCHIVE_PATH = join(process.cwd(), 'loa-grimoire/context/archive/.imported');
  const SKILLS_PATH = join(ARCHIVE_PATH, 'gtm-skills-import');
  const COMMANDS_PATH = join(ARCHIVE_PATH, 'gtm-commands');
  const COMMANDS_IN_SKILLS_PATH = join(SKILLS_PATH, 'commands');

  // Verify paths exist
  const paths = [SKILLS_PATH, COMMANDS_PATH, COMMANDS_IN_SKILLS_PATH];
  for (const p of paths) {
    try {
      statSync(p);
    } catch {
      console.error(`Error: Path not found: ${p}`);
      process.exit(1);
    }
  }

  // Skills to import (directories under gtm-skills-import, excluding 'commands')
  const skillDirs = readdirSync(SKILLS_PATH).filter(
    (name) => statSync(join(SKILLS_PATH, name)).isDirectory() && name !== 'commands'
  );

  console.log(`Found ${skillDirs.length} skills to import:`);
  skillDirs.forEach((s) => console.log(`  - ${s}`));

  // Commands from gtm-commands directory
  const commandFiles1 = readdirSync(COMMANDS_PATH).filter((name) => name.endsWith('.md'));
  console.log(`\nFound ${commandFiles1.length} commands in gtm-commands:`);
  commandFiles1.forEach((c) => console.log(`  - ${c}`));

  // Commands from skills-import/commands
  const commandFiles2 = readdirSync(COMMANDS_IN_SKILLS_PATH).filter((name) => name.endsWith('.md'));
  console.log(`\nFound ${commandFiles2.length} commands in gtm-skills-import/commands:`);
  commandFiles2.forEach((c) => console.log(`  - ${c}`));

  // Collect all files
  const files: Array<{ path: string; content: string; mimeType: string }> = [];

  // Add skill files
  for (const skillDir of skillDirs) {
    const skillPath = join(SKILLS_PATH, skillDir);
    const skillFiles = collectFilesRecursively(skillPath, skillPath);
    for (const file of skillFiles) {
      files.push({
        path: `skills/${skillDir}/${file.relativePath}`,
        content: file.content,
        mimeType: getMimeType(file.relativePath),
      });
    }
  }

  // Add commands from gtm-commands
  for (const cmdFile of commandFiles1) {
    const content = readFileSync(join(COMMANDS_PATH, cmdFile), 'utf-8');
    files.push({
      path: `commands/${cmdFile}`,
      content,
      mimeType: 'text/markdown',
    });
  }

  // Add commands from gtm-skills-import/commands
  for (const cmdFile of commandFiles2) {
    const content = readFileSync(join(COMMANDS_IN_SKILLS_PATH, cmdFile), 'utf-8');
    files.push({
      path: `commands/${cmdFile}`,
      content,
      mimeType: 'text/markdown',
    });
  }

  // Add README from gtm-skills-import
  const readmePath = join(SKILLS_PATH, 'README.md');
  try {
    const readmeContent = readFileSync(readmePath, 'utf-8');
    files.push({
      path: 'README.md',
      content: readmeContent,
      mimeType: 'text/markdown',
    });
    console.log('\nFound README.md');
  } catch {
    console.log('\nNo README.md found (optional)');
  }

  console.log(`\nTotal files to import: ${files.length}`);

  // Build manifest
  const manifest = {
    name: 'GTM Collective',
    slug: 'gtm-collective',
    version: '1.0.0',
    description: 'Go-To-Market skills and commands for product launches, positioning, and developer relations.',
    author: {
      name: 'The Honey Jar',
      email: 'hello@thehoneyjar.xyz',
      url: 'https://thehoneyjar.xyz',
    },
    skills: skillDirs.map((s) => ({
      slug: s,
      path: `skills/${s}/`,
    })),
    commands: [...commandFiles1, ...commandFiles2].map((c) => ({
      name: c.replace('.md', ''),
      path: `commands/${c}`,
    })),
    dependencies: {
      loa_version: '>=0.9.0',
      skills: [],
      packs: [],
    },
    pricing: {
      type: 'subscription',
      tier: 'pro',
    },
    tags: ['gtm', 'marketing', 'product', 'devrel', 'positioning', 'pricing', 'launch'],
    license: 'proprietary',
  };

  console.log('\nManifest:');
  console.log(JSON.stringify(manifest, null, 2));

  // Output import payload (for manual API call or DB insert)
  const importPayload = {
    pack: {
      name: 'GTM Collective',
      slug: 'gtm-collective',
      description: 'Go-To-Market skills and commands for product launches, positioning, and developer relations.',
      long_description: `The GTM Collective is a comprehensive suite of AI-powered skills and commands designed for
product teams executing go-to-market strategies. It includes:

**8 Skills:**
- analyzing-market: Market research, TAM/SAM/SOM, competitive analysis
- building-partnerships: Partnership strategy and ecosystem development
- crafting-narratives: Story development and messaging frameworks
- educating-developers: DevRel strategy and developer content
- positioning-product: Product positioning and differentiation
- pricing-strategist: Pricing strategy and packaging
- reviewing-gtm: GTM plan review and feedback
- translating-for-stakeholders: Executive communication and stakeholder alignment

**14 Commands:**
- /gtm-setup, /gtm-adopt, /gtm-feature-requests
- /sync-from-gtm, /review-gtm
- /analyze-market, /position, /price
- /plan-partnerships, /plan-devrel, /plan-launch
- /create-deck, /sync-from-dev, /announce-release

Requires Pro subscription or higher.`,
      pricing: {
        type: 'subscription',
        tier_required: 'pro',
      },
      thj_bypass: true, // Allow THJ users without subscription
    },
    version: {
      version: '1.0.0',
      changelog: 'Initial release of GTM Collective',
      manifest,
      min_loa_version: '0.9.0',
    },
    files: files.map((f) => ({
      path: f.path,
      content: Buffer.from(f.content).toString('base64'),
      mime_type: f.mimeType,
    })),
  };

  // Write to file for review
  const outputPath = join(process.cwd(), 'scripts/gtm-collective-import-payload.json');
  writeFileSync(outputPath, JSON.stringify(importPayload, null, 2));
  console.log(`\nImport payload written to: ${outputPath}`);

  // Summary
  console.log('\n============================');
  console.log('Summary:');
  console.log(`  Skills: ${skillDirs.length}`);
  console.log(`  Commands: ${commandFiles1.length + commandFiles2.length}`);
  console.log(`  Total files: ${files.length}`);
  console.log(`  Total size: ${formatBytes(files.reduce((sum, f) => sum + f.content.length, 0))}`);

  // Import to database if --import flag is set
  if (IMPORT_TO_DB) {
    console.log('\n============================');
    console.log('Importing to database...\n');
    await importToDatabase(importPayload);
  } else {
    console.log('\nTo import, use the API or run:');
    console.log('  curl -X POST http://localhost:3000/v1/packs \\');
    console.log('    -H "Authorization: Bearer <token>" \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d @scripts/gtm-collective-import-payload.json');
    console.log('\nOr run with --import flag:');
    console.log('  npx tsx scripts/import-gtm-collective.ts --import');
  }
}

/**
 * Import pack directly to database
 * @see sdd.md §3.1 Seeding Script Enhancement
 */
async function importToDatabase(payload: ImportPayload): Promise<void> {
  // Validate ADMIN_USER_ID
  if (!ADMIN_USER_ID) {
    console.error('Error: ADMIN_USER_ID environment variable not set');
    console.error('Set it to the UUID of the admin user who will own the pack');
    process.exit(1);
  }

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable not set');
    process.exit(1);
  }

  try {
    // Dynamic imports for ESM compatibility with API code
    // Use .ts extension when running with tsx
    const { db } = await import('../apps/api/src/db/index.ts');
    const {
      packs,
      packVersions,
      packFiles,
    } = await import('../apps/api/src/db/schema.ts');

    let uploadFile: ((key: string, content: Buffer, mimeType: string) => Promise<void>) | null = null;
    let storageConfigured = false;

    try {
      const storage = await import('../apps/api/src/services/storage.ts');
      uploadFile = storage.uploadFile;
      storageConfigured = storage.isStorageConfigured();
    } catch {
      console.log('  Storage service not available, files will be stored in DB only');
    }

    // Check if pack already exists
    const [existing] = await db
      .select()
      .from(packs)
      .where(eq(packs.slug, payload.pack.slug))
      .limit(1);

    if (existing) {
      console.log(`Pack "${payload.pack.slug}" already exists (ID: ${existing.id})`);
      console.log('To update, delete the existing pack first or use version update');
      return;
    }

    // Create pack record
    console.log('Creating pack record...');
    const [pack] = await db
      .insert(packs)
      .values({
        name: payload.pack.name,
        slug: payload.pack.slug,
        description: payload.pack.description,
        longDescription: payload.pack.long_description,
        ownerId: ADMIN_USER_ID,
        ownerType: 'user',
        pricingType: 'subscription',
        tierRequired: 'pro',
        status: 'published',
        thjBypass: payload.pack.thj_bypass,
        isFeatured: true,
      })
      .returning();

    console.log(`  Created pack: ${pack.name} (${pack.id})`);

    // Create version record
    console.log('Creating version record...');
    const [version] = await db
      .insert(packVersions)
      .values({
        packId: pack.id,
        version: payload.version.version,
        changelog: payload.version.changelog,
        manifest: payload.version.manifest,
        minLoaVersion: payload.version.min_loa_version,
        isLatest: true,
        publishedAt: new Date(),
      })
      .returning();

    console.log(`  Created version: ${version.version} (${version.id})`);

    // Process and upload files
    console.log(`Processing ${payload.files.length} files...`);
    let totalSize = 0;
    let uploadedCount = 0;

    for (const file of payload.files) {
      const content = Buffer.from(file.content, 'base64');
      const contentHash = createHash('sha256').update(content).digest('hex');
      const storageKey = `packs/${pack.slug}/${version.version}/${file.path}`;

      // Upload to R2 storage if configured
      if (storageConfigured && uploadFile) {
        try {
          await uploadFile(storageKey, content, file.mime_type);
          uploadedCount++;
        } catch (err) {
          console.warn(`  Warning: Failed to upload ${file.path} to storage`);
        }
      }

      // Create file record with content stored in DB as fallback
      await db.insert(packFiles).values({
        versionId: version.id,
        path: file.path,
        contentHash,
        storageKey,
        sizeBytes: content.length,
        mimeType: file.mime_type,
        // Store base64 content directly in DB when R2 isn't configured
        content: storageConfigured ? null : file.content,
      });

      totalSize += content.length;
    }

    console.log(`  Created ${payload.files.length} file records`);
    if (storageConfigured) {
      console.log(`  Uploaded ${uploadedCount} files to storage`);
    }

    // Update version stats
    await db
      .update(packVersions)
      .set({
        fileCount: payload.files.length,
        totalSizeBytes: totalSize,
      })
      .where(eq(packVersions.id, version.id));

    console.log('\n============================');
    console.log('Import successful!');
    console.log(`  Pack ID: ${pack.id}`);
    console.log(`  Version: ${version.version}`);
    console.log(`  Files: ${payload.files.length}`);
    console.log(`  Total size: ${formatBytes(totalSize)}`);
    console.log(`  Status: ${pack.status}`);
    console.log(`  Tier required: ${pack.tierRequired}`);
    console.log(`  THJ bypass: ${pack.thjBypass}`);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

function collectFilesRecursively(
  basePath: string,
  currentPath: string
): Array<{ relativePath: string; content: string }> {
  const files: Array<{ relativePath: string; content: string }> = [];
  const entries = readdirSync(currentPath);

  for (const entry of entries) {
    const fullPath = join(currentPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...collectFilesRecursively(basePath, fullPath));
    } else {
      const relativePath = relative(basePath, fullPath);
      const content = readFileSync(fullPath, 'utf-8');
      files.push({ relativePath, content });
    }
  }

  return files;
}

function getMimeType(filename: string): string {
  if (filename.endsWith('.md')) return 'text/markdown';
  if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return 'text/yaml';
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.ts')) return 'text/typescript';
  if (filename.endsWith('.js')) return 'text/javascript';
  return 'text/plain';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
