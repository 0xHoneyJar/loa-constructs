/**
 * Canonical Hivemind Laboratory label types (#247).
 * Derived from .claude/schemas/labels.schema.json v1.0 — keep in sync on schema bumps.
 * GitHub label strings use colon form (ratified 2026-06-01, loa-freeside aligned).
 */

export const LABELS_SCHEMA_VERSION = "1.0" as const;

export const ARTIFACT_TYPES = [
  "user-truth-canvas",
  "experiment-design",
  "atomic-learning",
  "product-spec",
  "bug-report",
  "incident-postmortem",
  "competitor-analysis",
  "user-interview-synthesis",
  "technical-rfc",
  "launch-plan",
  "meeting-notes",
] as const;

export const WORKSTREAMS = [
  "discovery",
  "delivery",
  "experimentation",
  "tech-debt",
  "sorry-for-ur-loss",
] as const;

export const PRIORITIES = ["urgent", "high", "medium", "low"] as const;

export const LEARNING_STATUSES = [
  "strongly-validated",
  "directionally-correct",
  "hypothesis-failed",
  "smol-evidence",
  "cant-make-a-conclusion",
] as const;

export const SOURCES = [
  "team-internal",
  "dm-to-team-member",
  "analytics-anomaly",
  "discord-support-or-feedback",
] as const;

export const JTBD_CATEGORIES = ["functional", "personal", "social"] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
export type Workstream = (typeof WORKSTREAMS)[number];
export type Priority = (typeof PRIORITIES)[number];
export type LearningStatus = (typeof LEARNING_STATUSES)[number];
export type Source = (typeof SOURCES)[number];
export type JtbdCategory = (typeof JTBD_CATEGORIES)[number];

export interface HivemindJtbd {
  category: JtbdCategory;
  description: string;
}

/** Seven-label hivemind block validated by scripts/lab/validator/ */
export interface HivemindLabels {
  schema_version?: typeof LABELS_SCHEMA_VERSION;
  artifact_type: ArtifactType;
  workstream: Workstream;
  priority: Priority;
  product_area?: string;
  jtbd?: HivemindJtbd;
  learning_status?: LearningStatus;
  source?: Source;
}

/** Schema field → GitHub colon label dimension prefix */
export const SCHEMA_TO_GITHUB_DIM = {
  artifact_type: "artifact-type",
  workstream: "workstream",
  priority: "priority",
  learning_status: "learning-status",
  source: "source",
} as const;

export type GithubLabelField = keyof typeof SCHEMA_TO_GITHUB_DIM;

/** Build a single colon-form GitHub label from a schema field and enum value */
export function toGithubLabel(field: GithubLabelField, value: string): string {
  return `${SCHEMA_TO_GITHUB_DIM[field]}:${value}`;
}

/** Project canonical hivemind enums to GitHub colon labels + laboratory marker */
export function hivemindToGithubLabels(hm: HivemindLabels): string[] {
  return [
    toGithubLabel("workstream", hm.workstream),
    toGithubLabel("artifact_type", hm.artifact_type),
    toGithubLabel("priority", hm.priority),
    toGithubLabel("learning_status", hm.learning_status!),
    toGithubLabel("source", hm.source!),
    "laboratory",
  ];
}

/** All colon-form GitHub labels by dimension (for sync/manifest validation) */
export const GITHUB_LAB_LABELS = {
  artifact_type: ARTIFACT_TYPES.map((v) => toGithubLabel("artifact_type", v)),
  workstream: WORKSTREAMS.map((v) => toGithubLabel("workstream", v)),
  priority: PRIORITIES.map((v) => toGithubLabel("priority", v)),
  learning_status: LEARNING_STATUSES.map((v) => toGithubLabel("learning_status", v)),
  source: SOURCES.map((v) => toGithubLabel("source", v)),
} as const;
