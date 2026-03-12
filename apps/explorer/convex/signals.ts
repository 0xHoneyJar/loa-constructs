import {
  query,
  mutation,
  action,
  internalMutation,
  internalAction,
  internalQuery,
} from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

// --- Shared Validators ---

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

// --- Rate Limiting ---

const RATE_LIMIT_WINDOW_MS = 3_600_000; // 1 hour
const RATE_LIMIT_MAX = 100; // per key per hour

export const checkRateLimit = internalMutation({
  args: { keyPrefix: v.string() },
  handler: async (ctx, { keyPrefix }) => {
    const now = Date.now();
    const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;

    const existing = await ctx.db
      .query('signalRateLimits')
      .withIndex('by_key_window', (q) =>
        q.eq('keyPrefix', keyPrefix).eq('windowStart', windowStart),
      )
      .first();

    if (existing) {
      if (existing.count >= RATE_LIMIT_MAX) {
        return { allowed: false, remaining: 0 };
      }
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
      return { allowed: true, remaining: RATE_LIMIT_MAX - existing.count - 1 };
    }

    await ctx.db.insert('signalRateLimits', {
      keyPrefix,
      windowStart,
      count: 1,
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  },
});

// --- Insert (Internal Mutation) ---

export const insert = internalMutation({
  args: {
    appSlug: v.string(),
    source: v.string(),
    severity: v.string(),
    title: v.string(),
    data: signalDataValidator,
    incidentGroupId: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    // Dedup: check for existing signal in the same incident group
    const existing = await ctx.db
      .query('signals')
      .withIndex('by_incident_group', (q) =>
        q.eq('incidentGroupId', args.incidentGroupId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        occurrenceCount: existing.occurrenceCount + 1,
      });
      return { signalId: existing._id, deduplicated: true };
    }

    const signalId = await ctx.db.insert('signals', {
      ...args,
      status: 'new',
      occurrenceCount: 1,
      classificationAttempts: 0,
    });

    return { signalId, deduplicated: false };
  },
});

// --- Ingest Action (Entry Point) ---

export const ingest = action({
  args: {
    writeKey: v.string(),
    keyPrefix: v.optional(v.string()),
    appSlug: v.string(),
    source: v.string(),
    severity: v.string(),
    title: v.string(),
    data: signalDataValidator,
    incidentGroupId: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args): Promise<{ signalId: string; deduplicated: boolean }> => {
    const expectedKey = process.env.CONVEX_WRITE_KEY;
    if (!expectedKey || args.writeKey !== expectedKey) {
      throw new Error('unauthorized');
    }

    // Rate limiting per API key
    if (args.keyPrefix) {
      const rateResult: { allowed: boolean; remaining: number } =
        await ctx.runMutation(internal.signals.checkRateLimit, {
          keyPrefix: args.keyPrefix,
        });
      if (!rateResult.allowed) {
        throw new Error('rate limit exceeded');
      }
    }

    const { writeKey: _, keyPrefix: _kp, ...signalData } = args;

    const result: { signalId: string; deduplicated: boolean } =
      await ctx.runMutation(internal.signals.insert, signalData);

    // Schedule classification for new signals (not deduped)
    if (!result.deduplicated) {
      await ctx.scheduler.runAfter(0, internal.signals.classify, {
        signalId: result.signalId as any,
      });

      // Discord alerting for critical/high
      if (args.severity === 'critical' || args.severity === 'high') {
        await ctx.scheduler.runAfter(0, internal.signals.alertDiscord, {
          signalId: result.signalId as any,
          incidentGroupId: args.incidentGroupId,
        });
      }
    }

    return result;
  },
});

// --- Query Functions ---

export const byApp = query({
  args: {
    appSlug: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { appSlug, status, limit = 20 }) => {
    let q;
    if (appSlug) {
      q = ctx.db
        .query('signals')
        .withIndex('by_app', (idx) => idx.eq('appSlug', appSlug))
        .order('desc');
    } else if (status) {
      q = ctx.db
        .query('signals')
        .withIndex('by_status', (idx) => idx.eq('status', status))
        .order('desc');
    } else {
      q = ctx.db.query('signals').withIndex('by_timestamp').order('desc');
    }

    const signals = await q.take(limit + 1);

    const hasMore = signals.length > limit;
    const page = hasMore ? signals.slice(0, limit) : signals;
    const nextCursor = hasMore ? page[page.length - 1]?._id : undefined;

    return { signals: page, nextCursor, hasMore };
  },
});

export const statusCounts = query({
  handler: async (ctx) => {
    // Query only active statuses via index instead of full table scan (HIGH-001)
    const newSigs = await ctx.db
      .query('signals')
      .withIndex('by_status', (q) => q.eq('status', 'new'))
      .collect();
    const triaged = await ctx.db
      .query('signals')
      .withIndex('by_status', (q) => q.eq('status', 'triaged'))
      .collect();
    const escalated = await ctx.db
      .query('signals')
      .withIndex('by_status', (q) => q.eq('status', 'escalated'))
      .collect();

    const active = [...newSigs, ...triaged, ...escalated].filter(
      (s) => s.source !== 'heartbeat',
    );

    const counts: Record<string, Record<string, number>> = {};
    let totalNew = 0;
    let totalCritical = 0;

    for (const signal of active) {
      const app = signal.appSlug;
      if (!counts[app]) {
        counts[app] = { new: 0, triaged: 0, escalated: 0, resolved: 0, dismissed: 0, critical: 0, high: 0 };
      }
      counts[app][signal.status] = (counts[app][signal.status] || 0) + 1;
      if (signal.severity === 'critical') {
        counts[app].critical = (counts[app].critical || 0) + 1;
        totalCritical++;
      }
      if (signal.severity === 'high') {
        counts[app].high = (counts[app].high || 0) + 1;
      }
      if (signal.status === 'new') totalNew++;
    }

    return { byApp: counts, totalNew, totalCritical };
  },
});

export const recentActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    return ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .order('desc')
      .take(limit);
  },
});

