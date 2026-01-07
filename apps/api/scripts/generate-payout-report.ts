#!/usr/bin/env tsx

/**
 * Generate Monthly Payout Report
 *
 * This script generates a report of creator earnings for the previous month.
 * It can be run manually or scheduled as a cron job.
 *
 * Usage:
 *   npx tsx scripts/generate-payout-report.ts [--month YYYY-MM] [--execute]
 *
 * Options:
 *   --month YYYY-MM    Month to process (default: previous month)
 *   --execute          Execute actual payouts via Stripe Connect
 *   --threshold        Minimum payout threshold in cents (default: 5000 = $50)
 *
 * @see prd-pack-submission.md §4.4.4
 * @see sdd-pack-submission.md §8.3
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

import {
  calculateCreatorEarnings,
  createPayout,
  getCreatorsWithStripeConnect,
} from '../src/services/payouts.js';
import { createConnectTransfer } from '../src/services/stripe-connect.js';
import { logger } from '../src/lib/logger.js';

interface ReportEntry {
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  grossCents: number;
  platformFeeCents: number;
  netCents: number;
  breakdown: Record<string, number>;
  aboveThreshold: boolean;
  stripeConnectAccountId: string | null;
  payoutStatus: 'pending' | 'completed' | 'skipped' | 'failed';
  transferId?: string;
  error?: string;
}

/**
 * Validate month format (YYYY-MM)
 * @see auditor-sprint-feedback.md CRITICAL-3
 */
function validateMonth(monthStr: string): boolean {
  // Must match YYYY-MM format
  const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!monthRegex.test(monthStr)) {
    return false;
  }

  // Validate year is reasonable (2020-2100)
  const [year, month] = monthStr.split('-').map(Number);
  if (year < 2020 || year > 2100) {
    return false;
  }

  // Validate month is 1-12 (already enforced by regex but double-check)
  if (month < 1 || month > 12) {
    return false;
  }

  return true;
}

/**
 * Validate threshold value
 * @see auditor-sprint-feedback.md CRITICAL-3
 */
function validateThreshold(threshold: number): boolean {
  // Must be positive integer
  if (!Number.isInteger(threshold) || threshold < 0) {
    return false;
  }

  // Reasonable range: $0 to $100,000 (0 to 10,000,000 cents)
  if (threshold > 10_000_000) {
    return false;
  }

  return true;
}

/**
 * Parse command line arguments with validation
 * @see auditor-sprint-feedback.md CRITICAL-3
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    month?: string;
    execute: boolean;
    threshold: number;
  } = {
    execute: false,
    threshold: 5000, // $50
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--month' && args[i + 1]) {
      const monthValue = args[i + 1];

      // SECURITY FIX (CRITICAL-3): Validate month format
      if (!validateMonth(monthValue)) {
        console.error(`ERROR: Invalid month format "${monthValue}". Use YYYY-MM (e.g., 2026-01).`);
        console.error('Month must be between 01-12, year must be between 2020-2100.');
        process.exit(1);
      }

      options.month = monthValue;
      i++;
    } else if (arg === '--execute') {
      options.execute = true;
    } else if (arg === '--threshold' && args[i + 1]) {
      const thresholdValue = parseInt(args[i + 1], 10);

      // SECURITY FIX (CRITICAL-3): Validate threshold value
      if (isNaN(thresholdValue) || !validateThreshold(thresholdValue)) {
        console.error(`ERROR: Invalid threshold "${args[i + 1]}". Must be a positive integer between 0 and 10000000 cents.`);
        process.exit(1);
      }

      options.threshold = thresholdValue;
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: npx tsx scripts/generate-payout-report.ts [options]

Options:
  --month YYYY-MM    Month to process (default: previous month)
                     Year must be 2020-2100, month must be 01-12
  --execute          Execute actual payouts via Stripe Connect
                     Without this flag, runs in dry-run mode
  --threshold <N>    Minimum payout threshold in cents (default: 5000 = $50)
                     Must be between 0 and 10,000,000 cents
  --help, -h         Show this help message

Examples:
  npx tsx scripts/generate-payout-report.ts                    # Dry run for previous month
  npx tsx scripts/generate-payout-report.ts --month 2026-01    # Dry run for January 2026
  npx tsx scripts/generate-payout-report.ts --execute          # Execute payouts for previous month
`);
      process.exit(0);
    }
  }

  return options;
}

/**
 * Get period dates for a given month
 */
function getPeriodDates(monthStr?: string): { start: Date; end: Date; label: string } {
  let year: number;
  let month: number;

  if (monthStr) {
    const [y, m] = monthStr.split('-').map(Number);
    year = y;
    month = m - 1; // JS months are 0-indexed
  } else {
    // Previous month
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    year = prevMonth.getFullYear();
    month = prevMonth.getMonth();
  }

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const label = `${year}-${String(month + 1).padStart(2, '0')}`;

  return { start, end, label };
}

/**
 * Format cents as dollars
 */
