import { query, mutation, internalMutation } from './_generated/server';
import { v } from 'convex/values';

const PRESENCE_TTL_MS = 60_000; // 60s

export const upsert = mutation({
  args: {
    wallet: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, { wallet, displayName }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query('dashboardPresence')
      .withIndex('by_wallet', (q) => q.eq('wallet', wallet))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeen: now,
        expiresAt: now + PRESENCE_TTL_MS,
        displayName,
      });
    } else {
      await ctx.db.insert('dashboardPresence', {
        wallet,
        displayName,
        lastSeen: now,
        expiresAt: now + PRESENCE_TTL_MS,
      });
    }
  },
});

export const listOnline = query({
  handler: async (ctx) => {
    const now = Date.now();
    return ctx.db
      .query('dashboardPresence')
      .withIndex('by_expires', (q) => q.gt('expiresAt', now))
      .collect();
  },
});

export const cleanupExpired = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query('dashboardPresence')
      .withIndex('by_expires', (q) => q.lt('expiresAt', now))
      .take(100);
    for (const row of expired) {
      await ctx.db.delete(row._id);
    }
  },
});