export const getById = internalQuery({
  args: { signalId: v.id('signals') },
  handler: async (ctx, { signalId }) => {
    return ctx.db.get(signalId);
  },
});

export const getByIdPublic = query({
  args: { signalId: v.id('signals') },
  handler: async (ctx, { signalId }) => {
    return ctx.db.get(signalId);
  },
});

// --- Status Update ---

export const updateStatus = internalMutation({
  args: {
    signalId: v.id('signals'),
    status: v.string(),
    resolvedBy: v.optional(v.string()),
    resolutionNote: v.optional(v.string()),
  },
  handler: async (ctx, { signalId, status, resolvedBy, resolutionNote }) => {
    const patch: Record<string, unknown> = { status };
    if (status === 'resolved') {
      patch.resolvedAt = new Date().toISOString();
      if (resolvedBy) patch.resolvedBy = resolvedBy;
      if (resolutionNote) patch.resolutionNote = resolutionNote;
    }
    await ctx.db.patch(signalId, patch);
  },
});

export const updateStatusFromDashboard = action({
  args: {
    writeKey: v.string(),
    signalId: v.id('signals'),
    status: v.string(),
    resolvedBy: v.optional(v.string()),
    resolutionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expectedKey = process.env.CONVEX_WRITE_KEY;
    if (!expectedKey || args.writeKey !== expectedKey) {
      throw new Error('unauthorized');
    }
    const { writeKey: _, ...updateArgs } = args;
    await ctx.runMutation(internal.signals.updateStatus, updateArgs);
  },
});

// --- Classification (Claude Haiku) ---

