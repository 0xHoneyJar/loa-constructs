#!/usr/bin/env node
// constructs — navigation & stationing for the constructs network.
//
// Output discipline (Axiom 4, non-negotiable): stdout is DATA, stderr is DIAGNOSTICS.
// `constructs list --json | jq` must never need a grep to survive.
//
// Bare invocation prints triage-help and exits 0. It never opens a TUI — an agent that
// didn't expect one would hang forever (Axiom 15).

import {
  VERBS,
  EXIT,
  capabilities,
  helpText,
  robotDocs,
  resolveVerb,
  allVerbTokens,
  MUTATION_VERBS,
} from '../lib/contract.mjs';
import { listConstructs, readLocalPacks, RUNGS, SotError } from '../lib/sot.mjs';
import { atlas, where, TerritoryError } from '../lib/territory.mjs';
import { station, StationError } from '../lib/station.mjs';

// ─── output ───────────────────────────────────────────────────────────────────

const isTTY = process.stdout.isTTY === true;
const colorOff = !isTTY || process.env.NO_COLOR !== undefined || process.argv.includes('--no-color');

function out(text) {
  process.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
}

function emitJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function diag(text) {
  process.stderr.write(text.endsWith('\n') ? text : `${text}\n`);
}

function dim(text) {
  return colorOff ? text : `[2m${text}[0m`;
}

/**
 * Every error the agent sees names three things: what failed, where, and the exact
 * command to run instead. "See --help" on its own is a failure of this function.
 */
function fail(exitCode, what, fix) {
  diag(`error: ${what}`);
  if (fix) diag(`  try: ${fix}`);
  process.exitCode = exitCode;
}

// ─── intent inference (T1.5) ──────────────────────────────────────────────────

// Damerau-Levenshtein (optimal string alignment): counts a transposition as ONE edit.
// Plain Levenshtein scores `statoin` → `station` as 2 and would miss the most common
// typo an agent (or a human) actually makes.
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); // transposition
      }
    }
  }
  return d[m][n];
}

/**
 * Candidates within edit distance 1 of the token.
 * Ambiguity NEVER guesses: two equally-close candidates ⇒ the caller refuses and lists both.
 */
export function inferVerb(token) {
  const tokens = allVerbTokens();
  const scored = tokens
    .map((t) => ({ token: t, distance: editDistance(token, t) }))
    .filter((c) => c.distance <= 1)
    .sort((a, b) => a.distance - b.distance);

  if (scored.length === 0) return { kind: 'none', candidates: [] };

  const best = scored[0].distance;
  const tied = scored.filter((c) => c.distance === best);
  const distinctVerbs = [...new Set(tied.map((c) => resolveVerb(c.token)?.name).filter(Boolean))];

  if (distinctVerbs.length > 1) {
    return { kind: 'ambiguous', candidates: distinctVerbs };
  }
  return { kind: 'single', verb: resolveVerb(tied[0].token), matched: tied[0].token };
}

// ─── arg parsing ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=');
      const next = argv[i + 1];
      if (inline !== undefined) {
        flags[key] = inline;
      } else if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

// ─── verb handlers ────────────────────────────────────────────────────────────

function rungFromFlag(value) {
  if (!value || value === true) return null;
  const map = { local: RUNGS.LOCAL, api: RUNGS.API, registry: RUNGS.REGISTRY };
  const resolved = map[value] ?? (Object.values(RUNGS).includes(value) ? value : null);
  if (!resolved) {
    throw new SotError(
      `unknown --rung ${JSON.stringify(value)}. Valid: local, api, registry`,
      EXIT.CALLER_ERROR
    );
  }
  return resolved;
}

