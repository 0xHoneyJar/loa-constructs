/**
 * Discovery Service — cycle-001 (2026-04-21)
 * Ported from scripts/discover-constructs.ts with three amendments:
 *   §14.3: Visibility preservation (AC-A5 — load-bearing)
 *   §14.5: trust_level population (evidence-only, no enforcement)
 *   §14.11: Manifest fallback chain (construct.yaml → construct.json)
 *
 * SEED: grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md
 */

import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { packs } from '../db/schema.js';
import { sql, eq } from 'drizzle-orm';
import { logger } from '../lib/logger.js';

// --- Types ---

export interface DiscoveryOpts {
  owner: string;
  dryRun?: boolean;
  githubToken?: string;
}

export interface DiscoveryResult {
  run_id: string;
  dry_run: boolean;
  owner: string;
  constructs_found: number;
  constructs_updated: number;
  constructs_skipped: number;
  details: {
    new: string[];
    updated: string[];
    unchanged: string[];
    visibility_preserved: string[];
  };
}

interface ManifestData {
  name?: string;
  slug?: string;
  description?: string;
  visibility?: string;
  trust_level?: string;
  version?: string;
  tags?: string[];
  source?: 'construct.yaml' | 'construct.json';
}

interface OrgRepo {
  name: string;
  visibility: string;
  defaultBranch: string;
  archived: boolean;
  description: string | null;
  url: string;
}

// --- GitHub API helpers ---

async function fetchOrgRepos(owner: string, token?: string): Promise<OrgRepo[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // cycle-002 F15: paginate. Large orgs (0xHoneyJar has 278 repos) scatter
  // construct-* names across pages 2-3. Fetching only page 1 silently
  // returned 0 constructs — the prod symptom behind F10.
  const all: Array<{
    name: string;
    visibility: string;
    default_branch: string;
    archived: boolean;
    description: string | null;
    html_url: string;
  }> = [];

  const MAX_PAGES = 10; // 100 * 10 = 1000 repos ceiling; fail loud if exceeded
  for (let page = 1; page <= MAX_PAGES; page++) {
    const resp = await fetch(
      `https://api.github.com/orgs/${owner}/repos?type=all&per_page=100&page=${page}`,
      { headers }
    );

    if (resp.status === 429) {
      throw Object.assign(new Error('GitHub rate limit hit'), { code: 'RATE_LIMIT' });
    }
    if (!resp.ok) {
      throw new Error(`GitHub API error: ${resp.status} ${resp.statusText}`);
    }

    const pageData = (await resp.json()) as typeof all;
    if (pageData.length === 0) break;
    all.push(...pageData);
    if (pageData.length < 100) break; // last page
    if (page === MAX_PAGES) {
      throw new Error(`Pagination ceiling hit (${MAX_PAGES} pages × 100). Org ${owner} has >1000 repos; raise MAX_PAGES.`);
    }
  }

  return all
    .filter(r => r.name.startsWith('construct-'))
    .map(r => ({
      name: r.name,
      visibility: r.visibility.toLowerCase(),
      defaultBranch: r.default_branch,
      archived: r.archived,
      description: r.description,
      url: r.html_url,
    }));
}

