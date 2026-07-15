import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { inspectConstruct, inspectLocalConstruct, readLocalPacks, RUNGS } from '../lib/sot.mjs';
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

async function makePack(manifest = MANIFEST, skillIndex = SKILL_INDEX) {
  const root = await mkdtemp(path.join(tmpdir(), 'construct-info-'));
  const pack = path.join(root, 'fixture');
  await mkdir(path.join(pack, 'skills', 'inspect-fixture'), { recursive: true });
  await mkdir(path.join(pack, 'commands'), { recursive: true });
  await writeFile(path.join(pack, 'construct.yaml'), manifest);
  await writeFile(path.join(pack, 'skills', 'inspect-fixture', 'index.yaml'), skillIndex);
  await writeFile(path.join(pack, 'skills', 'inspect-fixture', 'SKILL.md'), '# Fixture skill\n');
  await writeFile(path.join(pack, 'commands', 'inspect-fixture.md'), '# Fixture command\n');
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
    { name: 'inspect-fixture', path: 'commands/inspect-fixture.md', path_status: 'declared' },
  ]);
  assert.equal(info.mechanics.skills[0].metadata_status, 'declared');
  assert.equal(info.mechanics.skills[0].capabilities.danger_level, 'safe');
  assert.equal('source' in info, false);
  assert.deepEqual(Object.keys(info).sort(), [
    'info_schema_version',
    'mechanics',
    'name',
    'orientation',
    'slug',
    'version',
  ]);
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

test('programmatic info honors an explicit localRoot across listing and inspection', async (t) => {
  const root = await makePack();
  t.after(() => rm(root, { recursive: true, force: true }));

  const result = await inspectConstruct('fixture', { rung: RUNGS.LOCAL, localRoot: root });
  assert.equal(result.provenance.rung, RUNGS.LOCAL);
  assert.equal(result.data.slug, 'fixture');
  assert.equal(result.data.mechanics.kind, 'declared');
  assert.equal(result.data.mechanics.skills[0].slug, 'inspect-fixture');
});

test('local pack listings do not expose their integrity-checked manifest snapshot', async (t) => {
  const root = await makePack();
  t.after(() => rm(root, { recursive: true, force: true }));

  const local = await readLocalPacks(root);
  assert.equal(local.packs.length, 1);
  assert.equal(JSON.stringify(local.packs[0]).includes('schema_version'), false);
  assert.deepEqual(Object.keys(local.packs[0]).sort(), [
    'description',
    'name',
    'skills_count',
    'slug',
    'source',
    'version',
  ]);
});

test('unknown capability claims invalidate skill mechanics instead of reaching consumers', async (t) => {
  const index = `${SKILL_INDEX}  authority_effect: full\n`;
  const root = await makePack(MANIFEST, index);
  t.after(() => rm(root, { recursive: true, force: true }));

  const info = await inspectLocalConstruct('fixture', root);
  assert.equal(info.mechanics.skills[0].metadata_status, 'invalid');
  assert.equal(info.mechanics.skills[0].entry, null);
  assert.equal(info.mechanics.skills[0].capabilities, null);
});

test('malformed capability requirements invalidate skill mechanics', async (t) => {
  const index = SKILL_INDEX.replace('tool_calling: true', 'tool_calling: write-all');
  const root = await makePack(MANIFEST, index);
  t.after(() => rm(root, { recursive: true, force: true }));

  const info = await inspectLocalConstruct('fixture', root);
  assert.equal(info.mechanics.skills[0].metadata_status, 'invalid');
  assert.equal(info.mechanics.skills[0].capabilities, null);
});

test('a skill metadata path cannot escape the installed pack', async (t) => {
  const manifest = MANIFEST.replace('path: skills/inspect-fixture', 'path: ../../outside');
  const root = await makePack(manifest);
  t.after(() => rm(root, { recursive: true, force: true }));

  const info = await inspectLocalConstruct('fixture', root);
  assert.equal(info.mechanics.skills[0].metadata_status, 'invalid-path');
  assert.equal(info.mechanics.skills[0].capabilities, null);
  assert.equal(info.mechanics.skills[0].path, null);
});