export const classify = internalAction({
  args: { signalId: v.id('signals') },
  handler: async (ctx, { signalId }) => {
    const signal = await ctx.runQuery(internal.signals.getById, { signalId });
    if (!signal) return;
    if (signal.classification) return; // already classified
    if (signal.classificationAttempts >= 3) return; // max retries

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.signals.patchClassificationAttempt, {
        signalId,
        attempts: signal.classificationAttempts + 1,
      });
      return;
    }

    const prompt = buildClassificationPrompt(signal);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const result = await response.json();
      const text = result.content?.[0]?.text;
      if (!text) throw new Error('Empty response');

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (
        typeof parsed.level1Symptom !== 'string' ||
        typeof parsed.level2Want !== 'string' ||
        typeof parsed.level3Hypothesis !== 'string' ||
        typeof parsed.confidence !== 'number' ||
        !Array.isArray(parsed.labels)
      ) {
        throw new Error('Invalid classification shape');
      }

      await ctx.runMutation(internal.signals.patchClassification, {
        signalId,
        classification: {
          level1Symptom: parsed.level1Symptom.slice(0, 200),
          level2Want: parsed.level2Want.slice(0, 200),
          level3Hypothesis: parsed.level3Hypothesis.slice(0, 500),
          confidence: Math.min(1, Math.max(0, parsed.confidence)),
          labels: parsed.labels.slice(0, 10).map((l: string) => String(l).slice(0, 50)),
        },
      });
    } catch {
      await ctx.runMutation(internal.signals.patchClassificationAttempt, {
        signalId,
        attempts: signal.classificationAttempts + 1,
      });
    }
  },
});

function buildClassificationPrompt(signal: {
  title: string;
  source: string;
  severity: string;
  appSlug: string;
  data: { type: string; [key: string]: unknown };
}): string {
  const dataStr =
    signal.data.type === 'feedback'
      ? `Category: ${(signal.data as { category?: string }).category || 'unknown'}\nDescription: ${(signal.data as { description?: string }).description || 'N/A'}\nWhat user wanted: ${(signal.data as { whatUserWanted?: string }).whatUserWanted || 'N/A'}`
      : `Error: ${(signal.data as { errorClass?: string }).errorClass || 'unknown'}\nMessage: ${(signal.data as { message?: string }).message || 'N/A'}`;

  return `Classify this product signal. Return ONLY a JSON object.

Signal:
- App: ${signal.appSlug}
- Source: ${signal.source}
- Severity: ${signal.severity}
- Title: ${signal.title}
- ${dataStr}

Return JSON with:
{
  "level1Symptom": "What the user experienced (max 200 chars)",
  "level2Want": "What the user actually wants (max 200 chars)",
  "level3Hypothesis": "Root cause hypothesis (max 500 chars)",
  "confidence": 0.0-1.0,
  "labels": ["tag1", "tag2"]
}`;
}

// --- Classification Patches ---

export const patchClassification = internalMutation({
  args: {
    signalId: v.id('signals'),
    classification: v.object({
      level1Symptom: v.string(),
      level2Want: v.string(),
      level3Hypothesis: v.string(),
      confidence: v.number(),
      labels: v.array(v.string()),
    }),
  },
  handler: async (ctx, { signalId, classification }) => {
    await ctx.db.patch(signalId, { classification });
  },
});

export const patchClassificationAttempt = internalMutation({
  args: {
    signalId: v.id('signals'),
    attempts: v.number(),
  },
  handler: async (ctx, { signalId, attempts }) => {
    await ctx.db.patch(signalId, { classificationAttempts: attempts });
  },
});

// --- Discord Alerting ---

