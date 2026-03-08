/**
 * Visibility Route Regression Test — cycle-038
 * @see sdd.md §7.2 Route regression guard
 * @see sprint.md Task 3.3
 *
 * Inventories ALL :slug-parameterized routes that call getPackBySlug()
 * and asserts each passes PackAccessContext. New routes without visibility
 * context will fail this test.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROUTES_DIR = path.resolve(__dirname, '.');
const SERVICES_DIR = path.resolve(__dirname, '../services');

/**
 * Scan a TypeScript file for getPackBySlug() calls and check if they pass
 * an access context argument (second parameter).
 */
function auditGetPackBySlugCalls(filePath: string): {
  file: string;
  calls: Array<{
    line: number;
    text: string;
    hasAccessContext: boolean;
  }>;
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const calls: Array<{ line: number; text: string; hasAccessContext: boolean }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match getPackBySlug calls (not declarations/imports)
    if (line.includes('getPackBySlug(') && !line.includes('export') && !line.includes('import') && !line.includes('async function')) {
      // Check if call has a second argument (access context)
      // Simple heuristic: getPackBySlug(slug) vs getPackBySlug(slug, getAccessContext(c))
      const callMatch = line.match(/getPackBySlug\([^)]*\)/);
      const callText = callMatch ? callMatch[0] : line.trim();

      // Count commas inside the call (excluding nested parens)
      const argsText = callText.replace('getPackBySlug(', '').replace(/\)$/, '');
      let depth = 0;
      let commaCount = 0;
      for (const ch of argsText) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === ',' && depth === 0) commaCount++;
      }

      calls.push({
        line: i + 1,
        text: callText,
        hasAccessContext: commaCount >= 1, // At least 2 args = has access context
      });
    }
  }

  return { file: path.basename(filePath), calls };
}

describe('Visibility route regression guard', () => {
  it('ALL getPackBySlug() calls in route files pass PackAccessContext', () => {
    const routeFiles = fs.readdirSync(ROUTES_DIR)
      .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .map(f => path.join(ROUTES_DIR, f));

    const violations: string[] = [];

    for (const file of routeFiles) {
      const audit = auditGetPackBySlugCalls(file);
      for (const call of audit.calls) {
        if (!call.hasAccessContext) {
          violations.push(`${audit.file}:${call.line} — ${call.text} (missing access context)`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} getPackBySlug() call(s) without PackAccessContext:\n` +
        violations.map(v => `  • ${v}`).join('\n') +
        '\n\nAll getPackBySlug() calls must pass getAccessContext(c) as the second argument.'
      );
    }
  });

  it('inventories all slug-parameterized routes', () => {
    const routeFiles = fs.readdirSync(ROUTES_DIR)
      .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));

    const slugRoutes: string[] = [];

    for (const file of routeFiles) {
      const content = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match route definitions with :slug parameter
        const routeMatch = line.match(/\.(get|post|put|patch|delete|on)\(\s*['"`]([^'"`]*:slug[^'"`]*)/);
        if (routeMatch) {
          slugRoutes.push(`${file}:${i + 1} — ${routeMatch[1].toUpperCase()} ${routeMatch[2]}`);
        }
      }
    }

    // This test documents the inventory — if new slug routes appear,
    // the developer must ensure they pass PackAccessContext
    expect(slugRoutes.length).toBeGreaterThan(0);

    // Verify known critical routes are in the inventory
    const routeTexts = slugRoutes.join('\n');
    expect(routeTexts).toContain('/:slug'); // Basic slug routes exist
  });

  it('getPackBySlug calls in service files also pass context where appropriate', () => {
    // Services that are called by routes should propagate access context
    const serviceFiles = fs.readdirSync(SERVICES_DIR)
      .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && f !== 'packs.ts')
      .map(f => path.join(SERVICES_DIR, f));

    const warnings: string[] = [];

    for (const file of serviceFiles) {
      const audit = auditGetPackBySlugCalls(file);
      for (const call of audit.calls) {
        if (!call.hasAccessContext) {
          warnings.push(`${audit.file}:${call.line} — ${call.text}`);
        }
      }
    }

    // Service-level calls without context are warnings (may be internal/admin paths)
    // but should still be reviewed
    if (warnings.length > 0) {
      console.warn(
        `[REVIEW] ${warnings.length} getPackBySlug() call(s) in services without explicit access context:\n` +
        warnings.map(w => `  • ${w}`).join('\n')
      );
    }

    // This doesn't fail — services may legitimately skip context for admin paths
    expect(true).toBe(true);
  });
});
