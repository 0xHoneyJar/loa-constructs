import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import type { PurupuruMetrics } from './analytics';

const TELEGRAM_API = 'https://api.telegram.org';

// --- Telegram Bot API Helper ---

async function sendMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; description?: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown');
      console.error('[telegram] sendMessage HTTP error:', response.status, errorText);
      return { ok: false, description: `HTTP ${response.status}` };
    }

    const result = await response.json();
    if (!result.ok) {
      console.error('[telegram] sendMessage API error:', result.description);
    }
    return result as { ok: boolean; description?: string };
  } catch (error) {
    console.error('[telegram] sendMessage network error:', (error as Error).message);
    return { ok: false, description: 'Network error' };
  }
}

// --- Digest Formatting ---

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDigest(
  metrics: {
    installs: { total: number; byPack: Record<string, number> };
    signals: { total: number; items: { type: string; severity: string; title: string }[] };
    health: { score: number; delta: number } | null;
  },
  baseline: {
    avgDailyInstalls: number;
    avgDailySignals: number;
    avgHealthScore: number | null;
  },
  traffic: {
    visitors: number;
    pageviews: number;
    topReferrers: { name: string; value: number }[];
    topPages: { name: string; value: number }[];
    sites?: { name: string; visitors: number; pageviews: number }[];
  } | null,
): string {
  const dateStr = formatDate(new Date());
  const { installs, signals, health } = metrics;

  const installAnomaly = installs.total > 0 && installs.total >= baseline.avgDailyInstalls * 1.5;
  const signalAnomaly = signals.total > 0 && signals.total >= baseline.avgDailySignals * 1.5;
  const hasTraffic = traffic && traffic.visitors > 0;
  const hasActivity = installs.total > 0 || signals.total > 0 || hasTraffic;

  // Quiet day
  if (!hasActivity) {
    return `\uD83D\uDC3B\n\nquiet day`;
  }

  const lines: string[] = ['\uD83D\uDC3B', ''];

  // --- Traffic ---
  if (hasTraffic) {
    lines.push(`<b>${traffic.visitors}</b> visitor${traffic.visitors === 1 ? '' : 's'}`);
    lines.push(`<b>${traffic.pageviews}</b> views`);
    lines.push('');

    if (traffic.sites && traffic.sites.length > 1) {
      for (const site of traffic.sites) {
        lines.push(`${site.name}  ${site.visitors > 0 ? site.visitors : '\u2013'}`);
      }
    }

    if (traffic.topReferrers.length > 0) {
      const refs = traffic.topReferrers.slice(0, 3).map((r) => r.name || 'direct');
      lines.push('');
      lines.push(`via ${refs.join(' \u00B7 ')}`);
    }
  }

  // --- Installs ---
  if (installs.total > 0) {
    lines.push('');
    const sorted = Object.entries(installs.byPack).sort((a, b) => b[1] - a[1]);
    const packs = sorted.map(([slug]) => slug).join(' \u00B7 ');
    lines.push(`${packs} installed`);
  }

  // --- Signals ---
  if (signals.total > 0) {
    lines.push('');
    lines.push(`${signals.total} signal${signals.total === 1 ? '' : 's'}`);
  }

  return lines.join('\n');
}

// --- Purupuru Section ---

const ELEMENT_KANJI: Record<string, string> = {
  fire: '\u706B',
  water: '\u6C34',
  wood: '\u6728',
  earth: '\u571F',
  metal: '\u91D1',
};

function formatPurupuruSection(metrics: PurupuruMetrics): string {
  const lines: string[] = ['', '\uD83C\uDF6F purupuru', ''];

  // Bazi readings by element
  if (metrics.bazi.total > 0) {
    const parts = Object.entries(metrics.bazi.byElement)
      .sort(([, a], [, b]) => b - a)
      .map(([el, n]) => `${ELEMENT_KANJI[el] ?? el} ${n}`)
      .join(', ');
    lines.push(`bazi: ${metrics.bazi.total} reading${metrics.bazi.total === 1 ? '' : 's'} (${parts})`);
  }

  // Walled garden arrivals
  if (metrics.walledGarden.total > 0) {
    const parts = Object.entries(metrics.walledGarden.bySource)
      .sort(([, a], [, b]) => b - a)
      .map(([src, n]) => `${src} ${n}`)
      .join(', ');
    lines.push(`walled garden: ${metrics.walledGarden.total} arrival${metrics.walledGarden.total === 1 ? '' : 's'} (${parts})`);
  }

  // Locale split
  if (metrics.locale.length > 0) {
    const parts = metrics.locale.map((l) => `${l.lang} ${l.pct}%`).join(' \u00B7 ');
    lines.push(`locale: ${parts}`);
  }

  // Referrers
  if (metrics.referrers.length > 0) {
    lines.push(`via ${metrics.referrers.join(' \u00B7 ')}`);
  }

  // MCP version
  lines.push(`mcp: purupuru-mcp@${metrics.mcpVersion}`);

  return lines.join('\n');
}

// --- Cron Entry Point ---

export const sendDigest = internalAction({
  handler: async (ctx) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn(
        '[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set \u2014 skipping digest',
      );
      return;
    }

    try {
      // Convex-native data — always available, never fails
      const [metrics, baseline] = await Promise.all([
        ctx.runQuery(internal.analytics.getDigestMetrics),
        ctx.runQuery(internal.analytics.getDailyBaseline),
      ]);

      // External dependencies — isolated. Failures must not block the digest.
      let traffic: {
        visitors: number;
        pageviews: number;
        topReferrers: { name: string; value: number }[];
        topPages: { name: string; value: number }[];
        sites?: { name: string; visitors: number; pageviews: number }[];
      } | null = null;
      try {
        traffic = await ctx.runAction(internal.analytics.fetchUmamiTraffic);
      } catch (e) {
        console.warn('[telegram] Umami fetch failed, sending digest without traffic:', (e as Error).message);
      }

      let purupuru: PurupuruMetrics | null = null;
      try {
        purupuru = await ctx.runAction(internal.analytics.fetchPurupuruMetrics);
      } catch (e) {
        console.warn('[telegram] Purupuru fetch failed:', (e as Error).message);
      }

      const message = formatDigest(metrics, baseline, traffic)
        + (purupuru ? formatPurupuruSection(purupuru) : '');

      const result = await sendMessage(botToken, chatId, message);
      if (result.ok) {
        console.log('[telegram] Daily digest sent successfully');
      } else {
        console.error('[telegram] Failed to send digest:', result.description);
      }
    } catch (error) {
      console.error('[telegram] Digest pipeline error:', (error as Error).message);
      await sendMessage(
        botToken,
        chatId,
        '\uD83D\uDC3B oops something went wrong, try again?',
      );
    }
  },
});
