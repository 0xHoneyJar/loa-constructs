/**
 * Seed Forge Constructs
 *
 * Clones construct repos and seeds pack data into the database.
 * Source of truth: individual construct-* repos on GitHub.
 *
 * Run with: DATABASE_URL="..." pnpm tsx scripts/seed-forge-packs.ts
 */

import postgres from 'postgres';
import { randomUUID, randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import { readdir, readFile, stat } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';
import { packManifestSchema, type ValidatedPackManifest } from '../packages/shared/src/validation';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLONE_DIR = join(__dirname, '../.cache/construct-repos');

interface PackFile {
  path: string;
  content: string; // base64 encoded
  sizeBytes: number;
  contentHash: string;
}

// Pack icons (not stored in manifest to keep manifests simple)
const PACK_ICONS: Record<string, string> = {
  observer: '👁️',
  crucible: '🧪',
  artisan: '🎨',
  beacon: '🔔',
  'gtm-collective': '🚀',
  protocol: '🔗',
  herald: '📣',
  hardening: '🛡️',
  'dynamic-auth': '🔑',
  'the-easel': '🖼️',
};

// Git source configurations for packs with registered repos
// @see sprint.md T1.9: Seed Script Compatibility
const GIT_CONFIGS: Record<string, { gitUrl: string; gitRef: string }> = {
  'gtm-collective': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-gtm-collective.git',
    gitRef: 'main',
  },
  artisan: {
    gitUrl: 'https://github.com/0xHoneyJar/construct-artisan.git',
    gitRef: 'main',
  },
  beacon: {
    gitUrl: 'https://github.com/0xHoneyJar/construct-beacon.git',
    gitRef: 'main',
  },
  observer: {
    gitUrl: 'https://github.com/0xHoneyJar/construct-observer.git',
    gitRef: 'main',
  },
  crucible: {
    gitUrl: 'https://github.com/0xHoneyJar/construct-crucible.git',
    gitRef: 'main',
  },
  protocol: {
    gitUrl: 'https://github.com/0xHoneyJar/construct-protocol.git',
    gitRef: 'main',
  },
  herald: {
    gitUrl: 'https://github.com/0xHoneyJar/construct-herald.git',
    gitRef: 'main',
  },
  hardening: {
    gitUrl: 'https://github.com/0xHoneyJar/construct-hardening.git',
    gitRef: 'main',
  },
  'dynamic-auth': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-dynamic-auth.git',
    gitRef: 'main',
  },
  'the-easel': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-the-easel.git',
    gitRef: 'main',
  },
};

interface PackManifest {
  schema_version: number;
  name: string;
  slug: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  type?: string;
  skills?: Array<{ slug: string; path?: string }>;
}

interface IdentityData {
  persona?: Record<string, unknown>;
  expertise?: Record<string, unknown>;
}

interface DiscoveredPack extends PackManifest {
  icon: string;
  skillSlugs: string[];
  packPath: string;
  constructType: string;
  identity?: IdentityData;
  fullManifest: ValidatedPackManifest | null;
}

/**
 * Recursively collect all files from a directory
 */
async function collectFiles(dir: string, baseDir: string): Promise<PackFile[]> {
  const files: PackFile[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await collectFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      // Skip hidden files and non-essential files
      if (entry.name.startsWith('.')) continue;

      const content = await readFile(fullPath);
      const relativePath = relative(baseDir, fullPath);
      const contentHash = createHash('sha256').update(content).digest('hex');

      files.push({
        path: relativePath,
        content: content.toString('base64'),
        sizeBytes: content.length,
        contentHash,
      });
    }
  }

  return files;
}

/**
 * Clone or update construct repos from GitHub
 */
function ensureCloneDir() {
  if (!existsSync(CLONE_DIR)) {
    mkdirSync(CLONE_DIR, { recursive: true });
  }
}