async function fetchManifest(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<ManifestData | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Amendment: try construct.yaml first, then construct.json (Hypha schema_v1)
  for (const filename of ['construct.yaml', 'construct.json'] as const) {
    const resp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filename}?ref=${branch}`,
      { headers }
    );

    if (resp.status === 404) continue;
    if (!resp.ok) continue;

    const fileData = (await resp.json()) as { content?: string; encoding?: string };
    if (!fileData.content || fileData.encoding !== 'base64') continue;

    const raw = Buffer.from(fileData.content.replace(/\n/g, ''), 'base64').toString('utf-8');

    try {
      if (filename === 'construct.yaml') {
        // Parse YAML inline — minimal field extraction without yq dependency
        const parsed = parseSimpleYaml(raw);
        return { ...parsed, source: 'construct.yaml' };
      } else {
        const parsed = JSON.parse(raw) as ManifestData;
        return { ...parsed, source: 'construct.json' };
      }
    } catch {
      logger.warn({ repo, filename }, 'Failed to parse manifest');
      continue;
    }
  }

  return null;
}

/** Minimal YAML key-value parser for flat construct.yaml fields */
function parseSimpleYaml(yaml: string): ManifestData {
  const result: ManifestData = {};
  for (const line of yaml.split('\n')) {
    const m = line.match(/^(\w+):\s*["']?(.+?)["']?\s*$/);
    if (!m) continue;
    const [, key, value] = m;
    const clean = value.replace(/^["']|["']$/g, '').trim();
    switch (key) {
      case 'name': result.name = clean; break;
      case 'slug': result.slug = clean; break;
      case 'description': result.description = clean; break;
      case 'visibility': result.visibility = clean; break;
      case 'trust_level': result.trust_level = clean; break;
      case 'version': result.version = clean; break;
    }
  }
  return result;
}

// --- Visibility preservation (§14.3 AMENDMENT — load-bearing) ---

function shouldPreserveVisibility(dbVisibility: string | null, incoming: string): boolean {
  return dbVisibility === 'public' && incoming === 'private';
}

// --- Main discovery function ---

export async function runDiscovery(opts: DiscoveryOpts): Promise<DiscoveryResult> {
  const { owner, dryRun = false } = opts;
  const githubToken = opts.githubToken ?? process.env.GITHUB_TOKEN;
  const run_id = randomUUID();

  const result: DiscoveryResult = {
    run_id,
    dry_run: dryRun,
    owner,
    constructs_found: 0,
    constructs_updated: 0,
    constructs_skipped: 0,
    details: {
      new: [],
      updated: [],
      unchanged: [],
      visibility_preserved: [],
    },
  };

  const repos = await fetchOrgRepos(owner, githubToken);
  result.constructs_found = repos.length;

  const performWrites = async () => {
    for (const repo of repos) {
      const slug = repo.name.replace(/^construct-/, '');

      const manifest = await fetchManifest(owner, repo.name, repo.defaultBranch, githubToken);

      if (!manifest) {
        logger.info({ repo: repo.name, reason: 'no_manifest' }, 'Skipping repo — no manifest');
        result.constructs_skipped = result.constructs_skipped + 1;
        continue;
      }

      // Read existing DB row for visibility preservation check
      const existing = await db
        .select({ id: packs.id, visibility: packs.visibility, slug: packs.slug })
        .from(packs)
        .where(eq(packs.slug, slug))
        .limit(1);

      const existingPack = existing[0] ?? null;
      const incomingVisibility = manifest.visibility ?? repo.visibility ?? 'public';

      let effectiveVisibility = incomingVisibility;
      let preserved = false;

      // §14.3 AMENDMENT: preserve public visibility — never silently demote
      if (existingPack && shouldPreserveVisibility(existingPack.visibility, incomingVisibility)) {
        effectiveVisibility = 'public';
        preserved = true;
        result.details.visibility_preserved.push(slug);
        logger.info({ slug, dbVisibility: 'public', incoming: incomingVisibility }, 'Visibility preserved — demotion blocked');
      }

      const packData = {
        slug: manifest.slug ?? slug,
        name: manifest.name ?? slug,
        description: manifest.description ?? repo.description ?? '',
        visibility: effectiveVisibility as 'public' | 'internal' | 'unlisted',
        gitUrl: repo.url,
        // trust_level: written only when present (Amendment 2 — §14.5)
        ...(manifest.trust_level !== undefined ? { trustLevel: manifest.trust_level } : {}),
        updatedAt: new Date(),
      };

      if (existingPack) {
        if (!preserved) {
          await db.update(packs).set(packData).where(eq(packs.id, existingPack.id));
          result.constructs_updated = result.constructs_updated + 1;
          result.details.updated.push(slug);
        } else {
          // Still update non-visibility fields
          const { visibility: _v, ...nonVisibilityData } = packData;
          await db.update(packs).set(nonVisibilityData).where(eq(packs.id, existingPack.id));
          result.constructs_skipped = result.constructs_skipped + 1;
        }
      } else {
        await db.insert(packs).values({
          ...packData,
          status: 'published' as const,
          submissionSource: 'org_sync' as const,
          createdAt: new Date(),
        });
        result.details.new.push(slug);
        result.constructs_updated = result.constructs_updated + 1;
      }
    }

    // Write discovery_runs row
    await db.execute(sql`
      INSERT INTO discovery_runs (run_id, status, owner, dry_run, constructs_found, constructs_updated, constructs_skipped, completed_at)
      VALUES (
        ${result.run_id}::uuid,
        'completed',
        ${owner},
        ${dryRun},
        ${result.constructs_found},
        ${result.constructs_updated},
        ${result.constructs_skipped},
        NOW()
      )
    `);
  };

  if (dryRun) {
    // Dry run: compute diff but roll back all pack writes
    await db.transaction(async () => {
      await performWrites();
      // Force rollback — transaction will be rolled back
      throw Object.assign(new Error('DRY_RUN_ROLLBACK'), { isDryRunRollback: true });
    }).catch(err => {
      if (!err.isDryRunRollback) throw err;
      // Expected: dry-run rollback
    });

    // Write the dry_run discovery_runs row OUTSIDE the rolled-back transaction
    await db.execute(sql`
      INSERT INTO discovery_runs (run_id, status, owner, dry_run, constructs_found, constructs_updated, constructs_skipped, completed_at)
      VALUES (
        ${result.run_id}::uuid,
        'completed',
        ${owner},
        true,
        ${result.constructs_found},
        ${result.constructs_updated},
        ${result.constructs_skipped},
        NOW()
      )
    `);
  } else {
    await performWrites();
  }

  return result;
}
