// The territory-first source-of-truth ladder (T1.6 · PRD FR-4 · NFR-1).
//
//   rung 1  local packs      — what is actually installed on this machine (territory)
//   rung 2  api              — the network's answer
//   rung 3  registry.yaml    — the tracked git answer (the folded constructs-cli lane)
//
// Two rules make this honest:
//   1. Every answer names the rung that produced it (`provenance`). No anonymous truth.
//   2. When rungs disagree, we DO NOT MERGE. We emit the data, list the disagreement in
//      `drift[]`, and exit 5. Silent reconciliation is how a map starts lying.
//
// Cache is a declared input, not a hidden one: entries are content-hashed and the
// provenance says whether the answer came from cache, the wire, or a bypass.

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { parse as parseYaml } from './vendor/yaml-subset.mjs';
import { EXIT } from './contract.mjs';

export const RUNGS = Object.freeze({ LOCAL: 'local-packs', API: 'api', REGISTRY: 'registry-yaml' });

export class SotError extends Error {
  constructor(message, exitCode = EXIT.TOOL_FAILURE) {
    super(message);
    this.name = 'SotError';
    this.exitCode = exitCode;
  }
}

const DEFAULT_API = 'https://api.constructs.network/v1';
const CACHE_TTL_MS = 15 * 60 * 1000;

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function cacheDir() {
  return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'constructs-cli');
}

async function cacheRead(key) {
  try {
    const file = path.join(cacheDir(), `${sha256(key)}.json`);
    const raw = await readFile(file, 'utf8');
    const entry = JSON.parse(raw);
    if (entry.content_hash !== sha256(JSON.stringify(entry.data))) return null; // corrupt → miss
    const age = Date.now() - Date.parse(entry.fetched_at);
    if (Number.isFinite(age) && age > CACHE_TTL_MS) return null; // stale → miss
    return entry;
  } catch {
    return null;
  }
}

async function cacheWrite(key, data) {
  try {
    const dir = cacheDir();
    await mkdir(dir, { recursive: true, mode: 0o700 });
    const entry = {
      key,
      data,
      content_hash: sha256(JSON.stringify(data)),
      fetched_at: new Date().toISOString(),
    };
    await writeFile(path.join(dir, `${sha256(key)}.json`), JSON.stringify(entry), { mode: 0o600 });
  } catch {
    // A cache we cannot write is a performance problem, never a correctness one.
  }
}

// ─── rung 1: local packs ──────────────────────────────────────────────────────

export function packsRoot() {
  return process.env.CONSTRUCTS_DIR || path.join('.claude', 'constructs', 'packs');
}

function unavailableMechanics(reason) {
  return {
    kind: 'unavailable',
    authority_effect: 'none',
    reason,
    skills: [],
    commands: [],
  };
}

function orientationFromManifest(manifest, summary) {
  const identity = manifest?.identity ?? {};
  return {
    kind: 'prose',
    authoritative: false,
    description: manifest?.description ?? summary.description ?? '',
    short_description: manifest?.short_description ?? null,
    domains: Array.isArray(manifest?.domain) ? manifest.domain : [],
    persona_ref: typeof identity?.persona === 'string' ? identity.persona : null,
    expertise_ref: typeof identity?.expertise === 'string' ? identity.expertise : null,
  };
}

function normalizeDeclaredRef(value, key) {
  if (typeof value === 'string') return { [key]: value, path: null };
  if (!value || typeof value !== 'object') return null;
  const id = value[key] ?? value.slug ?? value.name;
  if (typeof id !== 'string' || id.length === 0) return null;
  return {
    [key]: id,
    path: typeof value.path === 'string' ? value.path : null,
  };
}

async function readSkillMechanics(packDir, declared) {
  const skill = normalizeDeclaredRef(declared, 'slug');
  if (!skill) return null;
  if (!skill.path) return { ...skill, metadata_status: 'missing', entry: null, capabilities: null };

  const packRoot = await realpath(packDir);
  const lexical = path.resolve(packDir, skill.path, 'index.yaml');
  const lexicalInside = lexical.startsWith(`${path.resolve(packDir)}${path.sep}`);
  if (!lexicalInside) {
    return { ...skill, metadata_status: 'invalid-path', entry: null, capabilities: null };
  }

  try {
    const actual = await realpath(lexical);
    if (!actual.startsWith(`${packRoot}${path.sep}`)) {
      return { ...skill, metadata_status: 'invalid-path', entry: null, capabilities: null };
    }
    const index = parseYaml(await readFile(actual, 'utf8'));
    return {
      ...skill,
      metadata_status: 'declared',
      entry: typeof index?.entry === 'string' ? index.entry : null,
      capabilities: index?.capabilities && typeof index.capabilities === 'object'
        ? index.capabilities
        : null,
    };
  } catch {
    return { ...skill, metadata_status: 'missing', entry: null, capabilities: null };
  }
}

/**
 * Resolve the full local info surface for one installed construct.
 *
 * The split is deliberate: `orientation` is prose and can only orient;
 * `mechanics` is a declaration read from construct.yaml + skill index.yaml and
 * grants no authority. Territory/L4 are the only authority surfaces.
 */