function cloneOrPull(slug: string, gitUrl: string, gitRef: string): string {
  const repoDir = join(CLONE_DIR, `construct-${slug}`);
  if (existsSync(join(repoDir, '.git'))) {
    console.log(`   Updating construct-${slug}...`);
    execSync(`git -C "${repoDir}" fetch origin && git -C "${repoDir}" reset --hard origin/${gitRef}`, { stdio: 'pipe' });
  } else {
    console.log(`   Cloning construct-${slug}...`);
    execSync(`git clone --depth 1 --branch ${gitRef} "${gitUrl}" "${repoDir}"`, { stdio: 'pipe' });
  }
  return repoDir;
}

/**
 * Normalize manifest fields that commonly differ from Zod schema expectations.
 * - repository: {url, homepage} object → url string
 * - runtime_requirements.external_tools: [{name, check}] → [string]
 */
function normalizeForValidation(raw: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...raw };

  // repository: {url: "..."} → "..."
  if (normalized.repository && typeof normalized.repository === 'object' && !Array.isArray(normalized.repository)) {
    const repo = normalized.repository as Record<string, unknown>;
    if (typeof repo.url === 'string') {
      normalized.repository = repo.url;
    }
    // Preserve homepage as top-level field if present and not already set
    if (typeof repo.homepage === 'string' && !normalized.homepage) {
      normalized.homepage = repo.homepage;
    }
  }

  // runtime_requirements.external_tools: [{name: "foundry", ...}] → ["foundry"]
  if (normalized.runtime_requirements && typeof normalized.runtime_requirements === 'object') {
    const rt = { ...(normalized.runtime_requirements as Record<string, unknown>) };
    if (Array.isArray(rt.external_tools)) {
      rt.external_tools = rt.external_tools.map((tool: unknown) => {
        if (typeof tool === 'object' && tool !== null && 'name' in tool) {
          return (tool as Record<string, unknown>).name as string;
        }
        return tool;
      });
      normalized.runtime_requirements = rt;
    }
  }

  return normalized;
}

