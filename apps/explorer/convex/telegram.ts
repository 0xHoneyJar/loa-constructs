import { internalAction } from './_generated/server';
import { internal } from './_generated/api';

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

    // Pull metrics, baseline, and traffic in parallel
    const [metrics, baseline, traffic] = await Promise.all([
      ctx.runQuery(internal.analytics.getDigestMetrics),
      ctx.runQuery(internal.analytics.getDailyBaseline),
      ctx.runAction(internal.analytics.fetchUmamiTraffic),
    ]);

    const message = formatDigest(metrics, baseline, traffic);

    const result = await sendMessage(botToken, chatId, message);
    if (result.ok) {
      console.log('[telegram] Daily digest sent successfully');
    } else {
      console.error('[telegram] Failed to send digest:', result.description);
    }
  },
});
