/**
 * Directional visibility guard — VIS-001
 *
 * Invariant: automated sync can only make visibility MORE restrictive.
 * Promotion (internal → public) requires explicit admin action.
 *
 * Restrictiveness order: public (0) < internal (1) < unlisted (2)
 */

export type Visibility = 'public' | 'internal' | 'unlisted';

const RESTRICTIVENESS: Record<Visibility, number> = {
  public: 0,
  internal: 1,
  unlisted: 2,
};

/**
 * Guard a visibility transition from automated sync.
 *
 * Returns fromManifest if it's equally or more restrictive than currentDb.
 * Returns currentDb if the manifest would promote (less restrictive) — blocked.
 *
 * Examples:
 *   guard('internal', 'public')   → 'internal'  (promotion blocked)
 *   guard('public', 'internal')   → 'internal'  (demotion allowed)
 *   guard('internal', 'internal') → 'internal'  (no change)
 */
export function guardVisibilityTransition(
  currentDb: Visibility,
  fromManifest: Visibility,
): Visibility {
  if (RESTRICTIVENESS[fromManifest] >= RESTRICTIVENESS[currentDb]) {
    return fromManifest;
  }
  return currentDb;
}
