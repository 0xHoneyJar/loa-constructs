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
const manifestSnapshots = new WeakMap();

const CAPABILITY_STRING_FIELDS = Object.freeze([
  'model_tier',
  'danger_level',
  'effort_hint',
  'execution_hint',
]);
const CAPABILITY_BOOLEAN_FIELDS = Object.freeze(['downgrade_allowed']);
const CAPABILITY_REQUIRE_FIELDS = Object.freeze([
  'native_runtime',
  'tool_calling',
  'thinking_traces',
  'vision',
]);

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

function normalizeSkillCapabilities(value) {
  if (value == null) return { valid: true, value: null };
  if (typeof value !== 'object' || Array.isArray(value)) return { valid: false, value: null };

  const allowed = new Set([
    ...CAPABILITY_STRING_FIELDS,
    ...CAPABILITY_BOOLEAN_FIELDS,
    'requires',
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return { valid: false, value: null };
  }

  const normalized = {};
  for (const key of CAPABILITY_STRING_FIELDS) {
    if (!(key in value)) continue;
    if (typeof value[key] !== 'string' || value[key].length === 0) {
      return { valid: false, value: null };
    }
    normalized[key] = value[key];
  }
  for (const key of CAPABILITY_BOOLEAN_FIELDS) {
    if (!(key in value)) continue;
    if (typeof value[key] !== 'boolean') return { valid: false, value: null };
    normalized[key] = value[key];
  }

  if ('requires' in value) {
    const requirements = value.requires;
    if (!requirements || typeof requirements !== 'object' || Array.isArray(requirements)) {
      return { valid: false, value: null };
    }
    if (Object.keys(requirements).some((key) => !CAPABILITY_REQUIRE_FIELDS.includes(key))) {
      return { valid: false, value: null };
    }
    normalized.requires = {};
    for (const key of CAPABILITY_REQUIRE_FIELDS) {
      if (!(key in requirements)) continue;
      if (typeof requirements[key] !== 'boolean') return { valid: false, value: null };
      normalized.requires[key] = requirements[key];
    }
  }

  return { valid: true, value: normalized };
}

function isInside(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function fsFailureStatus(error) {
  if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return 'missing';
  if (error?.code === 'EACCES' || error?.code === 'EPERM') return 'inaccessible';
  return 'invalid';
}

async function resolvePackPath(packDir, declaredPath, { baseDir = packDir, expect = 'file' } = {}) {
  if (typeof declaredPath !== 'string' || declaredPath.length === 0 || path.isAbsolute(declaredPath)) {
    return { status: 'invalid-path', path: null, actual: null };
  }

  const packRoot = await realpath(packDir);
  const baseRoot = await realpath(baseDir);
  const lexical = path.resolve(baseRoot, declaredPath);
  if (!isInside(baseRoot, lexical) || !isInside(packRoot, lexical)) {
    return { status: 'invalid-path', path: null, actual: null };
  }

  try {
    const actual = await realpath(lexical);
    if (!isInside(packRoot, actual) || !isInside(baseRoot, actual)) {
      return { status: 'invalid-path', path: null, actual: null };
    }
    const info = await stat(actual);
    if ((expect === 'file' && !info.isFile()) || (expect === 'directory' && !info.isDirectory())) {
      return { status: 'invalid', path: null, actual: null };
    }
    return {
      status: 'declared',
      path: path.relative(packRoot, actual).split(path.sep).join('/'),
      actual,
    };
  } catch (error) {
    return { status: fsFailureStatus(error), path: null, actual: null };
  }
}

async function readSkillMechanics(packDir, declared) {
  const skill = normalizeDeclaredRef(declared, 'slug');
  if (!skill) return null;
  if (!skill.path) return { ...skill, metadata_status: 'missing', entry: null, capabilities: null };

  const skillDir = await resolvePackPath(packDir, skill.path, { expect: 'directory' });
  if (skillDir.status !== 'declared') {
    return { ...skill, path: null, metadata_status: skillDir.status, entry: null, capabilities: null };
  }

  try {
    const indexFile = await resolvePackPath(packDir, 'index.yaml', { baseDir: skillDir.actual });
    if (indexFile.status !== 'declared') {
      return {
        ...skill,
        path: skillDir.path,
        metadata_status: indexFile.status,
        entry: null,
        capabilities: null,
      };
    }
    const index = parseYaml(await readFile(indexFile.actual, 'utf8'));
    if (!index || typeof index !== 'object' || typeof index.entry !== 'string') {
      return { ...skill, path: skillDir.path, metadata_status: 'invalid', entry: null, capabilities: null };
    }
    const capabilities = normalizeSkillCapabilities(index.capabilities);
    if (!capabilities.valid) {
      return { ...skill, path: skillDir.path, metadata_status: 'invalid', entry: null, capabilities: null };
    }
    const entryFile = await resolvePackPath(packDir, index.entry, { baseDir: skillDir.actual });
    if (entryFile.status !== 'declared') {
      return {
        ...skill,
        path: skillDir.path,
        metadata_status: entryFile.status,
        entry: null,
        capabilities: null,
      };
    }
    return {
      ...skill,
      path: skillDir.path,
      metadata_status: 'declared',
      entry: path.relative(skillDir.actual, entryFile.actual).split(path.sep).join('/'),
      capabilities: capabilities.value,
    };
  } catch (error) {
    return {
      ...skill,
      path: skillDir.path,
      metadata_status: fsFailureStatus(error),
      entry: null,
      capabilities: null,
    };
  }
}

async function readCommandMechanics(packDir, declared) {
  const command = normalizeDeclaredRef(declared, 'name');
  if (!command) return null;
  if (!command.path) return { ...command, path_status: 'missing' };
  const resolved = await resolvePackPath(packDir, command.path);
  return {
    ...command,
    path: resolved.path,
    path_status: resolved.status,
  };
}

/**
 * Resolve the full local info surface for one installed construct.
 *
 * The split is deliberate: `orientation` is prose and can only orient;
 * `mechanics` is a declaration read from construct.yaml + skill index.yaml and
 * grants no authority. Territory/L4 are the only authority surfaces.
 */
async function inspectLocalSummary(summary) {
  const manifestRaw = manifestSnapshots.get(summary);
  if (typeof manifestRaw !== 'string') {
    throw new SotError('local construct manifest snapshot is unavailable', EXIT.TOOL_FAILURE);
  }
  const manifest = parseYaml(manifestRaw);
  const declaredSkills = Array.isArray(manifest?.skills) ? manifest.skills : [];
  const declaredCommands = Array.isArray(manifest?.commands) ? manifest.commands : [];
  const skills = (await Promise.all(declaredSkills.map((skill) => readSkillMechanics(summary.source, skill))))
    .filter(Boolean)
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const commands = (await Promise.all(declaredCommands.map((command) => readCommandMechanics(summary.source, command))))
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
        .filter((skill) => skill.metadata_status === 'declared' && skill.path)
        .map((skill) => path.posix.join(skill.path, 'index.yaml'))],
      skills,
      commands,
      streams: manifest?.streams && typeof manifest.streams === 'object' ? manifest.streams : null,
      events: manifest?.events && typeof manifest.events === 'object' ? manifest.events : null,
    },
  };
}

