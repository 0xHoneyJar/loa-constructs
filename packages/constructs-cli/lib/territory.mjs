// Territory: the map, computed from the ground (T2.1–T2.4).
//
// Three strata, folded into one answer:
//   ZONES        who may write where            (grimoires/loa/zones.yaml)
//   ENVIRONMENT  what exists and what it may do (installed packs + their veves)
//   STATIONING   who answers for what           (each region's own territory.yaml)
//
// The atlas is computed, never hand-maintained — that is the whole point. And it says
// plainly what it is: `vantage: operator-local`. This machine's honest view of the estate,
// not a claim of shared truth. Conflating those two altitudes is how stale maps become
// outages (BB DR-001).

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from './vendor/yaml-subset.mjs';
import { validate } from './vendor/schema-subset.mjs';
import { match, overlaps, specificity, GlobError } from './vendor/glob.mjs';
import { readLocalPacks, packsRoot } from './sot.mjs';
import { EXIT } from './contract.mjs';

export const ATLAS_VERSION = '1.0';
export const MAX_SOURCES = 32;
export const DEFAULT_TIMEOUT_MS = 5_000;

export class TerritoryError extends Error {
  constructor(message, exitCode = EXIT.CALLER_ERROR, details = []) {
    super(message);
    this.name = 'TerritoryError';
    this.exitCode = exitCode;
    this.details = details;
  }
}

let cachedSchema = null;
async function territorySchema() {
  if (cachedSchema) return cachedSchema;
  const file = new URL('../schemas/territory.schema.json', import.meta.url);
  cachedSchema = JSON.parse(await readFile(file, 'utf8'));
  return cachedSchema;
}

// ── validation (T2.1 · T2.2) ──────────────────────────────────────────────────

/**
 * Validate a territory manifest. Returns the parsed doc, or throws with every reason.
 * Semantic checks the schema cannot express live here: scope syntax, intra-region
 * overlap, and loadout outcomes resolving against declared outcomes.
 */
export async function validateManifest(doc, { source = 'territory.yaml' } = {}) {
  const schema = await territorySchema();
  const { valid, errors } = validate(schema, doc);
  const problems = valid ? [] : errors.map((e) => `${source}${e}`);

  if (Array.isArray(doc?.scopes)) {
    for (const scope of doc.scopes) {
      try {
        match(scope, 'probe');
      } catch (err) {
        if (err instanceof GlobError) problems.push(`${source}: invalid scope ${JSON.stringify(scope)} — ${err.message}`);
        else throw err;
      }
    }
    // Intra-region overlap is an ERROR: a region that claims the same path twice has not
    // decided who owns it, and the atlas would have to guess. We refuse to guess.
    for (let i = 0; i < doc.scopes.length; i++) {
      for (let j = i + 1; j < doc.scopes.length; j++) {
        try {
          if (overlaps(doc.scopes[i], doc.scopes[j])) {
            problems.push(
              `${source}: scopes ${JSON.stringify(doc.scopes[i])} and ${JSON.stringify(doc.scopes[j])} overlap within one region — narrow one of them so ownership is unambiguous`
            );
          }
        } catch {
          // syntax already reported above
        }
      }
    }
  }

  const declared = new Set((doc?.outcomes ?? []).map((o) => o.id));
  for (const row of doc?.loadout ?? []) {
    for (const id of row.outcomes ?? []) {
      if (!declared.has(id)) {
        problems.push(
          `${source}: loadout construct ${JSON.stringify(row.construct)} claims outcome ${JSON.stringify(id)}, which this region does not declare. Declared: ${[...declared].join(', ') || '(none)'}`
        );
      }
    }
    for (const scope of row.scopes ?? []) {
      const inRegion = (doc.scopes ?? []).some((s) => {
        try {
          return overlaps(s, scope);
        } catch {
          return false;
        }
      });
      if (!inRegion) {
        problems.push(
          `${source}: loadout scope ${JSON.stringify(scope)} for ${JSON.stringify(row.construct)} lies outside the region's declared scopes — a warden cannot watch territory the region does not claim`
        );
      }
    }
  }

  if (problems.length) {
    throw new TerritoryError(
      `territory manifest is invalid (${problems.length} problem${problems.length > 1 ? 's' : ''})`,
      EXIT.CALLER_ERROR,
      problems
    );
  }
  return doc;
}

