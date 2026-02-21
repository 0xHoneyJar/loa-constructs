/**
 * Signal Outcomes Service — accuracy measurement
 * @see sdd.md §4.1 Signal Outcomes API (cycle-035)
 */

import { db, signalOutcomes } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';
import { getRedis, isRedisConfigured } from './redis.js';
import { logger } from '../lib/logger.js';

// --- Types ---

export interface SignalOutcomeInput {
  packId: string;
  signalType: string;
  signalSource: string;
  signalSourceUrl?: string;
  predictedImpact: 'high' | 'medium' | 'low';
  outcomeSummary?: string;
  recordedBy: string;
}

export interface EvaluationInput {
  actualImpact: 'high' | 'medium' | 'low' | 'none';
  outcomeSummary?: string;
  outcomeEvidence?: string;
  evaluatedBy: string;
}

export interface SignalOutcomePublic {
  id: string;
  signalType: string;
  signalSource: string;
  predictedImpact: string;
  actualImpact: string | null;
  outcomeSummary: string | null;
  selfEvaluated: boolean;
  createdAt: Date | null;
  evaluatedAt: Date | null;
}

export interface ClassMetrics {
  precision: number;
  recall: number;
  count: number;
}

export interface AccuracyReport {
  packSlug: string;
  sampleSize: number;
  coverage: number;
  sufficientData: boolean;
  confusionMatrix: Record<string, Record<string, number>>;
  perClass: Record<string, ClassMetrics>;
  weightedKappa: number;
  timeToOutcomeDays: { median: number; p25: number; p75: number };
  selfEvaluatedCount: number;
  selfEvaluatedFraction: number;
  warnings: string[];
}

// --- Constants ---

const ACCURACY_CACHE_TTL = 600; // 10 minutes
const accuracyCacheKey = (packId: string) => `accuracy:${packId}`;
const PREDICTED_CLASSES = ['high', 'medium', 'low'] as const;
const ACTUAL_CLASSES = ['high', 'medium', 'low', 'none'] as const;
const MIN_SAMPLE_SIZE = 20;

// --- Service Functions ---

export async function createSignalOutcome(input: SignalOutcomeInput) {
  const [outcome] = await db
    .insert(signalOutcomes)
    .values({
      packId: input.packId,
      signalType: input.signalType,
      signalSource: input.signalSource,
      signalSourceUrl: input.signalSourceUrl,
      predictedImpact: input.predictedImpact,
      outcomeSummary: input.outcomeSummary,
      recordedBy: input.recordedBy,
    })
    .returning();

  return outcome;
}

export async function evaluateSignalOutcome(
  outcomeId: string,
  input: EvaluationInput
) {
  const [updated] = await db
    .update(signalOutcomes)
    .set({
      actualImpact: input.actualImpact,
      outcomeSummary: input.outcomeSummary,
      outcomeEvidence: input.outcomeEvidence,
      evaluatedBy: input.evaluatedBy,
      evaluatedAt: new Date(),
    })
    .where(eq(signalOutcomes.id, outcomeId))
    .returning();

  // Invalidate accuracy cache
  if (updated) {
    await invalidateAccuracyCache(updated.packId);
  }

  return updated;
}

export async function getSignalOutcomes(
  packId: string,
  options: { page: number; perPage: number; includeEvidence: boolean }
) {
  const offset = (options.page - 1) * options.perPage;

  const rows = await db
    .select()
    .from(signalOutcomes)
    .where(eq(signalOutcomes.packId, packId))
    .orderBy(sql`${signalOutcomes.createdAt} DESC`)
    .limit(options.perPage)
    .offset(offset);

  return rows.map((row) => {
    const base: SignalOutcomePublic = {
      id: row.id,
      signalType: row.signalType,
      signalSource: row.signalSource,
      predictedImpact: row.predictedImpact,
      actualImpact: row.actualImpact,
      outcomeSummary: row.outcomeSummary,
      selfEvaluated: row.recordedBy === row.evaluatedBy,
      createdAt: row.createdAt,
      evaluatedAt: row.evaluatedAt,
    };

    if (options.includeEvidence) {
      return { ...base, outcomeEvidence: row.outcomeEvidence };
    }
    return base;
  });
}

