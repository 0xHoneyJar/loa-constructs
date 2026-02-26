# Material Feel Applied to Transaction UX — Cross-Construct Research

> Source: Gemini Deep Research (2026-02-26), commissioned for Protocol construct
> but fundamentally Artisan territory. The feel vocabulary, easing curves, and
> material personality framework here extend Artisan's existing design physics.

## Why This Lives Here

The Protocol construct handles verification and QA. But the **material personality
framework** — the concrete CSS values, easing curves, and timing tables — is design
physics. It belongs in Artisan's knowledge base.

**Composability**: Artisan defines the material → Protocol verifies compliance.

- Artisan's `crafting-physics` skill: defines weight-of-consequence timing
- Artisan's `animating-motion` skill: defines easing curves per material
- Artisan's `synthesizing-taste` skill: extracts personality → taste.md tokens
- Protocol's `dapp-lint` skill: verifies implementation matches declared taste

## Concrete Values for Artisan Skills

### Easing Curves by Material Personality

```css
/* Soft/Cozy — spring physics, overshoot */
--ease-cozy: cubic-bezier(0.34, 1.56, 0.64, 1);
--duration-cozy: 300ms - 600ms;

/* Sharp/Dense — fast response, no bounce */
--ease-sharp: cubic-bezier(0.4, 0, 0.2, 1);
--duration-sharp: 80ms - 150ms;

/* Premium/Minimal — smooth deceleration */
--ease-premium: cubic-bezier(0.2, 0, 0.38, 0.9);
--duration-premium: 200ms - 300ms;
```

### Weight-of-Consequence Timing (extends crafting-physics)

| Weight | Timing | State Mgmt | When |
|--------|--------|-----------|------|
| Light | < 100ms | Optimistic | toggle, expand, filter |
| Medium | 200-300ms | Pessimistic (soft) | save, submit, modify |
| Heavy | 800ms+ enforced | Pessimistic (strict) | burn, revoke, swap large amounts |

Key finding: Stripe adds **artificial delay** to payment confirmation — temporal weight
signals "this mattered" even when network responds instantly.

### Seven Dimensions Reference (extends envisioning-direction)

| Dimension | Soft/Cozy | Sharp/Dense | Premium/Minimal |
|-----------|-----------|-------------|-----------------|
| Spacing | `24px+` generous | `4-8px` tight | `16px` balanced |
| Typography | Editorial, varied weights | Monospace, tabular nums | Clean sans-serif |
| Corners | `border-radius: 16px+` | `0-2px` | `4-8px` |
| Motion | 300-600ms spring | 80-150ms linear-out | 200-300ms ease-out |
| Density | Sparse, one-big-button | Packed, all-params-inline | Intentional whitespace |
| Color | Warm, vibrant | Dark, high-contrast | Restrained, confident |
| Elevation | Soft layered shadows | Flat, minimal | Subtle, purposeful |

### Error Tone by Material (extends decomposing-feel)

- **Cozy**: "Network is busy. Trying again..." — warm yellows, gentle shake
- **Sharp**: "Slippage exceeded. Deviation: 1.2%. Adjust > 1.5%." — red border, instant
- **Premium**: "Price moved. Review updated quote." — clean card, one CTA

### Waiting State by Material (extends animating-motion)

- **Cozy**: indeterminate pulse, 1000ms loop, "Working our magic (~2 min)"
- **Sharp**: determinate progress bar, block confirmations, "ETA: 12s"
- **Premium**: phase transitions, progressive state reveals

## Key Insight: "Snappy" Is Not Universally Correct

A 200ms ease-out feels right for a trading app but **rushed** for a meditation app.
The optimal velocity is entirely material-dependent.

- Set&Forgetti (internal, soft/cozy): slower easing, generous spacing, warm — relaxing
- DeFi terminal: fast response, tight spacing, cold — immediate
- Same on-chain action, completely different feel

## Flow State Cost by Material

Gloria Mark (UC Irvine): 23 min to regain focus after interruption.

- Meditative app: interruption cost is **devastating** — session keys + gas abstraction essential
- Trading terminal: users expect staccato rhythm — interruptions are operational, not destructive
- Premium: balance — minimize friction, maintain security perception