/** Read + parse + validate a region's manifest from disk. */
export async function readManifest(repoRoot = '.') {
  const file = path.join(repoRoot, 'grimoires', 'territory.yaml');
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch {
    return null; // a region without a manifest simply hasn't declared itself yet
  }
  const doc = parseYaml(raw);
  await validateManifest(doc, { source: file });
  return { ...doc, _source: file, _root: repoRoot };
}

// ── zones (the zone stratum) ──────────────────────────────────────────────────

export async function readZones(repoRoot = '.') {
  try {
    const raw = await readFile(path.join(repoRoot, 'grimoires', 'loa', 'zones.yaml'), 'utf8');
    const doc = parseYaml(raw);
    const zones = doc?.zones ?? {};
    return Object.entries(zones).map(([name, z]) => ({
      name,
      description: z?.description ?? '',
      tracked_paths: z?.tracked_paths ?? [],
    }));
  } catch {
    return [];
  }
}

// ── cross-region conflicts (T2.2) ─────────────────────────────────────────────

/**
 * Two regions claiming the same path is NOT an error — layered oversight is legitimate
 * (a seam-warden may reasonably watch territory an API-warden also watches). But it must
 * never be silent: it surfaces as a CONFLICT naming both maintainers, so a human decides.
 */
export function detectConflicts(regions) {
  const conflicts = [];
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const a = regions[i];
      const b = regions[j];
      for (const sa of a.scopes ?? []) {
        for (const sb of b.scopes ?? []) {
          try {
            if (overlaps(sa, sb)) {
              conflicts.push({
                kind: 'scope-overlap',
                regions: [a.region, b.region],
                scopes: [sa, sb],
                maintainers: [...(a.maintainers ?? []), ...(b.maintainers ?? [])],
                note: 'two regions claim overlapping territory; both maintainers are named so a human decides. This is surfaced, never auto-resolved.',
              });
            }
          } catch {
            // invalid scope — already reported by the validator
          }
        }
      }
    }
  }
  conflicts.sort((x, y) => x.regions.join().localeCompare(y.regions.join()));
  return conflicts;
}

// ── atlas (T2.3) ──────────────────────────────────────────────────────────────

/**
 * Fold every stratum into one deterministic document.
 *
 * Per-source error capture (the L5 pattern): one unreachable source never aborts the read.
 * It lands in `failed_sources[]`, the answer is marked `partial: true`, and the exit stays 0 —
 * a partial map that says so is far more useful than no map at all.
 */
