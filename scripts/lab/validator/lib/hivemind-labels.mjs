// Core logic for the Gate-1 hivemind-labels validator (cycle-001).
// Pure, dependency-light (js-yaml only) so it is unit-testable without the CLI.
// See grimoires/loa/sdd.md §3.2 (drift map) and §5.2 (interface contract).

import { load as yamlLoad } from 'js-yaml';

// Canonical key absent but a known legacy key present → key-rename drift.
const LEGACY_KEY = { artifact_type: 'artifact', product_area: 'product' };
const JTBD_CATEGORIES = ['functional', 'personal', 'social'];

/**
 * Extract the `hivemind:` block from a markdown file's YAML frontmatter,
 * or — for --stdin — from a raw YAML block that either wraps it under
 * `hivemind:` or *is* the block itself.
 * Throws (YAMLException) on malformed YAML; returns null if no block found.
 */
export function getHivemindBlock(text) {
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const doc = yamlLoad(fm ? fm[1] : text); // throws on malformed YAML
  if (doc && typeof doc === 'object') {
    if (doc.hivemind && typeof doc.hivemind === 'object') return doc.hivemind;
    if ('artifact' in doc || 'artifact_type' in doc) return doc;
  }
  return null;
}

const hyphenate = (s) => (typeof s === 'string' ? s.replaceAll('_', '-') : s);

function checkEnum(val, prop) {
  if (prop.enum.includes(val)) return { status: 'MATCH', detail: `'${val}'` };
  if (typeof val === 'string' && prop.enum.includes(hyphenate(val))) {
    return { status: 'DRIFT', driftClass: 'enum-hyphenation', detail: `'${val}' needs hyphenation (canonical: '${hyphenate(val)}')` };
  }
  return { status: 'DRIFT', driftClass: 'unknown-enum-value', detail: `'${val}' not in canonical enum` };
}

function checkJtbd(val) {
  if (Array.isArray(val)) {
    return { status: 'DRIFT', driftClass: 'shape-mismatch', detail: `${val.length ? `array[${val.length}]` : 'empty array'} (canonical: {category, description} object)` };
  }
  if (val && typeof val === 'object') {
    const { category, description } = val;
    if (JTBD_CATEGORIES.includes(category) && typeof description === 'string' && description.length) {
      const short = description.length > 30 ? `${description.slice(0, 30)}…` : description;
      return { status: 'MATCH', detail: `{${category}: "${short}"}` };
    }
    return { status: 'DRIFT', driftClass: 'shape-mismatch', detail: 'incomplete object (needs category∈{functional,personal,social} + description)' };
  }
  return { status: 'DRIFT', driftClass: 'shape-mismatch', detail: 'not an object' };
}

/**
 * The construct's required field set. The canonical schema marks NO top-level
 * `required` array and is `additionalProperties: false`; the contract (PRD + drift
 * report) is the property set minus the optional meta-field `schema_version`.
 * Derived from the vendored file — the field list is never hard-coded (OQ-3).
 */
export function expectedFields(schema) {
  return Object.keys(schema.properties || {}).filter((f) => f !== 'schema_version');
}

/**
 * Compare an emitted hivemind block against the canonical schema, one row per
 * expected field. Each row: { field, status: MATCH|DRIFT|MISSING, driftClass?, detail }.
 */
export function analyzeDrift(block, schema) {
  const rows = [];
  for (const field of expectedFields(schema)) {
    const prop = schema.properties[field] || {};
    if (Object.prototype.hasOwnProperty.call(block, field)) {
      const val = block[field];
      let r;
      if (prop.enum) r = checkEnum(val, prop);
      else if (field === 'jtbd' || prop.type === 'object') r = checkJtbd(val);
      else if (prop.type === 'string') {
        r = typeof val === 'string'
          ? { status: 'MATCH', detail: `'${val}'` }
          : { status: 'DRIFT', driftClass: 'shape-mismatch', detail: `${Array.isArray(val) ? 'array' : typeof val} (canonical: string)` };
      } else r = { status: 'MATCH', detail: String(val) };
      rows.push({ field, ...r });
    } else {
      const legacy = LEGACY_KEY[field];
      if (legacy && Object.prototype.hasOwnProperty.call(block, legacy)) {
        const lv = block[legacy];
        let detail = `key '${legacy}' → '${field}'`;
        if (field === 'artifact_type' && typeof lv === 'string') {
          detail += `; value '${lv}'` + (prop.enum && prop.enum.includes(hyphenate(lv)) ? ` → '${hyphenate(lv)}'` : '');
        } else if (field === 'product_area') {
          detail += `; value is ${Array.isArray(lv) ? 'array' : typeof lv} (canonical: string)`;
        }
        rows.push({ field, status: 'DRIFT', driftClass: 'key-rename', detail });
      } else {
        const canon = prop.enum ? prop.enum.join('|') : (prop.type || 'value');
        rows.push({ field, status: 'MISSING', driftClass: 'missing-field', detail: `field absent (canonical: ${canon})` });
      }
    }
  }
  return rows;
}

export function summarize(rows) {
  const drifted = rows.filter((r) => r.status === 'DRIFT').length;
  const missing = rows.filter((r) => r.status === 'MISSING').length;
  const match = rows.filter((r) => r.status === 'MATCH').length;
  return { drifted, missing, match, conformant: drifted === 0 && missing === 0 };
}

export function formatReport(sourceLabel, rows, conformant) {
  const w = Math.max(5, ...rows.map((r) => r.field.length));
  const s = summarize(rows);
  const lines = [`hivemind-labels-validate — ${sourceLabel}`, ''];
  lines.push(`  ${'FIELD'.padEnd(w)}  ${'STATUS'.padEnd(8)} DETAIL`);
  for (const r of rows) lines.push(`  ${r.field.padEnd(w)}  ${r.status.padEnd(8)} ${r.detail}`);
  lines.push('');
  lines.push(`  RESULT: ${s.drifted} drifted, ${s.match} match, ${s.missing} missing → exit ${conformant ? 0 : 1}`);
  return lines.join('\n');
}
