// The contract (T1.3 · T1.4 · BB DR-004).
//
// The VERB TABLE below is the single source of truth. Dispatch reads it, `--help`
// renders it, `capabilities --json` serializes it, `robot-docs guide` narrates it,
// and the golden vectors are generated against it. There is no second copy to drift
// from — the doc cannot lie, because the doc IS the dispatch table.

export const CONTRACT_VERSION = '1.0.0';
export const VERSION = '0.1.0';

/**
 * Exit-code dictionary (PRD NFR-2). Precedence when conditions co-occur:
 *   4 (integrity) > 3 (refused) > 2 (caller) > 5 (drift).
 * `1` is the tool itself failing and never competes — it means we could not answer.
 * Empty results are exit 0 with `[]`, never a non-zero "no results" code.
 */
export const EXIT = {
  OK: 0,
  TOOL_FAILURE: 1,
  CALLER_ERROR: 2,
  REFUSED: 3,
  INTEGRITY_MISMATCH: 4,
  DRIFT_DETECTED: 5,
};

export const EXIT_CODES = {
  0: 'ok — request satisfied (an empty result is [] with exit 0, never an error)',
  1: 'tool failure — the CLI itself could not run (bug, unreadable state, unexpected error)',
  2: 'caller error — bad arguments, unknown verb, malformed input, out-of-subset manifest',
  3: 'refused — the act is outside your authority (foreign region, uncommitted stationing, unmounted region)',
  4: 'integrity mismatch — content hash, signature, or containment check failed (never overridden for STRIP-ATTACK)',
  5: 'drift detected — source-of-truth rungs disagree; data IS emitted with provenance + drift[], and is refused as input to mutations unless --rung pins one source',
};

/** Precedence order, most-severe first. Pinned by a fixture. */
export const EXIT_PRECEDENCE = [EXIT.INTEGRITY_MISMATCH, EXIT.REFUSED, EXIT.CALLER_ERROR, EXIT.DRIFT_DETECTED];

/** Given a set of co-occurring conditions, which exit code wins? */
export function resolveExit(codes) {
  const present = new Set(codes.filter((c) => c !== EXIT.OK));
  if (present.has(EXIT.TOOL_FAILURE)) return EXIT.TOOL_FAILURE;
  for (const code of EXIT_PRECEDENCE) if (present.has(code)) return code;
  return EXIT.OK;
}

export const ENV_VARS = {
  CONSTRUCTS_API_URL: 'API base for the network rung (default: https://api.constructs.network/v1)',
  CONSTRUCTS_DIR: 'pack install root (default: .claude/constructs/packs)',
  LOA_CONSTRUCTS_API_KEY: 'sk_ key for network-registry mutations. NEVER passed on argv. Stationing is keyless — it is gated by the region\'s git permissions.',
  NO_COLOR: 'any value suppresses ANSI styling',
  SOURCE_DATE_EPOCH: 'pins timestamps for reproducible output',
  CONSTRUCTS_SILENCE_DEPRECATION: 'silences the legacy-surface deprecation pointer',
};

/**
 * THE VERB TABLE.
 *
 * mutation: true  ⇒ intent inference REFUSES rather than auto-corrects (PRD FR-7 r2),
 *                   and drifted SoT data is refused as input unless --rung pins a source.
 * ambient:  what the verb touches beyond argv — drives the veve's determinism declaration.
 */