async function cmdList(flags, { filter = null, wantJson }) {
  const result = await listConstructs({
    noCache: Boolean(flags['no-cache']),
    rung: rungFromFlag(flags.rung),
  });

  let data = result.data;
  if (filter) {
    const q = filter.toLowerCase();
    data = data.filter(
      (c) => c.slug.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
    );
  }

  if (wantJson) {
    emitJson({
      data,
      provenance: result.provenance,
      drift: result.drift,
      corrupt: result.corrupt,
    });
  } else {
    if (data.length === 0) {
      out('No constructs found.');
    } else {
      const width = Math.max(...data.map((c) => c.slug.length), 9);
      out('');
      out(`  ${'CONSTRUCT'.padEnd(width)}  ${'VER'.padEnd(8)}  DESCRIPTION`);
      out(`  ${'─'.repeat(width)}  ${'─'.repeat(8)}  ${'─'.repeat(44)}`);
      for (const c of data) {
        const desc = (c.description ?? '').slice(0, 44);
        out(`  ${c.slug.padEnd(width)}  ${`v${c.version}`.padEnd(8)}  ${desc}`);
      }
      out('');
    }
    diag(dim(`provenance: ${result.provenance.rung} (cache: ${result.provenance.cache})`));
  }

  for (const c of result.corrupt) {
    diag(`warning: local pack ${c.slug} skipped — ${c.reason}`);
  }
  if (result.drift.length) {
    diag(`drift: ${result.drift.length} disagreement(s) between source-of-truth rungs; data emitted with provenance, nothing merged.`);
    diag('  pin a source to act on it: --rung local|api|registry');
  }
  process.exitCode = result.exitCode;
}

async function cmdInfo(slug, flags, wantJson) {
  if (!slug) {
    return fail(EXIT.CALLER_ERROR, 'info requires a construct slug', 'constructs info <slug> --json');
  }
  const result = await listConstructs({
    noCache: Boolean(flags['no-cache']),
    rung: rungFromFlag(flags.rung),
  });
  const found = result.data.find((c) => c.slug === slug);
  if (!found) {
    return fail(
      EXIT.CALLER_ERROR,
      `no construct named ${JSON.stringify(slug)} (rung: ${result.provenance.rung})`,
      'constructs list --json    # to see what exists'
    );
  }
  if (wantJson) {
    emitJson({ data: found, provenance: result.provenance, drift: result.drift });
  } else {
    out('');
    out(`  ${found.slug}  v${found.version}`);
    if (found.description) out(`  ${found.description}`);
    if (found.skills_count) out(`  skills: ${found.skills_count}`);
    out('');
    diag(dim(`provenance: ${result.provenance.rung}`));
  }
  process.exitCode = result.exitCode;
}

async function cmdSummary(wantJson) {
  const result = await listConstructs({});
  if (wantJson) {
    emitJson({
      data: result.data.map((c) => ({ slug: c.slug, version: c.version, description: c.description })),
      provenance: result.provenance,
      drift: result.drift,
    });
  } else {
    for (const c of result.data) out(`${c.slug}\tv${c.version}\t${c.description ?? ''}`);
  }
  process.exitCode = result.exitCode;
}

async function cmdDoctor(wantJson) {
  const local = await readLocalPacks();
  const checks = [
    { name: 'packs-dir', ok: local.present, detail: local.present ? `${local.packs.length} pack(s)` : 'no packs directory' },
    { name: 'packs-integrity', ok: local.corrupt.length === 0, detail: local.corrupt.length ? `${local.corrupt.length} corrupt` : 'all local packs verify' },
  ];
  // Reachable and empty are different facts. An empty catalog is exit 0 with [] by our
  // own contract — conflating it with "unreachable" would make the doctor lie about the
  // network being down when it is in fact up and answering "nothing here".
  let apiReachable = false;
  let apiCount = 0;
  try {
    const res = await listConstructs({ rung: RUNGS.API, timeoutMs: 5000 });
    apiReachable = true;
    apiCount = res.data.length;
  } catch {
    apiReachable = false;
  }
  checks.push({
    name: 'api-rung',
    ok: apiReachable,
    detail: apiReachable
      ? `reachable — ${apiCount} construct(s)${apiCount === 0 ? ' (catalog is EMPTY; the git rung will answer instead)' : ''}`
      : 'unreachable (degraded to the git rung)',
  });

  const status = checks.every((c) => c.ok) ? 'ok' : 'degraded';
  if (wantJson) {
    emitJson({ status, checks, corrupt: local.corrupt });
  } else {
    out('');
    for (const c of checks) out(`  ${c.ok ? '✓' : '✗'} ${c.name.padEnd(18)} ${c.detail}`);
    out('');
  }
  // A degraded estate is information, not a tool failure — exit 0 with the report.
  process.exitCode = EXIT.OK;
}

function atlasSources(flags) {
  if (typeof flags.source === 'string') return flags.source.split(',').map((s) => s.trim()).filter(Boolean);
  return ['.'];
}

