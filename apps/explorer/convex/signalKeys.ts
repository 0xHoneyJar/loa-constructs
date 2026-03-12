import { query } from './_generated/server';
import { v } from 'convex/values';

// Public query for key prefix lookup — used by Route Handler for key validation
export const getByPrefix = query({
  args: { keyPrefix: v.string() },
  handler: async (ctx, { keyPrefix }) => {
    const key = await ctx.db
      .query('signalKeys')
      .withIndex('by_prefix', (q) => q.eq('keyPrefix', keyPrefix))
      .first();

    if (!key || key.revoked) return null;
    return { keyHash: key.keyHash, appSlug: key.appSlug };
  },
});
