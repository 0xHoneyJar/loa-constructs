#!/usr/bin/env node
// =============================================================================
// validate-pack-manifests.mjs - Validate pack manifests against Zod schema
// =============================================================================
// Usage: node .claude/scripts/validate-pack-manifests.mjs
//
// Requires: @constructs/shared package to be built (pnpm --filter @constructs/shared build)

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

// Import from built shared package
const sharedPath = join(ROOT, 'packages/shared/dist/index.js');
const { validatePackManifest } = await import(sharedPath);

const PACKS_DIR = join(ROOT, 'apps/sandbox/packs');
const packs = readdirSync(PACKS_DIR).filter(name => {
  const fullPath = join(PACKS_DIR, name);
  return statSync(fullPath).isDirectory() &&
    statSync(join(fullPath, 'manifest.json'), { throwIfNoEntry: false });
});

let passed = 0;
let failed = 0;
const errors = [];

console.log('Validating pack manifests against Zod schema...\n');

for (const pack of packs) {
  const manifestPath = join(PACKS_DIR, pack, 'manifest.json');

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    console.log(`  FAIL  ${pack} — Invalid JSON: ${e.message}`);
    failed++;
    errors.push({ pack, error: `Invalid JSON: ${e.message}` });
    continue;
  }

  const result = validatePackManifest(manifest);

  if (result.success) {
    console.log(`  PASS  ${pack} (v${manifest.version})`);
    passed++;
  } else {
    console.log(`  FAIL  ${pack} (v${manifest.version})`);
    for (const issue of result.errors.issues) {
      const path = issue.path.join('.');
      console.log(`        ${path}: ${issue.message}`);
    }
    failed++;
    errors.push({ pack, issues: result.errors.issues });
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} packs`);

if (failed > 0) {
  process.exit(1);
}

console.log('All pack manifests are valid.');
