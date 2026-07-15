// JCS golden equivalence (T3.1): the node mirror vs the substrate's lib/jcs.sh.
//
// The substrate is the AUTHORITY; this test pins byte-identity so the zero-dep
// runtime can canonicalize without shelling out. If this test fails, fix the
// mirror (lib/vendor/jcs.mjs), never the substrate.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jcsCanonicalize, JcsError } from '../lib/vendor/jcs.mjs';
import { run } from '../lib/exec.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DRIVER = path.join(REPO_ROOT, 'lib', 'jcs.sh');

const VECTORS = [
  '{"b":2,"a":{"z":true,"m":[3,1.5,"x"]},"n":1e2}',
  '{"unicode":"héllo — ✓","esc":"line\\nbreak\\ttab","q":"\\"quoted\\""}',
  '{"nested":{"deep":{"deeper":[{"k":null},{"k":false}]}},"num":0.000001}',
  '{"empty_obj":{},"empty_arr":[],"zero":0,"neg":-42}',
  '[1,2,{"b":"x","a":"y"}]',
];

test('jcs: node mirror is byte-identical to the substrate for every vector', async () => {
  for (const raw of VECTORS) {
    const node = jcsCanonicalize(JSON.parse(raw));
    // jcs_canonicalize takes the document as its first argument (stdin is not
    // reachable through the exec contract). The script text is FIXED; the vector
    // rides as a positional parameter, never interpolated.
    const viaArg = await run('bash', ['-c', 'source "$1" && jcs_canonicalize "$2"', '_', DRIVER, raw], {
      cwd: REPO_ROOT,
      timeoutMs: 20_000,
    });
    assert.equal(node, viaArg.stdout.replace(/\n$/, ''), `divergence on ${raw}`);
  }
});

test('jcs: refuses what has no canonical form', () => {
  assert.throws(() => jcsCanonicalize(undefined), JcsError);
  assert.throws(() => jcsCanonicalize({ x: Infinity }), JcsError);
  assert.throws(() => jcsCanonicalize({ x: NaN }), JcsError);
});

test('jcs: key order is UTF-16 code-unit sort, undefined members drop', () => {
  assert.equal(jcsCanonicalize({ b: 1, a: 2, A: 3 }), '{"A":3,"a":2,"b":1}');
  assert.equal(jcsCanonicalize({ keep: 1, drop: undefined }), '{"keep":1}');
});
