/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Deployed to Vercel/Cloudflare as serverless function.
 *
 * @route POST /api/webhook/stripe
 * @header Stripe-Signature
 * @body Raw Stripe event payload
 */

import Stripe from 'stripe';

// Configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Initialize Stripe
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Event types we handle
const HANDLED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];

/**
 * Log subscription event for analytics/debugging
 */
function logEvent(event: Stripe.Event, metadata: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      type: 'stripe_webhook',
      event_type: event.type,
      event_id: event.id,
      timestamp: new Date().toISOString(),
      ...metadata,
    })
  );
}

/**
 * Handle checkout.session.completed
 * Triggered when a customer completes checkout
 */
async function handleCheckoutComplete(
  session: Stripe.Checkout.Session
): Promise<void> {
  const packId = session.metadata?.pack_id || 'gtm-collective';
  const githubId = session.metadata?.github_id;
  const githubLogin = session.metadata?.github_login;

  logEvent(
    { type: 'checkout.session.completed', id: session.id } as Stripe.Event,
    {
      pack_id: packId,
      github_id: githubId,
      github_login: githubLogin,
      customer: session.customer,
      subscription: session.subscription,
    }
  );

  // Could trigger:
  // - Welcome email
  // - Grant access to private repos
  // - Notify team in Slack
}

/**
 * Handle customer.subscription.created
 * Triggered when a subscription is first created
 */
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const packId = subscription.metadata?.pack_id || 'gtm-collective';
  const githubId = subscription.metadata?.github_id;

  logEvent(
    { type: 'customer.subscription.created', id: subscription.id } as Stripe.Event,
    {
      pack_id: packId,
      github_id: githubId,
      status: subscription.status,
      current_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    }
  );
}

/**
 * Handle customer.subscription.updated
 * Triggered when subscription status changes
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const packId = subscription.metadata?.pack_id || 'gtm-collective';
  const githubId = subscription.metadata?.github_id;

  logEvent(
    { type: 'customer.subscription.updated', id: subscription.id } as Stripe.Event,
    {
      pack_id: packId,
      github_id: githubId,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
    }
  );

  // Handle status changes
  switch (subscription.status) {
    case 'past_due':
      // Could trigger:
      // - Payment reminder email
      // - Grace period warning
      break;
    case 'canceled':
    case 'unpaid':
      // Could trigger:
      // - Revoke access
      // - Win-back email
      break;
  }
}

/**
 * Handle customer.subscription.deleted
 * Triggered when subscription is fully canceled
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const packId = subscription.metadata?.pack_id || 'gtm-collective';
  const githubId = subscription.metadata?.github_id;

  logEvent(
    { type: 'customer.subscription.deleted', id: subscription.id } as Stripe.Event,
    {
      pack_id: packId,
      github_id: githubId,
      ended_at: subscription.ended_at
        ? new Date(subscription.ended_at * 1000).toISOString()
        : null,
    }
  );

  // Could trigger:
  // - Final access revocation
  // - Feedback survey
}

/**
 * Handle invoice.paid
 * Triggered when invoice is successfully paid
 */
async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

  logEvent(
    { type: 'invoice.paid', id: invoice.id } as Stripe.Event,
    {
      subscription: subscriptionId,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
    }
  );
}

/**
 * Handle invoice.payment_failed
 * Triggered when payment fails
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

  logEvent(
    { type: 'invoice.payment_failed', id: invoice.id } as Stripe.Event,
    {
      subscription: subscriptionId,
      attempt_count: invoice.attempt_count,
      next_payment_attempt: invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000).toISOString()
        : null,
    }
  );

  // Could trigger:
  // - Payment failure email
  // - Grace period activation
}

/**
 * Main handler
 */
export default async function handler(
  req: Request
): Promise<Response> {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Get raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing Stripe signature');
    return new Response('Missing signature', { status: 400 });
  }

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  // Log all events
  console.log(`Received event: ${event.type} (${event.id})`);

  // Handle specific events
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        // Log unhandled events
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response('Webhook handler failed', { status: 500 });
  }
}
