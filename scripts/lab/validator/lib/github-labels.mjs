// GitHub colon-form label helpers — aligned with loa-freeside/tools/hivemind (2026-06-01).
// Schema snake_case keys map to GitHub label dimension prefixes (artifact_type → artifact-type).

/** @type {Record<string, string>} */
export const SCHEMA_TO_GITHUB_DIM = {
  artifact_type: 'artifact-type',
  workstream: 'workstream',
  priority: 'priority',
  learning_status: 'learning-status',
  source: 'source',
};

/**
 * Build a single colon-form GitHub label from a schema field and enum value.
 * @param {keyof typeof SCHEMA_TO_GITHUB_DIM} field
 * @param {string} value
 */
export function toGithubLabel(field, value) {
  const dim = SCHEMA_TO_GITHUB_DIM[field];
  if (!dim) {
    throw new Error(`no GitHub label dimension for schema field: ${field}`);
  }
  return `${dim}:${value}`;
}

/**
 * Project a canonical hivemind block to GitHub colon labels + laboratory marker.
 * product_area and jtbd are frontmatter/body-only — not GitHub labels.
 * @param {Record<string, unknown>} hm
 */
export function hivemindToGithubLabels(hm) {
  return [
    toGithubLabel('workstream', hm.workstream),
    toGithubLabel('artifact_type', hm.artifact_type),
    toGithubLabel('priority', hm.priority),
    toGithubLabel('learning_status', hm.learning_status),
    toGithubLabel('source', hm.source),
    'laboratory',
  ];
}