export async function atlas({ sources = ['.'], timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (sources.length > MAX_SOURCES) {
    throw new TerritoryError(
      `atlas.sources has ${sources.length} entries, over the bound of ${MAX_SOURCES}. The discovery set is explicit and bounded on purpose — an unbounded filesystem walk is not a map, it is a crawl.`,
      EXIT.CALLER_ERROR
    );
  }

  const regions = [];
  const failed = [];

  const results = await Promise.all(
    sources.map(async (src) => {
      const deadline = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`source timed out after ${timeoutMs}ms`)), timeoutMs)
      );
      try {
        return { src, manifest: await Promise.race([readManifest(src), deadline]) };
      } catch (err) {
        return { src, error: err?.message ?? String(err) };
      }
    })
  );

  for (const r of results) {
    if (r.error) {
      failed.push({ source: r.src, error: r.error });
      continue;
    }
    if (r.manifest) regions.push(r.manifest);
  }

  const zones = await readZones(sources[0] ?? '.');
  const local = await readLocalPacks();

  const installed = local.packs.map((p) => p.slug);
  const stationed = new Map();
  for (const region of regions) {
    for (const row of region.loadout ?? []) {
      if (!stationed.has(row.construct)) stationed.set(row.construct, []);
      stationed.get(row.construct).push(region.region);
    }
  }

  const regionBlocks = regions
    .map((r) => ({
      region: r.region,
      maintainers: r.maintainers ?? [],
      source: r._source,
      outcomes: (r.outcomes ?? []).map((o) => ({ id: o.id, description: o.description })),
      scopes: [...(r.scopes ?? [])].sort(),
      loadout: (r.loadout ?? [])
        .map((row) => ({
          construct: row.construct,
          outcomes: [...row.outcomes].sort(),
          scopes: row.scopes ? [...row.scopes].sort() : null,
          // The manifest declares a CEILING. The EARNED tier comes from the L4 ledger, and
          // until that ledger is read and verified, the honest answer is `unknown` — which
          // every consumer must treat as `observe`.
          authority_ceiling: row.authority_tier ?? 'observe',
          authority_earned: 'unknown',
          authority_effective: 'observe',
          installed: installed.includes(row.construct),
        }))
        .sort((a, b) => a.construct.localeCompare(b.construct)),
      trust: r.trust ?? null,
    }))
    .sort((a, b) => a.region.localeCompare(b.region));

  return {
    atlas_version: ATLAS_VERSION,
    vantage: 'operator-local',
    vantage_note:
      'This is this machine\'s honest view of the estate — the same altitude as `loa census`, not a claim of shared truth. Sources are local paths; a source this machine cannot see is reported, never silently omitted.',
    partial: failed.length > 0,
    failed_sources: failed,
    zones: zones.map((z) => ({ name: z.name, tracked_paths: [...z.tracked_paths].sort() })).sort((a, b) => a.name.localeCompare(b.name)),
    regions: regionBlocks,
    conflicts: detectConflicts(regions),
    estate: {
      installed_packs: installed.length,
      corrupt_packs: local.corrupt.length,
      stationed_constructs: stationed.size,
      unstationed_installed: installed.filter((s) => !stationed.has(s)).sort(),
    },
  };
}

// ── where (T2.4) ──────────────────────────────────────────────────────────────

/**
 * Resolve any path, noun, or slug to the six things an agent needs to act safely:
 * zone, region, owner, loadout, gate, provenance.
 *
 * Nested claims resolve nearest-scope-wins: the most specific scope owns the path.
 */
export async function where(target, { sources = ['.'] } = {}) {
  const map = await atlas({ sources });

  const zone = map.zones.find((z) => z.tracked_paths.some((p) => {
    try {
      return match(p, target);
    } catch {
      return false;
    }
  })) ?? null;

  const matching = [];
  for (const region of map.regions) {
    for (const scope of region.scopes) {
      try {
        if (match(scope, target)) matching.push({ region, scope, specificity: specificity(scope) });
      } catch {
        // invalid scope already surfaced by the validator
      }
    }
  }
  matching.sort((a, b) => b.specificity - a.specificity);
  const owner = matching[0] ?? null;

  const loadout = owner
    ? owner.region.loadout.filter(
        (row) => !row.scopes || row.scopes.some((s) => {
          try {
            return match(s, target);
          } catch {
            return false;
          }
        })
      )
    : [];

  return {
    target,
    zone: zone ? zone.name : null,
    region: owner ? owner.region.region : null,
    owner: owner ? owner.region.maintainers : [],
    matched_scope: owner ? owner.scope : null,
    also_claimed_by: matching.slice(1).map((m) => ({ region: m.region.region, scope: m.scope })),
    loadout: loadout.map((row) => ({
      construct: row.construct,
      outcomes: row.outcomes,
      authority_ceiling: row.authority_ceiling,
      authority_effective: row.authority_effective,
    })),
    // The gate is the region's git permissions — not an API key, not this CLI.
    gate: owner ? 'region-git-permissions (a stationing is live when the manifest edit is committed on the region\'s default branch)' : null,
    provenance: {
      vantage: 'operator-local',
      resolved_by: owner ? 'nearest-scope-wins' : 'no region claims this path',
      sources_consulted: sources,
      partial: map.partial,
    },
  };
}

export default { atlas, where, validateManifest, readManifest, detectConflicts, TerritoryError, ATLAS_VERSION };