export async function inspectLocalConstruct(slug, root = packsRoot()) {
  const local = await readLocalPacks(root);
  const summary = local.packs.find((pack) => pack.slug === slug);
  if (!summary) return null;

  const manifest = parseYaml(await readFile(path.join(summary.source, 'construct.yaml'), 'utf8'));
  const skills = (await Promise.all((manifest?.skills ?? []).map((skill) => readSkillMechanics(summary.source, skill))))
    .filter(Boolean)
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const commands = (manifest?.commands ?? [])
    .map((command) => normalizeDeclaredRef(command, 'name'))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ...summary,
    info_schema_version: '1.0',
    orientation: orientationFromManifest(manifest, summary),
    mechanics: {
      kind: 'declared',
      authority_effect: 'none',
      source_refs: ['construct.yaml', ...skills
        .filter((skill) => skill.path)
        .map((skill) => path.posix.join(skill.path, 'index.yaml'))],
      skills,
      commands,
      streams: manifest?.streams && typeof manifest.streams === 'object' ? manifest.streams : null,
      events: manifest?.events && typeof manifest.events === 'object' ? manifest.events : null,
    },
  };
}

export async function inspectConstruct(slug, opts = {}) {
  const result = await listConstructs(opts);
  const found = result.data.find((construct) => construct.slug === slug) ?? null;
  if (!found) return { ...result, data: null };

  if (result.provenance.rung === RUNGS.LOCAL) {
    const detailed = await inspectLocalConstruct(slug, opts.localRoot ?? packsRoot());
    if (detailed) return { ...result, data: detailed };
  }

  return {
    ...result,
    data: {
      ...found,
      info_schema_version: '1.0',
      orientation: {
        kind: 'prose',
        authoritative: false,
        description: found.description ?? '',
        short_description: null,
        domains: [],
        persona_ref: null,
        expertise_ref: null,
      },
      mechanics: unavailableMechanics(`source rung ${result.provenance.rung} does not expose construct mechanics`),
    },
  };
}

/**
 * Read the installed packs. A pack whose recorded content hash no longer matches
 * its meta is CORRUPT: we skip it and flag it, rather than answering from it.
 */
export async function readLocalPacks(root = packsRoot()) {
  const packs = [];
  const corrupt = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return { packs, corrupt, present: false };
  }

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const dir = path.join(root, entry.name);
    try {
      const manifestPath = path.join(dir, 'construct.yaml');
      const raw = await readFile(manifestPath, 'utf8');
      const manifest = parseYaml(raw);

      let meta = null;
      try {
        meta = JSON.parse(await readFile(path.join(dir, '.construct-meta.json'), 'utf8'));
      } catch {
        // no meta — an unmanaged/dev pack; still a real local answer
      }

      if (meta?.content_hash) {
        const actual = sha256(raw);
        if (meta.content_hash !== actual) {
          corrupt.push({ slug: entry.name, reason: 'content hash does not match .construct-meta.json' });
          continue;
        }
      }

      packs.push({
        slug: manifest.slug || manifest.name || entry.name,
        name: manifest.name ?? entry.name,
        version: String(manifest.version ?? '0.0.0'),
        description: manifest.description ?? '',
        skills_count: Array.isArray(manifest.skills) ? manifest.skills.length : 0,
        source: dir,
      });
    } catch (err) {
      if (err?.code === 'YAML_OUT_OF_SUBSET') {
        corrupt.push({ slug: entry.name, reason: err.message });
      }
      // no construct.yaml → not a pack; ignore silently
    }
  }
  packs.sort((a, b) => a.slug.localeCompare(b.slug));
  return { packs, corrupt, present: true };
}

// ─── rung 2: the network API ──────────────────────────────────────────────────

export async function apiFetch(pathname, { timeoutMs = 10_000, noCache = false } = {}) {
  const base = process.env.CONSTRUCTS_API_URL || DEFAULT_API;
  const url = `${base}${pathname}`;

  if (!noCache) {
    const hit = await cacheRead(url);
    if (hit) return { data: hit.data, cache: 'hit', fetched_at: hit.fetched_at };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'constructs-cli/0.1.0', Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new SotError(`api ${res.status} for ${pathname}`, EXIT.TOOL_FAILURE);
    }
    const data = await res.json();
    await cacheWrite(url, data);
    return { data, cache: noCache ? 'bypass' : 'miss', fetched_at: new Date().toISOString() };
  } finally {
    clearTimeout(timer);
  }
}

// ─── rung 3: registry.yaml (git-native) ───────────────────────────────────────

export async function readRegistryYaml(file = 'registry.yaml') {
  try {
    const raw = await readFile(file, 'utf8');
    const doc = parseYaml(raw);
    const constructs = doc?.constructs ?? {};
    return Object.entries(constructs).map(([slug, meta]) => ({
      slug,
      name: slug,
      version: String(meta?.version ?? '0.0.0'),
      description: meta?.description ?? '',
      git_url: meta?.git_url ?? null,
      commit: meta?.commit ?? null,
      skills_count: 0,
    }));
  } catch (err) {
    if (err?.code === 'YAML_OUT_OF_SUBSET') throw new SotError(err.message, EXIT.CALLER_ERROR);
    return null;
  }
}

