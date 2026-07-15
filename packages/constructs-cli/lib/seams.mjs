// Test-mode seams (T3.4 · FL-SDD HIGH · BB DR-003).
//
// LOA_CONSTRUCTS_FIXTURE_ROOT and LOA_CONSTRUCTS_TEST_NOW are honored ONLY when
// BOTH conditions hold: LOA_CONSTRUCTS_TEST_MODE=1 AND a test-runner marker is
// present. CI=true alone is NOT sufficient — it is injectable in dev and agent
// environments (the L7 dual-condition pattern, cycle-098 sprint-7 CRIT-1).
// Production paths emit a stderr WARNING and use defaults, never the override.

import path from 'node:path';
import os from 'node:os';
import { realpathSync } from 'node:fs';

function hasTestRunnerMarker(env) {
  // bats (the substrate's harness) or node:test (ours). LOA_CONSTRUCTS_TEST_RUNNER
  // is the explicit marker for subprocess-of-test invocations, where the runner's
  // own env does not survive the exec allowlist.
  return Boolean(
    env.BATS_TEST_FILENAME || env.BATS_VERSION || env.NODE_TEST_CONTEXT || env.LOA_CONSTRUCTS_TEST_RUNNER
  );
}

export function testSeamsActive(env = process.env) {
  return env.LOA_CONSTRUCTS_TEST_MODE === '1' && hasTestRunnerMarker(env);
}

function warnIgnored(name, why) {
  process.stderr.write(`WARNING: env override ${name} ignored — ${why}\n`);
}

const SEAM_GATE_MSG =
  'test seams require LOA_CONSTRUCTS_TEST_MODE=1 AND a test-runner marker (BATS_*, NODE_TEST_CONTEXT, or LOA_CONSTRUCTS_TEST_RUNNER); CI=true alone is not sufficient';

/**
 * The fixture estate root, when legitimately in a test. Must resolve under the
 * repo or the OS temp dir — a seam that can point at / is an exfiltration lever.
 * Returns null (with a stderr warning) in every non-qualifying case.
 */
export function fixtureRoot(env = process.env, { repoRoot = process.cwd() } = {}) {
  const requested = env.LOA_CONSTRUCTS_FIXTURE_ROOT;
  if (!requested) return null;
  if (!testSeamsActive(env)) {
    warnIgnored('LOA_CONSTRUCTS_FIXTURE_ROOT', SEAM_GATE_MSG);
    return null;
  }
  let resolved;
  try {
    resolved = realpathSync(requested);
  } catch {
    warnIgnored('LOA_CONSTRUCTS_FIXTURE_ROOT', `${requested} does not resolve`);
    return null;
  }
  const contained = (root) => resolved === root || resolved.startsWith(root + path.sep);
  let repo;
  try {
    repo = realpathSync(repoRoot);
  } catch {
    repo = repoRoot;
  }
  const tmp = realpathSync(os.tmpdir());
  if (!contained(repo) && !contained(tmp)) {
    warnIgnored('LOA_CONSTRUCTS_FIXTURE_ROOT', `${requested} must resolve under the repo or a mktemp dir`);
    return null;
  }
  return resolved;
}

/** Pinned clock for deterministic fixtures. Same dual-condition gate. */
export function testNow(env = process.env) {
  const v = env.LOA_CONSTRUCTS_TEST_NOW;
  if (!v) return null;
  if (!testSeamsActive(env)) {
    warnIgnored('LOA_CONSTRUCTS_TEST_NOW', SEAM_GATE_MSG);
    return null;
  }
  return v;
}

export default { testSeamsActive, fixtureRoot, testNow };
