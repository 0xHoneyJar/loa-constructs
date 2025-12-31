/**
 * Stripe Checkout Session Creation API
 *
 * Creates a Stripe Checkout session for pack subscriptions.
 * Deployed to Vercel/Cloudflare as serverless function.
 *
 * @route POST /api/checkout/create
 * @body { pack_id: string }
 * @header Authorization: Bearer <github_token>
 * @returns { checkout_url: string, session_id: string }
 */

import Stripe from 'stripe';

// Types
interface CheckoutRequest {
  pack_id: string;
  plan?: 'monthly' | 'annual';
}

interface CheckoutResponse {
  checkout_url: string;
  session_id: string;
}

interface ErrorResponse {
  error: string;
  message: string;
}

interface GitHubUser {
  id: number;
  login: string;
  email?: string;
  name?: string;
}

// Configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const BASE_URL = process.env.BASE_URL || 'https://loa.thj.ai';

// Price IDs for each pack (configure in Stripe Dashboard)
const PACK_PRICES: Record<string, Record<string, string>> = {
  'gtm-collective': {
    monthly: process.env.STRIPE_PRICE_GTM_MONTHLY || 'price_gtm_monthly',
    annual: process.env.STRIPE_PRICE_GTM_ANNUAL || 'price_gtm_annual',
  },
};

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
 * Get or create Stripe customer for GitHub user
 */
async function getOrCreateCustomer(user: GitHubUser): Promise<Stripe.Customer> {
  // Search for existing customer
  try {
    const existing = await stripe.customers.search({
      query: `metadata['github_id']:'${user.id}'`,
      limit: 1,
    });

    if (existing.data.length > 0) {
      return existing.data[0];
    }
  } catch (error) {
    console.error('Customer search failed:', error);
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: user.name || user.login,
    metadata: {
      github_id: String(user.id),
      github_login: user.login,
    },
  });

  return customer;
}

/**
 * Main handler
 */
export default async function handler(
  req: Request
): Promise<Response> {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'method_not_allowed', message: 'Method not allowed' } as ErrorResponse),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse request body
  let body: CheckoutRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_body', message: 'Invalid JSON body' } as ErrorResponse),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { pack_id = 'gtm-collective', plan = 'monthly' } = body;

  // Validate pack_id
  if (!PACK_PRICES[pack_id]) {
    return new Response(
      JSON.stringify({ error: 'invalid_pack', message: `Unknown pack: ${pack_id}` } as ErrorResponse),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate plan
  if (!['monthly', 'annual'].includes(plan)) {
    return new Response(
      JSON.stringify({ error: 'invalid_plan', message: `Invalid plan: ${plan}` } as ErrorResponse),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Extract GitHub token from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'unauthorized', message: 'Authorization required' } as ErrorResponse),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.substring(7);

  // Verify GitHub token and get user
  const user = await verifyGitHubToken(token);
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'invalid_token', message: 'Invalid GitHub token' } as ErrorResponse),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get or create Stripe customer
  const customer = await getOrCreateCustomer(user);

  // Get price ID
  const priceId = PACK_PRICES[pack_id][plan];

  // Create Checkout Session
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&pack_id=${pack_id}`,
      cancel_url: `${BASE_URL}/pricing?canceled=true&pack_id=${pack_id}`,
      subscription_data: {
        metadata: {
          pack_id,
          github_id: String(user.id),
          github_login: user.login,
        },
      },
      metadata: {
        pack_id,
        github_id: String(user.id),
        github_login: user.login,
      },
      allow_promotion_codes: true,
    });

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        session_id: session.id,
      } as CheckoutResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Checkout session creation failed:', error);
    return new Response(
      JSON.stringify({
        error: 'checkout_failed',
        message: 'Failed to create checkout session',
      } as ErrorResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
