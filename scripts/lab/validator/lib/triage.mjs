// Tier-1 deterministic pre-filter for the two-tier triage classifier (FR-4, C-4).
// Returns 'bug-report' on a clear bug signal, or null to ESCALATE to Tier-2.
// Full workstream × artifact_type × priority classification defers to autolabel.mjs
// (colon-form output: workstream:… artifact-type:… priority:…).

import { classifyFromText, dimsToColonLabels } from '../../autolabel.mjs';

export const BUG_SIGNAL_REGEX =
  /(\berror(?:ed|s)?\b|\bbroke(?:n)?\b|\bcrash(?:ed|ing|es)?\b|\bfail(?:ed|ing|ure|s)?\b|\bnot (?:working|showing|loading|displaying|responding)\b|\bdoesn'?t (?:work|load|show|open)\b|\bwon'?t (?:load|open|start|connect|show)\b|\bstack ?trace\b|\bexception\b|\bverification failed\b|\bunexpected error\b|\bHTTP [45]\d\d\b|\b[45]\d\d error\b)/i;

/**
 * Tier 1 — deterministic pre-filter. Clear bug signal → 'bug-report'.
 * No signal → null (escalate to the Tier-2 Level-3 diagnostic).
 */
export function tier1Classify(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  return BUG_SIGNAL_REGEX.test(text) ? 'bug-report' : null;
}

/**
 * Classify issue text via autolabel heuristics; override artifact_type when Tier-1
 * detects a bug signal. Returns schema dims + colon-form GitHub labels.
 */
export function classifyIssueText(title = '', body = '') {
  const dims = classifyFromText(title, body);
  if (tier1Classify(`${title}\n${body}`) === 'bug-report') {
    dims.artifact_type = 'bug-report';
  }
  return { dims, labels: dimsToColonLabels(dims) };
}
