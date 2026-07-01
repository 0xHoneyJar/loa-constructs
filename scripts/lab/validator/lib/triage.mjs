// Tier-1 deterministic pre-filter for the two-tier triage classifier (FR-4, C-4).
// Returns 'bug-report' on a clear bug signal, or null to ESCALATE to Tier-2 (the
// Level-3 diagnostic). It never guesses — ambiguity escalates, it does not default
// (sdd.md §6.2: "Triage never silently defaults").

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
