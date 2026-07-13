import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, YamlSubsetError } from '../lib/vendor/yaml-subset.mjs';
import { validate, SUPPORTED_KEYWORDS, SchemaSubsetError } from '../lib/vendor/schema-subset.mjs';
import { match, overlaps, compile, specificity, GlobError } from '../lib/vendor/glob.mjs';

// ── yaml-subset ───────────────────────────────────────────────────────────────

test('yaml: parses block maps, sequences, and scalar types', () => {
  const doc = parse(`
name: k-hole
version: 1.2.1
enabled: true
missing: null
skills:
  - dig
  - forge
nested:
  a: 1
  b: two
`);
  assert.equal(doc.name, 'k-hole');
  assert.equal(doc.version, '1.2.1'); // quoted-less version with a dot stays a string? no: 1.2.1 is not numeric
  assert.equal(doc.enabled, true);
  assert.equal(doc.missing, null);
  assert.deepEqual(doc.skills, ['dig', 'forge']);
  assert.deepEqual(doc.nested, { a: 1, b: 'two' });
});

test('yaml: parses sequences of maps', () => {
  const doc = parse(`
loadout:
  - construct: saaty
    authority_tier: observe
  - construct: evans
    authority_tier: advise
`);
  assert.deepEqual(doc.loadout, [
    { construct: 'saaty', authority_tier: 'observe' },
    { construct: 'evans', authority_tier: 'advise' },
  ]);
});

test('yaml: parses literal (|) and folded (>) block scalars', () => {
  const doc = parse(`
literal: |
  line one
  line two
folded: >
  these words
  become one line
after: yes
`);
  assert.equal(doc.literal, 'line one\nline two\n');
  assert.equal(doc.folded, 'these words become one line\n');
  assert.equal(doc.after, 'yes');
});

test('yaml: REFUSES out-of-subset constructs loudly — never a best-effort parse', () => {
  // The whole point of the subset: a silently-dropped anchor would hand the caller
  // a manifest that is not the one on disk.
  for (const [src, why] of [
    ['a: &anchor 1\nb: *anchor\n', 'anchors'],
    ['a: !!str 1\n', 'tags'],
    ['a: 1\n---\nb: 2\n...\n', 'multi-doc'],
    ['<<: *base\na: 1\n', 'merge keys'],
  ]) {
    assert.throws(() => parse(src), YamlSubsetError, `expected refusal for ${why}`);
  }
});

test('yaml: out-of-subset error names the line and the construct', () => {
  try {
    parse('name: ok\nbad: &a 1\n');
    assert.fail('should have thrown');
  } catch (err) {
    assert.equal(err.code, 'YAML_OUT_OF_SUBSET');
    assert.match(err.message, /anchors/);
    assert.match(err.message, /line 2/);
  }
});

test('yaml: comments and quoted strings survive intact', () => {
  const doc = parse(`
# a leading comment
url: "https://example.com/#not-a-comment"  # trailing comment
note: 'it''s quoted'
`);
  assert.equal(doc.url, 'https://example.com/#not-a-comment');
  assert.equal(doc.note, "it's quoted");
});

// ── schema-subset ─────────────────────────────────────────────────────────────

const territorySchema = {
  type: 'object',
  required: ['schema_version', 'region'],
  additionalProperties: false,
  properties: {
    schema_version: { type: 'string', pattern: '^1\\.' },
    region: { type: 'string', pattern: '^[a-z][a-z0-9-]*$' },
    scopes: { type: 'array', items: { type: 'string' } },
    tier: { type: 'string', enum: ['observe', 'advise', 'gate'] },
  },
};

test('schema: accepts a valid document', () => {
  const { valid, errors } = validate(territorySchema, {
    schema_version: '1.0',
    region: 'loa-constructs',
    scopes: ['packages/**'],
    tier: 'observe',
  });
  assert.equal(valid, true, errors.join('; '));
});

test('schema: rejects bad slug, unknown tier, unknown property, missing required', () => {
  const cases = [
    [{ schema_version: '1.0', region: 'Bad_Slug' }, /does not match/],
    [{ schema_version: '1.0', region: 'ok', tier: 'god' }, /must be one of/],
    [{ schema_version: '1.0', region: 'ok', surprise: 1 }, /unknown property/],
    [{ region: 'ok' }, /missing required property/],
  ];
  for (const [doc, re] of cases) {
    const { valid, errors } = validate(territorySchema, doc);
    assert.equal(valid, false);
    assert.match(errors.join(' '), re);
  }
});

test('schema: an UNSUPPORTED keyword in the schema is an error, not a silent no-op', () => {
  // A schema author who writes oneOf deserves to be told it is not enforced,
  // rather than believing that it is.
  assert.throws(() => validate({ oneOf: [{ type: 'string' }] }, 'x'), SchemaSubsetError);
  assert.ok(SUPPORTED_KEYWORDS.includes('pattern'));
  assert.ok(!SUPPORTED_KEYWORDS.includes('oneOf'));
});

// ── glob ──────────────────────────────────────────────────────────────────────

test('glob: normative scope semantics (** recursive, * one segment, case-sensitive)', () => {
  assert.equal(match('packages/**', 'packages/loa-registry/src/index.ts'), true);
  assert.equal(match('packages/*', 'packages/loa-registry'), true);
  assert.equal(match('packages/*', 'packages/loa-registry/src/index.ts'), false); // * never crosses /
  assert.equal(match('registry.yaml', 'registry.yaml'), true);
  assert.equal(match('Registry.yaml', 'registry.yaml'), false); // case-sensitive
  assert.equal(match('apps/**/*.ts', 'apps/api/src/app.ts'), true);
});

test('glob: refuses absolute paths, upward traversal, and unsupported syntax', () => {
  assert.throws(() => compile('/etc/passwd'), GlobError);
  assert.throws(() => compile('../secrets/**'), GlobError);
  assert.throws(() => compile('src/{a,b}/*'), GlobError);
  assert.throws(() => compile('src/[a-z]*'), GlobError);
});

test('glob: overlap detection drives intra-region errors and cross-region CONFLICTs', () => {
  assert.equal(overlaps('packages/**', 'packages/loa-registry/**'), true);
  assert.equal(overlaps('packages/**', 'apps/**'), false);
  assert.equal(overlaps('apps/api/**', 'apps/**'), true);
  assert.equal(overlaps('registry.yaml', 'registry.yaml'), true);
  assert.equal(overlaps('registry.yaml', 'package.json'), false);
});

test('glob: specificity implements nearest-scope-wins', () => {
  assert.ok(specificity('packages/loa-registry/**') > specificity('packages/**'));
});