test('a command path cannot escape the installed pack', async (t) => {
  const manifest = MANIFEST.replace('path: commands/inspect-fixture.md', 'path: ../../outside.md');
  const root = await makePack(manifest);
  t.after(() => rm(root, { recursive: true, force: true }));

  const info = await inspectLocalConstruct('fixture', root);
  assert.equal(info.mechanics.commands[0].path_status, 'invalid-path');
  assert.equal(info.mechanics.commands[0].path, null);
});

test('a skill entry cannot escape its skill directory', async (t) => {
  const index = SKILL_INDEX.replace('entry: SKILL.md', 'entry: ../../outside.md');
  const root = await makePack(MANIFEST, index);
  t.after(() => rm(root, { recursive: true, force: true }));

  const info = await inspectLocalConstruct('fixture', root);
  assert.equal(info.mechanics.skills[0].metadata_status, 'invalid-path');
  assert.equal(info.mechanics.skills[0].entry, null);
  assert.equal(info.mechanics.skills[0].capabilities, null);
});

test('realpath containment rejects command and skill-entry symlink escapes', async (t) => {
  const root = await makePack();
  t.after(() => rm(root, { recursive: true, force: true }));
  const pack = path.join(root, 'fixture');
  const outside = path.join(root, 'outside.md');
  await writeFile(outside, '# Outside the pack\n');
  await symlink(outside, path.join(pack, 'commands', 'escape.md'));
  await rm(path.join(pack, 'skills', 'inspect-fixture', 'SKILL.md'));
  await symlink(outside, path.join(pack, 'skills', 'inspect-fixture', 'SKILL.md'));
  await writeFile(
    path.join(pack, 'construct.yaml'),
    MANIFEST.replace('path: commands/inspect-fixture.md', 'path: commands/escape.md'),
  );

  const info = await inspectLocalConstruct('fixture', root);
  assert.equal(info.mechanics.commands[0].path_status, 'invalid-path');
  assert.equal(info.mechanics.commands[0].path, null);
  assert.equal(info.mechanics.skills[0].metadata_status, 'invalid-path');
  assert.equal(info.mechanics.skills[0].entry, null);
});

test('malformed manifest collections fail closed to empty mechanics', async (t) => {
  const manifest = MANIFEST
    .replace(/skills:\n(?:  .*\n){2}/, 'skills: malformed\n')
    .replace(/commands:\n(?:  .*\n){2}/, 'commands: malformed\n');
  const root = await makePack(manifest);
  t.after(() => rm(root, { recursive: true, force: true }));

  const info = await inspectLocalConstruct('fixture', root);
  assert.deepEqual(info.mechanics.skills, []);
  assert.deepEqual(info.mechanics.commands, []);
});

test('skill metadata distinguishes missing from invalid', async (t) => {
  const missingRoot = await makePack();
  const invalidRoot = await makePack(MANIFEST, 'not-an-object\n');
  t.after(() => rm(missingRoot, { recursive: true, force: true }));
  t.after(() => rm(invalidRoot, { recursive: true, force: true }));
  await rm(path.join(missingRoot, 'fixture', 'skills', 'inspect-fixture', 'index.yaml'));

  const missing = await inspectLocalConstruct('fixture', missingRoot);
  const invalid = await inspectLocalConstruct('fixture', invalidRoot);
  assert.equal(missing.mechanics.skills[0].metadata_status, 'missing');
  assert.equal(invalid.mechanics.skills[0].metadata_status, 'invalid');
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

test('the info schema rejects undeclared data, provenance, mechanics, and capability fields', async (t) => {
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

  payload.data.mechanics.permission_grant = 'write-all';
  payload.data.mechanics.skills[0].capabilities.authority_effect = 'full';
  payload.data.source = '/Users/operator/private/constructs/fixture';
  payload.provenance.permission_grant = 'write-all';
  const validation = validate(INFO_SCHEMA, payload);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join('\n'), /source/);
  assert.match(validation.errors.join('\n'), /provenance.*permission_grant/);
  assert.match(validation.errors.join('\n'), /permission_grant/);
  assert.match(validation.errors.join('\n'), /authority_effect/);
});