// ─── drift ────────────────────────────────────────────────────────────────────

/**
 * Compare what each rung said about the same slugs. We report disagreement; we never
 * pick a winner behind the caller's back.
 */
export function detectDrift(answers) {
  const drift = [];
  const bySlug = new Map();

  for (const { rung, items } of answers) {
    for (const item of items ?? []) {
      if (!bySlug.has(item.slug)) bySlug.set(item.slug, new Map());
      bySlug.get(item.slug).set(rung, item);
    }
  }

  for (const [slug, byRung] of bySlug) {
    const rungs = [...byRung.keys()];
    if (rungs.length < 2) continue;

    const versions = new Map();
    for (const [rung, item] of byRung) versions.set(rung, item.version ?? null);
    const distinct = new Set([...versions.values()].filter((v) => v && v !== '0.0.0'));
    if (distinct.size > 1) {
      drift.push({
        slug,
        kind: 'version-disagreement',
        rungs: Object.fromEntries(versions),
        note: 'rungs report different versions for the same construct; no merge was performed',
      });
    }
  }

  // A construct that exists in one rung and is absent from another it should be in.
  const seen = [...bySlug.entries()];
  const rungsPresent = answers.filter((a) => a.items != null).map((a) => a.rung);
  if (rungsPresent.includes(RUNGS.API) && rungsPresent.includes(RUNGS.REGISTRY)) {
    for (const [slug, byRung] of seen) {
      if (byRung.has(RUNGS.API) !== byRung.has(RUNGS.REGISTRY)) {
        drift.push({
          slug,
          kind: 'existence-disagreement',
          rungs: {
            [RUNGS.API]: byRung.has(RUNGS.API) ? 'present' : 'absent',
            [RUNGS.REGISTRY]: byRung.has(RUNGS.REGISTRY) ? 'present' : 'absent',
          },
          note: 'construct present in one rung and absent in another',
        });
      }
    }
  }

  drift.sort((a, b) => a.slug.localeCompare(b.slug) || a.kind.localeCompare(b.kind));
  return drift;
}

/**
 * Answer a listing query by walking the ladder.
 *
 * @param {{noCache?: boolean, rung?: string, timeoutMs?: number}} opts
 * @returns {Promise<{data: any[], provenance: object, drift: any[], corrupt: any[], exitCode: number}>}
 */
export async function listConstructs(opts = {}) {
  const { noCache = false, rung: pinned = null, timeoutMs = 10_000 } = opts;
  const answers = [];
  const corrupt = [];
  let cacheState = 'n/a';

  const wantLocal = !pinned || pinned === RUNGS.LOCAL;
  const wantApi = !pinned || pinned === RUNGS.API;
  const wantRegistry = !pinned || pinned === RUNGS.REGISTRY;

  if (wantLocal) {
    const local = await readLocalPacks();
    corrupt.push(...local.corrupt);
    if (local.present && local.packs.length) answers.push({ rung: RUNGS.LOCAL, items: local.packs });
  }

  if (wantApi) {
    try {
      // per_page is capped at 100 server-side; 200 is a 400.
      const res = await apiFetch('/constructs?per_page=100', { timeoutMs, noCache });
      cacheState = res.cache;
      const items = (res.data?.data ?? []).map((c) => ({
        slug: c.slug,
        name: c.name ?? c.slug,
        version: String(c.version ?? '0.0.0'),
        description: c.description ?? '',
        skills_count: c.skills_count ?? 0,
      }));
      answers.push({ rung: RUNGS.API, items });
    } catch {
      // The network is allowed to be down. We degrade to the git rung and say so.
    }
  }

  if (wantRegistry) {
    const items = await readRegistryYaml();
    if (items) answers.push({ rung: RUNGS.REGISTRY, items });
  }

  if (answers.length === 0) {
    throw new SotError(
      'no source-of-truth rung could answer. Tried: local packs, api, registry.yaml.\n' +
        '  Try: constructs doctor --json    (to see which rungs are reachable)',
      EXIT.TOOL_FAILURE
    );
  }

  const winner = answers[0];
  const drift = pinned ? [] : detectDrift(answers);

  return {
    data: winner.items,
    provenance: {
      rung: winner.rung,
      pinned: Boolean(pinned),
      cache: winner.rung === RUNGS.API ? cacheState : 'n/a',
      rungs_consulted: answers.map((a) => a.rung),
      vantage: 'operator-local',
    },
    drift,
    corrupt,
    exitCode: drift.length ? EXIT.DRIFT_DETECTED : EXIT.OK,
  };
}

export default {
  RUNGS,
  listConstructs,
  inspectConstruct,
  inspectLocalConstruct,
  readLocalPacks,
  readRegistryYaml,
  detectDrift,
  apiFetch,
  SotError,
};
