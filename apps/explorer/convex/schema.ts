import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  installEvents: defineTable({
    packSlug: v.string(),
    packName: v.string(),
    action: v.string(),
    timestamp: v.string(),
  }).index('by_created', ['_creationTime']),

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
});