export const VERBS = [
  {
    name: 'list',
    aliases: ['ls'],
    summary: 'List every construct on the network.',
    args: [],
    flags: ['--json', '--no-cache', '--rung <local|api|registry>'],
    mutation: false,
    ambient: ['network'],
    example: 'constructs list --json',
  },
  {
    name: 'find',
    aliases: ['search'],
    summary: 'Search constructs by keyword.',
    args: ['<query>'],
    flags: ['--json', '--no-cache'],
    mutation: false,
    ambient: ['network'],
    example: 'constructs find research --json',
  },
  {
    name: 'info',
    aliases: ['show'],
    summary: 'Show one construct in full (skills, commands, persona, provenance).',
    args: ['<slug>'],
    flags: ['--json', '--no-cache'],
    mutation: false,
    ambient: ['network'],
    example: 'constructs info k-hole --json',
  },
  {
    name: 'summary',
    aliases: [],
    summary: 'Agent-optimized listing — every construct, one line each, no prose.',
    args: [],
    flags: ['--json'],
    mutation: false,
    ambient: ['network'],
    example: 'constructs summary --json',
  },
  {
    name: 'atlas',
    aliases: [],
    summary: 'THE MAP: zones + topology + stationed loadouts + conflicts + health, in one call. Operator-local vantage.',
    args: [],
    flags: ['--json', '--timeout <s>'],
    mutation: false,
    ambient: ['filesystem_outside_cwd'],
    example: 'constructs atlas --json',
  },
  {
    name: 'where',
    aliases: [],
    summary: 'Resolve any path, noun, or slug to its zone, region, owner, loadout, gate, and provenance.',
    args: ['<path|noun|slug>'],
    flags: ['--json'],
    mutation: false,
    ambient: ['filesystem_outside_cwd'],
    example: 'constructs where packages/loa-registry --json',
  },
  {
    name: 'capabilities',
    aliases: [],
    summary: 'This contract, as data: verbs, exit codes, env vars, schema subset.',
    args: [],
    flags: ['--json'],
    mutation: false,
    ambient: [],
    example: 'constructs capabilities --json',
  },
  {
    name: 'robot-docs',
    aliases: [],
    summary: 'A paste-ready agent handbook, in-tool. No external doc lookup required.',
    args: ['[guide]'],
    flags: [],
    mutation: false,
    ambient: [],
    example: 'constructs robot-docs guide',
  },
  {
    name: 'doctor',
    aliases: [],
    summary: 'Health of the local constructs estate: packs, index, symlinks, zone coverage, veve vectors.',
    args: [],
    flags: ['--json'],
    mutation: false,
    ambient: ['filesystem_outside_cwd'],
    example: 'constructs doctor --json',
  },
  {
    name: 'install',
    aliases: ['add'],
    summary: 'Install a construct — integrity-verified (content hash + attestation), containment-hardened.',
    args: ['<slug>'],
    flags: ['--json', '--dry-run', '--rung <api|git>', '--payload <file>', '--allow-integrity-mismatch --reason <text>'],
    mutation: true,
    ambient: ['network', 'filesystem_outside_cwd'],
    example: 'constructs install k-hole',
  },
  {
    name: 'station',
    aliases: [],
    summary: 'Record a stationing of a construct over a region (validates + records; NEVER grants — the region\'s git permissions are the gate).',
    args: ['<slug>'],
    flags: ['--region <name>', '--json', '--dry-run'],
    mutation: true,
    ambient: ['filesystem_outside_cwd'],
    example: 'constructs station gecko --region loa-constructs --dry-run',
  },
  {
    name: 'observe',
    aliases: [],
    summary: 'Append a governed observation about a region outcome (the afferent nerve).',
    args: [],
    flags: ['--region <name>', '--outcome <id>', '--evidence <file:line>', '--body <text>', '--json', '--dry-run'],
    mutation: true,
    ambient: ['filesystem_outside_cwd'],
    example: 'constructs observe --region loa-constructs --outcome registry-sot-coherence --evidence registry.yaml:12 --body "..."',
  },
];

export const READ_ONLY_VERBS = VERBS.filter((v) => !v.mutation).map((v) => v.name);
export const MUTATION_VERBS = VERBS.filter((v) => v.mutation).map((v) => v.name);

/** verb name or alias → verb record */
export function resolveVerb(token) {
  return VERBS.find((v) => v.name === token || v.aliases.includes(token)) ?? null;
}

export function allVerbTokens() {
  return VERBS.flatMap((v) => [v.name, ...v.aliases]);
}

/** The capabilities payload — generated, never hand-maintained. */
export function capabilities() {
  return {
    tool: 'constructs',
    version: VERSION,
    contract_version: CONTRACT_VERSION,
    summary: 'Navigation and stationing for the constructs network. Deterministic JSON; zero runtime dependencies; Finn-sandbox compatible (no shell metacharacters required for any operation).',
    verbs: VERBS.map((v) => ({
      name: v.name,
      aliases: v.aliases,
      summary: v.summary,
      args: v.args,
      flags: v.flags,
      mutation: v.mutation,
      ambient: v.ambient,
      example: v.example,
    })),
    exit_codes: EXIT_CODES,
    exit_precedence: EXIT_PRECEDENCE,
    env: ENV_VARS,
    determinism: {
      class: 'attestable',
      ambient: ['network', 'filesystem_outside_cwd'],
      note: 'Ambient-free surfaces and every golden vector are byte-deterministic. Live answers carry provenance instead of byte-identity.',
    },
    schema_validation: {
      implementation: 'vendored declared-keyword subset (NOT full JSON Schema 2020-12)',
      supported_keywords: 'see robot-docs guide',
    },
    sot_ladder: ['local-packs', 'api', 'registry-yaml'],
    intent_inference: {
      read_only_verbs: 'auto-corrected with a warning',
      mutation_verbs: 'refused with the exact corrected command — never run on inference',
      ambiguity: 'refused with the candidate list — the tool never guesses between equal candidates',
    },
  };
}

