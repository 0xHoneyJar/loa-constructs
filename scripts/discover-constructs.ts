/**
 * Discover Constructs — Namespace Auto-Discovery
 *
 * Scans the GitHub org for construct-* repos and reports which ones
 * are missing from the registry (GIT_CONFIGS in seed-forge-packs.ts).
 *
 * This is step zero of auto-sync: the diagnostic that becomes the solution.
 *
 * Usage:
 *   pnpm tsx scripts/discover-constructs.ts              # Report only
 *   pnpm tsx scripts/discover-constructs.ts --register    # Register missing (requires DATABASE_URL)
 *   pnpm tsx scripts/discover-constructs.ts --json        # Machine-readable output
 *
 * Requires: gh CLI authenticated with org access
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ORG = process.env.CONSTRUCTS_ORG || '0xHoneyJar';
const REGISTER = process.argv.includes('--register');
const JSON_OUTPUT = process.argv.includes('--json');

interface OrgRepo {
  name: string;
  visibility: string;
  defaultBranch: string;
  archived: boolean;
  description: string | null;
  url: string;
}

interface ConstructStatus {
  slug: string;
  repo: string;
  visibility: 'public' | 'private' | 'internal';
  hasManifest: boolean;
  manifestType: 'construct.yaml' | 'manifest.json' | null;
  inRegistry: boolean;
  archived: boolean;
  description: string | null;
  skillCount: number | null;
}

/** Check if gh CLI is available and authenticated */
function checkGhCli(): boolean {
  try {
    execSync('gh auth status', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/** List all repos in the org matching construct-* */
function listConstructRepos(): OrgRepo[] {
  const raw = execSync(
    `gh repo list ${ORG} --limit 100 --json name,visibility,defaultBranchRef,isArchived,description,url`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );

  const repos = JSON.parse(raw) as Array<{
    name: string;
    visibility: string;
    defaultBranchRef: { name: string } | null;
    isArchived: boolean;
    description: string | null;
    url: string;
  }>;

  return repos
    .filter(r => r.name.startsWith('construct-'))
    .map(r => ({
      name: r.name,
      visibility: r.visibility.toLowerCase(),
      defaultBranch: r.defaultBranchRef?.name || 'main',
      archived: r.isArchived,
      description: r.description,
      url: r.url,
    }));
}

/** Check if a repo has a manifest file (without cloning) */
function checkManifest(repo: string, branch: string): { has: boolean; type: 'construct.yaml' | 'manifest.json' | null } {
  // Try construct.yaml first
  try {
    execSync(`gh api repos/${ORG}/${repo}/contents/construct.yaml?ref=${branch}`, {
      stdio: 'pipe',
    });
    return { has: true, type: 'construct.yaml' };
  } catch {
    // Not found, try manifest.json
  }

  try {
    execSync(`gh api repos/${ORG}/${repo}/contents/manifest.json?ref=${branch}`, {
      stdio: 'pipe',
    });
    return { has: true, type: 'manifest.json' };
  } catch {
    return { has: false, type: null };
  }
}

/** Extract skill count from manifest without full clone */
function getSkillCount(repo: string, branch: string, manifestType: string): number | null {
  try {
    const raw = execSync(
      `gh api repos/${ORG}/${repo}/contents/${manifestType}?ref=${branch} --jq '.content'`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const content = Buffer.from(raw.trim(), 'base64').toString('utf-8');

    if (manifestType === 'construct.yaml') {
      // Simple YAML skill count — look for "- slug:" lines under skills:
      const match = content.match(/skills:\n((?:\s+-\s+slug:.*\n?)+)/);
      if (match) {
        return (match[1].match(/slug:/g) || []).length;
      }
    } else {
      const json = JSON.parse(content);
      return json.skills?.length || 0;
    }
  } catch {
    // Can't parse — not critical
  }
  return null;
}

/** Read the current GIT_CONFIGS from seed script */
function getRegisteredSlugs(): Set<string> {
  const seedPath = join(__dirname, 'seed-forge-packs.ts');
  if (!existsSync(seedPath)) return new Set();

  const content = readFileSync(seedPath, 'utf-8');

  const slugs = new Set<string>();
  // Match both quoted ('slug': {) and unquoted (slug: {) keys before gitUrl
  const regex = /(?:['"]([a-z0-9-]+)['"]|([a-z][a-z0-9-]*))\s*:\s*\{[\s\S]*?gitUrl/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    slugs.add(match[1] || match[2]);
  }
  return slugs;
}

async function main() {
  if (!checkGhCli()) {
    console.error('ERROR: gh CLI not authenticated. Run: gh auth login');
    process.exit(1);
  }

  if (!JSON_OUTPUT) {
    console.log(`\n  Scanning ${ORG} for construct-* repos...\n`);
  }

  const repos = listConstructRepos();
  const registered = getRegisteredSlugs();

  const results: ConstructStatus[] = [];

  for (const repo of repos) {
    const slug = repo.name.replace(/^construct-/, '');

    // Skip the template repo
    if (slug === 'base' || slug === 'template') {
      if (!JSON_OUTPUT) {
        console.log(`  SKIP  ${repo.name} (template)`);
      }
      continue;
    }

    if (repo.archived) {
      if (!JSON_OUTPUT) {
        console.log(`  SKIP  ${repo.name} (archived)`);
      }
      continue;
    }

    const manifest = checkManifest(repo.name, repo.defaultBranch);
    const inRegistry = registered.has(slug);
    const skillCount = manifest.has && manifest.type
      ? getSkillCount(repo.name, repo.defaultBranch, manifest.type)
      : null;

    const status: ConstructStatus = {
      slug,
      repo: repo.name,
      visibility: repo.visibility as 'public' | 'private' | 'internal',
      hasManifest: manifest.has,
      manifestType: manifest.type,
      inRegistry,
      archived: repo.archived,
      description: repo.description,
      skillCount,
    };

    results.push(status);

    if (!JSON_OUTPUT) {
      const icon = inRegistry ? '  OK  ' : manifest.has ? ' MISS ' : ' BARE ';
      const vis = repo.visibility === 'public' ? '' : ` [${repo.visibility}]`;
      const skills = skillCount !== null ? ` (${skillCount} skills)` : '';
      const manifestInfo = manifest.type ? ` [${manifest.type}]` : ' [no manifest]';
      console.log(`  ${icon} ${slug}${vis}${skills}${manifestInfo}`);
    }
  }

  // Compute summary data used by both output modes
  const total = results.length;
  const inReg = results.filter(r => r.inRegistry).length;
  const missing = results.filter(r => !r.inRegistry && r.hasManifest);
  const bare = results.filter(r => !r.hasManifest);

  const registrationReport = missing.map(m => ({
    slug: m.slug,
    repo: m.repo,
    gitUrl: `https://github.com/${ORG}/${m.repo}.git`,
    manifestType: m.manifestType,
    skillCount: m.skillCount,
    description: m.description,
  }));

  if (JSON_OUTPUT) {
    const output: Record<string, unknown> = {
      results,
      summary: { total, registered: inReg, missing: missing.length, bare: bare.length },
    };
    if (REGISTER) {
      output.register = { missing: registrationReport, action: 'seed' };
    }
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Human-readable output
  console.log(`\n  Summary: ${total} construct-* repos`);
  console.log(`    ${inReg} registered`);
  console.log(`    ${missing.length} with manifest but not registered`);
  console.log(`    ${bare.length} without manifest`);

  if (missing.length > 0) {
    console.log(`\n  Missing from registry:`);
    for (const m of missing) {
      console.log(`    ${m.slug} — ${m.description || 'no description'}`);
      console.log(`      git: https://github.com/${ORG}/${m.repo}.git`);
    }
  }

  if (REGISTER && missing.length > 0) {
    console.log(`\n  Registration Report (${missing.length} constructs)`);
    console.log(`  ${'─'.repeat(50)}`);

    for (const entry of registrationReport) {
      console.log(`\n    ${entry.slug}`);
      console.log(`      git:      ${entry.gitUrl}`);
      console.log(`      manifest: ${entry.manifestType}`);
      console.log(`      skills:   ${entry.skillCount ?? 'unknown'}`);
    }

    console.log(`\n  Next steps:`);
    console.log(`    1. Add entries to scripts/seed-forge-packs.ts GIT_CONFIGS`);
    console.log(`    2. Run: bun seed:forge`);
    console.log(`    — or —`);
    console.log(`    Run: AUTO_DISCOVER=true bun seed:forge`);
  }

  console.log('');
}

main().catch(err => {
  console.error('Discovery failed:', err);
  process.exit(1);
});
