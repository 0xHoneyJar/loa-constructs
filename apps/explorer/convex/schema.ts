import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

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
});
