# Website Copy: Billing Page

**Route**: `/billing` (authenticated)
**Target Audience**: Users managing their subscription
**Tone**: Clear, actionable, no anxiety
**Generated**: 2026-01-03

---

## Page Header

### Headline
```
Billing
```

### Breadcrumb
```
Dashboard / Billing
```

---

## Current Plan Section

### For Free Users

```
┌─────────────────────────────────────────────────────────────┐
│  Current Plan                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FREE                                                       │
│  $0/month                                                   │
│                                                             │
│  ✓ Public skills                                            │
│  ✓ 3 API keys                                               │
│  ✓ Community support                                        │
│  — Premium packs                                            │
│  — Priority support                                         │
│                                                             │
│  [Upgrade to Pro - $29/mo]                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### For Pro Users

```
┌─────────────────────────────────────────────────────────────┐
│  Current Plan                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PRO                                           [ACTIVE]     │
│  $29/month                                                  │
│                                                             │
│  ✓ All public skills                                        │
│  ✓ Premium packs                                            │
│  ✓ Unlimited API keys                                       │
│  ✓ Priority support                                         │
│  ✓ Usage analytics                                          │
│                                                             │
│  Next billing: {date}                                       │
│                                                             │
│  [Manage Subscription]    [Cancel Plan]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Upgrade Section (Free Users)

### Headline
```
Upgrade to Pro
```

### Value Props
```
Get access to premium packs like GTM Collective:

• 8 skills for complete go-to-market workflow
• Market analysis, positioning, pricing, launch planning
• Built by founders who've shipped 10+ products

Plus:
• Unlimited API keys
• Priority support (24hr response)
• Early access to new packs
```

### Price
```
$29/month
```

### CTA
```
[Upgrade Now]
```

### Fine Print
```
Cancel anytime. Skills you've installed keep working.
```

---

## Payment Method Section (Pro Users)

### Headline
```
Payment Method
```

### Current Card Display
```
•••• •••• •••• {last4}
Expires {month}/{year}

[Update Card]
```

### Update Card Modal
```
Update Payment Method

Card number
[                    ]

Expiry          CVC
[MM/YY]         [•••]

[Save Card]  [Cancel]
```

---

## Billing History Section

### Headline
```
Billing History
```

### Table
```
| Date       | Description      | Amount  | Status | Receipt |
|------------|------------------|---------|--------|---------|
| 2026-01-01 | Pro - Monthly    | $29.00  | Paid   | [PDF]   |
| 2025-12-01 | Pro - Monthly    | $29.00  | Paid   | [PDF]   |
| 2025-11-01 | Pro - Monthly    | $29.00  | Paid   | [PDF]   |
```

### Empty State
```
No billing history yet.
```

---

## Cancel Subscription Flow

### Cancel Button
```
[Cancel Plan]
```

### Confirmation Modal
```
Cancel your Pro subscription?

You'll keep Pro access until {end_date}.
After that:
• Premium pack downloads will be blocked
• Skills already installed will keep working
• You can resubscribe anytime

[Keep Pro]  [Cancel Subscription]
```

### Post-Cancel State
```
┌─────────────────────────────────────────────────────────────┐
│  Current Plan                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PRO                                      [CANCELING]       │
│                                                             │
│  Your subscription ends on {date}.                          │
│  You'll retain access until then.                           │
│                                                             │
│  Changed your mind? [Reactivate Pro]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Upgrade Success State

After successful upgrade:
```
Welcome to Pro!

You now have access to:
✓ Premium packs
✓ Unlimited API keys
✓ Priority support

Get started:
npx loa-registry pack-install gtm-collective

[Browse Premium Packs]  [Go to Dashboard]
```

---

## Error States

### Payment Failed
```
Payment failed

Your card was declined. Please update your payment method.

[Update Card]
```

### Card Expired
```
Card expired

Your card ending in {last4} has expired.
Please update your payment method to continue Pro access.

[Update Card]
```

### Generic Error
```
Something went wrong

We couldn't process your request. Please try again.

[Try Again]  [Contact Support]
```

---

## FAQ Section

### Headline
```
Billing FAQ
```

### FAQs

**Q: When will I be charged?**
```
You're charged immediately on upgrade, then monthly on the same date.
```

**Q: Can I get a refund?**
```
Yes. Contact us within 14 days of any charge for a full refund.
```

**Q: What happens to my installed packs if I cancel?**
```
They keep working. You just can't download new premium packs.
```

**Q: Do you offer annual billing?**
```
Not yet. We're keeping things simple for now.
```

**Q: Need an invoice for your company?**
```
All receipts are available in your billing history.
For custom invoicing, contact hello@thehoneyjar.xyz.
```

---

## SEO Metadata

### Title
```
Billing | Loa Registry
```

### Description
```
Manage your Loa Registry subscription.
Upgrade to Pro for premium packs.
```

---

*Generated via /translate for indie-developers*
