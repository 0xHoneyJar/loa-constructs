// T2.9 — the L4 fixture proof (PRD G-4 r2).
//
// Tier-up and observed-override auto-drop are demonstrated MECHANICALLY, against a
// fixture ledger, driven through the real graduated-trust lib. Production stays
// observe-only this cycle — the last test pins that as an assertion, not a promise.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { makeRegion, REPO_ROOT } from './helpers/region.mjs';
import { readAuthority, effectiveTier } from '../lib/station.mjs';
import { run } from '../lib/exec.mjs';

const DRIVE = path.join(REPO_ROOT, 'packages', 'constructs-cli', 'test', 'fixtures', 'l4', 'drive.sh');
const CONFIG = path.join(REPO_ROOT, 'packages', 'constructs-cli', 'test', 'fixtures', 'l4', 'loa.config.fixture.yaml');

// The stationing trust-triple convention (station.mjs trustTriple):
const SCOPE = 'fixture-region';
const CAPABILITY = 'station/saaty';
const ACTOR = 'saaty';

test('L4 fixture proof: tier-up, auto-drop + cooldown, verify-or-observe (G-4)', async (t) => {
  const region = await makeRegion({ mount: 'real' });
  const ledger = path.join(region, '.run', 'trust-ledger.jsonl');
  await mkdir(path.join(region, '.run'), { recursive: true });

  const drive = (args) =>
    run('bash', [DRIVE, ...args], {
      cwd: REPO_ROOT,
      timeoutMs: 60_000,
      allowNonZero: true,
      env: {
        LOA_TRUST_CONFIG_FILE: CONFIG,
        LOA_TRUST_LEDGER_FILE: ledger,
        // The fixture REGION's trust posture, not the host repo's: a fresh region
        // has no trust store (bootstrap-pending), so its unsigned fixture entries
        // verify permissively — the same semantics readAuthority sees in-region.
        // Without this, the HOST repo's signing cutoff bleeds into the fixture.
        LOA_TRUST_STORE_FILE: path.join(region, 'grimoires', 'loa', 'trust-store.yaml'),
      },
    });

  await t.test('trust_grant raises the earned tier: observe → advise', async () => {
    const res = await drive(['grant', SCOPE, CAPABILITY, ACTOR, 'advise', '--reason', 'fixture: accepted observations exceed the manifest predicate']);
    assert.equal(res.exitCode, 0, `trust_grant failed: ${res.stderr}`);
    const a = await readAuthority({ regionRoot: region, region: SCOPE, construct: ACTOR });
    assert.equal(a.chain, 'verified', 'the chain must verify before any tier is displayed');
    assert.equal(a.earned, 'advise');
  });

  await t.test('trust_grant raises again: advise → gate — and the manifest ceiling still governs display', async () => {
    const res = await drive(['grant', SCOPE, CAPABILITY, ACTOR, 'gate', '--reason', 'fixture: demonstrated alignment per transition rules']);
    assert.equal(res.exitCode, 0, `trust_grant failed: ${res.stderr}`);
    const a = await readAuthority({ regionRoot: region, region: SCOPE, construct: ACTOR });
    assert.equal(a.earned, 'gate');
    // saaty's fixture-manifest ceiling is observe: earned gate NEVER shows as effective gate.
    assert.equal(effectiveTier(a.earned, 'observe'), 'observe');
  });

  await t.test('observed override → auto-drop with cooldown (trust_record_override, never a hand edit)', async () => {
    const res = await drive(['override', SCOPE, CAPABILITY, ACTOR, 'decision-001', 'operator overrode the gate at the seam']);
    assert.equal(res.exitCode, 0, `trust_record_override failed: ${res.stderr}`);
    const a = await readAuthority({ regionRoot: region, region: SCOPE, construct: ACTOR });
    assert.equal(a.earned, 'advise', 'gate auto-drops to advise per the fixture rules');
    assert.ok(a.in_cooldown_until, 'auto-drop must arm a cooldown');
  });

  await t.test('cooldown blocks the next grant (exit 3, transition rejected)', async () => {
    const res = await drive(['grant', SCOPE, CAPABILITY, ACTOR, 'gate', '--reason', 'fixture: trying to re-grant during cooldown']);
    assert.equal(res.exitCode, 3, `expected cooldown rejection, got exit ${res.exitCode}: ${res.stderr}`);
  });

  await t.test('tampered ledger → authority unknown, treated as observe', async () => {
    await appendFile(ledger, `${JSON.stringify({ prev_hash: 'forged', event_type: 'trust.grant', payload: { scope: SCOPE, capability: CAPABILITY, actor: ACTOR, to_tier: 'gate' } })}\n`);
    const a = await readAuthority({ regionRoot: region, region: SCOPE, construct: ACTOR });
    assert.equal(a.earned, 'unknown', 'a broken chain must never render a tier');
    assert.equal(a.chain, 'unverified');
    assert.equal(effectiveTier(a.earned, 'gate'), 'observe');
  });
});

test('production stationings stay observe-only this cycle (PRD G-4 r2)', async () => {
  // The self-host manifest: every loadout row (there may be none yet) is observe.
  const raw = await readFile(path.join(REPO_ROOT, 'grimoires', 'territory.yaml'), 'utf8');
  const declaredTiers = [...raw.matchAll(/authority_tier:\s*(\S+)/g)].map((m) => m[1]);
  for (const tier of declaredTiers) {
    assert.equal(tier, 'observe', 'a production stationing above observe is a cycle-scope violation');
  }
  // And the production L4 ledger is not armed: graduated_trust stays disabled.
  let config = '';
  try {
    config = await readFile(path.join(REPO_ROOT, '.loa.config.yaml'), 'utf8');
  } catch {
    // no config file — nothing armed, vacuously observe-only
  }
  const gtBlock = config.match(/^graduated_trust:\s*\n((?:[ \t]+.*\n?)*)/m);
  if (gtBlock) {
    assert.ok(!/^\s*enabled:\s*true\b/m.test(gtBlock[1]), 'production graduated_trust must stay disabled this cycle');
  }
});

// ── review pass 1 regression (LOW-8): the trust.force_grant display branch ─────

test('L4: trust.force_grant renders through readAuthority', async () => {
  const region = await makeRegion({ mount: 'real' });
  const ledger = path.join(region, '.run', 'trust-ledger.jsonl');
  await mkdir(path.join(region, '.run'), { recursive: true });
  const res = await run(
    'bash',
    [DRIVE, 'grant', SCOPE, CAPABILITY, ACTOR, 'gate', '--force', '--operator', 'overseer', '--reason', 'fixture: operator force-grant across tiers'],
    {
      cwd: REPO_ROOT,
      timeoutMs: 60_000,
      allowNonZero: true,
      env: {
        LOA_TRUST_CONFIG_FILE: CONFIG,
        LOA_TRUST_LEDGER_FILE: ledger,
        LOA_TRUST_STORE_FILE: path.join(region, 'grimoires', 'loa', 'trust-store.yaml'),
      },
    }
  );
  assert.equal(res.exitCode, 0, `force grant failed: ${res.stderr}`);
  const a = await readAuthority({ regionRoot: region, region: SCOPE, construct: ACTOR });
  assert.equal(a.chain, 'verified');
  assert.equal(a.earned, 'gate');
});
