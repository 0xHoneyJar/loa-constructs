# Website Copy: Email Templates

**Target Audience**: Loa Registry users
**Tone**: Developer-friendly, concise, actionable
**Generated**: 2026-01-03

---

## Email Design Principles

```
• Plain text first, HTML optional
• No images (devs often block them)
• Code blocks where relevant
• One clear CTA per email
• Short - readable in 30 seconds
• From: Loa Registry <hello@thehoneyjar.xyz>
```

---

# 1. Welcome Email

**Trigger**: After email verification complete
**Subject Line Options**:
1. `Welcome to Loa Registry`
2. `You're in. Here's how to start.`
3. `Loa Registry: Get started`

---

## Plain Text Version

```
Welcome to Loa Registry

You're set up. Here's how to get started:

1. Install the CLI:
   npm install -g loa-registry

2. Authenticate:
   loa auth login

3. Install your first pack:
   loa pack-install <pack-name>

Browse available packs:
https://constructs.network/packs

─────────────────────────────────

Questions? Reply to this email or join our Discord:
https://discord.gg/loa-registry

Happy shipping,
The Loa Team

─────────────────────────────────
Loa Registry | https://constructs.network
Unsubscribe: {unsubscribe_link}
```

---

## HTML Version (Simple)

```html
<div style="font-family: 'IBM Plex Mono', monospace; max-width: 600px; margin: 0 auto; padding: 20px; color: #c0c0c0; background: #0a0a0a;">

  <h1 style="color: #5fff87; font-size: 16px;">Welcome to Loa Registry</h1>

  <p>You're set up. Here's how to get started:</p>

  <div style="background: #1a1a1a; padding: 16px; border: 1px solid #5f5f5f; margin: 16px 0;">
    <p style="margin: 0 0 8px 0; color: #5f5f5f;"># 1. Install the CLI</p>
    <code style="color: #5fafff;">npm install -g loa-registry</code>

    <p style="margin: 16px 0 8px 0; color: #5f5f5f;"># 2. Authenticate</p>
    <code style="color: #5fafff;">loa auth login</code>

    <p style="margin: 16px 0 8px 0; color: #5f5f5f;"># 3. Install your first pack</p>
    <code style="color: #5fafff;">loa pack-install &lt;pack-name&gt;</code>
  </div>

  <p>
    <a href="https://constructs.network/packs" style="color: #5fffff;">Browse available packs →</a>
  </p>

  <hr style="border: none; border-top: 1px solid #5f5f5f; margin: 24px 0;">

  <p style="color: #606060; font-size: 12px;">
    Questions? Reply to this email or <a href="https://discord.gg/loa-registry" style="color: #5fffff;">join Discord</a>
  </p>

  <p>Happy shipping,<br>The Loa Team</p>

  <hr style="border: none; border-top: 1px solid #5f5f5f; margin: 24px 0;">

  <p style="color: #606060; font-size: 11px;">
    Loa Registry | <a href="https://constructs.network" style="color: #5fffff;">constructs.network</a><br>
    <a href="{unsubscribe_link}" style="color: #606060;">Unsubscribe</a>
  </p>

</div>
```

---

# 2. Email Verification

**Trigger**: After registration, before verification
**Subject Line**: `Verify your email`

---

## Plain Text Version

```
Verify your email

Click the link below to verify your email address:

{verification_link}

Link expires in 24 hours.

If you didn't create a Loa Registry account, ignore this email.

─────────────────────────────────
Loa Registry | https://constructs.network
```

---

# 3. Subscription Confirmed (Pro Upgrade)

**Trigger**: After successful Pro subscription
**Subject Line Options**:
1. `Welcome to Pro`
2. `Pro activated - here's what's new`
3. `You're Pro now`

---

## Plain Text Version

```
Welcome to Pro

Your subscription is active. Here's what you unlocked:

✓ Premium packs (GTM Collective, more coming)
✓ Unlimited API keys
✓ Priority support (24hr response)
✓ Early access to new packs

─────────────────────────────────

Get started with GTM Collective:

  loa pack-install gtm-collective

This gives you 8 skills for go-to-market:
/gtm-setup, /analyze-market, /position, /price,
/plan-launch, /announce-release, /plan-devrel, /create-deck

Full command list:
https://constructs.network/packs/gtm-collective

─────────────────────────────────

Billing:
• $29/month, billed today
• Next charge: {next_billing_date}
• Manage subscription: https://constructs.network/billing

Questions? Reply to this email.

Happy shipping,
The Loa Team

─────────────────────────────────
Loa Registry | https://constructs.network
```

