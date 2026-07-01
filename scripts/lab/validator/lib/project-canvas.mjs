// Pure canvas → GitHub-issue projection (FR-5, C-5). Deterministic, no I/O —
// fully unit-testable without GitHub. The platform adapter (scripts/project-canvas-to-issue)
// is the only impure boundary.
//
// Output conforms to the canonical [CANVAS] issue template (vendored at
// templates/hivemind-issue-templates.md, from 0xHoneyJar/construct-hivemind-os):
//   Title: [CANVAS] {core friction in user's words}
//   Body:  ## Quotes  ## Data  ## Who  ## Where  ## When  ## What (JTBD)
// Labels remain the hivemind-laboratory schema chips ([A][W][PR][P][J][LS][SO] + laboratory).

import yaml from 'js-yaml';
import { getHivemindBlock, analyzeDrift, summarize } from './hivemind-labels.mjs';

const REQUIRED = ['artifact_type', 'workstream', 'priority', 'product_area', 'jtbd', 'learning_status', 'source'];
const PRIORITY_ORDINAL = { urgent: 1, high: 2, medium: 3, low: 4 };

export class ProjectionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProjectionError';
  }
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

// Pull attributed quotes out of the canvas body's blockquotes and render them with
// the org source-fidelity markup: [QUOTED: "<quote>" — <source>].
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
 */
export function project(canvasText, schema = null) {
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
  const ord = PRIORITY_ORDINAL[hm.priority];
  if (!ord) {
    throw new ProjectionError(`hivemind.priority '${hm.priority}' is not a canonical priority (urgent|high|medium|low).`);
  }

  // Shared acceptance criteria with the validator (consensus H1): when a schema is provided,
  // refuse to project a non-canonical block — never emit drifted labels from a drifted canvas.
  if (schema) {
    const rows = analyzeDrift(hm, schema);
    const s = summarize(rows);
    if (!s.conformant) {
      const bad = rows.filter((r) => r.status !== 'MATCH').map((r) => `${r.field}=${r.status}`).join(', ');
      throw new ProjectionError(
        `canvas is not canonical (${bad}). Run hivemind-labels-validate; it must pass Gate 1 before projection.`,
      );
    }
  }

  const friction = extractTitle(canvasText);
  // Canonical [CANVAS] issue title (templates/hivemind-issue-templates.md).
  const title = `[CANVAS] ${friction}`;

  // 7 prefixed labels + the 'laboratory' marker (the hivemind-laboratory schema is the
  // label authority; [PR] carries the ordinal). Unchanged by the [CANVAS] adoption.
  const labels = [
    `[A] ${hm.artifact_type}`,
    `[W] ${hm.workstream}`,
    `[PR] ${ord} ${hm.priority}`,
    `[P] ${hm.product_area}`,
    `[J] ${hm.jtbd.description}`,
    `[LS] ${hm.learning_status}`,
    `[SO] ${hm.source}`,
    'laboratory',
  ];

  const quotes = extractQuotes(bodyAfterFrontmatter(canvasText));
  const when = doc.created
    ? `${doc.created}${doc.updated && doc.updated !== doc.created ? ` (updated ${doc.updated})` : ''}`
    : '—';

  // Canonical [CANVAS] body (templates/hivemind-issue-templates.md), then the verbatim canvas.
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
