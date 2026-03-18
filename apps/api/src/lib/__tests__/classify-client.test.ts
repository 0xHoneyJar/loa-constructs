import { describe, expect, it } from 'vitest';
import { classifyClient } from '../classify-client.js';

describe('classifyClient', () => {
  describe('agent detection', () => {
    it('classifies Claude Code', () => {
      expect(classifyClient('claude-code/1.0.0')).toBe('agent');
    });

    it('classifies Cursor', () => {
      expect(classifyClient('cursor/0.45.0')).toBe('agent');
    });

    it('classifies Windsurf', () => {
      expect(classifyClient('windsurf/1.2.3')).toBe('agent');
    });

    it('classifies Cline', () => {
      expect(classifyClient('cline/3.0.0')).toBe('agent');
    });

    it('classifies aider', () => {
      expect(classifyClient('aider/0.50.0')).toBe('agent');
    });

    it('classifies node-fetch (CLI tool)', () => {
      expect(classifyClient('node-fetch/1.0.0')).toBe('agent');
    });

    it('classifies undici (Node HTTP client)', () => {
      expect(classifyClient('undici/6.0.0')).toBe('agent');
    });

    it('classifies loa-cli', () => {
      expect(classifyClient('loa-cli/0.1.0')).toBe('agent');
    });
  });

  describe('bot detection', () => {
    it('classifies Googlebot', () => {
      expect(
        classifyClient(
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        )
      ).toBe('bot');
    });

    it('classifies Bingbot', () => {
      expect(
        classifyClient(
          'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'
        )
      ).toBe('bot');
    });

    it('classifies Slackbot', () => {
      expect(classifyClient('Slackbot-LinkExpanding 1.0')).toBe('bot');
    });

    it('classifies Discordbot', () => {
      expect(
        classifyClient('Mozilla/5.0 (compatible; Discordbot/2.0)')
      ).toBe('bot');
    });
  });

  describe('human detection', () => {
    it('classifies Chrome on macOS', () => {
      expect(
        classifyClient(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
      ).toBe('human');
    });

    it('classifies Firefox', () => {
      expect(
        classifyClient(
          'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0'
        )
      ).toBe('human');
    });

    it('classifies Safari on iOS', () => {
      expect(
        classifyClient(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        )
      ).toBe('human');
    });
  });

  describe('edge cases', () => {
    it('returns unknown for null', () => {
      expect(classifyClient(null)).toBe('unknown');
    });

    it('returns unknown for undefined', () => {
      expect(classifyClient(undefined)).toBe('unknown');
    });

    it('returns unknown for empty string', () => {
      expect(classifyClient('')).toBe('unknown');
    });

    it('returns unknown for unrecognizable UA', () => {
      expect(classifyClient('some-random-thing/1.0')).toBe('unknown');
    });

    it('prioritizes agent over browser tokens', () => {
      // A Claude-based tool that includes Mozilla in its UA
      expect(
        classifyClient('Mozilla/5.0 claude-code-extension/1.0')
      ).toBe('agent');
    });

    it('prioritizes bot over browser tokens', () => {
      // Googlebot includes Mozilla in its UA
      expect(
        classifyClient(
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        )
      ).toBe('bot');
    });
  });
});
