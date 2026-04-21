---
persona: STAMETS (k-hole DIG)
lens: external prior art for loa-constructs registry + install/sync + Freeside payment integration
date: 2026-04-21
depth: 5 DIGs @ depth-3 (Gemini grounded) + 1 local-filesystem audit of construct-freeside + loa-freeside
---

# STAMETS · Prior-Art for loa-constructs Registry + Freeside Charging

> *"Discovery, not invention. The scaffolding we build should stand on shoulders — OCI, skills.sh, Polar — not reimplement what has already been hardened in production."*

## §1 Canonical References (Cited)

### Package-registry architecture (DIG 1, DIG 5)

- **Nesbitt, "Package managers keep using git as a database, it never works out"** — Homebrew, Cargo, CocoaPods each started with git-backed indexes; each hit scaling walls; each migrated. Homebrew 4.0.0 → JSON API; CocoaPods 1.8 → CDN; Cargo → sparse HTTP index; npm → paginated JSON replacing CouchDB `_changes`. `{url: https://nesbitt.io/2025/12/24/package-managers-keep-using-git-as-a-database.html}`
- **Nesbitt, "What Package Registries Could Borrow from OCI"** — OCI Distribution Spec is the emerging cross-ecosystem transport (Homebrew bottles, Helm, Sigstore via referrers API). Content-addressable, platform-variant aware, pull-on-demand. `{url: https://nesbitt.io/2026/02/18/what-package-registries-could-borrow-from-oci.html}`
- **Nesbitt, "Package Management Namespaces"** — flat (PyPI), scoped (`@babel/core`), URL-based (Go, Swift PM). Scoped + URL-based beat flat for ownership + typosquat resistance. `{url: https://nesbitt.io/2026/02/14/package-management-namespaces.html}`
- **npm Trusted Publishing (RFC #103 + GH Actions OIDC + Changesets)** — "repo push triggers registry" now lives at the CI layer, not registry. Keyless publishing via OIDC. `{url: https://github.com/npm/rfcs/pull/103}`

### Agent-era skill registries (DIG 2)

- **Anthropic Agent Skills** (Zhang, Lazuka, Murag) — foundational open standard. *Progressive disclosure*: metadata → SKILL.md → linked files, each lazy. Unbounded context inside a skill. `{url: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills}`
- **skills.sh** (Mukherjee/Vercel) — explicitly models on npm + Chrome Web Store. CLI install + marketplace. Solves cross-agent fragmentation. `{url: https://avikmukherjee.me/blog/ai-skills-registry/how-i-built-a-skills-registry}`
- **Inference.sh, "Agent Skills"** — canonical *tools / skills / features* taxonomy worth adopting verbatim. Tools = primitives; skills = orchestrated tool-use with expertise; features = product-level. `{url: https://inference.sh/blog/skills/agent-skills-overview}`
- **Louis Wang, Claude Code plugin/skill system** — schema-durability lessons. `{url: https://louiswang524.github.io/blog/claude-code-plugin-skill-system}`

### Payment-integrated creator marketplaces (DIG 3, DIG 6)

- **Polar.sh** — Apache 2.0 open-source, self-hostable, Merchant-of-Record for developers. Auto license keys, GitHub repo access on purchase, Discord roles, global VAT. 4% + $0.40. Endorsed by Rauch (Vercel). `{url: https://polar.sh/docs/introduction}`
- **Raul Carini, "Polar: a better Stripe alternative"** — cost isn't fees, it's *"the features you don't have to build, maintain, or debug at 3 AM"*. `{url: https://www.raulcarini.dev/blog/polar-better-stripe-alternative}`
- **PkgPulse / APIScout comparisons (2026)** — Paddle = SaaS MoR. Gumroad = non-technical. Lemon Squeezy = MoR but less dev-native. Stripe Connect = max flexibility/max build-it-yourself. Polar sits alone in "opinionated developer MoR." `{url: https://www.pkgpulse.com/blog/polar-vs-paddle-vs-gumroad-developer-monetization-platforms-2026}`

### Freeside native surfaces (DIG 4 — local filesystem audit)

- **loa-freeside/docs/INFRA-AS-PRODUCT-GTM.md** — 3-pillar plan: Twilio-style API + dev portal, dNFT-for-dixie dogfood, open multi-tenant platform. Strawman tiers: Free / Builder $49 / Pro $199 / Enterprise. `{file: /Users/zksoju/Documents/GitHub/loa-freeside/docs/INFRA-AS-PRODUCT-GTM.md:334-341}`
- **loa-freeside/docs/ECONOMICS.md** — 9-tier BGT conviction, two-counter atomic budget (Redis Lua), BigInt micro-USD, per-model cost attribution, ensemble accounting. `{file: /Users/zksoju/Documents/GitHub/loa-freeside/docs/ECONOMICS.md:211-213}`
- **Freeside billing already wired**: Paddle (subscriptions, customer portal, webhooks), NOWPayments (crypto, flagged), USDC x402 top-up (`/api/billing/topup`), shadow billing. `{file: /Users/zksoju/Documents/GitHub/loa-freeside/README.md:63-73}`
- **construct-freeside/construct.yaml** — `use-freeside` scopes to *operating* worlds (Terraform/ECR/ECS), NOT *selling* constructs. The integration gap. `{file: /Users/zksoju/Documents/GitHub/construct-freeside/construct.yaml}`

---

## §2 Three Patterns That Transfer — HIGH_SIGNAL

### HIGH_SIGNAL · Progressive disclosure as manifest architecture (DIG 2)

Anthropic's SKILL.md pattern — metadata first, body on invocation, linked files on deeper need — is the **directly correct shape** for loa-constructs. Registry serves a tiny summary envelope (name, desc, icon, capabilities) and streams SKILL.md bodies on demand. Matches `auto-sync-architecture.md`'s plan to use GitHub Contents API without cloning. Steal the mental model; the implementation is already aligned. `{url: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills}`

### HIGH_SIGNAL · Polar.sh as the Freeside "menu" for paid constructs (DIG 3, DIG 6)

Polar.sh is **the answer to the "menu of options" intuition**. It solves four day-one problems for a paid-tier registry:

1. **Merchant of Record** — handles global VAT/sales tax; loa-constructs avoids becoming a tax-software company.
2. **GitHub access as fulfillment** — on purchase, Polar grants access to a private repo. Maps 1:1 to the `visibility: private/org/public` ladder in `auto-sync-architecture.md`. Paid construct = private `construct-*` repo whose purchase auto-grants buyer read access. Zero new delivery infra.
3. **License keys + entitlements API** — for CLI/agent auth. `npx constructs` accepts `--license` or reads `~/.constructs/licenses`.
4. **Apache 2.0 + self-hostable** — no lock-in; aligns with Loa framework ethos.

Transfer: **Freeside does not build a payments system**. It adopts Polar as a billing adapter next to Paddle. Constructs become Polar "products"; private `construct-*` repos become Polar "benefits"; registry `visibility` becomes Polar entitlement check. 4% + $0.40 vs. build-it-yourself = trivial. `{url: https://polar.sh/docs/introduction}`

### HIGH_SIGNAL · OIDC-signed publish + content-addressable storage (DIG 1, DIG 5)

npm Trusted Publishing (GH Actions OIDC → registry, no long-lived tokens) plus OCI-style content-addressable storage is the 2026 modern-secure shape. For loa-constructs: push-webhook → sync verifies GitHub OIDC token from the event, and stored blobs are content-hashed (SHA-256 of file set at commit SHA) so repeated syncs are idempotent and tamper-evident. Same principle as Freeside's Lua-enforced budget idempotency — protect the write path with structural uniqueness. `{url: https://github.com/npm/rfcs/pull/103}`

---

## §3 Three Patterns That Would Re-Invent — DO NOT

### DO_NOT · Git-as-database for the registry *index* (DIG 1)

Nesbitt documents *four* major registries (Homebrew, Cargo, CocoaPods, npm's CouchDB mirror) that independently concluded git-backed metadata doesn't scale past low-thousands of entries. All migrated. If the seed suggests "the registry IS a GitHub repo of YAML" (as the *index*, not the *source*), known dead end. Postgres + CDN is the boring correct answer. Git is fine for the construct source repos. `{url: https://nesbitt.io/2025/12/24/package-managers-keep-using-git-as-a-database.html}`

### DO_NOT · Stripe Connect for creator payouts (DIG 3, DIG 6)

Connect is max-flexibility but makes YOU the operator of record: YOU write tax-compliance code, YOU do KYC onboarding, YOU wire 1099s, YOU build the entitlements delivery layer, YOU build license-keys, YOU build the dashboard. Polar already did all of that. For a small team, Connect is wrong granularity. Haseeb Gulraiz's 2026 migration piece documents this calculus in detail. `{url: https://medium.com/@haseeb_gulraiz/stripe-alternative-for-solo-developers-how-i-set-up-polar-payments-and-the-mistakes-that-cost-me-35a9b045552c}`

### DO_NOT · Build a new "npm for agent skills" in isolation (DIG 2)

skills.sh, Anthropic Skills, Inference.sh, Claude Code's plugin/skill system all exist. **loa-constructs should position as an opinionated overlay on the emerging Agent-Skills standard, not a competing standard**. Practically: every construct manifest should ship a valid SKILL.md per skill, so any construct is *also* installable as a plain Anthropic Skill by any Claude client. Compliance-by-inclusion; ride the standard. `{url: https://inference.sh/blog/skills/agent-skills-overview}`

---

## §4 Freeside-Specific Findings + Integration Shape

### What Freeside already has (local audit)

| Capability | Status | Surface |
|------------|--------|---------|
| Paddle (subscriptions, customer portal, webhooks) | shipped | `/api/billing/*` |
| NOWPayments (crypto) | feature-flagged | `/api/billing/*` |
| USDC x402 top-ups | shipped | `POST /api/billing/topup` |
| 9-tier BGT conviction | shipped | `TierService.ts` |
| BigInt micro-USD budget (two-counter Lua) | shipped | `budget-manager.ts` |
| Shadow billing, per-tenant RLS, BYOK | shipped | `adapters/coexistence`, `tenant-context`, `byok-manager` |

Source: `{file: /Users/zksoju/Documents/GitHub/loa-freeside/README.md:63-105}`.

### What the "menu" becomes

Mapping the operator's "menu of options" to the INFRA-AS-PRODUCT-GTM 3-pillar plan plus one integration loa-constructs specifically needs:

1. **Free tier** — public `construct-*` repos. No billing. Default for the vast majority. `{file: /Users/zksoju/Documents/GitHub/loa-constructs/grimoires/bridgebuilder/auto-sync-architecture.md:70-77}`
2. **Private-org tier** — private repos → `org` visibility → GitHub org-membership check. Already free. This is the "internal → external" tiering.
3. **Paid construct tier (new)** — author links a private `construct-*` repo to a Polar product. Purchase grants GitHub access + issues license key. `npx constructs add` reads `~/.constructs/licenses`. Polar slots next to Paddle; doesn't replace it.
4. **Enterprise multi-tenant hosted** — existing Freeside Pillar 3 surface. No change.

### Why Polar slots in cleanly

Polar is a **per-product** MoR; Paddle is a **per-subscription** MoR. Constructs are products, not subscriptions. Polar's "benefits" primitive (GH access, Discord role, license key, file) matches construct delivery shape exactly. Loa already has an `accepting-payments` skill; a sibling `monetizing-constructs` skill wraps the Polar + visibility flow: `npx constructs publish --paid --price $29 --benefits license-key,repo-access`.

### Integration shape (one line)

Freeside adds `packages/adapters/billing/polar/` exposing `createConstructProduct()`, `checkEntitlement()`, `onPurchaseWebhook()` — called by the registry during visibility resolution. Zero changes to existing budget/tier/RLS layers.

---

## §5 SPECULATION — one non-obvious transfer

**SPECULATION**: *OCI Distribution Spec, not npm, is the most defensible long-term transport for loa-constructs artifacts.*

Nesbitt's OCI-beyond-containers essay is prescient. OCI gives content-addressable blobs, platform-variant manifests, pull-on-demand, Sigstore signatures via referrers API, and — critically — a transport every cloud already speaks (ECR, GHCR, Docker Hub, Artifactory). If sync-extracted construct blobs (per commit) are OCI-pushed alongside being Postgres-indexed:

- GHCR becomes free hot storage for every public construct
- Sigstore signing arrives for free
- Air-gapped / enterprise self-host becomes `oras pull` — no loa-constructs server at all
- Caching solved; every org already runs an OCI cache

Risk: adds a primitive to learn; npm-ish JSON index is friendlier for year one. Benefit: eliminates "what if registry goes down / gets bought / wants to federate" forever. **Not current quarter**; 2027 Vision-Registry candidate. `{url: https://nesbitt.io/2026/02/18/what-package-registries-could-borrow-from-oci.html}`

---

## §6 Open Pull-Threads

1. **Sandboxing executable-code skills** (DIG 2) — Anthropic Skills allow embedded scripts. What sandbox does loa-constructs inherit/override? Ties to `team-skill-guard.sh`.
2. **Agent self-authored constructs** (DIG 2) — if agents write their own constructs, what's the trust boundary? `auto_discovered: true` is adjacent.
3. **Paginated-JSON `_changes` successor** (DIG 1) — canonical "what's new since cursor X" pattern that may supplement the webhook approach for high-volume sync.
4. **Absorption dynamics** (DIG 5) — Lerna → native workspaces shows successful tooling gets absorbed. What does loa-constructs absorb (Changesets? incur?) or get absorbed by (Anthropic Skills registry)?
5. **Creem** — Polar-class competitor surfaced but not canvassed; reserve for fallback. `{url: https://devtoolpicks.com/blog/polar-vs-lemon-squeezy-vs-creem-2026}`
6. **Post-purchase DX** (DIG 3 pull-thread) — under-researched half of creator platforms. Worth a standalone DIG if paid tier gets traction.

---

*Stamets out. Polar is the integration; progressive disclosure is the manifest shape; OCI is the far-future transport; the three don't-reinvent traps are documented. No novel synthesis required — the pattern library already assembles.*
