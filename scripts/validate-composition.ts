/**
 * Composition Validation Script
 *
 * Advisory checks for construct composition health:
 * - Ghost wires: reads with no matching writer
 * - Orphan outputs: writes with no matching reader
 * - Governance consistency: bidirectional declaration
 * - Placeholder cleanup: remaining consumes: ['?']
 *
 * Run with: bun tsx scripts/validate-composition.ts
 * Exit code 0 if only warnings/info, exit code 1 if errors.
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import yaml from 'js-yaml';

const CLONE_DIR = join(import.meta.dirname || __dirname, '../.cache/construct-repos');

interface ConstructManifest {
  slug: string;
  name: string;
  composition_paths?: {
    writes?: string[];
    reads?: string[];
  };
  paths?: {
    writes?: string[];
    reads?: string[];
  };
  governs?: string[];
  governed_by?: string[];
  consumes?: unknown[];
  composes_with?: string[];
}

interface Finding {
  level: 'error' | 'warning' | 'info';
  category: string;
  message: string;
}

async function loadManifests(): Promise<ConstructManifest[]> {
  const manifests: ConstructManifest[] = [];

  if (!existsSync(CLONE_DIR)) {
    console.error(`Clone dir not found: ${CLONE_DIR}`);
    console.error('Run seed-forge-packs.ts first to clone construct repos.');
    process.exit(1);
  }

  const entries = await readdir(CLONE_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('construct-')) continue;

    const repoDir = join(CLONE_DIR, entry.name);
    const yamlPath = join(repoDir, 'construct.yaml');

    if (!existsSync(yamlPath)) continue;

    try {
      const content = await readFile(yamlPath, 'utf-8');
      const parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA }) as ConstructManifest;
      if (parsed && parsed.slug) {
        // Normalize: paths.writes/reads -> composition_paths if not already present
        if (!parsed.composition_paths && parsed.paths) {
          const p = parsed.paths as Record<string, unknown>;
          if (Array.isArray(p.writes) || Array.isArray(p.reads)) {
            parsed.composition_paths = {
              writes: Array.isArray(p.writes) ? p.writes : undefined,
              reads: Array.isArray(p.reads) ? p.reads : undefined,
            };
          }
        }
        manifests.push(parsed);
      }
    } catch (e) {
      console.warn(`  Skipping ${entry.name}: ${e instanceof Error ? e.message : 'parse error'}`);
    }
  }

  return manifests;
}

function validateComposition(manifests: ConstructManifest[]): Finding[] {
  const findings: Finding[] = [];
  const slugSet = new Set(manifests.map((m) => m.slug));

  // Build writer index: path -> [slugs that write to it]
  const writerIndex = new Map<string, string[]>();
  // Build reader index: path -> [slugs that read from it]
  const readerIndex = new Map<string, string[]>();

  for (const m of manifests) {
    const writes = m.composition_paths?.writes || [];
    const reads = m.composition_paths?.reads || [];

    for (const path of writes) {
      if (!writerIndex.has(path)) writerIndex.set(path, []);
      writerIndex.get(path)!.push(m.slug);
    }

    for (const path of reads) {
      if (!readerIndex.has(path)) readerIndex.set(path, []);
      readerIndex.get(path)!.push(m.slug);
    }
  }

  // 1. Ghost wires: reads with no matching writer
  for (const [path, readers] of readerIndex) {
    const writers = writerIndex.get(path);
    if (!writers || writers.length === 0) {
      for (const reader of readers) {
        findings.push({
          level: 'warning',
          category: 'Ghost Wire',
          message: `${reader} reads ${path} — no known writer in the network`,
        });
      }
    }
  }

  // 2. Orphan outputs: writes with no matching reader
  for (const [path, writers] of writerIndex) {
    const readers = readerIndex.get(path);
    if (!readers || readers.length === 0) {
      for (const writer of writers) {
        findings.push({
          level: 'info',
          category: 'Orphan Output',
          message: `${writer} writes ${path} — no known reader in the network`,
        });
      }
    }
  }

  // 3. Governance consistency: bidirectional check
  for (const m of manifests) {
    const governs = m.governs || [];
    for (const governed of governs) {
      if (!slugSet.has(governed)) {
        findings.push({
          level: 'warning',
          category: 'Governance Mismatch',
          message: `${m.slug} governs ${governed} — but ${governed} is not in the network`,
        });
        continue;
      }
      const target = manifests.find((t) => t.slug === governed);
      if (target) {
        const targetGovernedBy = target.governed_by || [];
        if (!targetGovernedBy.includes(m.slug)) {
          findings.push({
            level: 'warning',
            category: 'Governance Mismatch',
            message: `${m.slug} governs ${governed} but ${governed} does not declare governed_by: [${m.slug}]`,
          });
        }
      }
    }

    const governedBy = m.governed_by || [];
    for (const governor of governedBy) {
      if (!slugSet.has(governor)) {
        findings.push({
          level: 'warning',
          category: 'Governance Mismatch',
          message: `${m.slug} declares governed_by: [${governor}] — but ${governor} is not in the network`,
        });
        continue;
      }
      const source = manifests.find((s) => s.slug === governor);
      if (source) {
        const sourceGoverns = source.governs || [];
        if (!sourceGoverns.includes(m.slug)) {
          findings.push({
            level: 'warning',
            category: 'Governance Mismatch',
            message: `${m.slug} declares governed_by: [${governor}] but ${governor} does not declare governs: [${m.slug}]`,
          });
        }
      }
    }
  }

  // 4. Placeholder cleanup: consumes: ['?']
  for (const m of manifests) {
    if (Array.isArray(m.consumes)) {
      for (const item of m.consumes) {
        if (item === '?' || (typeof item === 'string' && item === '?')) {
          findings.push({
            level: 'error',
            category: 'Placeholder',
            message: `${m.slug} has consumes: ['?'] — replace with real events or remove`,
          });
        }
      }
    }
  }

  return findings;
}

async function main() {
  console.log('Composition Validation Report');
  console.log('='.repeat(50));
  console.log();

  const manifests = await loadManifests();
  console.log(`Loaded ${manifests.length} construct manifests\n`);

  const findings = validateComposition(manifests);

  // Group by category
  const categories = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!categories.has(f.category)) categories.set(f.category, []);
    categories.get(f.category)!.push(f);
  }

  const levelIcon = { error: '\u2717', warning: '\u26A0', info: '\u2139' };

  for (const [category, items] of categories) {
    console.log(`${category}:`);
    for (const item of items) {
      console.log(`  ${levelIcon[item.level]} ${item.message}`);
    }
    console.log();
  }

  // Summary
  const errors = findings.filter((f) => f.level === 'error').length;
  const warnings = findings.filter((f) => f.level === 'warning').length;
  const infos = findings.filter((f) => f.level === 'info').length;

  console.log(`Summary: ${errors} errors, ${warnings} warnings, ${infos} info`);

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