export async function getSignalOutcomeById(id: string) {
  const [row] = await db
    .select()
    .from(signalOutcomes)
    .where(eq(signalOutcomes.id, id));
  return row ?? null;
}

// --- Accuracy Computation ---

export async function computeAccuracy(
  packId: string,
  packSlug: string
): Promise<AccuracyReport> {
  // Try cache first
  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      const cached = await redis.get<AccuracyReport>(accuracyCacheKey(packId));
      if (cached) return cached;
    }
  } catch (err) {
    logger.warn({ err, packId }, 'Redis cache read failed, computing without cache');
  }

  // Fetch all outcomes for this pack
  const allOutcomes = await db
    .select()
    .from(signalOutcomes)
    .where(eq(signalOutcomes.packId, packId));

  const totalCount = allOutcomes.length;
  const evaluated = allOutcomes.filter((o) => o.actualImpact !== null);
  const evaluatedCount = evaluated.length;
  const coverage = totalCount > 0 ? evaluatedCount / totalCount : 0;
  const sufficientData = evaluatedCount >= MIN_SAMPLE_SIZE;

  // Self-evaluation tracking
  const selfEvaluated = evaluated.filter(
    (o) => o.recordedBy === o.evaluatedBy
  );
  const selfEvaluatedCount = selfEvaluated.length;
  const selfEvaluatedFraction =
    evaluatedCount > 0 ? selfEvaluatedCount / evaluatedCount : 0;

  // Non-self-evaluated outcomes for kappa computation
  const independent = evaluated.filter(
    (o) => o.recordedBy !== o.evaluatedBy
  );

  // Build confusion matrix
  const confusionMatrix: Record<string, Record<string, number>> = {};
  for (const p of PREDICTED_CLASSES) {
    confusionMatrix[p] = {};
    for (const a of ACTUAL_CLASSES) {
      confusionMatrix[p][a] = 0;
    }
  }

  for (const outcome of independent) {
    const predicted = outcome.predictedImpact as string;
    const actual = outcome.actualImpact as string;
    if (confusionMatrix[predicted] && actual in confusionMatrix[predicted]) {
      confusionMatrix[predicted][actual]++;
    }
  }

  // Per-class metrics
  const perClass: Record<string, ClassMetrics> = {};
  for (const cls of PREDICTED_CLASSES) {
    const tp = confusionMatrix[cls][cls] || 0;
    const predictedTotal = Object.values(confusionMatrix[cls]).reduce(
      (a, b) => a + b,
      0
    );
    const actualTotal = PREDICTED_CLASSES.reduce(
      (sum, p) => sum + (confusionMatrix[p][cls] || 0),
      0
    );

    perClass[cls] = {
      precision: predictedTotal > 0 ? tp / predictedTotal : 0,
      recall: actualTotal > 0 ? tp / actualTotal : 0,
      count: predictedTotal,
    };
  }

  // Weighted kappa (linear weights, ordinal scale)
  const weightedKappa = computeWeightedKappa(independent);

  // Time-to-outcome statistics
  const timeToOutcomeDays = computeTimeToOutcome(evaluated);

  // Warnings
  const warnings: string[] = [];
  if (evaluatedCount < MIN_SAMPLE_SIZE) {
    warnings.push(
      `Sample size (${evaluatedCount}) below minimum threshold (${MIN_SAMPLE_SIZE})`
    );
  }
  if (coverage < 0.5) {
    warnings.push(
      `Coverage (${(coverage * 100).toFixed(0)}%) below 50% threshold`
    );
  }
  if (selfEvaluatedFraction > 0.2) {
    warnings.push(
      `Self-evaluated outcomes (${(selfEvaluatedFraction * 100).toFixed(0)}%) exceed 20% threshold`
    );
  }

  const report: AccuracyReport = {
    packSlug,
    sampleSize: evaluatedCount,
    coverage,
    sufficientData,
    confusionMatrix,
    perClass,
    weightedKappa,
    timeToOutcomeDays,
    selfEvaluatedCount,
    selfEvaluatedFraction,
    warnings,
  };

  // Cache result
  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      await redis.set(accuracyCacheKey(packId), report, {
        ex: ACCURACY_CACHE_TTL,
      });
    }
  } catch (err) {
    logger.warn({ err, packId }, 'Redis cache write failed');
  }

  return report;
}