export const alertDiscord = internalAction({
  args: {
    signalId: v.id('signals'),
    incidentGroupId: v.string(),
  },
  handler: async (ctx, { signalId, incidentGroupId }) => {
    const webhookUrl = process.env.DISCORD_SIGNALS_WEBHOOK_URL;
    if (!webhookUrl) return;

    const signal = await ctx.runQuery(internal.signals.getById, { signalId });
    if (!signal) return;

    // Debounce: check if already alerted for this group in last 5 min
    if (signal.discordAlertedAt) {
      const lastAlert = new Date(signal.discordAlertedAt).getTime();
      if (Date.now() - lastAlert < 300_000) return;
    }

    const color = signal.severity === 'critical' ? 0xdc2626 : 0xf59e0b; // crimson / amber

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: `${signal.severity.toUpperCase()}: ${signal.title}`,
              description: `**App**: ${signal.appSlug}\n**Source**: ${signal.source}\n**Group**: ${incidentGroupId}`,
              color,
              timestamp: signal.timestamp,
              footer: { text: 'Signals Dashboard' },
            },
          ],
        }),
      });

      await ctx.runMutation(internal.signals.patchDiscordAlert, { signalId });
    } catch {
      // Fire-and-forget — don't block signal ingestion
    }
  },
});

export const patchDiscordAlert = internalMutation({
  args: { signalId: v.id('signals') },
  handler: async (ctx, { signalId }) => {
    await ctx.db.patch(signalId, {
      discordAlertedAt: new Date().toISOString(),
    });
  },
});

// --- Linear Integration ---

export const patchLinearIssue = internalMutation({
  args: {
    signalId: v.id('signals'),
    linearIssueId: v.string(),
    linearIssueUrl: v.string(),
  },
  handler: async (ctx, { signalId, linearIssueId, linearIssueUrl }) => {
    await ctx.db.patch(signalId, {
      linearIssueId,
      linearIssueUrl,
      linearSyncedAt: new Date().toISOString(),
      status: 'escalated',
    });
  },
});

export const patchFromLinear = internalMutation({
  args: {
    linearIssueId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, { linearIssueId, status }) => {
    // Use index instead of full table scan (HIGH-002)
    const signal = await ctx.db
      .query('signals')
      .withIndex('by_linear_issue', (q) => q.eq('linearIssueId', linearIssueId))
      .first();
    if (!signal) return;

    const statusMap: Record<string, string> = {
      Done: 'resolved',
      Canceled: 'dismissed',
    };

    const mappedStatus = statusMap[status];
    if (mappedStatus) {
      await ctx.db.patch(signal._id, {
        status: mappedStatus,
        linearSyncedAt: new Date().toISOString(),
      });
    }
  },
});

// Public action wrapper for Linear webhook (HIGH-003)
export const patchFromLinearWebhook = action({
  args: {
    writeKey: v.string(),
    linearIssueId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, { writeKey, linearIssueId, status }) => {
    const expectedKey = process.env.CONVEX_WRITE_KEY;
    if (!expectedKey || writeKey !== expectedKey) {
      throw new Error('unauthorized');
    }
    await ctx.runMutation(internal.signals.patchFromLinear, {
      linearIssueId,
      status,
    });
  },
});

export const patchLinearCreationAttempt = internalMutation({
  args: {
    signalId: v.id('signals'),
    attempts: v.number(),
  },
  handler: async (ctx, { signalId, attempts }) => {
    await ctx.db.patch(signalId, { linearCreationAttempts: attempts });
  },
});

export const escalate = action({
  args: {
    writeKey: v.string(),
    signalId: v.id('signals'),
  },
  handler: async (ctx, { writeKey, signalId }) => {
    const expectedKey = process.env.CONVEX_WRITE_KEY;
    if (!expectedKey || writeKey !== expectedKey) {
      throw new Error('unauthorized');
    }

    // Delegate to Linear integration
    await ctx.scheduler.runAfter(0, internal.linear.createLinearIssue, {
      signalId,
    });

    return { scheduled: true };
  },
});

// --- Reconciliation ---

