/**
 * Reconcile Ratings Backstop Script
 * @see sprint.md T2.1: Rating Aggregation backstop
 *
 * Recomputes packs.rating_sum and packs.rating_count from construct_reviews.
 * Run if aggregate drift is suspected.
 *
 * Usage: DATABASE_URL="..." pnpm tsx scripts/reconcile-ratings.ts
 */

import postgres from 'postgres';

async function reconcileRatings() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = postgres(databaseUrl, { prepare: false });

  console.log('Reconciling ratings...\n');

  try {
    // Compute actual aggregates from reviews
    const actuals = await client`
      SELECT
        p.id,
        p.slug,
        p.rating_sum AS stored_sum,
        p.rating_count AS stored_count,
        COALESCE(SUM(r.rating), 0)::int AS actual_sum,
        COUNT(r.id)::int AS actual_count
      FROM packs p
      LEFT JOIN construct_reviews r ON r.pack_id = p.id AND r.is_hidden = false
      GROUP BY p.id, p.slug, p.rating_sum, p.rating_count
      HAVING p.rating_sum != COALESCE(SUM(r.rating), 0)
         OR p.rating_count != COUNT(r.id)
      ORDER BY p.slug
    `;

    if (actuals.length === 0) {
      console.log('All ratings are consistent. No drift detected.\n');
      await client.end();
      return;
    }

    console.log(`Found ${actuals.length} packs with rating drift:\n`);

    for (const row of actuals) {
      console.log(`  ${row.slug}:`);
      console.log(`    stored:  sum=${row.stored_sum}, count=${row.stored_count}`);
      console.log(`    actual:  sum=${row.actual_sum}, count=${row.actual_count}`);

      await client`
        UPDATE packs
        SET rating_sum = ${row.actual_sum},
            rating_count = ${row.actual_count},
            updated_at = NOW()
        WHERE id = ${row.id}
      `;

      console.log('    -> fixed');
    }

    console.log(`\nReconciled ${actuals.length} packs.`);
  } catch (error) {
    console.error('Reconciliation failed:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

reconcileRatings();
