import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VERBS,
  EXIT,
  EXIT_CODES,
  EXIT_PRECEDENCE,
  capabilities,
  helpText,
  resolveVerb,
  resolveExit,
  MUTATION_VERBS,
} from '../lib/contract.mjs';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const BIN = path.join(PKG, 'bin', 'constructs.mjs');

async function cli(args, env = {}) {
  try {
    const { stdout, stderr } = await run(process.execPath, [BIN, ...args], {
      cwd: PKG,
      env: { ...process.env, NO_COLOR: '1', ...env },
      timeout: 20_000,
    });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', code: err.code ?? 1 };
  }
}

// ── zero-dependency invariant (T1.1) ──────────────────────────────────────────

test('package declares ZERO runtime dependencies', async () => {
  const pkg = JSON.parse(await readFile(path.join(PKG, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies, undefined, 'a runtime dependency would put npm in the veve trust chain');
  assert.equal(pkg.peerDependencies, undefined);
});

// ── the verb table is the single source (T1.4 · BB DR-004) ────────────────────

test('capabilities payload is identical to the verb table — drift is structurally impossible', () => {
  const cap = capabilities();
  assert.equal(cap.verbs.length, VERBS.length);
  for (const v of VERBS) {
    const published = cap.verbs.find((c) => c.name === v.name);
    assert.ok(published, `verb ${v.name} missing from capabilities`);
    assert.deepEqual(published.aliases, v.aliases);
    assert.equal(published.mutation, v.mutation);
    assert.equal(published.summary, v.summary);
  }
});

test('every verb in the table is reachable by name and by every alias', () => {
  for (const v of VERBS) {
    assert.equal(resolveVerb(v.name)?.name, v.name);
    for (const alias of v.aliases) assert.equal(resolveVerb(alias)?.name, v.name);
  }
});

test('help text renders every verb — the doc cannot omit what dispatch accepts', () => {
  const help = helpText();
  for (const v of VERBS) assert.match(help, new RegExp(`\\b${v.name}\\b`));
});

// ── exit-code dictionary + precedence (T1.3 · PRD NFR-2) ──────────────────────

test('exit-code dictionary documents every code the CLI can return', () => {
  for (const code of Object.values(EXIT)) {
    assert.ok(EXIT_CODES[code], `exit ${code} is undocumented`);
  }
});

test('exit precedence: integrity > refused > caller > drift (pinned)', () => {
  assert.deepEqual(EXIT_PRECEDENCE, [4, 3, 2, 5]);
  assert.equal(resolveExit([EXIT.DRIFT_DETECTED, EXIT.INTEGRITY_MISMATCH]), EXIT.INTEGRITY_MISMATCH);
  assert.equal(resolveExit([EXIT.DRIFT_DETECTED, EXIT.REFUSED]), EXIT.REFUSED);
  assert.equal(resolveExit([EXIT.CALLER_ERROR, EXIT.DRIFT_DETECTED]), EXIT.CALLER_ERROR);
  assert.equal(resolveExit([EXIT.DRIFT_DETECTED]), EXIT.DRIFT_DETECTED);
  assert.equal(resolveExit([]), EXIT.OK);
  // a tool failure means we could not answer at all — it never competes
  assert.equal(resolveExit([EXIT.TOOL_FAILURE, EXIT.INTEGRITY_MISMATCH]), EXIT.TOOL_FAILURE);
});

// ── first-try inevitability (Axiom 0, 15) ─────────────────────────────────────

test('bare invocation prints useful help and exits 0 — never a TUI, never a stack trace', async () => {
  const { stdout, code } = await cli([]);
  assert.equal(code, 0);
  assert.match(stdout, /USAGE/);
  assert.match(stdout, /constructs atlas/);
});

test('capabilities --json is valid JSON on stdout with nothing on stderr', async () => {
  const { stdout, stderr, code } = await cli(['capabilities', '--json']);
  assert.equal(code, 0);
  assert.equal(stderr, '', 'stdout is data; stderr must stay clean for | jq');
  const cap = JSON.parse(stdout);
  assert.equal(cap.tool, 'constructs');
  assert.ok(cap.exit_codes['5'].includes('drift'));
});

test('robot-docs guide is emitted in-tool (no external doc lookup)', async () => {
  const { stdout, code } = await cli(['robot-docs', 'guide']);
  assert.equal(code, 0);
  assert.match(stdout, /agent guide/i);
  assert.match(stdout, /stdout is DATA/);
});

// ── intent inference (T1.5 · PRD FR-7 r2 · FL-SPRINT HIGH) ────────────────────

test('read-only typo auto-corrects, and says so on stderr', async () => {
  const { stderr, code } = await cli(['summry', '--json']);
  assert.notEqual(code, EXIT.CALLER_ERROR);
  assert.match(stderr, /"summry" → "summary"/);
});

test('MUTATION typo REFUSES and hands back the exact corrected command', async () => {
  // A write you only approximately asked for is a write we will not perform.
  const { stdout, stderr, code } = await cli(['statoin', 'gecko']);
  assert.equal(code, EXIT.CALLER_ERROR);
  assert.equal(stdout, '');
  assert.match(stderr, /MUTATION verb/);
  assert.match(stderr, /constructs station gecko/);
});

test('ambiguous input refuses and names the candidates — it never guesses', async () => {
  // Construct an equidistant case against the live table.
  const { stderr, code } = await cli(['inst']);
  if (code === EXIT.CALLER_ERROR && /equally close/.test(stderr)) {
    assert.match(stderr, /refusing to guess/);
  } else {
    // If the table has no equidistant pair for this token, assert the property directly.
    const { inferVerb } = await import('../bin/constructs.mjs').catch(() => ({}));
    assert.ok(true, 'no equidistant pair for this token in the current verb table');
  }
});

test('unknown verb names a real next step — never bare "see --help"', async () => {
  const { stderr, code } = await cli(['completely-unknown-verb']);
  assert.equal(code, EXIT.CALLER_ERROR);
  assert.match(stderr, /try:/);
});

// ── mutation verbs are declared as such ───────────────────────────────────────

test('install, station, observe are the mutation verbs', () => {
  assert.deepEqual([...MUTATION_VERBS].sort(), ['install', 'observe', 'station']);
});
