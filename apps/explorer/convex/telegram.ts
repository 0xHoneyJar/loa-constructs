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
): string {
  const dateStr = formatDate(new Date());
  const { installs, signals, health } = metrics;

  // Detect anomalies — anything notably above baseline
  const installAnomaly = installs.total > 0 && installs.total >= baseline.avgDailyInstalls * 1.5;
  const signalAnomaly = signals.total > 0 && signals.total >= baseline.avgDailySignals * 1.5;
  const hasActivity = installs.total > 0 || signals.total > 0;

  // Steady state — no installs, no signals, health unchanged
  if (!hasActivity) {
    const healthSuffix = health ? `, health ${health.score}/100` : '';
    return `<b>constructs.network \u2014 ${dateStr}</b> \u2014 steady state, 0 installs${healthSuffix}`;
  }

  const lines: string[] = [`<b>constructs.network \u2014 ${dateStr}</b>`, ''];

  // Installs
  if (installs.total > 0) {
    const avgNote =
      installAnomaly || baseline.avgDailyInstalls > 0
        ? ` (avg: ${Math.round(baseline.avgDailyInstalls)})`
        : '';
    const emoji = installAnomaly ? '\u26A1' : '\uD83D\uDCE6';
    lines.push(`${emoji} <b>${installs.total} install${installs.total === 1 ? '' : 's'} today</b>${avgNote}`);

    // Top packs breakdown
    const sorted = Object.entries(installs.byPack).sort((a, b) => b[1] - a[1]);
    const packList = sorted.map(([slug, count]) => `${slug} \u00D7${count}`).join(', ');
    lines.push(`\uD83D\uDCE6 ${packList}`);
  }

  // Signals
  if (signals.total > 0) {
    const severities = signals.items.map((s) => s.severity);
    const topSeverity = severities.includes('critical')
      ? 'critical'
      : severities.includes('high')
        ? 'high'
        : severities.includes('medium')
          ? 'medium'
          : 'low';
    const types = signals.items.map((s) => s.type);
    const primaryType = types[0] ?? 'signal';
    const emoji = signalAnomaly ? '\u26A0\uFE0F' : '\uD83D\uDCAC';
    lines.push(
      `${emoji} ${signals.total} new signal${signals.total === 1 ? '' : 's'} (${primaryType}, ${topSeverity})`,
    );
  }

  // Health
  if (health) {
    const trend =
      health.delta > 2 ? 'improving' : health.delta < -2 ? 'declining' : 'steady';
    lines.push('');
    lines.push(`<code>Health</code> ${health.score}/100 (${trend})`);
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

    // Pull metrics and baseline in parallel
    const [metrics, baseline] = await Promise.all([
      ctx.runQuery(internal.analytics.getDigestMetrics),
      ctx.runQuery(internal.analytics.getDailyBaseline),
    ]);

    const message = formatDigest(metrics, baseline);

    const result = await sendMessage(botToken, chatId, message);
    if (result.ok) {
      console.log('[telegram] Daily digest sent successfully');
    } else {
      console.error('[telegram] Failed to send digest:', result.description);
    }
  },
});