async function cmdAtlas(flags, wantJson) {
  const timeoutMs = flags.timeout ? Number(flags.timeout) * 1000 : undefined;
  const map = await atlas({ sources: atlasSources(flags), timeoutMs });

  if (wantJson) {
    emitJson(map);
  } else {
    out('');
    out(`  ATLAS  (vantage: ${map.vantage}${map.partial ? ', PARTIAL' : ''})`);
    out('');
    if (map.regions.length === 0) {
      out('  No region has declared a territory manifest yet.');
      out('  A region declares itself in its own tree: grimoires/territory.yaml');
    }
    for (const r of map.regions) {
      out(`  ▸ ${r.region}${r.maintainers.length ? `  (${r.maintainers.join(', ')})` : ''}`);
      for (const o of r.outcomes) out(`      outcome  ${o.id} — ${o.description}`);
      for (const l of r.loadout) {
        const mark = l.installed ? '' : '  [not installed]';
        out(`      warden   ${l.construct} → ${l.outcomes.join(', ')}  [${l.authority_effective}/${l.authority_ceiling}]${mark}`);
      }
      out('');
    }
    if (map.conflicts.length) {
      out(`  ⚠ ${map.conflicts.length} CONFLICT(S) — two regions claim overlapping territory:`);
      for (const c of map.conflicts) out(`      ${c.regions.join(' ↔ ')}  ${c.scopes.join(' / ')}`);
      out('');
    }
    out(`  estate: ${map.estate.installed_packs} pack(s) installed · ${map.estate.stationed_constructs} stationed`);
    out('');
  }

  for (const f of map.failed_sources) diag(`warning: source ${f.source} unreadable — ${f.error}`);
  process.exitCode = EXIT.OK; // a partial map that says so beats no map at all
}

async function cmdStation(slug, flags, wantJson) {
  if (!slug || typeof flags.region !== 'string') {
    return fail(
      EXIT.CALLER_ERROR,
      'station requires a construct slug and --region <name>',
      'constructs station gecko --region loa-constructs --dry-run'
    );
  }
  // Keyless by design: the gate is the region's git permissions, so this verb
  // reads no sk_ key and offers nowhere to pass one.
  const result = await station({
    slug,
    region: flags.region,
    regionRoot: '.',
    dryRun: Boolean(flags['dry-run']),
  });

  if (wantJson) {
    emitJson(result);
  } else {
    out('');
    if (result.mode === 'dry-run') {
      out(`  DRY RUN — nothing written`);
      out(`  ratified   ${result.ratified ? 'yes' : 'NO'}`);
      for (const b of result.blockers) out(`    · ${b}`);
      out(`  would write ${result.would_write}`);
    } else {
      out(`  recorded   ${result.receipt_path}${result.idempotent ? '  (idempotent — already recorded)' : ''}`);
    }
    const a = result.authority;
    out(`  authority  ceiling=${a.ceiling} earned=${a.earned} effective=${a.effective} (chain: ${a.chain})`);
    out('');
  }
  process.exitCode = EXIT.OK;
}

async function cmdWhere(target, flags, wantJson) {
  if (!target) {
    return fail(EXIT.CALLER_ERROR, 'where requires a path, noun, or slug', 'constructs where packages/loa-registry --json');
  }
  const answer = await where(target, { sources: atlasSources(flags) });
  if (wantJson) {
    emitJson(answer);
  } else {
    out('');
    out(`  ${answer.target}`);
    out(`    zone      ${answer.zone ?? '(unzoned)'}`);
    out(`    region    ${answer.region ?? '(unclaimed)'}`);
    if (answer.owner.length) out(`    owner     ${answer.owner.join(', ')}`);
    if (answer.matched_scope) out(`    scope     ${answer.matched_scope}`);
    for (const l of answer.loadout) out(`    warden    ${l.construct} [${l.authority_effective}] → ${l.outcomes.join(', ')}`);
    for (const c of answer.also_claimed_by) out(`    also      ${c.region} (${c.scope})`);
    if (answer.gate) out(`    gate      ${answer.gate}`);
    out('');
  }
  process.exitCode = EXIT.OK;
}

// ─── dispatch ─────────────────────────────────────────────────────────────────