function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();
  const { start, end, label } = getPeriodDates(options.month);

  console.log('='.repeat(80));
  console.log('Creator Payout Report');
  console.log('='.repeat(80));
  console.log(`Period: ${label} (${start.toISOString()} to ${end.toISOString()})`);
  console.log(`Threshold: ${formatDollars(options.threshold)}`);
  console.log(`Execute Payouts: ${options.execute ? 'YES' : 'NO (dry run)'}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // Get all creators with Stripe Connect
    const creators = await getCreatorsWithStripeConnect();

    if (creators.length === 0) {
      console.log('No creators with Stripe Connect found.');
      return;
    }

    console.log(`Found ${creators.length} creator(s) with Stripe Connect\n`);

    const report: ReportEntry[] = [];
    let totalGrossCents = 0;
    let totalPlatformFeeCents = 0;
    let totalNetCents = 0;
    let totalPayoutsCents = 0;

    // Calculate earnings for each creator
    for (const creator of creators) {
      console.log(`Processing creator: ${creator.name} (${creator.email})...`);

      try {
        const earnings = await calculateCreatorEarnings(creator.id, start, end);

        const aboveThreshold = earnings.netCents >= (creator.payoutThresholdCents ?? options.threshold);

        totalGrossCents += earnings.grossCents;
        totalPlatformFeeCents += earnings.platformFeeCents;
        totalNetCents += earnings.netCents;

        const entry: ReportEntry = {
          creatorId: creator.id,
          creatorName: creator.name || 'Unknown',
          creatorEmail: creator.email,
          grossCents: earnings.grossCents,
          platformFeeCents: earnings.platformFeeCents,
          netCents: earnings.netCents,
          breakdown: earnings.breakdown,
          aboveThreshold,
          stripeConnectAccountId: creator.stripeConnectAccountId,
          payoutStatus: 'pending',
        };

        // Execute payout if requested and above threshold
        if (options.execute && aboveThreshold && creator.stripeConnectAccountId) {
          try {
            console.log(`  Executing payout of ${formatDollars(earnings.netCents)}...`);

            const transfer = await createConnectTransfer(
              creator.stripeConnectAccountId,
              earnings.netCents,
              {
                creator_id: creator.id,
                period: label,
                breakdown: JSON.stringify(earnings.breakdown),
              }
            );

            // Create payout record
            await createPayout(
              creator.id,
              earnings.netCents,
              start,
              end,
              earnings.breakdown,
              transfer.id
            );

            entry.payoutStatus = 'completed';
            entry.transferId = transfer.id;
            totalPayoutsCents += earnings.netCents;

            console.log(`  ✓ Payout completed (Transfer ID: ${transfer.id})`);
          } catch (error) {
            entry.payoutStatus = 'failed';
            entry.error = error instanceof Error ? error.message : String(error);
            console.error(`  ✗ Payout failed: ${entry.error}`);
          }
        } else if (!aboveThreshold) {
          entry.payoutStatus = 'skipped';
          console.log(`  → Below threshold (${formatDollars(earnings.netCents)}), skipped`);
        } else if (!creator.stripeConnectAccountId) {
          entry.payoutStatus = 'skipped';
          console.log(`  → No Stripe Connect account, skipped`);
        } else {
          entry.payoutStatus = 'pending';
          console.log(`  → Dry run, would pay ${formatDollars(earnings.netCents)}`);
        }

        report.push(entry);
      } catch (error) {
        console.error(`  Error calculating earnings: ${error}`);
        logger.error({ error, creatorId: creator.id }, 'Failed to calculate earnings');
      }

      console.log('');
    }

    // Print summary report
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log('');

    console.log('Creators:');
    for (const entry of report) {
      console.log(`\n${entry.creatorName} (${entry.creatorEmail})`);
      console.log(`  Gross Earnings: ${formatDollars(entry.grossCents)}`);
      console.log(`  Platform Fee:   ${formatDollars(entry.platformFeeCents)}`);
      console.log(`  Net Earnings:   ${formatDollars(entry.netCents)}`);
      console.log(`  Status:         ${entry.payoutStatus.toUpperCase()}`);
      if (entry.transferId) {
        console.log(`  Transfer ID:    ${entry.transferId}`);
      }
      if (entry.error) {
        console.log(`  Error:          ${entry.error}`);
      }
      console.log('  Breakdown by pack:');
      for (const [packSlug, cents] of Object.entries(entry.breakdown)) {
        console.log(`    - ${packSlug}: ${formatDollars(cents)}`);
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('TOTALS');
    console.log('='.repeat(80));
    console.log(`Total Gross:        ${formatDollars(totalGrossCents)}`);
    console.log(`Total Platform Fee: ${formatDollars(totalPlatformFeeCents)}`);
    console.log(`Total Net:          ${formatDollars(totalNetCents)}`);
    if (options.execute) {
      console.log(`Total Paid Out:     ${formatDollars(totalPayoutsCents)}`);
    }
    console.log('='.repeat(80));

    // Generate CSV output
    if (report.length > 0) {
      console.log('\n\nCSV Export:');
      console.log('Creator Name,Email,Gross,Platform Fee,Net,Status,Transfer ID');
      for (const entry of report) {
        console.log(
          `"${entry.creatorName}","${entry.creatorEmail}",` +
          `${entry.grossCents / 100},${entry.platformFeeCents / 100},${entry.netCents / 100},` +
          `${entry.payoutStatus},"${entry.transferId || ''}"`
        );
      }
    }

  } catch (error) {
    console.error('Fatal error generating payout report:', error);
    logger.error({ error }, 'Fatal error generating payout report');
    process.exit(1);
  }
}

// Run main function
main()
  .then(() => {
    console.log('\n✓ Payout report generation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
