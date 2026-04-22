# Polar Billing Adapter — Scaffold

This package is a **scaffold stub** for Polar.sh billing integration. No live API calls are made from this package. All three exported functions throw `NotImplementedError` when called.

## Purpose

Polar.sh's GitHub-access-as-fulfillment model (see STAMETS §2 prior art) requires public repos or paid entitlements. This adapter surface is created ahead of that wiring so the interface is typed and discoverable.

## Stubs

- `createConstructProduct(opts)` — create a product in Polar for a construct
- `checkEntitlement(opts)` — check if a user has entitlement to a construct
- `onPurchaseWebhook(payload)` — handle Polar purchase webhook

## Current Billing

**Polar is an ADDITIONAL adapter alongside Paddle, not a replacement.**

Use Paddle (existing integration) for current billing flows. Wire Polar in a future cycle when the Polar entitlement model is validated against the construct network's GitHub-access distribution pattern.

## Licensing

Polar.sh is released under the Apache 2.0 license.

## Prior Art

- STAMETS §2: Research on Polar.sh's GitHub-access-as-fulfillment model
- `grimoires/loa-constructs-seed-2026-04-21/stamets-prior-art.md`
- Cycle: loa-constructs-cycle-001, Leg G
