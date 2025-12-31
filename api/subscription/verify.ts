/**
 * Subscription Verification API Endpoint
 *
 * Verifies subscription status for Loa Marketplace packs.
 * Deployed to Vercel/Cloudflare as serverless function.
 *
 * @route GET /api/subscription/verify
 * @query pack_id - Pack to verify (default: gtm-collective)
 * @header Authorization: Bearer <github_token>
 * @returns {SubscriptionResponse}
 */

import Stripe from 'stripe';

// Types
interface SubscriptionResponse {
  status: 'active' | 'canceled' | 'expired' | 'grace_period' | 'not_found';
  message: string;
  pack_id: string;
  subscriptions: PackSubscription[];
  thj_member?: boolean;
  thj_bypass_method?: string;
}

interface PackSubscription {
  pack_id: string;
  status: string;
  stripe_subscription_id?: string;
  started?: string;
  expiry?: string | null;
  grace_period_end?: string | null;
  plan?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  email?: string;
}

// Configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const THJ_GITHUB_ORGS = ['0xHoneyJar', 'thj-dev'];
const THJ_EMAIL_DOMAINS = ['thehoneyjar.com', 'thj.ai', 'honeyjar.xyz'];
const GRACE_PERIOD_DAYS = 7;

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

/**
 * Verify GitHub token and get user info
 */
async function verifyGitHubToken(token: string): Promise<GitHubUser | null> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('GitHub token verification failed:', error);
    return null;
  }
}

/**
 * Check if user is THJ member by org membership
 */
async function checkTHJOrgMembership(token: string): Promise<string | null> {
  for (const org of THJ_GITHUB_ORGS) {
    try {
      const response = await fetch(
        `https://api.github.com/user/memberships/orgs/${org}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (response.ok) {
        return org;
      }
    } catch {
      // Continue to next org
    }
  }
  return null;
}

/**
 * Check if user email is THJ domain
 */
function checkTHJEmailDomain(email?: string): boolean {
  if (!email) return false;

  const domain = email.split('@')[1]?.toLowerCase();
  return THJ_EMAIL_DOMAINS.includes(domain);
}

/**
 * Lookup Stripe customer by GitHub ID
 */
async function findStripeCustomer(
  githubId: number
): Promise<Stripe.Customer | null> {
  try {
    const customers = await stripe.customers.search({
      query: `metadata['github_id']:'${githubId}'`,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0];
    }

    return null;
  } catch (error) {
    console.error('Stripe customer lookup failed:', error);
    return null;
  }
}

/**
 * Get active subscriptions for a customer
 */
async function getCustomerSubscriptions(
  customerId: string,
  packId: string
): Promise<PackSubscription[]> {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
    });

    const packSubscriptions: PackSubscription[] = [];

    for (const sub of subscriptions.data) {
      // Check if this subscription is for the requested pack
      const subPackId = sub.metadata?.pack_id || 'gtm-collective';
      if (subPackId !== packId) continue;

      let status: string;
      let expiryDate: string | null = null;
      let gracePeriodEnd: string | null = null;

      switch (sub.status) {
        case 'active':
        case 'trialing':
          status = 'active';
          break;
        case 'past_due':
          status = 'grace_period';
          expiryDate = new Date(sub.current_period_end * 1000).toISOString();
          gracePeriodEnd = new Date(
            sub.current_period_end * 1000 + GRACE_PERIOD_DAYS * 86400000
          ).toISOString();
          break;
        case 'canceled':
          status = 'canceled';
          expiryDate = sub.canceled_at
            ? new Date(sub.canceled_at * 1000).toISOString()
            : null;
          break;
        case 'unpaid':
        case 'incomplete':
        case 'incomplete_expired':
          status = 'expired';
          break;
        default:
          status = sub.status;
      }

      packSubscriptions.push({
        pack_id: packId,
        status,
        stripe_subscription_id: sub.id,
        started: new Date(sub.start_date * 1000).toISOString(),
        expiry: expiryDate,
        grace_period_end: gracePeriodEnd,
        plan: sub.items.data[0]?.price?.recurring?.interval || 'unknown',
      });
    }

    return packSubscriptions;
  } catch (error) {
    console.error('Subscription lookup failed:', error);
    return [];
  }
}

/**
 * Main handler
 */
export default async function handler(
  req: Request
): Promise<Response> {
  // Only allow GET
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Extract pack_id from query
  const url = new URL(req.url);
  const packId = url.searchParams.get('pack_id') || 'gtm-collective';

  // Extract GitHub token from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({
        status: 'not_found',
        message: 'Authorization required',
        pack_id: packId,
        subscriptions: [],
      } as SubscriptionResponse),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.substring(7);

  // Verify GitHub token and get user
  const user = await verifyGitHubToken(token);
  if (!user) {
    return new Response(
      JSON.stringify({
        status: 'not_found',
        message: 'Invalid GitHub token',
        pack_id: packId,
        subscriptions: [],
      } as SubscriptionResponse),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check THJ membership (bypass billing)
  const thjOrg = await checkTHJOrgMembership(token);
  if (thjOrg) {
    return new Response(
      JSON.stringify({
        status: 'active',
        message: 'THJ member - full access',
        pack_id: packId,
        subscriptions: [],
        thj_member: true,
        thj_bypass_method: `github_org:${thjOrg}`,
      } as SubscriptionResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check THJ email domain
  if (checkTHJEmailDomain(user.email)) {
    return new Response(
      JSON.stringify({
        status: 'active',
        message: 'THJ member - full access',
        pack_id: packId,
        subscriptions: [],
        thj_member: true,
        thj_bypass_method: 'email_domain',
      } as SubscriptionResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Look up Stripe customer
  const customer = await findStripeCustomer(user.id);
  if (!customer) {
    return new Response(
      JSON.stringify({
        status: 'not_found',
        message: 'No subscription found',
        pack_id: packId,
        subscriptions: [],
      } as SubscriptionResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get subscriptions
  const subscriptions = await getCustomerSubscriptions(customer.id, packId);

  if (subscriptions.length === 0) {
    return new Response(
      JSON.stringify({
        status: 'not_found',
        message: 'No subscription for this pack',
        pack_id: packId,
        subscriptions: [],
      } as SubscriptionResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Find the best status (active > grace_period > canceled > expired)
  const activeSubscription = subscriptions.find((s) => s.status === 'active');
  const graceSubscription = subscriptions.find(
    (s) => s.status === 'grace_period'
  );

  let overallStatus: SubscriptionResponse['status'];
  let message: string;

  if (activeSubscription) {
    overallStatus = 'active';
    message = 'Active subscription';
  } else if (graceSubscription) {
    overallStatus = 'grace_period';
    message = 'Subscription in grace period';
  } else if (subscriptions.some((s) => s.status === 'canceled')) {
    overallStatus = 'canceled';
    message = 'Subscription canceled';
  } else {
    overallStatus = 'expired';
    message = 'Subscription expired';
  }

  return new Response(
    JSON.stringify({
      status: overallStatus,
      message,
      pack_id: packId,
      subscriptions,
    } as SubscriptionResponse),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
