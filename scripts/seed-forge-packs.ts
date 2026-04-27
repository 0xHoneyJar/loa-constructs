// DEPRECATED: cycle-001 (2026-04-21).
// Use POST /v1/admin/discover instead.
// Deletion scheduled for cycle-002.
// SEED: grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md §14.11

console.warn(
  '[DEPRECATED] seed-forge-packs.ts is deprecated as of cycle-001 (2026-04-21). ' +
  'Use POST /v1/admin/discover instead. This script will be deleted in cycle-002.'
);

/**
 * Seed Forge Constructs
 *
 * Clones construct repos and seeds pack data into the database.
 * Source of truth: individual construct-* repos on GitHub.
 *
 * Run with: DATABASE_URL="..." pnpm tsx scripts/seed-forge-packs.ts
 *
 * Flags:
 *   --dry-run                       Validate manifests without DB writes
 *   --auto-discover                 Scan org for construct-* repos instead of hardcoded list (requires gh CLI)
 *   --only slug1,slug2              Seed only the specified constructs (comma-separated slugs)
 *   --visibility-override <value>   Force all seeded packs to this visibility (public|internal|unlisted)
 */

import postgres from 'postgres';
import { randomUUID, randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { readdir, readFile, stat } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';
// Relative import: @loa-constructs/shared isn't linked at root level by pnpm.
// This script must be run with tsx from the repo root (e.g., pnpm tsx scripts/seed-forge-packs.ts).
import { packManifestSchema, type ValidatedPackManifest } from '../packages/shared/src/validation';
import { normalizeCategory } from '../packages/shared/src/categories';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLONE_DIR = join(__dirname, '../.cache/construct-repos');
const AUTO_DISCOVER = process.argv.includes('--auto-discover');
const CONSTRUCTS_ORG = process.env.CONSTRUCTS_ORG || '0xHoneyJar';

// --only slug1,slug2 — limit seeding to specific constructs
const ONLY_FLAG_INDEX = process.argv.indexOf('--only');
const ONLY_SLUGS: Set<string> | null = ONLY_FLAG_INDEX !== -1 && process.argv[ONLY_FLAG_INDEX + 1]
  ? new Set(process.argv[ONLY_FLAG_INDEX + 1].split(',').map(s => s.trim()).filter(Boolean))
  : null;

// --visibility-override <value> — force all seeded packs to a specific visibility
const VIS_FLAG_INDEX = process.argv.indexOf('--visibility-override');
const VISIBILITY_OVERRIDE: string | null = VIS_FLAG_INDEX !== -1 && process.argv[VIS_FLAG_INDEX + 1]
  ? process.argv[VIS_FLAG_INDEX + 1]
  : null;
if (VISIBILITY_OVERRIDE && !['public', 'internal', 'unlisted'].includes(VISIBILITY_OVERRIDE)) {
  console.error(`ERROR: --visibility-override must be one of: public, internal, unlisted (got "${VISIBILITY_OVERRIDE}")`);
  process.exit(1);
}

interface PackFile {
  path: string;
  content: string; // base64 encoded
  sizeBytes: number;
  contentHash: string;
}

/** Recursively sorted canonical JSON — deterministic output for hashing */
function canonicalStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const props = keys
      .filter((k) => obj[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`);
    return `{${props.join(',')}}`;
  }
  return 'null';
}

// Short description overrides — handcrafted taglines for storefront display
// Used when construct.yaml doesn't provide short_description
const SHORT_DESCRIPTION_OVERRIDES: Record<string, string> = {
  artisan: 'Design systems craft',
  beacon: 'AI-retrievable trust signals',
  crucible: 'Journey validation testing',
  'dynamic-auth': 'Wallet identity resolution',
  gecko: 'Ecosystem intelligence',
  growthpages: 'Educational content pipeline',
  'gtm-collective': 'Go-to-market operations',
  hardening: 'Defensive artifact forge',
  herald: 'Grounded product comms',
  'k-hole': 'Depth engine for exploration',
  'mibera-codex': 'Mibera universe knowledge',
  observer: 'Patient observation and insightful probing for products people actually use',
  protocol: 'Grounds your dApp in what the contract actually says',
  'social-oracle': 'GitHub-to-social content',
  'the-arcade': 'Game design philosophy',
  'the-easel': 'Aesthetic direction studio',
  webreel: 'Cinematic web capture',
  'vocabulary-bank': 'Vocabulary governance for products',
  'webgl-particles': 'WebGL particle system',
  showcase: 'Landing page visual intelligence',
  'vfx-playbook': 'VFX patterns and techniques',
  'the-mint': 'Material transformation pipeline',
  'the-speakers': 'Psychoacoustic engineering',
  hypha: 'Berachain PoL historian',
};

// Pack icons (not stored in manifest to keep manifests simple)
const PACK_ICONS: Record<string, string> = {
  observer: '🐝',
  crucible: '🧪',
  artisan: '🎨',
  beacon: '🔔',
  'gtm-collective': '🚀',
  protocol: '🔗',
  herald: '📣',
  hardening: '🛡️',
  'dynamic-auth': '🔑',
  'the-easel': '🖼️',
  'k-hole': '🕳️',
  'webgl-particles': '✨',
  'the-arcade': '🕹️',
  gecko: '🦎',
  'social-oracle': '🔮',
  'mibera-codex': '📖',
  'vocabulary-bank': '📖',
  webreel: '🎬',
  growthpages: '🌱',
  showcase: '🖥️',
  'vfx-playbook': '🎞️',
  'the-mint': '⚒️',
  'the-speakers': '🔊',
  hypha: '🍄',
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
    gitUrl: 'https://github.com/0xHoneyJar/construct-beehive.git',
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
  'k-hole': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-k-hole.git',
    gitRef: 'main',
  },
  'webgl-particles': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-webgl-particles.git',
    gitRef: 'main',
  },
  'mibera-codex': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-mibera-codex.git',
    gitRef: 'main',
  },
  webreel: {
    gitUrl: 'https://github.com/0xHoneyJar/construct-webreel.git',
    gitRef: 'main',
  },
  'social-oracle': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-social-oracle.git',
    gitRef: 'main',
  },
  'the-arcade': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-the-arcade.git',
    gitRef: 'main',
  },
  growthpages: {
    gitUrl: 'https://github.com/0xHoneyJar/construct-growthpages.git',
    gitRef: 'main',
  },
  gecko: {
    gitUrl: 'https://github.com/0xHoneyJar/construct-gecko.git',
    gitRef: 'main',
  },
  showcase: {
    gitUrl: 'https://github.com/0xHoneyJar/construct-showcase.git',
    gitRef: 'main',
  },
  'vfx-playbook': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-vfx-playbook.git',
    gitRef: 'main',
  },
  'the-mint': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-the-mint.git',
    gitRef: 'main',
  },
  'the-speakers': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-the-speakers.git',
    gitRef: 'main',
  },
  'vocabulary-bank': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-vocabulary-bank.git',
    gitRef: 'main',
  },
  'codex-review': {
    gitUrl: 'https://github.com/0xHoneyJar/construct-codex-review.git',
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
  rawVisibility?: string; // Pre-Zod visibility from manifest file (NOT the Zod default)
  gitConfig?: { gitUrl: string; gitRef: string; githubRepoId?: number; visibility?: string; category?: string; short_description?: string };
}

/**
 * Extract the core PackManifest fields from a fully validated manifest.
 * Centralizes the validated → PackManifest mapping to avoid duplication
 * between manifest.json and construct.yaml parsing paths.
 */
function toPackManifest(validated: ValidatedPackManifest): PackManifest {
  return {
    schema_version: validated.schema_version,
    name: validated.name,
    slug: validated.slug,
    version: validated.version,
    description: validated.description || '',
    author: typeof validated.author === 'string' ? validated.author : validated.author?.name,
    license: validated.license,
    type: validated.type,
    skills: validated.skills,
  };
}

/**
 * Collect files from allowed directories only (matches git-sync.ts allowlist).
 * Prevents walking massive data directories (e.g. 10K mibera entries).
 */
const ALLOWED_DIRS = ['skills', 'commands', 'contexts', 'identity', 'scripts', 'templates'];
const ALLOWED_ROOT_FILES = [
  'construct.yaml', 'construct.json', 'manifest.json', 'manifest.yaml',
  'README.md', 'LICENSE', 'CHANGELOG.md',
];
const MAX_FILES = 500;
const MAX_FILE_SIZE = 256 * 1024; // 256KB per file

async function collectFiles(rootDir: string, _baseDir: string): Promise<PackFile[]> {
  const files: PackFile[] = [];

  // Collect allowed root files
  for (const fileName of ALLOWED_ROOT_FILES) {
    const fullPath = join(rootDir, fileName);
    if (!existsSync(fullPath)) continue;
    const content = await readFile(fullPath);
    if (content.length > MAX_FILE_SIZE) continue;
    files.push({
      path: fileName,
      content: content.toString('base64'),
      sizeBytes: content.length,
      contentHash: createHash('sha256').update(content).digest('hex'),
    });
  }

  // Collect from allowed directories
  for (const dir of ALLOWED_DIRS) {
    const dirPath = join(rootDir, dir);
    if (!existsSync(dirPath)) continue;
    const subFiles = await collectDirRecursive(dirPath, rootDir);
    files.push(...subFiles);
    if (files.length >= MAX_FILES) {
      console.warn(`     ⚠ Hit ${MAX_FILES} file limit, truncating`);
      break;
    }
  }

  return files.slice(0, MAX_FILES);
}

async function collectDirRecursive(dir: string, baseDir: string): Promise<PackFile[]> {
  const files: PackFile[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.name.startsWith('.')) continue;

    if (entry.isDirectory()) {
      const subFiles = await collectDirRecursive(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      const content = await readFile(fullPath);
      if (content.length > MAX_FILE_SIZE) continue;
      const relativePath = relative(baseDir, fullPath);
      files.push({
        path: relativePath,
        content: content.toString('base64'),
        sizeBytes: content.length,
        contentHash: createHash('sha256').update(content).digest('hex'),
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
    try {
      execSync(`git -C "${repoDir}" fetch origin && git -C "${repoDir}" pull --ff-only origin ${gitRef}`, { stdio: 'pipe' });
    } catch {
      // ff-only failed (diverged local state) — nuke and reclone
      execSync(`rm -rf "${repoDir}"`);
      execSync(`git clone --depth 1 --branch ${gitRef} "${gitUrl}" "${repoDir}"`, { stdio: 'pipe' });
    }
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

  // paths.writes/reads shorthand → composition_paths (cycle-051)
  // If paths contains writes/reads arrays, extract to composition_paths and preserve runtime paths
  if (normalized.paths && typeof normalized.paths === 'object' && !Array.isArray(normalized.paths)) {
    const p = normalized.paths as Record<string, unknown>;
    if (Array.isArray(p.writes) || Array.isArray(p.reads)) {
      // This is a composition paths declaration, not (only) runtime paths
      normalized.composition_paths = {
        ...(Array.isArray(p.writes) ? { writes: p.writes } : {}),
        ...(Array.isArray(p.reads) ? { reads: p.reads } : {}),
      };
      // Preserve runtime paths (state, cache, output) if present
      const runtimePaths: Record<string, unknown> = {};
      if (p.state) runtimePaths.state = p.state;
      if (p.cache) runtimePaths.cache = p.cache;
      if (p.output) runtimePaths.output = p.output;
      normalized.paths = Object.keys(runtimePaths).length > 0 ? runtimePaths : undefined;
    }
  }

  // slug: derive from name if missing (external constructs may omit)
  if (!normalized.slug && typeof normalized.name === 'string') {
    normalized.slug = (normalized.name as string).toLowerCase().replace(/\s+/g, '-');
  }

  // type: normalize non-standard values (e.g., "construct" → "skill-pack")
  if (normalized.type === 'construct' || !normalized.type) {
    normalized.type = 'skill-pack';
  }

  // skills: string[] → {slug, path}[] (external constructs may use bare strings)
  if (Array.isArray(normalized.skills) && normalized.skills.length > 0 && typeof normalized.skills[0] === 'string') {
    normalized.skills = (normalized.skills as string[]).map(s => ({ slug: s, path: `skills/${s}` }));
  }

  // commands: string[] → {name, slug, path}[] (external constructs may use bare strings)
  if (Array.isArray(normalized.commands) && normalized.commands.length > 0 && typeof normalized.commands[0] === 'string') {
    normalized.commands = (normalized.commands as string[]).map(c => ({ name: `/${c}`, slug: c, path: `commands/${c}` }));
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

/**
 * Auto-discover construct-* repos from the GitHub org.
 * Returns the same {slug → {gitUrl, gitRef}} shape as GIT_CONFIGS.
 * Requires `gh` CLI authenticated with org access.
 */
function discoverFromOrg(): Record<string, { gitUrl: string; gitRef: string; githubRepoId?: number }> {
  const raw = execSync(
    `gh repo list ${CONSTRUCTS_ORG} --limit 100 --json name,defaultBranchRef,isArchived,url,databaseId`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );

  const repos = JSON.parse(raw) as Array<{
    name: string;
    defaultBranchRef: { name: string } | null;
    isArchived: boolean;
    url: string;
    databaseId: number;
  }>;

  const configs: Record<string, { gitUrl: string; gitRef: string; githubRepoId?: number }> = {};

  for (const repo of repos) {
    if (!repo.name.startsWith('construct-')) continue;
    const slug = repo.name.replace(/^construct-/, '');
    if (slug === 'base' || slug === 'template' || repo.isArchived) continue;

    configs[slug] = {
      gitUrl: `${repo.url}.git`,
      gitRef: repo.defaultBranchRef?.name || 'main',
      githubRepoId: repo.databaseId,
    };
  }

  return configs;
}

/**
 * Load external construct sources from registry-sources.yaml.
 * Merges with org-discovered or hardcoded configs.
 */
function loadExternalSources(): Record<string, { gitUrl: string; gitRef: string; visibility?: string; category?: string; short_description?: string }> {
  const sourcesPath = join(__dirname, '../registry-sources.yaml');
  if (!existsSync(sourcesPath)) return {};

  try {
    const raw = require('fs').readFileSync(sourcesPath, 'utf-8');
    const parsed = yaml.load(raw) as { external?: Record<string, { git_url: string; git_ref: string; visibility?: string; category?: string; short_description?: string }> };
    if (!parsed?.external) return {};

    const configs: Record<string, { gitUrl: string; gitRef: string; visibility?: string; category?: string; short_description?: string }> = {};
    for (const [slug, source] of Object.entries(parsed.external)) {
      configs[slug] = { gitUrl: source.git_url, gitRef: source.git_ref || 'main', visibility: source.visibility, category: source.category, short_description: source.short_description };
    }

    if (Object.keys(configs).length > 0) {
      console.log(`🌐 Loaded ${Object.keys(configs).length} external source(s): ${Object.keys(configs).join(', ')}`);
    }
    return configs;
  } catch (err) {
    console.warn('⚠️  Failed to load registry-sources.yaml:', (err as Error).message);
    return {};
  }
}

async function discoverPacks(): Promise<DiscoveredPack[]> {
  const orgConfigs = AUTO_DISCOVER ? discoverFromOrg() : GIT_CONFIGS;
  const externalConfigs = loadExternalSources();
  const configs = { ...orgConfigs, ...externalConfigs };
  const source = AUTO_DISCOVER ? `${CONSTRUCTS_ORG} org (auto-discover)` : 'GIT_CONFIGS (hardcoded)';
  console.log(`📂 Discovering packs from ${source}${Object.keys(externalConfigs).length > 0 ? ' + external sources' : ''}...\n`);

  if (ONLY_SLUGS) {
    const slugList = Array.from(ONLY_SLUGS).join(', ');
    console.log(`🔒 --only flag active: seeding only [${slugList}]\n`);
    // Warn about slugs not found in configs
    for (const s of ONLY_SLUGS) {
      if (!(s in configs)) {
        console.warn(`   ⚠️  "${s}" not found in ${AUTO_DISCOVER ? 'org repos' : 'GIT_CONFIGS'} — will be skipped`);
      }
    }
  } else {
    console.warn(`⚠️  Seeding ALL constructs. Use --only slug1,slug2 to limit scope.\n`);
  }

  if (VISIBILITY_OVERRIDE) {
    console.log(`🛡️  --visibility-override active: all packs will be set to "${VISIBILITY_OVERRIDE}"\n`);
  }

  ensureCloneDir();

  const packs: DiscoveredPack[] = [];

  for (const [slug, config] of Object.entries(configs)) {
    // Skip constructs not in --only list
    if (ONLY_SLUGS && !ONLY_SLUGS.has(slug)) {
      continue;
    }
    try {
      const repoDir = cloneOrPull(slug, config.gitUrl, config.gitRef);

      // Prefer construct.yaml (schema v3), fall back to construct.json/manifest.json (legacy/external)
      const manifestJsonPath = join(repoDir, 'manifest.json');
      const constructJsonPath = join(repoDir, 'construct.json');
      const constructYamlPath = join(repoDir, 'construct.yaml');
      let manifest: PackManifest;

      let fullManifest: ValidatedPackManifest | null = null;
      let rawVisibility: string | undefined; // Track pre-Zod visibility (before defaults inject)

      if (existsSync(constructYamlPath)) {
        const content = await readFile(constructYamlPath, 'utf-8');
        const parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
        rawVisibility = typeof parsed.visibility === 'string' ? parsed.visibility : undefined;
        const result = packManifestSchema.safeParse(normalizeForValidation(parsed));
        if (result.success) {
          fullManifest = result.data;
          manifest = toPackManifest(result.data);
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
      } else if (existsSync(constructJsonPath) || existsSync(manifestJsonPath)) {
        const jsonPath = existsSync(constructJsonPath) ? constructJsonPath : manifestJsonPath;
        const jsonName = existsSync(constructJsonPath) ? 'construct.json' : 'manifest.json';
        const content = await readFile(jsonPath, 'utf-8');
        const raw = JSON.parse(content);
        rawVisibility = typeof raw.visibility === 'string' ? raw.visibility : undefined;
        const result = packManifestSchema.safeParse(normalizeForValidation(raw));
        if (result.success) {
          fullManifest = result.data;
          manifest = toPackManifest(result.data);
          console.log(`     → validated ${jsonName} for ${slug} (full manifest captured)`);
        } else {
          console.warn(`     → ${jsonName} for ${slug} failed Zod validation, using raw fields`);
          console.warn(`       Errors: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`);
          manifest = raw as PackManifest;
        }
      } else {
        console.warn(`   Skipping ${slug}: no construct.yaml, construct.json, or manifest.json found`);
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

      // Extract skill descriptions from SKILL.md files (cycle-048)
      // Handles both object-form ({slug, path}) and string-form skills
      if (Array.isArray(manifest.skills)) {
        for (let i = 0; i < manifest.skills.length; i++) {
          const raw = manifest.skills[i] as any;
          const slug = typeof raw === 'string' ? raw : raw?.slug;
          if (!slug || typeof slug !== 'string') continue;

          const skillPath = typeof raw === 'object' && raw?.path ? raw.path : `skills/${slug}`;
          const skillDir = join(repoDir, skillPath);
          const skillMdPath = join(skillDir, 'SKILL.md');
          if (!existsSync(skillMdPath)) continue;

          try {
            const content = await readFile(skillMdPath, 'utf-8');
            const lines = content.split('\n');
            let inFrontmatter = false;
            let sawOpeningFrontmatter = false;
            let description = '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed === '---') {
                if (!sawOpeningFrontmatter) {
                  sawOpeningFrontmatter = true;
                  inFrontmatter = true;
                } else if (inFrontmatter) {
                  inFrontmatter = false;
                }
                continue;
              }
              if (inFrontmatter) continue;
              if (trimmed && !trimmed.startsWith('#')) {
                description = trimmed.slice(0, 120);
                break;
              }
            }

            if (description) {
              // Normalize string-form skills back to object form with description
              const normalized = typeof raw === 'string'
                ? { slug, path: `skills/${slug}`, description }
                : { ...raw, description };
              manifest.skills[i] = normalized as any;
            }
          } catch {
            // skip unreadable skill markdown
          }
        }
      }

      const constructType = manifest.type || 'skill-pack';

      packs.push({
        ...manifest,
        icon: (fullManifest as any)?.icon || PACK_ICONS[manifest.slug] || '📦',
        skillSlugs: manifest.skills?.map((s) => s.slug) || [],
        packPath: repoDir,
        constructType,
        identity,
        fullManifest,
        rawVisibility,
        gitConfig: config,
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
        // Composability data (cycle-051)
        const compPaths = (pack.fullManifest as any)?.composition_paths;
        if (compPaths) {
          const writes = Array.isArray(compPaths.writes) ? compPaths.writes.length : 0;
          const reads = Array.isArray(compPaths.reads) ? compPaths.reads.length : 0;
          console.log(`          → composition_paths: writes=${writes}, reads=${reads}`);
        }
        const governs = (pack.fullManifest as any)?.governs;
        const governedBy = (pack.fullManifest as any)?.governed_by;
        if (governs || governedBy) {
          console.log(`          → governs: [${(governs || []).join(', ')}]  governed_by: [${(governedBy || []).join(', ')}]`);
        }
        if (pack.identity) {
          const domains = Array.isArray((pack.identity.expertise as Record<string, unknown>)?.domains)
            ? ((pack.identity.expertise as Record<string, unknown>).domains as Array<{ name: string }>).map(d => d.name)
            : [];
          console.log(`          → identity: ${domains.length} expertise domains`);
        }
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
        // Extract fields from fullManifest when available
        // Short description: manifest > override map > derive from description
        const shortDesc = pack.fullManifest?.short_description
          ?? SHORT_DESCRIPTION_OVERRIDES[pack.slug]
          ?? pack.gitConfig?.short_description
          ?? (pack.description ? pack.description.split('.')[0].slice(0, 80) || null : null);
        const longDesc = pack.fullManifest?.long_description ?? null;
        const repoUrl = pack.fullManifest?.repository ?? null;
        const homepageUrl = pack.fullManifest?.homepage ?? null;
        const docUrl = pack.fullManifest?.documentation ?? null;
        const searchKeywords = pack.fullManifest?.keywords ?? [];
        const searchUseCases = pack.fullManifest?.domain ?? [];

        // Derive category from domain[0] via shared normalizeCategory (cycle-041)
        const rawCategory = pack.fullManifest?.domain?.[0] ?? pack.gitConfig?.category ?? null;
        const category = rawCategory ? normalizeCategory(rawCategory) : 'development';

        // VIS-002: Public visibility allowlist — manifest declarations are NOT sufficient.
        // Only constructs explicitly listed here can be seeded as public.
        // All others default to internal regardless of what their manifest declares.
        // To make a construct public: add it here AND set visibility: public in its manifest.
        const PUBLIC_ALLOWLIST = new Set([
          'observer',
          'k-hole',
          'protocol',
          'mibera-codex',
          'artisan',
          'hypha',
          'the-easel',
          'the-mint',
        ]);

        const VALID_VIS = ['public', 'internal', 'unlisted'];
        const registryVis = pack.gitConfig?.visibility as string | undefined;

        // Priority: --visibility-override > allowlist-gated manifest > registry-sources.yaml > 'internal'
        // CRITICAL: use rawVisibility (pre-Zod), NOT fullManifest.visibility (Zod injects default 'internal')
        let packVisibility = 'internal'; // default
        if (VISIBILITY_OVERRIDE && VALID_VIS.includes(VISIBILITY_OVERRIDE)) {
          packVisibility = VISIBILITY_OVERRIDE;
        } else if (pack.rawVisibility === 'public' && PUBLIC_ALLOWLIST.has(pack.slug)) {
          packVisibility = 'public';
        } else if (pack.rawVisibility && VALID_VIS.includes(pack.rawVisibility) && pack.rawVisibility !== 'public') {
          // Non-public visibility from manifest (internal, unlisted) is always respected
          packVisibility = pack.rawVisibility;
        } else if (registryVis && VALID_VIS.includes(registryVis) && registryVis !== 'public') {
          // Non-public visibility from registry sources is always respected
          packVisibility = registryVis;
        }
        // else: stays 'internal' (default)

        const allowlisted = PUBLIC_ALLOWLIST.has(pack.slug);
        const manifestWantsPublic = pack.rawVisibility === 'public';
        if (manifestWantsPublic && !allowlisted) {
          console.log(`     → visibility: internal (manifest says public but not in PUBLIC_ALLOWLIST)`);
        } else {
          console.log(`     → visibility: ${packVisibility} (manifest=${pack.rawVisibility ?? 'none'}, registry=${registryVis ?? 'none'})`);
        }

        // Logos: -mark.svg (icon), -wordmark.svg (horizontal text lockup), .svg (full knockout)
        // cycle-007: relocated from ./logos/ to grimoires/artisan/logos/ per repo declutter
        const logoDir = join(__dirname, '../grimoires/artisan/logos');
        const readLogo = (filename: string) => {
          const p = join(logoDir, filename);
          return existsSync(p) ? require('fs').readFileSync(p, 'utf-8') as string : null;
        };
        let logoMark = readLogo(`${pack.slug}-mark.svg`);
        let logoWordmark = readLogo(`${pack.slug}-wordmark.svg`);
        let logoKnockout = readLogo(`${pack.slug}.svg`);
        // Fallback: if only one file exists, use it for all slots
        if (!logoMark && logoKnockout) logoMark = logoKnockout;
        if (!logoWordmark && logoKnockout) logoWordmark = logoKnockout;
        if (logoMark || logoWordmark || logoKnockout) {
          console.log(`     → logos: mark=${logoMark ? 'yes' : 'no'} wordmark=${logoWordmark ? 'yes' : 'no'} knockout=${logoKnockout ? 'yes' : 'no'}`);
        }

        const packResult = await tx`
          INSERT INTO packs (
            id, name, slug, description, short_description, long_description, icon, owner_id, owner_type,
            status, tier_required, pricing_type, thj_bypass,
            construct_type, category,
            visibility, submission_source,
            repository_url, homepage_url, documentation_url,
            search_keywords, search_use_cases,
            logo_mark, logo_wordmark, logo_knockout,
            created_at, updated_at
          ) VALUES (
            ${packId},
            ${pack.name},
            ${pack.slug},
            ${pack.description},
            ${shortDesc},
            ${longDesc},
            ${pack.icon},
            ${ownerId},
            'user',
            'published',
            'free',
            'free',
            true,
            ${pack.constructType},
            ${category},
            ${packVisibility},
            'org_sync',
            ${repoUrl},
            ${homepageUrl},
            ${docUrl},
            ${searchKeywords},
            ${searchUseCases},
            ${logoMark},
            ${logoWordmark},
            ${logoKnockout},
            NOW(),
            NOW()
          )
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            short_description = EXCLUDED.short_description,
            long_description = EXCLUDED.long_description,
            icon = EXCLUDED.icon,
            status = 'published',
            construct_type = EXCLUDED.construct_type,
            category = EXCLUDED.category,
            -- VIS-001: never auto-promote on re-seed. Visibility only set on INSERT.
            -- Use CASE to allow demotion (more restrictive) but block promotion.
            visibility = CASE
              WHEN EXCLUDED.visibility = 'unlisted' THEN 'unlisted'
              WHEN EXCLUDED.visibility = 'internal' AND packs.visibility != 'unlisted' THEN 'internal'
              ELSE packs.visibility
            END,
            repository_url = EXCLUDED.repository_url,
            homepage_url = EXCLUDED.homepage_url,
            documentation_url = EXCLUDED.documentation_url,
            search_keywords = EXCLUDED.search_keywords,
            search_use_cases = EXCLUDED.search_use_cases,
            logo_mark = COALESCE(EXCLUDED.logo_mark, packs.logo_mark),
            logo_wordmark = COALESCE(EXCLUDED.logo_wordmark, packs.logo_wordmark),
            logo_knockout = COALESCE(EXCLUDED.logo_knockout, packs.logo_knockout),
            updated_at = NOW()
          RETURNING id
        `;

        const resolvedPackId = packResult[0].id as string;
        console.log(`   ✓ ${pack.slug}: upserted (${resolvedPackId})`);

        // Set git source fields from the config that discovered this pack
        if (pack.gitConfig) {
          await tx`
            UPDATE packs
            SET source_type = 'git',
                git_url = ${pack.gitConfig.gitUrl},
                git_ref = ${pack.gitConfig.gitRef},
                github_repo_id = ${pack.gitConfig.githubRepoId ?? null},
                updated_at = NOW()
            WHERE id = ${resolvedPackId}
          `;
          console.log(`     → git source set: ${pack.gitConfig.gitUrl} (${pack.gitConfig.gitRef})`);
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
        const baseManifest = pack.fullManifest ?? {
          schema_version: pack.schema_version || 1,
          name: pack.name,
          slug: pack.slug,
          version: pack.version,
          description: pack.description,
          author: pack.author || '0xHoneyJar',
          license: pack.license || 'MIT',
          skills: pack.skillSlugs.map((s) => ({ slug: s, path: `skills/${s}` })),
        };

        // Merge skill descriptions from SKILL.md extraction (cycle-048)
        if (pack.skills && Array.isArray((baseManifest as any).skills)) {
          const descMap = new Map(pack.skills.map((s: any) => [s.slug, (s as any).description || '']));
          for (const skill of (baseManifest as any).skills) {
            if (descMap.has(skill.slug) && descMap.get(skill.slug)) {
              skill.description = descMap.get(skill.slug);
            }
          }
        }
        const manifest = baseManifest;

        // Collect files first (needed for content hash)
        console.log(`     → collecting files from ${pack.packPath}...`);
        const files = await collectFiles(pack.packPath, pack.packPath);

        // Compute aggregate content hash: SHA-256 of (canonical manifest JSON + sorted file hashes)
        const sortedFileHashes = files
          .map((f) => `${f.path}:${f.contentHash}`)
          .sort()
          .join('\n');
        // Canonical JSON: recursively sorted keys for deterministic hashing
        const contentHashInput = canonicalStringify(manifest) + '\n' + sortedFileHashes;
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

        // Step 7: Upsert identity data if present
        if (pack.identity) {
          const persona = pack.identity.persona as Record<string, unknown> | undefined;
          const expertise = pack.identity.expertise as Record<string, unknown> | undefined;

          // Read raw YAML for storage
          const personaPath = join(pack.packPath, 'identity', 'persona.yaml');
          const expertisePath = join(pack.packPath, 'identity', 'expertise.yaml');
          const personaYaml = existsSync(personaPath) ? await readFile(personaPath, 'utf-8') : null;
          const expertiseYaml = existsSync(expertisePath) ? await readFile(expertisePath, 'utf-8') : null;

          // Extract structured fields
          const cognitiveFrame = persona?.cognitiveFrame ?? null;
          const voiceConfig = persona?.voice ?? null;
          const modelPreferences = persona?.model_preferences
            ? (persona.model_preferences as Record<string, unknown>)
            : null;
          const expertiseDomains = Array.isArray((expertise as Record<string, unknown>)?.domains)
            ? ((expertise as Record<string, unknown>).domains as Array<{ name: string }>).map(d => d.name)
            : null;

          await tx`
            INSERT INTO construct_identities (
              id, pack_id, persona_yaml, expertise_yaml,
              cognitive_frame, expertise_domains, voice_config, model_preferences,
              created_at, updated_at
            ) VALUES (
              ${randomUUID()},
              ${resolvedPackId},
              ${personaYaml},
              ${expertiseYaml},
              ${cognitiveFrame ? JSON.stringify(cognitiveFrame) : null}::jsonb,
              ${expertiseDomains ? JSON.stringify(expertiseDomains) : null}::jsonb,
              ${voiceConfig ? JSON.stringify(voiceConfig) : null}::jsonb,
              ${modelPreferences ? JSON.stringify(modelPreferences) : null}::jsonb,
              NOW(),
              NOW()
            )
            ON CONFLICT (pack_id) DO UPDATE SET
              persona_yaml = EXCLUDED.persona_yaml,
              expertise_yaml = EXCLUDED.expertise_yaml,
              cognitive_frame = EXCLUDED.cognitive_frame,
              expertise_domains = EXCLUDED.expertise_domains,
              voice_config = EXCLUDED.voice_config,
              model_preferences = EXCLUDED.model_preferences,
              updated_at = NOW()
          `;
          console.log(`     → identity upserted (${expertiseDomains?.length || 0} expertise domains)`);
        }
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
