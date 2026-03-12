import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Signal data discriminated union — SDD §3.1
const signalDataValidator = v.union(
  v.object({
    type: v.literal('feedback'),
    category: v.string(),
    description: v.optional(v.string()),
    whatUserWanted: v.optional(v.string()),
    frustration: v.optional(v.number()),
  }),
  v.object({
    type: v.literal('error_report'),
    errorClass: v.optional(v.string()),
    message: v.optional(v.string()),
    stackTrace: v.optional(v.string()),
    url: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }),
);

export default defineSchema({
  installEvents: defineTable({
    packSlug: v.string(),
    packName: v.string(),
    action: v.string(),
    timestamp: v.string(),
  }).index('by_created', ['timestamp']),

  syncStatus: defineTable({
    slug: v.string(),
    status: v.string(),
    lastSyncAt: v.string(),
    errorMessage: v.optional(v.string()),
  }).index('by_slug', ['slug']),

  dashboardPresence: defineTable({
    wallet: v.string(),
    displayName: v.optional(v.string()),
    lastSeen: v.number(),
    expiresAt: v.number(),
  })
    .index('by_wallet', ['wallet'])
    .index('by_expires', ['expiresAt']),

  healthObservations: defineTable({
    timestamp: v.string(),
    healthScore: v.number(),
    healthDelta: v.number(),
    apiStatus: v.string(),
    apiResponseMs: v.number(),
    registeredCount: v.number(),
    namespaceCount: v.number(),
    staleConstructs: v.array(v.string()),
    emptyCategories: v.array(v.string()),
    verificationTiers: v.any(),
    subScores: v.object({
      api_liveness: v.number(),
      version_freshness: v.number(),
      category_coverage: v.number(),
      identity_drift: v.number(),
      composition_density: v.number(),
      verification_flow: v.number(),
    }),
    source: v.optional(v.string()),
  }).index('by_timestamp', ['timestamp']),

  // --- Observability Dashboard (cycle-044) ---

  signals: defineTable({
    appSlug: v.string(),
    source: v.string(),
    severity: v.string(),
    title: v.string(),
    data: signalDataValidator,
    status: v.string(), // new | triaged | escalated | resolved | dismissed
    incidentGroupId: v.string(),
    occurrenceCount: v.number(),
    timestamp: v.string(),
    // Classification (populated async by Claude Haiku)
    classification: v.optional(
      v.object({
        level1Symptom: v.string(),
        level2Want: v.string(),
        level3Hypothesis: v.string(),
        confidence: v.number(),
        labels: v.array(v.string()),
      }),
    ),
    classificationAttempts: v.number(),
    // Linear integration
    linearIssueId: v.optional(v.string()),
    linearIssueUrl: v.optional(v.string()),
    linearSyncedAt: v.optional(v.string()),
    linearCreationAttempts: v.optional(v.number()),
    // Resolution
    resolvedBy: v.optional(v.string()),
    resolvedAt: v.optional(v.string()),
    resolutionNote: v.optional(v.string()),
    // Discord alerting
    discordAlertedAt: v.optional(v.string()),
  })
    .index('by_app', ['appSlug', 'timestamp'])
    .index('by_status', ['status', 'timestamp'])
    .index('by_severity', ['severity', 'timestamp'])
    .index('by_incident_group', ['incidentGroupId'])
    .index('by_timestamp', ['timestamp'])
    .index('by_linear_issue', ['linearIssueId'])
    .index('by_source_timestamp', ['source', 'timestamp']),

  signalKeys: defineTable({
    keyPrefix: v.string(),
    keyHash: v.string(),
    appSlug: v.string(),
    revoked: v.boolean(),
    syncedAt: v.string(),
  }).index('by_prefix', ['keyPrefix']),

  signalRateLimits: defineTable({
    keyPrefix: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index('by_key_window', ['keyPrefix', 'windowStart']),
});