export const reconcile = internalAction({
  handler: async (ctx) => {
    // Find escalated signals with stale sync
    const escalated = await ctx.runQuery(internal.signals.getStaleEscalated);

    for (const signal of escalated) {
      if (!signal.linearIssueId) {
        // Retry creation if under retry limit
        if ((signal.linearCreationAttempts ?? 0) < 3) {
          await ctx.scheduler.runAfter(0, internal.linear.createLinearIssue, {
            signalId: signal._id,
          });
        }
        continue;
      }

      // Check Linear status
      const linearStatus = await ctx.runAction(
        internal.linear.fetchIssueStatus,
        { linearIssueId: signal.linearIssueId },
      );

      if (linearStatus) {
        const statusMap: Record<string, string> = {
          Done: 'resolved',
          Canceled: 'dismissed',
        };
        const mapped = statusMap[linearStatus];
        if (mapped && mapped !== signal.status) {
          await ctx.runMutation(internal.signals.updateStatus, {
            signalId: signal._id,
            status: mapped,
          });
        }
      }
    }
  },
});

export const getStaleEscalated = internalQuery({
  handler: async (ctx) => {
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const escalated = await ctx.db
      .query('signals')
      .withIndex('by_status', (q) => q.eq('status', 'escalated'))
      .collect();

    return escalated.filter(
      (s) => !s.linearSyncedAt || s.linearSyncedAt < oneHourAgo,
    );
  },
});

// --- Retention Purge ---

export const purgeExpired = internalMutation({
  handler: async (ctx) => {
    const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const expired = await ctx.db
      .query('signals')
      .withIndex('by_timestamp', (q) => q.lt('timestamp', cutoff))
      .take(100);

    for (const signal of expired) {
      await ctx.db.delete(signal._id);
    }

    // Also purge old rate limit windows
    const rateLimitCutoff = Date.now() - 2 * RATE_LIMIT_WINDOW_MS;
    const oldLimits = await ctx.db.query('signalRateLimits').take(200);
    for (const rl of oldLimits) {
      if (rl.windowStart < rateLimitCutoff) {
        await ctx.db.delete(rl._id);
      }
    }

    return { purgedSignals: expired.length };
  },
});

// --- Signal Key Validation ---

export const validateKey = internalQuery({
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

// --- Signal Key Sync ---

export const syncSignalKey = internalMutation({
  args: {
    keyPrefix: v.string(),
    keyHash: v.string(),
    appSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('signalKeys')
      .withIndex('by_prefix', (q) => q.eq('keyPrefix', args.keyPrefix))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        keyHash: args.keyHash,
        appSlug: args.appSlug,
        syncedAt: new Date().toISOString(),
        revoked: false,
      });
    } else {
      await ctx.db.insert('signalKeys', {
        ...args,
        revoked: false,
        syncedAt: new Date().toISOString(),
      });
    }
  },
});

export const revokeSignalKey = internalMutation({
  args: { keyPrefix: v.string() },
  handler: async (ctx, { keyPrefix }) => {
    const existing = await ctx.db
      .query('signalKeys')
      .withIndex('by_prefix', (q) => q.eq('keyPrefix', keyPrefix))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { revoked: true });
    }
  },
});

// --- Public Action Wrappers for External Callers (HIGH-003, HIGH-006) ---

export const syncSignalKeyPublic = action({
  args: {
    writeKey: v.string(),
    keyPrefix: v.string(),
    keyHash: v.string(),
    appSlug: v.string(),
  },
  handler: async (ctx, { writeKey, ...keyData }) => {
    const expectedKey = process.env.CONVEX_WRITE_KEY;
    if (!expectedKey || writeKey !== expectedKey) {
      throw new Error('unauthorized');
    }
    await ctx.runMutation(internal.signals.syncSignalKey, keyData);
  },
});

export const revokeSignalKeyPublic = action({
  args: {
    writeKey: v.string(),
    keyPrefix: v.string(),
  },
  handler: async (ctx, { writeKey, keyPrefix }) => {
    const expectedKey = process.env.CONVEX_WRITE_KEY;
    if (!expectedKey || writeKey !== expectedKey) {
      throw new Error('unauthorized');
    }
    await ctx.runMutation(internal.signals.revokeSignalKey, { keyPrefix });
  },
});

