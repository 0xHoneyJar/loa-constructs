// Pure canvas → GitHub-issue projection (FR-5, C-5). Deterministic, no I/O —
// fully unit-testable without GitHub. The platform adapter (scripts/project-canvas-to-issue)
// is the only impure boundary.
//
// Output conforms to the canonical [CANVAS] issue template:
//   Title: [CANVAS] {core friction in user's words}
//   Body:  ## Quotes  ## Data  ## Who  ## Where  ## When  ## What (JTBD)
// Labels: colon-form hivemind taxonomy (workstream:… artifact-type:… priority:…
//         learning-status:… source:…) + laboratory — aligned with loa-freeside (2026-06-01).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { getHivemindBlock, analyzeDrift, summarize } from './hivemind-labels.mjs';
import { hivemindToGithubLabels } from './github-labels.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA_PATH = join(__dir, '../../../../.claude/schemas/labels.schema.json');

const REQUIRED = ['artifact_type', 'workstream', 'priority', 'product_area', 'jtbd', 'learning_status', 'source'];
const PRIORITY_VALUES = new Set(['urgent', 'high', 'medium', 'low']);

export class ProjectionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProjectionError';
  }
}

function loadDefaultSchema() {
  return JSON.parse(readFileSync(DEFAULT_SCHEMA_PATH, 'utf8'));
}

function parseDoc(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? yaml.load(m[1]) || {} : {};
}

function extractTitle(text) {
  const m = text.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : 'Untitled canvas';
}

function bodyAfterFrontmatter(text) {
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return (m ? m[1] : text).trim();
}

function extractQuotes(body) {
  const out = [];
  const re = /^>\s*(?:\*\*(.+?)\*\*\s*[—–-]\s*)?[^"\n]*"([^"]+)"/gm;
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push(`- [QUOTED: "${m[2]}"${m[1] ? ` — ${m[1]}` : ''}]`);
  }
  return out;
}

/**
 * project(canvasText) -> { title, labels, body }
 * Throws ProjectionError when any required hivemind field is absent — it must NOT
 * emit a partial label set (an incomplete projection silently fails Gate 3).
 * @param {string} canvasText
 * @param {object|null|undefined} schema — undefined loads default schema; null skips drift check
 */
export function project(canvasText, schema = undefined) {
  const resolvedSchema = schema === undefined ? loadDefaultSchema() : schema;
  const doc = parseDoc(canvasText);
  const hm = (doc && typeof doc === 'object' && doc.hivemind) || getHivemindBlock(canvasText);
  if (!hm) {
    throw new ProjectionError('no hivemind: block found. Run hivemind-labels-validate first.');
  }
  for (const f of REQUIRED) {
    if (!(f in hm) || hm[f] === undefined || hm[f] === null) {
      throw new ProjectionError(
        `hivemind.${f} is required for projection but is absent. ` +
          'Run hivemind-labels-validate first; the canvas must be canonical before projection.',
      );
    }
  }
  if (typeof hm.jtbd !== 'object' || Array.isArray(hm.jtbd) || !hm.jtbd.category || !hm.jtbd.description) {
    throw new ProjectionError('hivemind.jtbd must be a {category, description} object (run the validator).');
  }
  if (!PRIORITY_VALUES.has(hm.priority)) {
    throw new ProjectionError(`hivemind.priority '${hm.priority}' is not a canonical priority (urgent|high|medium|low).`);
  }

  if (resolvedSchema) {
    const rows = analyzeDrift(hm, resolvedSchema);
    const s = summarize(rows);
    if (!s.conformant) {
      const bad = rows.filter((r) => r.status !== 'MATCH').map((r) => `${r.field}=${r.status}`).join(', ');
      throw new ProjectionError(
        `canvas is not canonical (${bad}). Run hivemind-labels-validate; it must pass Gate 1 before projection.`,
      );
    }
  }

  const friction = extractTitle(canvasText);
  const title = `[CANVAS] ${friction}`;
  const labels = hivemindToGithubLabels(hm);

  const quotes = extractQuotes(bodyAfterFrontmatter(canvasText));
  const when = doc.created
    ? `${doc.created}${doc.updated && doc.updated !== doc.created ? ` (updated ${doc.updated})` : ''}`
    : '—';

  const body = [
    '## Quotes',
    quotes.length ? quotes.join('\n') : '_No verbatim quotes captured in the canvas body._',
    '',
    '## Data',
    `Learning status: \`${hm.learning_status}\` · Priority: \`${hm.priority}\` · Source: \`${hm.source}\``,
    '',
    '## Who',
    String(doc.user || '—'),
    '',
    '## Where',
    String(hm.product_area),
    '',
    '## When',
    when,
    '',
    '## What (JTBD)',
    `**${hm.jtbd.category}** — ${hm.jtbd.description}`,
    '',
    '---',
    '',
    bodyAfterFrontmatter(canvasText),
  ].join('\n');

  return { title, labels, body };
}