async function main(argv) {
  const { flags, positional } = parseArgs(argv);
  const wantJson = Boolean(flags.json) || !isTTY;

  if (flags.version || flags.v) {
    out(capabilities().version);
    return;
  }

  const [token, ...rest] = positional;

  // Bare invocation: useful help, exit 0. Never a TUI.
  if (!token || flags.help || flags.h) {
    if (!token && flags.help === undefined && flags.h === undefined) {
      out(helpText());
      return;
    }
    out(helpText());
    return;
  }

  let verb = resolveVerb(token);

  if (!verb) {
    const inferred = inferVerb(token);

    if (inferred.kind === 'none') {
      return fail(
        EXIT.CALLER_ERROR,
        `unknown verb ${JSON.stringify(token)}`,
        'constructs --help    # or: constructs capabilities --json'
      );
    }

    if (inferred.kind === 'ambiguous') {
      // Never guess between equally-close candidates.
      return fail(
        EXIT.CALLER_ERROR,
        `${JSON.stringify(token)} is equally close to ${inferred.candidates.join(' and ')} — refusing to guess`,
        `constructs ${inferred.candidates[0]} …   (or: constructs ${inferred.candidates[1]} …)`
      );
    }

    const target = inferred.verb;
    if (MUTATION_VERBS.includes(target.name)) {
      // A write you only approximately asked for is a write we will not perform.
      return fail(
        EXIT.CALLER_ERROR,
        `unknown verb ${JSON.stringify(token)} — did you mean ${JSON.stringify(target.name)}? It is a MUTATION verb, so it will not be run on inference`,
        `constructs ${target.name} ${rest.join(' ')}`.trim()
      );
    }

    diag(`note: ${JSON.stringify(token)} → ${JSON.stringify(target.name)} (read-only verb, auto-corrected)`);
    verb = target;
  }

  try {
    switch (verb.name) {
      case 'list':
        return await cmdList(flags, { wantJson });
      case 'find':
        if (!rest[0]) {
          return fail(EXIT.CALLER_ERROR, 'find requires a query', 'constructs find <query> --json');
        }
        return await cmdList(flags, { filter: rest[0], wantJson });
      case 'info':
        return await cmdInfo(rest[0], flags, wantJson);
      case 'summary':
        return await cmdSummary(wantJson);
      case 'capabilities':
        emitJson(capabilities());
        return;
      case 'robot-docs':
        out(robotDocs());
        return;
      case 'doctor':
        return await cmdDoctor(wantJson);
      case 'atlas':
        return await cmdAtlas(flags, wantJson);
      case 'where':
        return await cmdWhere(rest[0], flags, wantJson);
      case 'station':
        return await cmdStation(rest[0], flags, wantJson);
      case 'install':
      case 'observe':
        // Landing in sprint-229. Refuse honestly rather than pretend.
        return fail(
          EXIT.TOOL_FAILURE,
          `${verb.name} is declared in the contract but not yet implemented in v${capabilities().version}`,
          'constructs capabilities --json    # the implemented surface'
        );
      default:
        return fail(EXIT.CALLER_ERROR, `unhandled verb ${verb.name}`, 'constructs --help');
    }
  } catch (err) {
    if (err instanceof SotError) {
      return fail(err.exitCode, err.message, 'constructs doctor --json');
    }
    if (err instanceof TerritoryError) {
      diag(`error: ${err.message}`);
      for (const detail of err.details) diag(`  · ${detail}`);
      diag('  try: constructs robot-docs guide    # the territory manifest contract');
      process.exitCode = err.exitCode;
      return;
    }
    if (err instanceof StationError) {
      diag(`error: ${err.message}`);
      for (const detail of err.details) diag(`  · ${detail}`);
      if (err.fix) diag(`  try: ${err.fix}`);
      process.exitCode = err.exitCode;
      return;
    }
    if (err?.code === 'YAML_OUT_OF_SUBSET' || err?.code === 'SCHEMA_OUT_OF_SUBSET' || err?.code === 'GLOB_INVALID') {
      return fail(EXIT.CALLER_ERROR, err.message, 'constructs robot-docs guide    # the supported subset');
    }
    // Never silent-fail: something on stderr, non-zero exit, always.
    return fail(EXIT.TOOL_FAILURE, `${err?.message ?? err}`, 'constructs doctor --json');
  }
}

main(process.argv.slice(2)).catch((err) => {
  diag(`error: ${err?.message ?? err}`);
  process.exitCode = EXIT.TOOL_FAILURE;
});
