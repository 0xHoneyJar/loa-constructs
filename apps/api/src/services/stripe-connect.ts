/**
 * Stripe Connect Service
 * Manages creator onboarding and payouts via Stripe Connect.
 * @see sdd-pack-submission.md §8 Revenue Sharing Architecture
 * @see prd-pack-submission.md §4.4 Revenue Sharing
 */

import type Stripe from 'stripe';
import { db, users } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger.js';
import { getStripe } from './stripe.js';

/**
 * Create a Stripe Connect account and return onboarding URL
 */
export async function createConnectAccountLink(
  userId: string,
  userEmail: string,
  returnUrl: string,
  refreshUrl: string
): Promise<{ url: string; accountId: string }> {
  try {
    // Get user record to check if account exists
    const [user] = await db
      .select({
        stripeConnectAccountId: users.stripeConnectAccountId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    let accountId = user?.stripeConnectAccountId;

    // Create Connect account if doesn't exist
    if (!accountId) {
      const account = await getStripe().accounts.create({
        type: 'express',
        email: userEmail,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          user_id: userId,
        },
      });

      accountId = account.id;

      // Save account ID to user record
      await db
        .update(users)
        .set({
          stripeConnectAccountId: accountId,
        })
        .where(eq(users.id, userId));

      logger.info(
        { userId, accountId },
        'Created Stripe Connect account'
      );
    }

    // Create account link for onboarding
    const accountLink = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    logger.info(
      { userId, accountId },
      'Created Stripe Connect account link'
    );

    return {
      url: accountLink.url,
      accountId,
    };
  } catch (error) {
    logger.error(
      { error, userId },
      'Failed to create Stripe Connect account link'
    );
    throw error;
  }
}

/**
 * Get Stripe Connect account details
 */
export async function getConnectAccount(accountId: string) {
  try {
    return await getStripe().accounts.retrieve(accountId);
  } catch (error) {
    logger.error(
      { error, accountId },
      'Failed to retrieve Stripe Connect account'
    );
    throw error;
  }
}

/**
 * Check if Connect account onboarding is complete
 */
export async function isConnectAccountComplete(accountId: string): Promise<boolean> {
  try {
    const account = await getStripe().accounts.retrieve(accountId);
    return account.charges_enabled && account.payouts_enabled;
  } catch (error) {
    logger.error(
      { error, accountId },
      'Failed to check Stripe Connect account status'
    );
    return false;
  }
}

/**
 * Update user's Connect onboarding status
 */
export async function updateConnectOnboardingStatus(
  userId: string,
  complete: boolean
): Promise<void> {
  await db
    .update(users)
    .set({
      stripeConnectOnboardingComplete: complete,
    })
    .where(eq(users.id, userId));

  logger.info(
    { userId, complete },
    'Updated Stripe Connect onboarding status'
  );
}

/**
 * Create a Stripe Connect transfer (payout to creator)
 */
export async function createConnectTransfer(
  accountId: string,
  amountCents: number,
  metadata: Record<string, string>
): Promise<Stripe.Transfer> {
  try {
    const transfer = await getStripe().transfers.create({
      amount: amountCents,
      currency: 'usd',
      destination: accountId,
      metadata,
    });

    logger.info(
      {
        accountId,
        transferId: transfer.id,
        amountCents,
      },
      'Created Stripe Connect transfer'
    );

    return transfer;
  } catch (error) {
    logger.error(
      { error, accountId, amountCents },
      'Failed to create Stripe Connect transfer'
    );
    throw error;
  }
}

/**
 * Get Stripe Connect dashboard link for creator
 */
export async function getConnectDashboardLink(accountId: string): Promise<string> {
  try {
    const loginLink = await getStripe().accounts.createLoginLink(accountId);
    return loginLink.url;
  } catch (error) {
    logger.error(
      { error, accountId },
      'Failed to create Stripe Connect dashboard link'
    );
    throw error;
  }
}