export async function inspectLocalConstruct(slug, root = packsRoot()) {
  const local = await readLocalPacks(root);
  const summary = local.packs.find((pack) => pack.slug === slug);
  return summary ? inspectLocalSummary(summary) : null;
}

export async function inspectConstruct(slug, opts = {}) {
  const result = await listConstructs(opts);
  const found = result.data.find((construct) => construct.slug === slug) ?? null;
  if (!found) return { ...result, data: null };

  if (result.provenance.rung === RUNGS.LOCAL) {
    return { ...result, data: await inspectLocalSummary(found) };
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

      const summary = {
        slug: manifest.slug || manifest.name || entry.name,
        name: manifest.name ?? entry.name,
        version: String(manifest.version ?? '0.0.0'),
        description: manifest.description ?? '',
        skills_count: Array.isArray(manifest.skills) ? manifest.skills.length : 0,
        source: dir,
      };
      manifestSnapshots.set(summary, raw);
      packs.push(summary);
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
 * @param {{noCache?: boolean, rung?: string, timeoutMs?: number, localRoot?: string}} opts
 * @returns {Promise<{data: any[], provenance: object, drift: any[], corrupt: any[], exitCode: number}>}
 */
export async function listConstructs(opts = {}) {
  const {
    noCache = false,
    rung: pinned = null,
    timeoutMs = 10_000,
    localRoot = packsRoot(),
  } = opts;
  const answers = [];
  const corrupt = [];
  let cacheState = 'n/a';

  const wantLocal = !pinned || pinned === RUNGS.LOCAL;
  const wantApi = !pinned || pinned === RUNGS.API;
  const wantRegistry = !pinned || pinned === RUNGS.REGISTRY;

  if (wantLocal) {
    const local = await readLocalPacks(localRoot);
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