// --- Key Verification (HIGH-004: hash stays inside Convex) ---

export const verifySignalKey = action({
  args: { keyPrefix: v.string(), rawKey: v.string() },
  handler: async (ctx, { keyPrefix, rawKey }): Promise<{ appSlug: string } | null> => {
    const keyData: { keyHash: string; appSlug: string } | null =
      await ctx.runQuery(internal.signals.validateKey, { keyPrefix });
    if (!keyData) return null;

    const { default: bcryptLib } = await import('bcryptjs');
    const valid = await bcryptLib.compare(rawKey, keyData.keyHash);
    if (!valid) return null;

    return { appSlug: keyData.appSlug };
  },
});

// --- Heartbeat (Pipeline Health) ---

export const checkHeartbeat = internalAction({
  handler: async (ctx) => {
    const recent = await ctx.runQuery(internal.signals.getLastHeartbeat);
    if (!recent) {
      // No heartbeat ever — pipeline may not be set up yet
      return;
    }

    const lastTime = new Date(recent.timestamp).getTime();
    const twoHoursAgo = Date.now() - 2 * 3_600_000;

    if (lastTime < twoHoursAgo) {
      // Pipeline may be down — alert Discord
      const webhookUrl = process.env.DISCORD_SIGNALS_WEBHOOK_URL;
      if (!webhookUrl) return;

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: 'Signal Pipeline Health Warning',
              description:
                'No heartbeat signal received in the last 2 hours. The signal ingestion pipeline may be down.',
              color: 0xf59e0b,
              timestamp: new Date().toISOString(),
              footer: { text: 'Pipeline Health Check' },
            },
          ],
        }),
      });
    }
  },
});

export const getLastHeartbeat = internalQuery({
  handler: async (ctx) => {
    // Use source index instead of scanning 50 recent signals (LOW-002)
    return (
      (await ctx.db
        .query('signals')
        .withIndex('by_source_timestamp', (q) => q.eq('source', 'heartbeat'))
        .order('desc')
        .first()) ?? null
    );
  },
});

export const sendHeartbeat = internalMutation({
  handler: async (ctx) => {
    const now = new Date().toISOString();

    // Upsert: update existing heartbeat instead of accumulating rows (MEDIUM-006)
    const existing = await ctx.db
      .query('signals')
      .withIndex('by_source_timestamp', (q) => q.eq('source', 'heartbeat'))
      .order('desc')
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        timestamp: now,
        occurrenceCount: existing.occurrenceCount + 1,
      });
      return;
    }

    const timeBucket = Math.floor(Date.now() / 300_000);
    const groupId = `system:heartbeat:health:${timeBucket}`;

    await ctx.db.insert('signals', {
      appSlug: 'system',
      source: 'heartbeat',
      severity: 'low',
      title: 'Pipeline heartbeat',
      data: { type: 'feedback', category: 'heartbeat' },
      status: 'resolved',
      incidentGroupId: groupId,
      occurrenceCount: 1,
      timestamp: now,
      classificationAttempts: 0,
    });
  },
});

// --- Retry Failed Classifications ---

export const retryFailedClassifications = internalAction({
  handler: async (ctx) => {
    const unclassified = await ctx.runQuery(
      internal.signals.getUnclassifiedSignals,
    );
    for (const signal of unclassified) {
      await ctx.scheduler.runAfter(0, internal.signals.classify, {
        signalId: signal._id,
      });
    }
  },
});

export const getUnclassifiedSignals = internalQuery({
  handler: async (ctx) => {
    const all = await ctx.db
      .query('signals')
      .withIndex('by_status', (q) => q.eq('status', 'new'))
      .take(50);

    return all.filter(
      (s) => !s.classification && s.classificationAttempts < 3,
    );
  },
});
