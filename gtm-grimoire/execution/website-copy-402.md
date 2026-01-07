# Website Copy: 402 Payment Required

**Context**: API response / Modal / Inline error
**Target Audience**: Free users hitting premium features
**Tone**: Helpful not pushy, show value
**Generated**: 2026-01-03

---

## API Response Body

```json
{
  "error": {
    "code": "PACK_SUBSCRIPTION_REQUIRED",
    "message": "This pack requires a Pro subscription",
    "pack": "{pack_slug}",
    "required_tier": "pro",
    "upgrade_url": "https://constructs.network/billing"
  }
}
```

---

## CLI Output (Terminal)

When user tries to install premium pack without Pro:

```
Error: Pack requires Pro subscription

gtm-collective is a premium pack.
Upgrade to Pro ($29/mo) to install.

→ Upgrade: https://constructs.network/billing
→ View pack: https://constructs.network/packs/gtm-collective

Already subscribed? Run: loa auth login
```

---

## Web Modal (Pack Detail Page)

When free user clicks install on premium pack:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Pro pack                                                   │
│                                                             │
│  {pack_name} requires a Pro subscription.                   │
│                                                             │
│  What you get with Pro:                                     │
│  • This pack + all premium packs                            │
│  • Unlimited API keys                                       │
│  • Priority support                                         │
│                                                             │
│  $29/month • Cancel anytime                                 │
│                                                             │
│  [Upgrade to Pro]              [Maybe Later]                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Web Modal - Value-Focused Variant

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Unlock {pack_name}                                         │
│                                                             │
│  This pack includes:                                        │
│  • {skill_count} skills                                     │
│  • {command_count} commands                                 │
│  • {key_benefit}                                            │
│                                                             │
│  ──────────────────────────────────────────────────────     │
│                                                             │
│  Pro: $29/month                                             │
│                                                             │
│  ✓ All premium packs (not just this one)                    │
│  ✓ Cancel anytime                                           │
│  ✓ Installed packs keep working if you cancel               │
│                                                             │
│  [Upgrade to Pro]              [View Pricing]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Inline Banner (Dashboard)

On dashboard or skills page for free users:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Unlock premium packs like GTM Collective                 │
│    8 skills for go-to-market. $29/mo.  [Upgrade]  [×]       │
└─────────────────────────────────────────────────────────────┘
```

Dismissible. Don't show again for 7 days after dismiss.

---

## Toast Notification

Quick, non-blocking notification:

```
Pro subscription required for this pack.
[Upgrade]
```

Auto-dismiss after 5 seconds.

---

## Pack Card Badge

On pack cards in browse view:

```
┌─────────────────────────────────────────┐
│                                   [PRO] │
│  GTM Collective                         │
│  Go-to-market skills for devs           │
│                                         │
│  8 skills • 14 commands                 │
│                                         │
│  [View Details]                         │
└─────────────────────────────────────────┘
```

---

## Specific Pack Messages

### GTM Collective
```
GTM Collective requires Pro.

Skip the marketing homework. 8 AI-powered skills
for market research, positioning, pricing, and launch.

$29/mo gets you this + all future premium packs.

[Upgrade to Pro]
```

### Generic Premium Pack
```
{pack_name} requires Pro.

{pack_description}

$29/mo. Cancel anytime.

[Upgrade to Pro]
```

---

## Soft Upgrade Prompts

### After 3 free pack installs
```
You've installed 3 packs!

Ready for premium? GTM Collective has 8 skills
for go-to-market strategy.

[Check it out]  [Not now]
```

### After 7 days of account
```
Been here a week!

Unlock premium packs to ship even faster.
Pro is $29/mo. Cancel anytime.

[See what's included]  [Dismiss]
```

---

## Anti-Patterns (What NOT to write)

```
❌ "You need to upgrade to access this feature"
   (Feels like a wall)

❌ "Unlock premium content for just $29/month!"
   (Salesy, "just" is manipulative)

❌ "Don't miss out on GTM Collective!"
   (FOMO tactics, developers hate this)

❌ "Upgrade now and save!"
   (Save what? No discount mentioned)
```

---

## Tone Guidelines

```
✓ State the requirement clearly
✓ Show what they get (not what they're missing)
✓ Always mention cancel anytime
✓ Provide escape route (Maybe Later, View Pricing)
✓ Keep it short - one screen, no scroll
```

---

*Generated via /translate for indie-developers*
