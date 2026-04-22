/**
 * Visibility Guard Service — cycle-001 (2026-04-21)
 * One-directional guard: blocks public → private demotion.
 * Webhook and discover service use this guard before any visibility update.
 *
 * Distinct from lib/visibility-guard.ts (git-sync guard, blocks promotion).
 * This guard is for webhook-level and discover-level transitions.
 *
 * SEED: grimoires/loa-constructs-seed-2026-04-21/SEED-loa-constructs-infrastructure-cycle.md
 * Amendments: §14.7, §14.15
 */

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

export interface GuardResult {
  blocked: boolean;
  status?: 409 | 200;
  error?: string;
  current?: string;
  attempted?: string;
}

/**
 * Guard a visibility transition at the webhook/discover layer.
 *
 * Blocks public → private (demotion risk for operators who installed the pack).
 * Allows all other transitions.
 * Always writes a visibility_transitions row.
 *
 * @param packId - UUID of the pack
 * @param fromVisibility - Current DB visibility
 * @param toVisibility - Requested new visibility
 * @param source - Transition source: 'webhook' | 'discover' | 'manual'
 * @param githubDeliveryId - Optional GitHub delivery ID (for webhook events)
 */
export async function guardVisibilityTransition(
  packId: string,
  fromVisibility: string,
  toVisibility: string,
  source: 'webhook' | 'discover' | 'guard_block' | 'manual',
  githubDeliveryId?: string | null,
): Promise<GuardResult> {
  const isBlock = fromVisibility === 'public' && toVisibility === 'private';

  const effectiveSource = isBlock ? 'guard_block' : source;

  // Always write transition row (append-only audit)
  await db.execute(sql`
    INSERT INTO visibility_transitions (pack_id, from_visibility, to_visibility, source, github_delivery_id)
    VALUES (
      ${packId}::uuid,
      ${fromVisibility},
      ${toVisibility},
      ${effectiveSource},
      ${githubDeliveryId ?? null}
    )
  `);

  if (isBlock) {
    return {
      blocked: true,
      status: 409,
      error: 'visibility_demotion_blocked',
      current: fromVisibility,
      attempted: toVisibility,
    };
  }

  return { blocked: false };
}

/**
 * Check idempotency for a GitHub delivery ID.
 * Returns true if this delivery has already been processed.
 */
export async function isDeliveryProcessed(githubDeliveryId: string): Promise<boolean> {
  const rows = await db.execute(sql`
    SELECT 1 FROM visibility_transitions
    WHERE github_delivery_id = ${githubDeliveryId}
    LIMIT 1
  `);
  return (rows as unknown[]).length > 0;
}