---

## HTML Version

```html
<div style="font-family: 'IBM Plex Mono', monospace; max-width: 600px; margin: 0 auto; padding: 20px; color: #c0c0c0; background: #0a0a0a;">

  <h1 style="color: #5fff87; font-size: 16px;">Welcome to Pro</h1>

  <p>Your subscription is active. Here's what you unlocked:</p>

  <ul style="list-style: none; padding: 0;">
    <li style="margin: 8px 0;">✓ Premium packs (GTM Collective, more coming)</li>
    <li style="margin: 8px 0;">✓ Unlimited API keys</li>
    <li style="margin: 8px 0;">✓ Priority support (24hr response)</li>
    <li style="margin: 8px 0;">✓ Early access to new packs</li>
  </ul>

  <hr style="border: none; border-top: 1px solid #5f5f5f; margin: 24px 0;">

  <h2 style="color: #5fafff; font-size: 14px;">Get started with GTM Collective</h2>

  <div style="background: #1a1a1a; padding: 16px; border: 1px solid #5f5f5f; margin: 16px 0;">
    <code style="color: #5fafff;">loa pack-install gtm-collective</code>
  </div>

  <p>8 skills for go-to-market strategy. <a href="https://constructs.network/packs/gtm-collective" style="color: #5fffff;">See full command list →</a></p>

  <hr style="border: none; border-top: 1px solid #5f5f5f; margin: 24px 0;">

  <p style="color: #606060; font-size: 12px;">
    <strong>Billing</strong><br>
    $29/month • Next charge: {next_billing_date}<br>
    <a href="https://constructs.network/billing" style="color: #5fffff;">Manage subscription</a>
  </p>

  <p>Happy shipping,<br>The Loa Team</p>

</div>
```

---

# 4. Subscription Cancelled

**Trigger**: After user cancels Pro
**Subject Line**: `Your Pro subscription has been cancelled`

---

## Plain Text Version

```
Your Pro subscription has been cancelled

You'll keep Pro access until {end_date}.

After that:
• Premium pack downloads will be blocked
• Skills already installed will keep working
• Your account stays active (free tier)

Changed your mind? Reactivate anytime:
https://constructs.network/billing

─────────────────────────────────

We'd love to know why you cancelled.
Reply to this email - feedback helps us improve.

Thanks for trying Pro,
The Loa Team

─────────────────────────────────
Loa Registry | https://constructs.network
```

---

# 5. Payment Failed

**Trigger**: Stripe payment failure
**Subject Line**: `Action needed: Payment failed`

---

## Plain Text Version

```
Payment failed

We couldn't charge your card for Loa Pro.

To keep Pro access, update your payment method:
https://constructs.network/billing

If we can't collect payment within 7 days,
your subscription will be downgraded to Free.

Your installed packs will keep working either way.

─────────────────────────────────

Having trouble? Reply to this email.

The Loa Team

─────────────────────────────────
Loa Registry | https://constructs.network
```

---

# 6. Password Reset

**Trigger**: Forgot password request
**Subject Line**: `Reset your password`

---

## Plain Text Version

```
Reset your password

Click the link below to reset your password:

{reset_link}

Link expires in 1 hour.

If you didn't request this, ignore this email.
Your password won't change.

─────────────────────────────────
Loa Registry | https://constructs.network
```

---

# 7. New Pack Available (Optional Newsletter)

**Trigger**: New pack published (opt-in only)
**Subject Line**: `New pack: {pack_name}`

---

## Plain Text Version

```
New pack: {pack_name}

{pack_description}

{skill_count} skills • {command_count} commands

Install:
  loa pack-install {pack_slug}

Details:
https://constructs.network/packs/{pack_slug}

─────────────────────────────────

This is a product update. You're receiving this because
you opted in to pack announcements.

Unsubscribe: {unsubscribe_link}

─────────────────────────────────
Loa Registry | https://constructs.network
```

---

# Email Footer (Standard)

```
─────────────────────────────────
Loa Registry | https://constructs.network
© 2026 The Honey Jar

{unsubscribe_link} | {preferences_link}
```

---

# Subject Line A/B Tests

## Welcome Email
- A: `Welcome to Loa Registry`
- B: `You're in. Here's how to start.`
- C: `Your Loa account is ready`

## Pro Upgrade
- A: `Welcome to Pro`
- B: `Pro activated`
- C: `You unlocked premium packs`

## Payment Failed
- A: `Action needed: Payment failed`
- B: `Update your payment method`
- C: `We couldn't charge your card`

---

*Generated via /translate for indie-developers*
