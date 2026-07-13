// Test-seam containment (T3.4 · FL-SDD HIGH · BB DR-003).
// One containment test per seam; the CI=true-only case is the one that bites.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { testSeamsActive, fixtureRoot, testNow } from '../lib/seams.mjs';

function captureStderr(fn) {
  const chunks = [];
  const original = process.stderr.write;
  process.stderr.write = (s) => (chunks.push(String(s)), true);
  try {
    return { result: fn(), stderr: chunks.join('') };
  } finally {
    process.stderr.write = original;
  }
}

test('seams: CI=true alone is NOT sufficient — override ignored with a warning', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'seam-'));
  const env = { CI: 'true', LOA_CONSTRUCTS_FIXTURE_ROOT: dir };
  assert.equal(testSeamsActive(env), false);
  const { result, stderr } = capturesRoot(env);
  assert.equal(result, null);
  assert.match(stderr, /ignored/);
  assert.match(stderr, /CI=true alone is not sufficient/);
});

function capturesRoot(env) {
  return capture(() => fixtureRoot(env));
}

function capture(fn) {
  const chunks = [];
  const original = process.stderr.write;
  process.stderr.write = (s) => (chunks.push(String(s)), true);
  let result;
  try {
    result = fn();
  } finally {
    process.stderr.write = original;
  }
  return { result, stderr: chunks.join('') };
}

test('seams: TEST_MODE without a runner marker → ignored', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'seam-'));
  const { result, stderr } = capture(() => fixtureRoot({ LOA_CONSTRUCTS_TEST_MODE: '1', LOA_CONSTRUCTS_FIXTURE_ROOT: dir }));
  assert.equal(result, null);
  assert.match(stderr, /test-runner marker/);
});

test('seams: the dual condition (TEST_MODE + marker) honors the override', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'seam-'));
  const env = { LOA_CONSTRUCTS_TEST_MODE: '1', LOA_CONSTRUCTS_TEST_RUNNER: '1', LOA_CONSTRUCTS_FIXTURE_ROOT: dir };
  assert.equal(testSeamsActive(env), true);
  const resolved = fixtureRoot(env);
  assert.ok(resolved !== null && resolved.length > 0);
});

test('seams: a root outside the repo AND the temp dir is refused even in test mode', () => {
  const env = { LOA_CONSTRUCTS_TEST_MODE: '1', LOA_CONSTRUCTS_TEST_RUNNER: '1', LOA_CONSTRUCTS_FIXTURE_ROOT: '/etc' };
  const { result, stderr } = capture(() => fixtureRoot(env));
  assert.equal(result, null);
  assert.match(stderr, /must resolve under the repo or a mktemp dir/);
});

test('seams: TEST_NOW follows the same gate', () => {
  const gated = capture(() => testNow({ CI: 'true', LOA_CONSTRUCTS_TEST_NOW: '2026-01-01T00:00:00Z' }));
  assert.equal(gated.result, null);
  assert.match(gated.stderr, /ignored/);
  const open = testNow({ LOA_CONSTRUCTS_TEST_MODE: '1', BATS_VERSION: '1.10', LOA_CONSTRUCTS_TEST_NOW: '2026-01-01T00:00:00Z' });
  assert.equal(open, '2026-01-01T00:00:00Z');
});
