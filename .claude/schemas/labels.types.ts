/**
 * Canonical Hivemind Laboratory label types (#247).
 * Derived from .claude/schemas/labels.schema.json v1.0 — keep in sync on schema bumps.
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

/** GitHub label names for Lab-member issues (#247 additive alignment) */
export const GITHUB_LAB_LABELS = {
  artifact_type: ARTIFACT_TYPES.map((v) => `[AT] ${v}`),
  workstream: WORKSTREAMS.map((v) => `[WS] ${v}`),
  priority: PRIORITIES.map((v) => `[PR] ${v}`),
  learning_status: LEARNING_STATUSES.map((v) => `[LS] ${v}`),
  source: SOURCES.map((v) => `[SO] ${v}`),
} as const;
