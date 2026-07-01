import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCHEMA_TO_GITHUB_DIM,
  toGithubLabel,
  hivemindToGithubLabels,
} from './github-labels.mjs';
import { project } from './project-canvas.mjs';
import { getHivemindBlock } from './hivemind-labels.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const goldenPath = join(__dir, '../../../../tests/lab/golden-hivemind-frontmatter.md');

test('SCHEMA_TO_GITHUB_DIM maps artifact_type to artifact-type', () => {
  assert.equal(SCHEMA_TO_GITHUB_DIM.artifact_type, 'artifact-type');
});

test('toGithubLabel emits colon form', () => {
  assert.equal(toGithubLabel('workstream', 'discovery'), 'workstream:discovery');
  assert.equal(toGithubLabel('artifact_type', 'bug-report'), 'artifact-type:bug-report');
});

test('hivemindToGithubLabels for golden fixture enums', () => {
  const hm = {
    artifact_type: 'experiment-design',
    workstream: 'discovery',
    priority: 'high',
    learning_status: 'directionally-correct',
    source: 'team-internal',
  };
  assert.deepEqual(hivemindToGithubLabels(hm), [
    'workstream:discovery',
    'artifact-type:experiment-design',
    'priority:high',
    'learning-status:directionally-correct',
    'source:team-internal',
    'laboratory',
  ]);
});

test('hivemindToGithubLabels never emits bracket prefixes', () => {
  const hm = {
    artifact_type: 'user-truth-canvas',
    workstream: 'delivery',
    priority: 'medium',
    learning_status: 'smol-evidence',
    source: 'team-internal',
  };
  for (const label of hivemindToGithubLabels(hm)) {
    assert.doesNotMatch(label, /^\[[A-Z]+\]/);
  }
});

test('project() on golden fixture yields colon labels only', () => {
  const canvas = readFileSync(goldenPath, 'utf8');
  const { labels } = project(canvas, null);
  assert.ok(labels.includes('workstream:discovery'));
  assert.ok(labels.includes('artifact-type:experiment-design'));
  assert.ok(labels.includes('priority:high'));
  assert.ok(labels.includes('learning-status:directionally-correct'));
  assert.ok(labels.includes('source:team-internal'));
  assert.ok(labels.includes('laboratory'));
  assert.equal(labels.some((l) => l.startsWith('[A]') || l.startsWith('[AT]')), false);
  assert.equal(labels.some((l) => l.startsWith('[P]') || l.startsWith('[J]')), false);
});

test('project() title uses [CANVAS] prefix', () => {
  const canvas = readFileSync(goldenPath, 'utf8');
  const { title } = project(canvas, null);
  assert.match(title, /^\[CANVAS\] /);
});

test('getHivemindBlock parses golden fixture jtbd', () => {
  const canvas = readFileSync(goldenPath, 'utf8');
  const hm = getHivemindBlock(canvas);
  assert.equal(hm.jtbd.category, 'functional');
  assert.match(hm.jtbd.description, /synced/);
});
