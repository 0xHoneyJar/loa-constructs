import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { inspectLocalConstruct } from '../lib/sot.mjs';
import { validate } from '../lib/vendor/schema-subset.mjs';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const BIN = path.join(PKG, 'bin', 'constructs.mjs');
const INFO_SCHEMA = JSON.parse(await readFile(path.join(PKG, 'schemas', 'info.schema.json'), 'utf8'));

const MANIFEST = `schema_version: 3
name: Fixture
slug: fixture
version: 1.2.3
description: "Prose that helps an operator understand the fixture."
short_description: "Fixture orientation"
domain:
  - observability
skills:
  - slug: inspect-fixture
    path: skills/inspect-fixture
commands:
  - name: inspect-fixture
    path: commands/inspect-fixture.md
identity:
  persona: identity/persona.yaml
  expertise: identity/expertise.yaml
streams:
  reads: [Intent]
  writes: [Signal]
`;

const SKILL_INDEX = `slug: inspect-fixture
name: "Inspect Fixture"
version: 0.1.0
entry: SKILL.md
capabilities:
  model_tier: sonnet
  danger_level: safe
  effort_hint: small
  downgrade_allowed: true
  execution_hint: sequential
  requires:
    native_runtime: false
    tool_calling: true
    thinking_traces: false
    vision: false
`;

async function makePack(manifest = MANIFEST) {
  const root = await mkdtemp(path.join(tmpdir(), 'construct-info-'));
  const pack = path.join(root, 'fixture');
  await mkdir(path.join(pack, 'skills', 'inspect-fixture'), { recursive: true });
  await writeFile(path.join(pack, 'construct.yaml'), manifest);
  await writeFile(path.join(pack, 'skills', 'inspect-fixture', 'index.yaml'), SKILL_INDEX);
  return root;
}

test('local info separates prose orientation from declared mechanics', async (t) => {
  const root = await makePack();
  t.after(() => rm(root, { recursive: true, force: true }));

  const info = await inspectLocalConstruct('fixture', root);
  assert.equal(info.orientation.kind, 'prose');
  assert.equal(info.orientation.authoritative, false);
  assert.equal(info.orientation.persona_ref, 'identity/persona.yaml');
  assert.equal(info.mechanics.kind, 'declared');
  assert.equal(info.mechanics.authority_effect, 'none');
  assert.deepEqual(info.mechanics.commands, [
    { name: 'inspect-fixture', path: 'commands/inspect-fixture.md' },
  ]);
  assert.equal(info.mechanics.skills[0].metadata_status, 'declared');
  assert.equal(info.mechanics.skills[0].capabilities.danger_level, 'safe');
});

test('info --json --rung local emits the split with pinned provenance', async (t) => {
  const root = await makePack();
  t.after(() => rm(root, { recursive: true, force: true }));

  const { stdout, stderr } = await run(process.execPath, [BIN, 'info', 'fixture', '--json', '--rung', 'local'], {
    cwd: PKG,
    env: { ...process.env, CONSTRUCTS_DIR: root, NO_COLOR: '1' },
  });
  assert.equal(stderr, '');
  const payload = JSON.parse(stdout);
  const validation = validate(INFO_SCHEMA, payload);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(payload.provenance.rung, 'local-packs');
  assert.equal(payload.provenance.pinned, true);
  assert.equal(payload.data.orientation.authoritative, false);
  assert.equal(payload.data.mechanics.skills[0].slug, 'inspect-fixture');
});

test('a skill metadata path cannot escape the installed pack', async (t) => {
  const manifest = MANIFEST.replace('path: skills/inspect-fixture', 'path: ../../outside');
  const root = await makePack(manifest);
  t.after(() => rm(root, { recursive: true, force: true }));

  const info = await inspectLocalConstruct('fixture', root);
  assert.equal(info.mechanics.skills[0].metadata_status, 'invalid-path');
  assert.equal(info.mechanics.skills[0].capabilities, null);
});

test('a rung without detailed metadata says mechanics are unavailable', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'construct-info-registry-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'registry.yaml'), `constructs:\n  fixture:\n    version: 1.2.3\n    description: "Registry prose"\n`);

  const { stdout } = await run(process.execPath, [BIN, 'info', 'fixture', '--json', '--rung', 'registry'], {
    cwd: root,
    env: { ...process.env, NO_COLOR: '1' },
  });
  const payload = JSON.parse(stdout);
  const validation = validate(INFO_SCHEMA, payload);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(payload.data.orientation.authoritative, false);
  assert.equal(payload.data.mechanics.kind, 'unavailable');
  assert.match(payload.data.mechanics.reason, /registry-yaml/);
});

test('the info schema rejects prose that claims authority', async (t) => {
  const root = await makePack();
  t.after(() => rm(root, { recursive: true, force: true }));
  const data = await inspectLocalConstruct('fixture', root);
  const payload = {
    data,
    provenance: {
      rung: 'local-packs',
      pinned: true,
      cache: 'n/a',
      rungs_consulted: ['local-packs'],
      vantage: 'operator-local',
    },
    drift: [],
  };
  payload.data.orientation.authoritative = true;
  const validation = validate(INFO_SCHEMA, payload);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join('\n'), /authoritative/);
});
