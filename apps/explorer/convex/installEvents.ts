import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    return ctx.db
      .query('installEvents')
      .withIndex('by_created')
      .order('desc')
      .take(limit);
  },
});

export const record = mutation({
  args: {
    writeKey: v.string(),
    packSlug: v.string(),
    packName: v.string(),
    action: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    const expectedKey = process.env.CONVEX_WRITE_KEY;
    if (!expectedKey || args.writeKey !== expectedKey) {
      throw new Error('unauthorized');
    }
    await ctx.db.insert('installEvents', {
      packSlug: args.packSlug,
      packName: args.packName,
      action: args.action,
      timestamp: args.timestamp,
    });
  },
});
