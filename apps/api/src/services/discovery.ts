import { createHash } from 'crypto';
import yaml from 'js-yaml';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { packs, discoveryRuns, skills, type NewPack } from '../db/schema.js';
import { logger } from '../lib/logger.js';

/**
 * Discovery service (SDD §3.3, §6.1.1)
 *
 * Scans a GitHub org for `construct-*` repos, parses each repo's manifest
 * (`construct.yaml` / `loa.yaml` / `loa.config.yaml` — best-match precedence),
 * and upserts rows into `packs` (+ `skills` from manifest). Logs an audit row
 * to `discovery_runs` with caller fingerprint / IP / UA.
 *
 * Auth: operational-token only (admin middleware wraps the caller).
 *
 * Intentionally minimal: this is the post-cycle-012 replacement for a much
 * larger Postgres-era git-sync + discovery service. Manifest-field coverage
 * expands as future cycles grow the live surface.
 */

export interface DiscoveryResult {
  constructs_found: number;
  constructs_updated: number;
  constructs_created: number;
  errors: string[];
  run_id: string;
  duration_ms: number;
}

export interface DiscoveryCaller {
  fingerprint?: string;
  ip?: string;
  userAgent?: string;
}

const MANIFEST_CANDIDATES = [
  'construct.yaml',
  'construct.yml',
  'loa.yaml',
  'loa.config.yaml',
];

interface ParsedManifest {
  name?: string;
  description?: string;
  version?: string;
  category?: string;
  maturity?: string;
  visibility?: string;
  construct_type?: string;
  owner?: string;
  skills?: Array<{ name?: string; description?: string; slug?: string; path?: string }>;
}

async function githubFetch(url: string, token: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'loa-constructs-api/cycle-012',
    },
  });
}

async function listOrgRepos(owner: string, token: string): Promise<Array<Record<string, unknown>>> {
  const repos: Array<Record<string, unknown>> = [];
  let page = 1;
  const perPage = 100;
  for (;;) {
    const res = await githubFetch(
      `https://api.github.com/orgs/${owner}/repos?per_page=${perPage}&page=${page}&type=public`,
      token
    );
    if (!res.ok) {
      throw new Error(`GitHub repo list failed: HTTP ${res.status}`);
    }
    const batch = (await res.json()) as Array<Record<string, unknown>>;
    repos.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
    if (page > 20) break;
  }
  return repos;
}

async function fetchManifest(
  owner: string,
  repo: string,
  defaultBranch: string
): Promise<ParsedManifest | null> {
  for (const filename of MANIFEST_CANDIDATES) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${filename}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'loa-constructs-api/cycle-012' },
    });
    if (!res.ok) continue;
    const raw = await res.text();
    try {
      const parsed = yaml.load(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as ParsedManifest;
      }
    } catch (err) {
      logger.warn({ owner, repo, filename, err }, 'manifest parse failed');
    }
  }
  return null;
}

function tokenFingerprint(token: string | undefined): string | undefined {
  if (!token) return undefined;
  return createHash('sha256').update(token).digest('hex').slice(0, 8);
}

export async function runDiscovery(options: {
  owner: string;
  dryRun: boolean;
  githubToken: string;
  callerFingerprint?: string;
  callerIp?: string;
  callerUserAgent?: string;
}): Promise<DiscoveryResult> {
  const { owner, dryRun, githubToken } = options;
  const started = Date.now();
  const runRow = (
    await db
      .insert(discoveryRuns)
      .values({
        owner,
        dry_run: dryRun,
        triggered_by: 'operational-token',
        triggered_by_fingerprint: options.callerFingerprint,
        triggered_by_ip: options.callerIp,
        triggered_by_user_agent: options.callerUserAgent,
      })
      .returning()
  )[0];

  const errors: string[] = [];
  let found = 0;
  let updated = 0;
  let created = 0;

  try {
    const allRepos = await listOrgRepos(owner, githubToken);
    const constructRepos = allRepos.filter((r) => {
      const name = String(r.name ?? '');
      return name.startsWith('construct-');
    });
    found = constructRepos.length;

    for (const repo of constructRepos) {
      const repoName = String(repo.name ?? '');
      const defaultBranch = String(repo.default_branch ?? 'main');
      const htmlUrl = String(repo.html_url ?? '');

      const manifest = await fetchManifest(owner, repoName, defaultBranch);
      if (!manifest) {
        errors.push(`${owner}/${repoName}: no manifest found`);
        continue;
      }

      const slug = repoName.replace(/^construct-/, '');
      const existing = (
        await db.select().from(packs).where(eq(packs.slug, slug)).limit(1)
      )[0];

      const now = new Date();
      const payload: NewPack = {
        slug,
        name: manifest.name ?? slug,
        description: manifest.description ?? String(repo.description ?? ''),
        namespace: `${owner}/${repoName}`,
        version: manifest.version ?? '0.0.0',
        visibility: manifest.visibility ?? 'public',
        category: manifest.category ?? null,
        maturity: manifest.maturity ?? 'experimental',
        repo_url: htmlUrl,
        manifest: manifest as unknown as Record<string, unknown>,
        owner_id: String(repo.owner && typeof repo.owner === 'object' ? (repo.owner as { id?: unknown }).id : ''),
        owner_type: 'org',
        source_type: 'github',
        construct_type: manifest.construct_type ?? null,
        updated_at: now,
      };

      if (dryRun) continue;

      if (existing) {
        await db
          .update(packs)
          .set(payload)
          .where(eq(packs.id, existing.id))
          .run();
        updated += 1;
      } else {
        const inserted = (
          await db.insert(packs).values(payload).returning()
        )[0];
        created += 1;

        if (manifest.skills?.length) {
          for (const skill of manifest.skills) {
            if (!skill?.slug || !skill?.name) continue;
            await db
              .insert(skills)
              .values({
                pack_id: inserted.id,
                name: skill.name,
                description: skill.description ?? null,
                slug: skill.slug,
                path: skill.path ?? null,
              })
              .run();
          }
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`discovery failed: ${message}`);
    logger.error({ err }, 'discovery error');
  }

  await db
    .update(discoveryRuns)
    .set({
      completed_at: new Date(),
      constructs_found: found,
      constructs_updated: updated,
      constructs_created: created,
      errors: errors.length ? errors : null,
    })
    .where(eq(discoveryRuns.id, runRow.id))
    .run();

  return {
    constructs_found: found,
    constructs_updated: updated,
    constructs_created: created,
    errors,
    run_id: runRow.id,
    duration_ms: Date.now() - started,
  };
}

export function fingerprintFromHeader(authHeader: string | undefined): string | undefined {
  if (!authHeader) return undefined;
  const match = /^Bearer\s+(.+)$/.exec(authHeader.trim());
  if (!match) return undefined;
  return tokenFingerprint(match[1]);
}