/**
 * Compute weighted kappa with linear weights for ordinal scale.
 * Reference: scikit-learn cohen_kappa_score(weights='linear')
 * Self-evaluated outcomes must be excluded before calling this.
 */
function computeWeightedKappa(
  outcomes: Array<{ predictedImpact: string; actualImpact: string | null }>
): number {
  // Filter to only ordinal classes (exclude 'none' from kappa)
  const ordinalClasses = ['high', 'medium', 'low'];
  const filtered = outcomes.filter(
    (o) =>
      o.actualImpact !== null &&
      ordinalClasses.includes(o.predictedImpact) &&
      ordinalClasses.includes(o.actualImpact)
  );

  const n = filtered.length;
  if (n === 0) return 0;

  const k = ordinalClasses.length;

  // Build observed matrix
  const observed: number[][] = Array.from({ length: k }, () =>
    Array(k).fill(0)
  );
  for (const o of filtered) {
    const i = ordinalClasses.indexOf(o.predictedImpact);
    const j = ordinalClasses.indexOf(o.actualImpact!);
    if (i >= 0 && j >= 0) observed[i][j]++;
  }

  // Row and column sums
  const rowSums = observed.map((row) => row.reduce((a, b) => a + b, 0));
  const colSums = Array(k).fill(0);
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      colSums[j] += observed[i][j];
    }
  }

  // Linear weight matrix: w_ij = |i - j| / (k - 1)
  const weights: number[][] = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => Math.abs(i - j) / (k - 1))
  );

  // Observed disagreement
  let observedDisagreement = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      observedDisagreement += weights[i][j] * observed[i][j];
    }
  }
  observedDisagreement /= n;

  // Expected disagreement (chance)
  let expectedDisagreement = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      expectedDisagreement +=
        weights[i][j] * ((rowSums[i] * colSums[j]) / n);
    }
  }
  expectedDisagreement /= n;

  // Kappa = 1 - (observed / expected)
  if (expectedDisagreement === 0) return 0;
  const kappa = 1 - observedDisagreement / expectedDisagreement;

  // Guard against NaN/Infinity
  if (!Number.isFinite(kappa)) return 0;

  return Math.round(kappa * 1000) / 1000;
}

function computeTimeToOutcome(
  evaluated: Array<{ createdAt: Date | null; evaluatedAt: Date | null }>
): { median: number; p25: number; p75: number } {
  const durations = evaluated
    .filter((o) => o.createdAt && o.evaluatedAt)
    .map((o) => {
      const created = new Date(o.createdAt!).getTime();
      const evaluated = new Date(o.evaluatedAt!).getTime();
      return (evaluated - created) / (1000 * 60 * 60 * 24); // days
    })
    .sort((a, b) => a - b);

  if (durations.length === 0) {
    return { median: 0, p25: 0, p75: 0 };
  }

  return {
    median: percentile(durations, 0.5),
    p25: percentile(durations, 0.25),
    p75: percentile(durations, 0.75),
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

async function invalidateAccuracyCache(packId: string) {
  try {
    if (isRedisConfigured()) {
      const redis = getRedis();
      await redis.del(accuracyCacheKey(packId));
    }
  } catch (err) {
    logger.warn({ err, packId }, 'Failed to invalidate accuracy cache');
  }
}

// --- Rate Limiting ---

const SIGNAL_RATE_LIMIT = 50; // per hour
const SIGNAL_RATE_WINDOW = 3600; // 1 hour in seconds

export async function checkSignalRateLimit(userId: string): Promise<boolean> {
  if (!isRedisConfigured()) return true;

  try {
    const redis = getRedis();
    const key = `rl:signals:create:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, SIGNAL_RATE_WINDOW);
    }
    return count <= SIGNAL_RATE_LIMIT;
  } catch {
    return true; // Allow on Redis failure
  }
}

const SHOWCASE_RATE_LIMIT = 20;
const SHOWCASE_RATE_WINDOW = 3600;

export async function checkShowcaseRateLimit(
  userId: string
): Promise<boolean> {
  if (!isRedisConfigured()) return true;

  try {
    const redis = getRedis();
    const key = `rl:showcases:create:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, SHOWCASE_RATE_WINDOW);
    }
    return count <= SHOWCASE_RATE_LIMIT;
  } catch {
    return true;
  }
}