async function discoverPacks(): Promise<DiscoveredPack[]> {
  console.log(`📂 Discovering packs from construct repos...\n`);
  ensureCloneDir();

  const packs: DiscoveredPack[] = [];

  for (const [slug, config] of Object.entries(GIT_CONFIGS)) {
    try {
      const repoDir = cloneOrPull(slug, config.gitUrl, config.gitRef);

      // Try manifest.json first (legacy), then construct.yaml
      const manifestJsonPath = join(repoDir, 'manifest.json');
      const constructYamlPath = join(repoDir, 'construct.yaml');
      let manifest: PackManifest;

      let fullManifest: ValidatedPackManifest | null = null;

      if (existsSync(manifestJsonPath)) {
        const content = await readFile(manifestJsonPath, 'utf-8');
        const raw = JSON.parse(content);
        const result = packManifestSchema.safeParse(normalizeForValidation(raw));
        if (result.success) {
          fullManifest = result.data;
          manifest = {
            schema_version: result.data.schema_version,
            name: result.data.name,
            slug: result.data.slug,
            version: result.data.version,
            description: result.data.description || '',
            author: typeof result.data.author === 'string' ? result.data.author : result.data.author?.name,
            license: result.data.license,
            type: result.data.type,
            skills: result.data.skills,
          };
          console.log(`     → validated manifest.json for ${slug} (full manifest captured)`);
        } else {
          console.warn(`     → manifest.json for ${slug} failed Zod validation, using raw fields`);
          console.warn(`       Errors: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
          manifest = raw as PackManifest;
        }
      } else if (existsSync(constructYamlPath)) {
        const content = await readFile(constructYamlPath, 'utf-8');
        const parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
        const result = packManifestSchema.safeParse(normalizeForValidation(parsed));
        if (result.success) {
          fullManifest = result.data;
          manifest = {
            schema_version: result.data.schema_version,
            name: result.data.name,
            slug: result.data.slug,
            version: result.data.version,
            description: result.data.description || '',
            author: typeof result.data.author === 'string' ? result.data.author : result.data.author?.name,
            license: result.data.license,
            type: result.data.type,
            skills: result.data.skills,
          };
          console.log(`     → validated construct.yaml for ${slug} (full manifest captured)`);
        } else {
          console.warn(`     → construct.yaml for ${slug} failed Zod validation, falling back to manual extraction`);
          console.warn(`       Errors: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
          manifest = {
            schema_version: (parsed.schema_version as number) || 1,
            name: (parsed.name as string) || slug,
            slug: (parsed.slug as string) || slug,
            version: (parsed.version as string) || '1.0.0',
            description: (parsed.description as string) || '',
            author: parsed.author as string | undefined,
            license: parsed.license as string | undefined,
            type: parsed.type as string | undefined,
            skills: Array.isArray(parsed.skills)
              ? (parsed.skills as Array<Record<string, unknown>>).map((s) => ({
                  slug: (s.slug as string) || '',
                  path: s.path as string | undefined,
                }))
              : undefined,
          };
        }
      } else {
        console.warn(`   Skipping ${slug}: no manifest.json or construct.yaml found`);
        continue;
      }

      // Parse identity files if present
      let identity: IdentityData | undefined;
      const personaPath = join(repoDir, 'identity', 'persona.yaml');
      const expertisePath = join(repoDir, 'identity', 'expertise.yaml');
      if (existsSync(personaPath) || existsSync(expertisePath)) {
        identity = {};
        if (existsSync(personaPath)) {
          const personaContent = await readFile(personaPath, 'utf-8');
          identity.persona = yaml.load(personaContent, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
        }
        if (existsSync(expertisePath)) {
          const expertiseContent = await readFile(expertisePath, 'utf-8');
          identity.expertise = yaml.load(expertiseContent, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
        }
        console.log(`     → parsed identity files for ${slug}`);
      }

      const constructType = manifest.type || 'skill-pack';

      packs.push({
        ...manifest,
        icon: PACK_ICONS[manifest.slug] || '📦',
        skillSlugs: manifest.skills?.map((s) => s.slug) || [],
        packPath: repoDir,
        constructType,
        identity,
        fullManifest,
      });

      console.log(`   Found: ${manifest.name} (${manifest.slug}) - ${manifest.skills?.length || 0} skills`);
    } catch (e) {
      console.warn(`   Skipping ${slug}: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  }

  console.log(`\n   Total: ${packs.length} packs discovered\n`);
  return packs;
}

const DRY_RUN = process.argv.includes('--dry-run');

async function seedForgePacks() {
  // Discover packs from local manifests
  const packs = await discoverPacks();

  if (packs.length === 0) {
    console.error('ERROR: No packs found in construct repos');
    process.exit(1);
  }

  // Dry-run mode: validate all manifests and report results
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — Validating manifests without DB writes\n');
    let passed = 0;
    let failed = 0;
    for (const pack of packs) {
      const status = pack.fullManifest ? '✓ VALID' : '✗ FALLBACK';
      const fields = pack.fullManifest ? Object.keys(pack.fullManifest).length : 0;
      console.log(`  ${status}  ${pack.slug} (v${pack.version}) — ${pack.skillSlugs.length} skills, ${fields} manifest fields`);
      if (pack.fullManifest) {
        if (pack.fullManifest.golden_path) console.log(`          → golden_path: ${pack.fullManifest.golden_path.commands?.length || 0} commands`);
        if (pack.fullManifest.workflow) console.log(`          → workflow: depth=${pack.fullManifest.workflow.depth}`);
        if (pack.fullManifest.domain) console.log(`          → domain: ${pack.fullManifest.domain.join(', ')}`);
        if (pack.fullManifest.hooks) console.log(`          → hooks: post_install=${!!pack.fullManifest.hooks.post_install}`);
        passed++;
      } else {
        failed++;
      }
    }
    console.log(`\n  Summary: ${passed} validated, ${failed} fallback, ${packs.length} total`);
    if (failed > 0) {
      console.log('  ⚠️  Fallback packs store only 7 core fields. Fix upstream manifests to capture full metadata.');
    }
    console.log('\n  No database writes performed.\n');
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = postgres(databaseUrl, { prepare: false });

  console.log('🌱 Seeding Forge Packs...\n');

  try {
    // Wrap all operations in a transaction for atomicity
    await client.begin(async (tx) => {
      // Step 1: Create or get system user using UPSERT
      console.log('1. Creating system user...');
      const systemUserId = randomUUID();
      const systemUserResult = await tx`
        INSERT INTO users (id, email, name, password_hash, email_verified, created_at, updated_at)
        VALUES (
          ${systemUserId},
          'system@constructs.network',
          'Loa System',
          'not-a-real-password-hash',
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `;
      const ownerId = systemUserResult[0].id;
      console.log(`   ✓ System user: ${ownerId}`);

      // Step 1b: Create API key for publishing
      const apiKeySecret = `sk_live_${randomBytes(32).toString('hex')}`;
      const apiKeyHash = await bcrypt.hash(apiKeySecret, 10);
      const apiKeyPrefix = apiKeySecret.slice(0, 12);

      // Delete any existing API keys for this user and create new one
      await tx`DELETE FROM api_keys WHERE user_id = ${ownerId}`;

      {
        await tx`
          INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, scopes, created_at)
          VALUES (
            ${randomUUID()},
            ${ownerId},
            'System Publisher',
            ${apiKeyHash},
            ${apiKeyPrefix},
            ${['packs:write', 'packs:read']},
            NOW()
          )
        `;
        (global as any).__apiKey = apiKeySecret;
        console.log(`   ✓ API key created\n`);
      }

      // Step 2: Create packs using UPSERT
      console.log('2. Creating packs...');
      for (const pack of packs) {
        const packId = randomUUID();
        const packResult = await tx`
          INSERT INTO packs (
            id, name, slug, description, icon, owner_id, owner_type,
            status, tier_required, pricing_type, thj_bypass,
            construct_type,
            created_at, updated_at
          ) VALUES (
            ${packId},
            ${pack.name},
            ${pack.slug},
            ${pack.description},
            ${pack.icon},
            ${ownerId},
            'user',
            'published',
            'free',
            'free',
            true,
            ${pack.constructType},
            NOW(),
            NOW()
          )
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            icon = EXCLUDED.icon,
            status = 'published',
            construct_type = EXCLUDED.construct_type,
            updated_at = NOW()
          RETURNING id
        `;

        const resolvedPackId = packResult[0].id as string;
        console.log(`   ✓ ${pack.slug}: upserted (${resolvedPackId})`);

        // Set git source fields if pack has a registered repo
        const gitConfig = GIT_CONFIGS[pack.slug];
        if (gitConfig) {
          await tx`
            UPDATE packs
            SET source_type = 'git',
                git_url = ${gitConfig.gitUrl},
                git_ref = ${gitConfig.gitRef},
                updated_at = NOW()
            WHERE id = ${resolvedPackId}
          `;
          console.log(`     → git source set: ${gitConfig.gitUrl} (${gitConfig.gitRef})`);
        }

        // Step 3: Unset isLatest on existing versions (required by partial unique constraint)
        await tx`
          UPDATE pack_versions
          SET is_latest = false
          WHERE pack_id = ${resolvedPackId}
        `;

        // Step 4: Build manifest and collect files
        // Use full validated manifest when available, fall back to minimal 7-field
        const versionId = randomUUID();
        const manifest = pack.fullManifest ?? {
          schema_version: pack.schema_version || 1,
          name: pack.name,
          slug: pack.slug,
          version: pack.version,
          description: pack.description,
          author: pack.author || '0xHoneyJar',
          license: pack.license || 'MIT',
          skills: pack.skillSlugs.map((s) => ({ slug: s, path: `skills/${s}` })),
        };

        // Collect files first (needed for content hash)
        console.log(`     → collecting files from ${pack.packPath}...`);
        const files = await collectFiles(pack.packPath, pack.packPath);

        // Compute aggregate content hash: SHA-256 of (manifest JSON + sorted file hashes)
        const sortedFileHashes = files
          .map((f) => `${f.path}:${f.contentHash}`)
          .sort()
          .join('\n');
        const contentHashInput = JSON.stringify(manifest) + '\n' + sortedFileHashes;
        const contentHash = createHash('sha256').update(contentHashInput).digest('hex');

        // Get existing version ID if it exists (for file updates)
        const existingVersion = await tx`
          SELECT id FROM pack_versions
          WHERE pack_id = ${resolvedPackId} AND version = ${pack.version}
        `;

        const resolvedVersionId = existingVersion.length > 0
          ? existingVersion[0].id as string
          : versionId;

        // Step 5: Create pack version using UPSERT
        await tx`
          INSERT INTO pack_versions (
            id, pack_id, version, changelog, is_latest, manifest, content_hash,
            published_at, created_at
          ) VALUES (
            ${versionId},
            ${resolvedPackId},
            ${pack.version},
            'Initial release',
            true,
            ${manifest},
            ${contentHash},
            NOW(),
            NOW()
          )
          ON CONFLICT (pack_id, version) DO UPDATE SET
            changelog = EXCLUDED.changelog,
            is_latest = EXCLUDED.is_latest,
            manifest = EXCLUDED.manifest,
            content_hash = EXCLUDED.content_hash
        `;
        console.log(`     → version ${pack.version} upserted (hash: ${contentHash.slice(0, 12)}...)`);

        // Step 6: Upload pack files
        // Delete existing files for this version (clean slate)
        await tx`DELETE FROM pack_files WHERE version_id = ${resolvedVersionId}`;

        // Insert all files
        let totalBytes = 0;
        for (const file of files) {
          await tx`
            INSERT INTO pack_files (
              id, version_id, path, content_hash, storage_key, size_bytes, content, created_at
            ) VALUES (
              ${randomUUID()},
              ${resolvedVersionId},
              ${file.path},
              ${file.contentHash},
              ${'db://' + file.path},
              ${file.sizeBytes},
              ${file.content},
              NOW()
            )
          `;
          totalBytes += file.sizeBytes;
        }

        // Update version stats
        await tx`
          UPDATE pack_versions
          SET file_count = ${files.length}, total_size_bytes = ${totalBytes}
          WHERE id = ${resolvedVersionId}
        `;

        console.log(`     → uploaded ${files.length} files (${(totalBytes / 1024).toFixed(1)}KB)`);
      }
    });

    // Step 4: Verify results (after transaction commits)
    console.log('\n3. Verification...');
    const packSlugs = packs.map((p) => p.slug);
    const finalPacks = await client`
      SELECT p.slug, p.name, p.status, p.icon, COUNT(v.id) as versions
      FROM packs p
      LEFT JOIN pack_versions v ON v.pack_id = p.id
      WHERE p.slug = ANY(${packSlugs})
      GROUP BY p.id
      ORDER BY p.name
    `;

    console.log('\n   Final pack status:');
    for (const pack of finalPacks) {
      console.log(`   ${pack.icon} ${pack.slug}: ${pack.status} (${pack.versions} versions)`);
    }

    console.log('\n✅ Seeding complete!');

    const savedKey = (global as any).__apiKey;
    if (savedKey) {
      console.log('\n📋 API key for publishing:');
      console.log(`LOA_CONSTRUCTS_API_KEY=${savedKey}`);
      console.log('LOA_CONSTRUCTS_API_URL=https://api.constructs.network/v1');
    }
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

seedForgePacks();
