#!/usr/bin/env node
/*
 * Hivemind auto-labeler — derives canonical taxonomy labels from issue/PR context.
 * VENDORED from loa-freeside/tools/hivemind/autolabel.mjs (construct-laboratory-substrate @2bd219ad).
 * Self-contained: enums are inline, no schema-file dependency.
 *
 *   node autolabel.mjs            → "workstream:delivery artifact-type:product-spec priority:medium"
 *   node autolabel.mjs --json     → {"workstream":"delivery",...}
 *
 * Emits the COLON form (ratified 2026-06-01). Title prefixes ([CANVAS]/[BUG]) are orthogonal.
 */

const RX = (s) => new RegExp(s, 'i');

const WS = [
  ['sorry-for-ur-loss', RX('\\b(outage|hotfix|on.?fire|sev[012]|p0|active incident|(is|went|going|service|site|prod|production) down|down for|broke (the )?(build|prod|production))\\b')],
  ['experimentation', RX('\\b(experiment|spike|prototype|hypothesis|canary|rlhf|poc|playtest)\\b')],
  ['tech-debt', RX('\\b(refactor|upgrade|migrat|deprecat|clean.?up|tech.?debt|chore|lint|rename|bump)\\b')],
  ['discovery', RX('\\b(research|discover|explore|investigat|scope|understand|unknown)\\b')],
  ['delivery', RX('.')],
];

const ART = [
  ['incident-postmortem', RX('\\b(postmortem|post.?mortem)\\b')],
  ['bug-report', RX('(stack ?trace|traceback|\\bexception\\b|\\bthrows?\\b|crashes? (on|when|at|after)|fails? to |does(n.?t| not) work|not working|\\b[45]\\d\\d\\b|reproduc)')],
  ['technical-rfc', RX('\\b(rfc|design doc|architecture|sdd|adr)\\b')],
  ['experiment-design', RX('\\b(experiment design|hypothesis|a/b test)\\b')],
  ['launch-plan', RX('\\b(launch|release plan|go.?to.?market|gtm|rollout)\\b')],
  ['competitor-analysis', RX('\\b(competitor|competitive|vs\\.? )\\b')],
  ['user-interview-synthesis', RX('\\b(user interview|interview synthesis)\\b')],
  ['user-truth-canvas', RX('\\b(user truth|canvas|persona|user research)\\b')],
  ['atomic-learning', RX('\\b(learning|insight|finding|takeaway)\\b')],
  ['meeting-notes', RX('\\b(meeting|sync notes|standup)\\b')],
  ['product-spec', RX('.')],
];

const PRI = [
  ['urgent', RX('\\b(urgent|p0|critical|asap|blocker|on.?fire|sev0)\\b')],
  ['high', RX('\\b(\\bp1\\b|important|high.?priority|soon|sev1)\\b')],
  ['low', RX('\\b(low.?priority|minor|cosmetic|nice.?to.?have|p3|someday|backlog)\\b')],
  ['medium', RX('.')],
];

function pick(table, hay) {
  return (table.find(([, rx]) => rx.test(hay)) || table[table.length - 1])[0];
}

/** Classify title+body into schema enum values (workstream, artifact_type, priority). */
export function classifyFromText(title = '', body = '') {
  const hay = `${title}\n${body}`.replace(/^[ \t]*#{1,6}[ \t].*$/gm, '').toLowerCase();
  return {
    workstream: pick(WS, hay),
    artifact_type: pick(ART, hay),
    priority: pick(PRI, hay),
  };
}

/** Map hivemind enum dims to colon-form GitHub label strings (3-dim autolabel output). */
export function dimsToColonLabels(dims) {
  return [
    `workstream:${dims.workstream}`,
    `artifact-type:${dims.artifact_type}`,
    `priority:${dims.priority}`,
  ];
}

import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const title = process.env.ISSUE_TITLE || args[0] || '';
  const body = process.env.ISSUE_BODY || args[1] || '';
  const dims = classifyFromText(title, body);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(dims));
  } else {
    console.log(dimsToColonLabels(dims).join(' '));
  }
}
