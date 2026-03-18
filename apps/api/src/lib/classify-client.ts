/**
 * Client type classifier for pack installations.
 *
 * Classifies HTTP User-Agent strings into:
 * - 'agent': AI coding agents (Claude Code, Cursor, Windsurf, Cline, etc.)
 * - 'bot': Search crawlers and social media bots
 * - 'human': Standard web browsers
 * - 'unknown': Unrecognizable or missing UA
 *
 * The agent-vs-human ratio per construct reveals fundamentally different
 * adoption patterns: API-first (agent-adopted) vs UX-first (human-discovered).
 */

export type ClientType = 'human' | 'agent' | 'bot' | 'unknown';

// AI coding agent patterns — these hit the API directly via CLI or SDK
const AGENT_PATTERNS = [
  /claude/i,
  /cursor/i,
  /windsurf/i,
  /cline/i,
  /aider/i,
  /continue/i,
  /copilot/i,
  /loa-cli/i,
  /construct-cli/i,
  /codex-cli/i,
  // Node.js HTTP clients used by CLI tools (not browsers)
  /^node-fetch/i,
  /^undici/i,
  /^axios\//i,
  /^got\//i,
  // Generic Node.js UA (no browser tokens)
  /^node\.js/i,
];

// Known bot/crawler patterns
const BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /slackbot/i,
  /discordbot/i,
  /linkedinbot/i,
  /crawl/i,
  /spider/i,
  /bot\//i,
  /bot;/i,
  /headlesschrome/i,
  /phantomjs/i,
  /prerender/i,
];

// Browser patterns — standard human traffic
const BROWSER_PATTERNS = [
  /mozilla\/\d/i,
  /chrome\/\d/i,
  /safari\/\d/i,
  /firefox\/\d/i,
  /edg\/\d/i, // Edge uses "Edg/" not "Edge/"
  /opera\/\d/i,
  /opr\/\d/i, // Opera modern
];

export function classifyClient(userAgent: string | null | undefined): ClientType {
  if (!userAgent || userAgent.trim().length === 0) {
    return 'unknown';
  }

  const ua = userAgent.trim();

  // Agent check first — most specific patterns
  for (const pattern of AGENT_PATTERNS) {
    if (pattern.test(ua)) {
      return 'agent';
    }
  }

  // Bot check second — before browser check because some bots include browser tokens
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(ua)) {
      return 'bot';
    }
  }

  // Browser check — standard human traffic
  for (const pattern of BROWSER_PATTERNS) {
    if (pattern.test(ua)) {
      return 'human';
    }
  }

  return 'unknown';
}
