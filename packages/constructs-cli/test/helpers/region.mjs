// Fixture regions for stationing tests: a real git repo in a mktemp dir, because
// the gate under test IS git state — faking it would test nothing.

import { mkdtemp, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../../lib/exec.mjs';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

export const FIXTURE_MANIFEST = `schema_version: "1.0"
region: fixture-region
maintainers:
  - "@fixture"
outcomes:
  - id: fixture-outcome
    description: "the fixture stays coherent"
scopes:
  - "src/**"
loadout:
  - construct: saaty
    outcomes: [fixture-outcome]
    authority_tier: observe
  - construct: gecko
    outcomes: [fixture-outcome]
    authority_tier: gate
`;

export async function gitIn(dir, args) {
  const res = await run('git', args, { cwd: dir, allowNonZero: true });
  if (res.exitCode !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

export async function commitAll(dir, message) {
  await gitIn(dir, ['add', '-A']);
  await gitIn(dir, ['-c', 'user.email=fixture@test', '-c', 'user.name=fixture', 'commit', '-q', '-m', message]);
}

/**
 * `mount: 'stub'` creates empty marker files (enough for the probe);
 * `mount: 'real'` copies the actual audit validator so verify-chain runs;
 * `mount: 'none'` leaves the region unmounted.
 */
export async function makeRegion({ manifest = FIXTURE_MANIFEST, mount = 'stub', commit = true } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'station-fixture-'));
  await gitIn(dir, ['init', '-q']);
  await gitIn(dir, ['symbolic-ref', 'HEAD', 'refs/heads/main']);

  await mkdir(path.join(dir, 'grimoires'), { recursive: true });
  await writeFile(path.join(dir, 'grimoires', 'territory.yaml'), manifest);

  if (mount === 'stub' || mount === 'real') {
    await mkdir(path.join(dir, '.claude', 'scripts'), { recursive: true });
    await mkdir(path.join(dir, 'lib'), { recursive: true });
    if (mount === 'real') {
      await mkdir(path.join(dir, '.claude', 'scripts', 'lib'), { recursive: true });
      await copyFile(path.join(REPO_ROOT, '.claude', 'scripts', 'audit-envelope.sh'), path.join(dir, '.claude', 'scripts', 'audit-envelope.sh'));
      await copyFile(path.join(REPO_ROOT, '.claude', 'scripts', 'compat-lib.sh'), path.join(dir, '.claude', 'scripts', 'compat-lib.sh'));
      await copyFile(path.join(REPO_ROOT, 'lib', 'jcs.sh'), path.join(dir, 'lib', 'jcs.sh'));
      await copyFile(path.join(REPO_ROOT, '.claude', 'scripts', 'lib', 'jcs-helper.py'), path.join(dir, '.claude', 'scripts', 'lib', 'jcs-helper.py'));
    } else {
      await writeFile(path.join(dir, '.claude', 'scripts', 'audit-envelope.sh'), '# stub\n');
      await writeFile(path.join(dir, 'lib', 'jcs.sh'), '# stub\n');
    }
  }

  if (commit) await commitAll(dir, 'fixture: region genesis');
  return dir;
}
