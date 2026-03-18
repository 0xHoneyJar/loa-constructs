import { describe, it, expect } from 'vitest';
import { guardVisibilityTransition, type Visibility } from '../visibility-guard.js';

describe('guardVisibilityTransition', () => {
  // Full 3×3 matrix: every possible transition
  const cases: [Visibility, Visibility, Visibility][] = [
    // [currentDb, fromManifest, expected]

    // Same → same (no-op)
    ['public', 'public', 'public'],
    ['internal', 'internal', 'internal'],
    ['unlisted', 'unlisted', 'unlisted'],

    // More restrictive → allowed (demotion)
    ['public', 'internal', 'internal'],
    ['public', 'unlisted', 'unlisted'],
    ['internal', 'unlisted', 'unlisted'],

    // Less restrictive → blocked (promotion)
    ['internal', 'public', 'internal'],
    ['unlisted', 'public', 'unlisted'],
    ['unlisted', 'internal', 'unlisted'],
  ];

  it.each(cases)(
    'guard(%s, %s) → %s',
    (currentDb, fromManifest, expected) => {
      expect(guardVisibilityTransition(currentDb, fromManifest)).toBe(expected);
    },
  );

  it('blocks the exact bug scenario: internal pack with public manifest', () => {
    // This is VIS-001: construct.yaml says public, DB says internal
    expect(guardVisibilityTransition('internal', 'public')).toBe('internal');
  });

  it('allows author to restrict their own construct', () => {
    // Author changes construct.yaml from public to internal
    expect(guardVisibilityTransition('public', 'internal')).toBe('internal');
  });
});
