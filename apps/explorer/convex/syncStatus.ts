import { query, action, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

export const get = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return ctx.db
      .query('syncStatus')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .first();
  },
});

export const listAll = query({
  handler: async (ctx) => {
    return ctx.db.query('syncStatus').collect();
  },
});

export const upsert = internalMutation({
  args: {
    slug: v.string(),
    status: v.string(),
    lastSyncAt: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('syncStatus')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        lastSyncAt: args.lastSyncAt,
        errorMessage: args.errorMessage,
      });
    } else {
      await ctx.db.insert('syncStatus', {
        slug: args.slug,
        status: args.status,
        lastSyncAt: args.lastSyncAt,
        errorMessage: args.errorMessage,
      });
    }
  },
});

export const upsertFromServer = action({
  args: {
    writeKey: v.string(),
    slug: v.string(),
    status: v.string(),
    lastSyncAt: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expectedKey = process.env.CONVEX_WRITE_KEY;
    if (!expectedKey || args.writeKey !== expectedKey) {
      throw new Error('unauthorized');
    }
    await ctx.runMutation(internal.syncStatus.upsert, {
      slug: args.slug,
      status: args.status,
      lastSyncAt: args.lastSyncAt,
      errorMessage: args.errorMessage,
    });
  },
});
