/**
 * Seed Forge Constructs
 *
 * Creates the initial packs from the forge repository manifests.
 * Run with: DATABASE_URL="..." pnpm tsx scripts/seed-forge-packs.ts
 */

import postgres from 'postgres';
import { randomUUID } from 'crypto';

const FORGE_PACKS = [
  {
    name: 'Observer',
    slug: 'observer',
    version: '1.0.0',
    description: 'User truth capture skills for hypothesis-first research',
    icon: '👁️',
    skills: [
      'observing-users',
      'shaping-journeys',
      'level-3-diagnostic',
      'analyzing-gaps',
      'filing-gaps',
      'importing-research',
    ],
  },
  {
    name: 'Crucible',
    slug: 'crucible',
    version: '1.0.0',
    description: 'Validation and testing skills for journey verification',
    icon: '🧪',
    skills: [
      'validating-journeys',
      'grounding-code',
      'iterating-feedback',
      'walking-through',
      'diagramming-states',
    ],
  },
  {
    name: 'Artisan',
    slug: 'artisan',
    version: '1.0.0',
    description: 'Brand and UI craftsmanship skills for design systems and motion',
    icon: '🎨',
    skills: [
      'animating-motion',
      'applying-behavior',
      'crafting-physics',
      'distilling-components',
      'inscribing-taste',
      'styling-material',
      'surveying-patterns',
      'synthesizing-taste',
      'validating-physics',
      'web3-testing',
    ],
  },
  {
    name: 'Beacon',
    slug: 'beacon',
    version: '1.0.0',
    description:
      'Signal readiness to the agent network with AI-retrievable content, trust auditing, and x402 payment endpoints',
    icon: '🔔',
    skills: [
      'auditing-content',
      'generating-markdown',
      'optimizing-chunks',
      'discovering-endpoints',
      'defining-actions',
      'accepting-payments',
    ],
  },
];

async function seedForgePacks() {
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
      console.log(`   ✓ System user: ${ownerId}\n`);

      // Step 2: Create packs using UPSERT
      console.log('2. Creating packs...');
      for (const pack of FORGE_PACKS) {
        const packId = randomUUID();
        const packResult = await tx`
          INSERT INTO packs (
            id, name, slug, description, icon, owner_id, owner_type,
            status, tier_required, pricing_type, thj_bypass,
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
            NOW(),
            NOW()
          )
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            icon = EXCLUDED.icon,
            status = 'published',
            updated_at = NOW()
          RETURNING id
        `;

        const resolvedPackId = packResult[0].id as string;
        console.log(`   ✓ ${pack.slug}: upserted (${resolvedPackId})`);

        // Step 3: Create pack version using UPSERT
        const versionId = randomUUID();
        const manifest = {
          schema_version: 1,
          name: pack.name,
          slug: pack.slug,
          version: pack.version,
          description: pack.description,
          author: '0xHoneyJar',
          license: 'MIT',
          skills: pack.skills.map((s) => ({ slug: s, path: `skills/${s}` })),
        };

        await tx`
          INSERT INTO pack_versions (
            id, pack_id, version, changelog, is_latest, manifest,
            published_at, created_at
          ) VALUES (
            ${versionId},
            ${resolvedPackId},
            ${pack.version},
            'Initial release',
            true,
            ${manifest},
            NOW(),
            NOW()
          )
          ON CONFLICT (pack_id, version) DO UPDATE SET
            changelog = EXCLUDED.changelog,
            is_latest = EXCLUDED.is_latest,
            manifest = EXCLUDED.manifest
        `;
        console.log(`     → version ${pack.version} upserted`);
      }
    });

    // Step 4: Verify results (after transaction commits)
    console.log('\n3. Verification...');
    const finalPacks = await client`
      SELECT p.slug, p.name, p.status, p.icon, COUNT(v.id) as versions
      FROM packs p
      LEFT JOIN pack_versions v ON v.pack_id = p.id
      WHERE p.slug IN ('observer', 'crucible', 'artisan', 'beacon')
      GROUP BY p.id
      ORDER BY p.name
    `;

    console.log('\n   Final pack status:');
    for (const pack of finalPacks) {
      console.log(`   ${pack.icon} ${pack.slug}: ${pack.status} (${pack.versions} versions)`);
    }

    console.log('\n✅ Seeding complete!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

seedForgePacks();