/** Human help, rendered from the same table. */
export function helpText() {
  const lines = [];
  lines.push(`constructs ${VERSION} — navigation & stationing for the constructs network`);
  lines.push('');
  lines.push('USAGE');
  lines.push('  constructs <verb> [args] [--json]');
  lines.push('');
  lines.push('START HERE');
  lines.push('  constructs atlas --json          the whole map in one call (zones, regions, loadouts, conflicts)');
  lines.push('  constructs capabilities --json   this contract, as data');
  lines.push('  constructs robot-docs guide      the agent handbook, in-tool');
  lines.push('');
  lines.push('VERBS');
  const width = Math.max(...VERBS.map((v) => (v.name + ' ' + v.args.join(' ')).length));
  for (const v of VERBS) {
    const sig = `${v.name} ${v.args.join(' ')}`.trim();
    const mark = v.mutation ? ' *' : '  ';
    lines.push(`  ${sig.padEnd(width)}${mark} ${v.summary}`);
  }
  lines.push('');
  lines.push('  * mutation verb — a typo is REFUSED with the correction, never inferred-and-run.');
  lines.push('');
  lines.push('EXIT CODES');
  for (const [code, meaning] of Object.entries(EXIT_CODES)) {
    lines.push(`  ${code}  ${meaning.split(' — ')[0]}`);
  }
  lines.push('');
  lines.push('Every read verb takes --json. stdout is data; stderr is diagnostics.');
  return lines.join('\n');
}

/** The agent handbook — same table, narrated for a machine reader. */
export function robotDocs() {
  const cap = capabilities();
  const lines = [];
  lines.push('# constructs — agent guide');
  lines.push('');
  lines.push('You are the primary user of this tool. It is built so the first command you guess works.');
  lines.push('');
  lines.push('## The one call that orients you');
  lines.push('```');
  lines.push('constructs atlas --json');
  lines.push('```');
  lines.push('Returns zones (who may write where), regions and their declared outcomes, the constructs');
  lines.push('stationed over them, cross-region CONFLICT blocks, and health — in a single round-trip.');
  lines.push('`vantage: operator-local` says plainly what the map is: this machine\'s honest view, not shared truth.');
  lines.push('');
  lines.push('## Output contract');
  lines.push('- stdout is DATA. stderr is DIAGNOSTICS. `constructs list --json | jq` never needs a grep.');
  lines.push('- Every answer carries `provenance` naming which source-of-truth rung answered.');
  lines.push('- An empty result is `[]` with exit 0. There is no "no results" error code.');
  lines.push('');
  lines.push('## Exit codes');
  for (const [code, meaning] of Object.entries(cap.exit_codes)) lines.push(`- \`${code}\` — ${meaning}`);
  lines.push('');
  lines.push(`Precedence when several apply: ${cap.exit_precedence.join(' > ')}.`);
  lines.push('');
  lines.push('## Drift (exit 5)');
  lines.push('The source-of-truth rungs disagreed. The data is still emitted, with a `drift[]` array naming');
  lines.push('each disagreeing rung. Drifted data is SAFE TO READ but is REFUSED as input to a mutation');
  lines.push('unless you pin a source with `--rung <local|api|registry>`. Decide deliberately; do not guess.');
  lines.push('');
  lines.push('## Typos');
  lines.push('Read-only verbs auto-correct and warn. Mutation verbs (marked below) refuse and hand you the');
  lines.push('exact corrected command — the tool will not run a write you only approximately asked for.');
  lines.push('Two equally-close candidates? Refused, with both named. It never guesses.');
  lines.push('');
  lines.push('## Verbs');
  for (const v of cap.verbs) {
    lines.push(`### ${v.name}${v.aliases.length ? ` (aka ${v.aliases.join(', ')})` : ''}${v.mutation ? ' — MUTATION' : ''}`);
    lines.push(v.summary);
    lines.push('```');
    lines.push(v.example);
    lines.push('```');
    if (v.flags.length) lines.push(`Flags: ${v.flags.join(' · ')}`);
    lines.push('');
  }
  lines.push('## Stationing, in one paragraph');
  lines.push('A region declares its own outcomes and loadout in its own `grimoires/territory.yaml`. This CLI');
  lines.push('VALIDATES and RECORDS that declaration; it never grants authority. The gate is the region\'s git');
  lines.push('permissions — a stationing is live when the manifest edit is committed on the region\'s default');
  lines.push('branch. No API key can substitute for that. Every stationed construct starts observe-only:');
  lines.push('it surfaces findings and never decides. Higher tiers are earned through the graduated-trust');
  lines.push('ledger, and an unverifiable ledger reads as `authority: unknown`, which is treated as observe.');
  lines.push('');
  lines.push('## Environment');
  for (const [k, v] of Object.entries(cap.env)) lines.push(`- \`${k}\` — ${v}`);
  return lines.join('\n');
}

export default { VERBS, EXIT, EXIT_CODES, capabilities, helpText, robotDocs, resolveVerb, resolveExit };
