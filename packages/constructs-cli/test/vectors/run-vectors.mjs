#!/usr/bin/env node
// Golden vectors (T1.8 · PRD FR-6, NFR-1).
//
// The determinism proof is not "we think it's stable" — each vector runs TWICE and the
// bytes are diffed. Same input, same output bytes, or the build fails.
//
// Vectors cover only AMBIENT-FREE surfaces (no network, no filesystem outside cwd), which
// is exactly what the veve's `determinism.class: attestable` promises. Live answers carry
// provenance instead of byte-identity, and are deliberately not vectored.

import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, '..', '..');
const BIN = path.join(PKG, 'bin', 'constructs.mjs');

const ENV = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  NO_COLOR: '1',
  SOURCE_DATE_EPOCH: '1700000000',
  // no CONSTRUCTS_API_URL — vectors must not touch the network
};

async function invoke(argv) {
  try {
    const { stdout, stderr } = await run(process.execPath, [BIN, ...argv], {
      cwd: PKG,
      env: ENV,
      timeout: 20_000,
    });
    return { stdout, stderr, exit: 0 };
  } catch (err) {
    return { stdout: err.stdout ?? '', stderr: err.stderr ?? '', exit: err.code ?? 1 };
  }
}

const sha256 = (s) => `sha256:${createHash('sha256').update(s).digest('hex')}`;

async function main() {
  const veve = JSON.parse(await readFile(path.join(PKG, 'veve.json'), 'utf8'));
  let failures = 0;

  for (const vector of veve.vectors) {
    const first = await invoke(vector.argv);
    const second = await invoke(vector.argv);

    // 1. Determinism: same input → same output BYTES.
    if (first.stdout !== second.stdout) {
      console.error(`✗ ${vector.name}\n    NON-DETERMINISTIC: two runs produced different stdout`);
      failures++;
      continue;
    }

    // 2. Exit code matches the declared contract.
    if (first.exit !== vector.expect_exit) {
      console.error(`✗ ${vector.name}\n    exit ${first.exit}, expected ${vector.expect_exit}`);
      failures++;
      continue;
    }

    // 3. Output hash matches the pinned value (a drift in the contract fails the build).
    const actual = sha256(first.stdout);
    if (vector.expect_output_hash && vector.expect_output_hash !== actual) {
      console.error(
        `✗ ${vector.name}\n    output hash drifted\n      pinned: ${vector.expect_output_hash}\n      actual: ${actual}`
      );
      failures++;
      continue;
    }

    console.log(`✓ ${vector.name}  (exit ${first.exit}, ${actual.slice(0, 23)}…)`);
  }

  console.log('');
  if (failures) {
    console.error(`${failures}/${veve.vectors.length} vector(s) failed`);
    process.exit(1);
  }
  console.log(`${veve.vectors.length}/${veve.vectors.length} vectors green — byte-deterministic across re-runs`);
}

// `--print-hashes` regenerates the pins after an intentional contract change.
if (process.argv.includes('--print-hashes')) {
  const veve = JSON.parse(await readFile(path.join(PKG, 'veve.json'), 'utf8'));
  for (const vector of veve.vectors) {
    const { stdout, exit } = await invoke(vector.argv);
    console.log(`${vector.name}\n  argv: ${JSON.stringify(vector.argv)}\n  exit: ${exit}\n  hash: ${sha256(stdout)}`);
  }
} else {
  await main();
}
