# 0xHoneyJar DNS & Domain Infrastructure Mapping

> *"Before you build the bridge, you map every cable holding up the one that's already standing."*

**Status**: Complete Excavation
**Date**: 2026-02-26
**Author**: Bridgebuilder (requested by jani, compiled by soju)
**Purpose**: Comprehensive DNS/domain/subdomain audit for migration from Vercel-managed → AWS IaC/Terraform
**Context**: Foundation for the agent economy — automated dNFT website deployments at scale (100K+ subdomains)

---

## Executive Summary

0xHoneyJar operates **32 domains** across **4 registrars**, hosting **33+ Vercel projects** with **40+ custom domain assignments**. DNS is managed at the **registrar level** (primarily Gandi), NOT through Vercel's nameservers — which is actually favorable for migration. Only 1 domain (bera8.xyz) delegates nameservers to Vercel directly.

The critical path for AWS migration is: **Route 53 hosted zones → replicate all DNS records → update nameservers at registrars → Terraform manages all records going forward**. Vercel deployments continue unchanged — only DNS authority moves.

**Key findings**:
- Email infrastructure (Google Workspace on 0xhoneyjar.xyz) requires careful MX/SPF/DKIM migration
- DMARC record has a **placeholder email** (`admin@yourdomain.com`) — live misconfiguration, fix NOW
- `_acme-challenge` NS delegation required for wildcard TLS cert renewal post-migration (Vercel can't satisfy DNS-01 challenges without it)
- `arrakis.community` is **already on AWS Route 53 nameservers** — migration template
- `constructs.network` has **no Vercel project assignment** despite A record pointing to Vercel — broken mapping
- 100K+ agent subdomains: **wildcard + Edge Middleware** is the definitive architecture (NOT individual DNS records)
- Use `cname.vercel-dns.com` universally — NOT project-specific CNAME hashes (brittle)
- Vercel Terraform Provider enables atomic DNS + project domain binding in a single `terraform apply`

---

## 1. Domain Inventory (32 Domains)

### 1.1 Registrar Distribution

| Registrar | Nameservers | Domains | Count |
|-----------|-------------|---------|-------|
| **Gandi SAS** | `ns-*-{a,b,c}.gandi.net` | 0xhoneyjar.xyz, constructs.network, setandforgetti.io, beraflip.com, cubquests.com, beekeeper.sh, fatbera.xyz, honeyroad.xyz, beradrops.xyz, moneycomb.xyz, honeycomb.guide, moneycomb.guide, cubscouts.com, cubscouts.club, cubscouts.quest, beardrops.xyz, berabaddie.xyz, berabaddies.xyz, berainfinity.xyz, apiologydao.xyz, beratone-game.com, beranames.com, bearfy.xyz, berafy.com, crayons.art, henlo.xyz | ~26 |
| **GoDaddy** | `ns{37,38,67,68}.domaincontrol.com` | notinterpol.com, henlo.com (via Afternic/GoDaddy) | 2 |
| **AWS Route 53** | `ns-*.awsdns-*.{org,co.uk,com,net}` | arrakis.community | 1 |
| **Vercel DNS** | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` | bera8.xyz | 1 |
| **Unknown/Other** | Various | berabaddie.com, berabaddies.com | 2 |

### 1.2 Full Domain List with Status

| # | Domain | Registrar | NS Provider | Has Projects | Email | Age |
|---|--------|-----------|-------------|--------------|-------|-----|
| 1 | **0xhoneyjar.xyz** | Gandi | Gandi | Yes (17 subdomains) | Google Workspace | 1106d |
| 2 | **constructs.network** | Gandi | Gandi | **None mapped** | Gandi mail | 50d |
| 3 | **arrakis.community** | ? | **AWS Route 53** | Yes (docs) | — | 53d |
| 4 | **henlo.com** | GoDaddy | GoDaddy/Afternic | Yes (www, app) | Null MX | 722d |
| 5 | **henlo.xyz** | Gandi | Gandi | — | — | 174d |
| 6 | **crayons.art** | Gandi | Gandi | — | — | 207d |
| 7 | **honeyroad.xyz** | Gandi | Gandi | Yes | — | 346d |
| 8 | **fatbera.xyz** | Gandi | Gandi | Yes | — | 388d |
| 9 | **beradrops.xyz** | Gandi | Gandi | Yes | — | 396d |
| 10 | **setandforgetti.io** | Gandi | Gandi | Yes (app, docs, www) | Gandi mail | 528d |
| 11 | **notinterpol.com** | GoDaddy | GoDaddy | Yes (app, docs, old, www) | — | 551d |
| 12 | **moneycomb.xyz** | Gandi | Gandi | Yes | — | 573d |
| 13 | **honeycomb.guide** | Gandi | Gandi | Yes | — | 573d |
| 14 | **moneycomb.guide** | Gandi | Gandi | Yes | — | 573d |
| 15 | **beardrops.xyz** | Gandi | Gandi | Yes | — | 578d |
| 16 | **cubscouts.com** | Gandi | Gandi | — | — | 581d |
| 17 | **cubquests.com** | Gandi | Gandi | Yes (www, dashboard, creator) | — | 582d |
| 18 | **cubscouts.club** | Gandi | Gandi | — | — | 584d |
| 19 | **cubscouts.quest** | Gandi | Gandi | — | — | 591d |
| 20 | **beraflip.com** | Gandi | Gandi | Yes (www, root) | — | 618d |
| 21 | **apiologydao.xyz** | Gandi | Gandi | Yes | — | 677d |
| 22 | **berabaddie.xyz** | Gandi | Gandi | — | — | 681d |
| 23 | **berabaddie.com** | ? | ? | — | — | 681d |
| 24 | **berabaddies.xyz** | Gandi | Gandi | — | — | 681d |
| 25 | **berabaddies.com** | ? | ? | — | Google verification | 681d |
| 26 | **beekeeper.sh** | Gandi | Gandi | — | — | 716d |
| 27 | **berainfinity.xyz** | Gandi | Gandi | — | — | 721d |
| 28 | **bera8.xyz** | ? | **Vercel DNS** | Yes (root, www, *, awards) | — | 721d |
| 29 | **beranames.com** | Gandi | Gandi | — | — | 759d |
| 30 | **beratone-game.com** | Gandi | Gandi | — | — | 767d |
| 31 | **berafy.com** | Gandi | Gandi | Yes | — | 779d |
| 32 | **bearfy.xyz** | Gandi | Gandi | — | — | 779d |

---

## 2. Primary Domain: 0xhoneyjar.xyz (Deep Dive)

### 2.1 DNS Configuration

**Registrar**: Gandi SAS (WHOIS confirmed, expires 2028-02-16)
**Nameservers**: Gandi (`ns-156-a.gandi.net`, `ns-170-b.gandi.net`, `ns-27-c.gandi.net`)
**Vercel wants**: `ns1.vercel-dns.com`, `ns2.vercel-dns.com` — **NOT delegated** (uses CNAME/A instead)

#### DNS Records (Vercel-side)

| Name | Type | Value | Notes |
|------|------|-------|-------|
| `@` (root) | ALIAS | `34e2ea806a9383c1.vercel-dns-013.com` | Apex → Vercel |
| `*` | ALIAS | `cname.vercel-dns-016.com` | Wildcard catch-all |
| `@` | CAA | `0 issue "letsencrypt.org"` | TLS cert authority |
| `@` | CAA | `0 issue "pki.goog"` | Google CA |
| `@` | CAA | `0 issue "sectigo.com"` | Sectigo CA |

#### DNS Records (Gandi-side, from live `dig`)

| Name | Type | Value | Notes |
|------|------|-------|-------|
| `@` | A | `76.76.21.21` | Vercel anycast IP |
| `@` | MX | `1 aspmx.l.google.com` + 4 alternates | Google Workspace |
| `@` | TXT | `v=spf1 include:_mailcust.gandi.net include:_spf.google.com -all` | SPF |
| `@` | TXT | `google-site-verification=Le1FtsBR0ydAKuaq1OM7cNSDymc61AWDBpKsPlaKkpE` | Google verification |
| `@` | TXT | `1password-site-verification=UVX2GYFY6BEWBO4OIYWSJG2LKU` | 1Password |
| `_dmarc` | TXT | `v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com; ...` | **BUG: placeholder email** |

### 2.2 Subdomain → Project Mapping (17 subdomains)

| Subdomain | Vercel Project | Production URL | Status |
|-----------|---------------|----------------|--------|
| `@` (root) | community-interface | www.0xhoneyjar.xyz | Active |
| `www` | community-interface | www.0xhoneyjar.xyz | Active |
| `community` | community-interface | community.0xhoneyjar.xyz | Active |
| `app` | honey-interface | app.0xhoneyjar.xyz | Active (77d) |
| `hub` | hub-interface | hub.0xhoneyjar.xyz | Active (1d) |
| `midi` | midi-interface | midi.0xhoneyjar.xyz | Active (14m) |
| `henlo` | henlo-interface | henlo.0xhoneyjar.xyz | Active (3d) |
| `mibera` | mibera-interface | mibera.0xhoneyjar.xyz | Active (2d) |
| `fatbera` | fat-bera-interface | fatbera.0xhoneyjar.xyz | Active (76d) |
| `partners` | partners-interface | partners.0xhoneyjar.xyz | Active (77d) |
| `beardrops` | beardrops-interface | beardrops.0xhoneyjar.xyz | Active (73d) |
| `honeycomb` | moneycomb-interface | honeycomb.0xhoneyjar.xyz | Active (73d) |
| `moneycomb` | moneycomb-interface | moneycomb.0xhoneyjar.xyz | Active (73d) |
| `apiologydao` | apdao-auction-house | apiologydao.0xhoneyjar.xyz | Active (14h) |
| `docs` | thj-docs | docs.0xhoneyjar.xyz | Active (94d) |
| `ecosystem` | explorer-interface | ecosystem.0xhoneyjar.xyz | Active (116d) |
| `cubquests` | faucet-interface | cubquests.0xhoneyjar.xyz | Active |
| `faucet` | faucet-interface | faucet.0xhoneyjar.xyz | Active |
| `setandforgetti` | sf-interface | setandforgetti.0xhoneyjar.xyz | Active |
| `splits` | berachain-splits | splits.0xhoneyjar.xyz | Active (116d) |

**Note**: `apiologydao.0xhoneyjar.xyz` is assigned to BOTH `apdao-auction-house` AND `apdao-interface` — potential conflict.

### 2.3 CNAME Resolution Patterns

Subdomains resolve via two patterns:

**Pattern A — Project-specific Vercel DNS hash** (newer deployments):
```
hub.0xhoneyjar.xyz → 7f8ff656ff66a8ca.vercel-dns-013.com → 216.150.16.193
midi.0xhoneyjar.xyz → e08caa55252e5d21.vercel-dns-016.com → 216.150.16.1
henlo.0xhoneyjar.xyz → 4eed31661f35f4b8.vercel-dns-013.com → 216.150.16.193
mibera.0xhoneyjar.xyz → d99931349aa80519.vercel-dns-013.com → 216.150.16.193
fatbera.0xhoneyjar.xyz → fb0908262cb0c3a2.vercel-dns-013.com → 216.150.1.129
apiologydao.0xhoneyjar.xyz → 95f52dd35ce167ab.vercel-dns-013.com → 216.150.16.129
```

**Pattern B — Generic Vercel DNS** (older deployments, caught by wildcard):
```
www.0xhoneyjar.xyz → cname.vercel-dns.com → 76.76.21.61 / 66.33.60.130
app.0xhoneyjar.xyz → cname.vercel-dns.com → 76.76.21.61 / 66.33.60.130
partners.0xhoneyjar.xyz → cname.vercel-dns.com → same
beardrops.0xhoneyjar.xyz → cname.vercel-dns.com → same
honeycomb.0xhoneyjar.xyz → cname.vercel-dns.com → same
docs.0xhoneyjar.xyz → cname.vercel-dns.com → same
```

---

## 3. Other Active Domains (Deep Dive)

### 3.1 constructs.network

| Record | Type | Value | Notes |
|--------|------|-------|-------|
| `@` | A | `216.150.1.1` | Vercel edge IP (via Gandi) |
| `api` | CNAME | `z74r2ku7.up.railway.app` | **Railway** — NOT Vercel |
| `@` | MX | Gandi mail servers | Active email |
| `@` | TXT/SPF | `include:_mailcust.gandi.net` | Gandi SPF |

**CRITICAL FINDING**: `constructs.network` has **no Vercel project assignment** visible in domain inspect. The A record points to Vercel's edge but no project is linked. The Explorer app (`loa-constructs-explorer`) uses `loa-constructs-explorer.vercel.app` as its production URL — the custom domain may need to be (re)connected.

**API subdomain**: `api.constructs.network` → Railway (CNAME to `z74r2ku7.up.railway.app`) — this is the Hono API, NOT managed by Vercel.

### 3.2 setandforgetti.io

| Subdomain | Project | URL |
|-----------|---------|-----|
| `@` (root) | sf-landing | setandforgetti.io |
| `www` | sf-landing | www.setandforgetti.io |
| `app` | sf-interface | app.setandforgetti.io |
| `docs` | sf-docs | docs.setandforgetti.io |

NS: Gandi. Email: Gandi mail (MX active).

### 3.3 notinterpol.com

| Subdomain | Project | URL |
|-----------|---------|-----|
| `@` (root) | interpol-landing | notinterpol.com |
| `www` | interpol-landing | www.notinterpol.com |
| `app` | interpol-interface | app.notinterpol.com |
| `docs` | interpol-docs | docs.notinterpol.com |
| `old` | interpol-interface-old | old.notinterpol.com |

NS: GoDaddy. No email.

### 3.4 henlo.com

| Subdomain | Project | URL |
|-----------|---------|-----|
| `@` (root) | henlo-landing | henlo.com |
| `www` | henlo-landing | www.henlo.com |
| `app` | henlo-interface | app.henlo.com |

NS: GoDaddy/Afternic. **Domain warning** from Vercel — not properly configured. Live resolution goes to `13.248.169.48` / `76.223.54.146` (AWS Global Accelerator IPs — likely a different service or CDN, NOT Vercel). Email: Null MX (`0 .`) with `v=spf1 -all` — explicitly rejects all email.

### 3.5 cubquests.com

| Subdomain | Project | URL |
|-----------|---------|-----|
| `@` (root) | faucet-interface | cubquests.com |
| `www` | faucet-interface | www.cubquests.com |
| `dashboard` | cubquests-dashboard | dashboard.cubquests.com |
| `creator` | cubquests-creator-docs | creator.cubquests.com |

NS: Gandi. No email.

### 3.6 beraflip.com

| Subdomain | Project | URL |
|-----------|---------|-----|
| `@` (root) | berafy-interface | beraflip.com |
| `www` | berafy-interface | www.beraflip.com |

NS: Gandi. No email.

### 3.7 bera8.xyz (Vercel-delegated NS)

| Subdomain | Project | URL |
|-----------|---------|-----|
| `@` (root) | bera-infinity-interface | bera8.xyz |
| `www` | bera-infinity-interface | www.bera8.xyz |
| `*` (wildcard) | bera-infinity-interface | *.bera8.xyz |
| `awards` | bera8-interface | awards.bera8.xyz |

NS: **Vercel DNS** (only domain with Vercel nameservers). This is the **hardest to migrate** — all DNS records are managed by Vercel's nameserver infrastructure.

### 3.8 arrakis.community (Already on AWS)

| Subdomain | Project | URL |
|-----------|---------|-----|
| `docs` | docs-site | docs.arrakis.community |

NS: **AWS Route 53** (`ns-1416.awsdns-49.org`, etc.). **Domain warning** from Vercel — nameservers don't match. This domain is the **migration template** — it's already on AWS but needs Vercel A record/CNAME configured properly.

---

## 4. Email Infrastructure

### 4.1 Active Email Domains

| Domain | Provider | MX Records | SPF | Notes |
|--------|----------|------------|-----|-------|
| **0xhoneyjar.xyz** | Google Workspace | `aspmx.l.google.com` + 4 alternates | `include:_mailcust.gandi.net include:_spf.google.com -all` | Primary email. DMARC has **placeholder**. |
| **setandforgetti.io** | Gandi | `spool.mail.gandi.net`, `fb.mail.gandi.net` | `include:_mailcust.gandi.net ?all` | Gandi default mail |
| **constructs.network** | Gandi | `spool.mail.gandi.net`, `fb.mail.gandi.net` | `include:_mailcust.gandi.net ?all` | Gandi default mail |

### 4.2 DMARC Bug (0xhoneyjar.xyz)

```
_dmarc.0xhoneyjar.xyz TXT "v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com; ruf=mailto:admin@yourdomain.com; fo=1"
```

**`admin@yourdomain.com` is a placeholder** — DMARC aggregate and forensic reports are going nowhere. This should be changed to a real mailbox (e.g., `dmarc@0xhoneyjar.xyz` or a DMARC monitoring service).

### 4.3 Additional TXT Records

| Domain | Type | Value | Purpose |
|--------|------|-------|---------|
| 0xhoneyjar.xyz | TXT | `google-site-verification=Le1FtsBR0ydAKuaq1OM7cNSDymc61AWDBpKsPlaKkpE` | Google Search Console |
| 0xhoneyjar.xyz | TXT | `1password-site-verification=UVX2GYFY6BEWBO4OIYWSJG2LKU` | 1Password |
| berabaddies.com | CNAME | `m5i3laeqj3oq → gv-j6zyjduim65xmf.dv.googlehosted.com` | Google domain verification |
| berabaddies.com | TXT | `google-site-verification=ojr7wi4kjSxgZJndcpN5SZjpWPu1kuB1_15Db4aWDxU` | Google verification |

---

## 5. Vercel Project Inventory (33 Projects)

### 5.1 Active Projects with Custom Domains

| Project | Production URL | Domain | Last Updated |
|---------|---------------|--------|-------------|
| midi-interface | midi.0xhoneyjar.xyz | 0xhoneyjar.xyz | 14m ago |
| faucet-interface | faucet-vert.vercel.app | 0xhoneyjar.xyz, cubquests.com | 26m ago |
| mcv-interface | mcv-interface.vercel.app | — | 3h ago |
| constructs-web | constructs-web-ebon.vercel.app | — | 9h ago |
| loa-constructs-explorer | loa-constructs-explorer.vercel.app | — | 9h ago |
| loa-constructs-explorer-5bfi | loa-constructs-explorer-5bfi.vercel.app | — | 9h ago |
| sf-interface | set-and-forgetti.vercel.app | 0xhoneyjar.xyz, setandforgetti.io | 12h ago |
| sf-docs | docs.setandforgetti.io | setandforgetti.io | 12h ago |
| apdao-auction-house | apiologydao.0xhoneyjar.xyz | 0xhoneyjar.xyz | 14h ago |
| hub-interface | hub.0xhoneyjar.xyz | 0xhoneyjar.xyz | 1d ago |
| thj-corporate | thj-corporate-*.vercel.app | — | 1d ago |
| mibera-interface | mibera.0xhoneyjar.xyz | 0xhoneyjar.xyz | 2d ago |
| rektdrop-interface | rektdrop-interface-*.vercel.app | — | 2d ago |
| henlo-landing | www.henlo.com | henlo.com | 3d ago |
| henlo-interface | henlo.0xhoneyjar.xyz | 0xhoneyjar.xyz, henlo.com | 3d ago |
| berafy-interface | www.beraflip.com | beraflip.com | 3d ago |
| score-dashboard | score-dashboard.vercel.app | — | 9d ago |
| sf-landing | *.vercel.app | setandforgetti.io | 31d ago |
| mibera-landing | mibera-landing.vercel.app | — | 44d ago |
| docs-site | docs.arrakis.community | arrakis.community | 52d ago |
| honey-os | *.vercel.app | — | 63d ago |
| hivemind-dashboard | *.vercel.app | — | 63d ago |
| honey-guard | honey-guard.vercel.app | — | 65d ago |
| beardrops-interface | beardrops.0xhoneyjar.xyz | 0xhoneyjar.xyz | 73d ago |
| moneycomb-interface | honeycomb.0xhoneyjar.xyz | 0xhoneyjar.xyz | 73d ago |
| community-interface | www.0xhoneyjar.xyz | 0xhoneyjar.xyz | 73d ago |
| fat-bera-interface | fatbera.0xhoneyjar.xyz | 0xhoneyjar.xyz | 76d ago |
| honey-interface | app.0xhoneyjar.xyz | 0xhoneyjar.xyz | 77d ago |
| partners-interface | partners.0xhoneyjar.xyz | 0xhoneyjar.xyz | 77d ago |
| cubquests-dashboard | dashboard.cubquests.com | cubquests.com | 83d ago |
| thj-docs | docs.0xhoneyjar.xyz | 0xhoneyjar.xyz | 94d ago |
| interpol-interface-old | old.notinterpol.com | notinterpol.com | 116d ago |
| interpol-landing | *.vercel.app | notinterpol.com | 116d ago |
| interpol-docs | docs.notinterpol.com | notinterpol.com | 116d ago |
| interpol-interface | app.notinterpol.com | notinterpol.com | 116d ago |
| explorer-interface | explorer-interface.vercel.app | 0xhoneyjar.xyz | 116d ago |
| beradrops-interface | beradrops-interface.vercel.app | 0xhoneyjar.xyz | 116d ago |
| bera-infinity-interface | bera8.xyz | bera8.xyz | 116d ago |
| bera8-interface | awards.bera8.xyz | bera8.xyz | 116d ago |
| crayons-monorepo-baseapp | *.vercel.app | — | 116d ago |
| crayons | *.vercel.app | — | 116d ago |
| berachain-splits | *.vercel.app | 0xhoneyjar.xyz | 116d ago |
| fat-bera-docs | fat-bera-docs.vercel.app | — | 116d ago |
| apdao-docs | apdao-docs.vercel.app | — | 116d ago |
| cubquests-creator-docs | *.vercel.app | cubquests.com | 116d ago |
| apdao-interface | apdao-interface.vercel.app | 0xhoneyjar.xyz | 116d ago |
| tomato-patch | tomato-patch.vercel.app | — | 51d ago |
| tomato-farm | tomato-farm-nu.vercel.app | — | 77d ago |
| tomato-chicago | tomato-chicago.vercel.app | — | 77d ago |
| guz | *.vercel.app | — | 116d ago |
| score-words | score-words-five.vercel.app | — | 84d ago |
| loa-registry | — | — | 50d ago |

### 5.2 Projects WITHOUT Custom Domains (Vercel-only URLs)

These projects use only `*.vercel.app` URLs and don't need DNS migration:

mcv-interface, constructs-web, loa-constructs-explorer, loa-constructs-explorer-5bfi, thj-corporate, rektdrop-interface, score-dashboard, mibera-landing, honey-os, hivemind-dashboard, honey-guard, crayons-monorepo-baseapp, crayons, fat-bera-docs, apdao-docs, tomato-patch, tomato-farm, tomato-chicago, guz, score-words, loa-registry, henlo-landing-old

---

## 6. Infrastructure Split

### 6.1 What Lives Where

| Service | Provider | How DNS Points There |
|---------|----------|---------------------|
| **All frontend apps** | Vercel | A/CNAME records at registrar → Vercel edge IPs/CNAMEs |
| **API (constructs.network)** | Railway | `api.constructs.network` CNAME → `z74r2ku7.up.railway.app` |
| **Database** | Supabase (PostgreSQL) | No public DNS — connection string only |
| **Cache** | Upstash (Redis) | No public DNS — connection string only |
| **Storage** | Cloudflare R2 | No public DNS — SDK access only |
| **Email (0xhoneyjar.xyz)** | Google Workspace | MX records at Gandi |
| **Email (other)** | Gandi default mail | MX records at Gandi |
| **Domain registration** | Gandi (primary), GoDaddy, others | Registrar-level |

### 6.2 DNS Record Types in Use

| Record Type | Count (est.) | Purpose |
|-------------|-------------|---------|
| A | ~15 | Apex domains → Vercel `76.76.21.21` |
| CNAME | ~40 | Subdomains → `cname.vercel-dns.com` or project-specific hashes |
| ALIAS | ~6 | Vercel-side apex ALIAS records |
| MX | ~3 domains | Email routing |
| TXT | ~8 | SPF, DMARC, site verifications |
| CAA | ~4 domains | Certificate authority authorization |
| Wildcard (*) | 2 | `*.0xhoneyjar.xyz`, `*.bera8.xyz` |

---

## 7. Migration Architecture: Vercel → AWS Route 53

### 7.1 What Changes

```
BEFORE:
  Registrar (Gandi/GoDaddy) → Registrar NS → Registrar DNS → Vercel IPs

AFTER:
  Registrar (Gandi/GoDaddy) → AWS Route 53 NS → Terraform-managed DNS → Vercel IPs
                                                                        → Railway IPs
                                                                        → Future agent sites
```

**Vercel deployment stays exactly the same.** Only the DNS authority layer moves. Vercel projects continue to serve traffic — they just get routed through Route 53 instead of Gandi/GoDaddy DNS. No Vercel features degrade: Edge Middleware, ISR, image optimization, and analytics all rely on the HTTP Host header, not the authoritative DNS provider.

### 7.2 Vercel + Route 53 DNS Pattern (Confirmed)

Route 53 does NOT support ALIAS records to external (non-AWS) targets. The correct pattern:

| Domain Type | Record Type | Target | Notes |
|-------------|-------------|--------|-------|
| **Apex** (`0xhoneyjar.xyz`) | A | `76.76.21.21` | Vercel's anycast IPv4. Standard A record, not ALIAS. |
| **Subdomains** (`hub.0xhoneyjar.xyz`) | CNAME | `cname.vercel-dns.com` | Universal target for ALL subdomains. Do NOT use project-specific hashes. |
| **API** (`api.constructs.network`) | CNAME | `z74r2ku7.up.railway.app` | Railway — not Vercel |
| **Wildcard** (`*.0xhoneyjar.xyz`) | CNAME | `cname.vercel-dns.com` | Vercel routes by Host header |

**Use `cname.vercel-dns.com` universally** — not the project-specific hashes (e.g., `7f8ff656ff66a8ca.vercel-dns-013.com`). The specific hashes work but are brittle if projects are rebuilt. The generic target routes by Host header.

### 7.3 Wildcard TLS: The _acme-challenge Delegation (Critical)

Vercel uses Let's Encrypt for automatic TLS. For standard subdomains, Vercel uses HTTP-01 challenges (no DNS involvement). But **wildcard certificates** (`*.0xhoneyjar.xyz`, `*.agents.0xhoneyjar.xyz`) require DNS-01 challenges. Since Vercel no longer controls the zone, it can't inject the required TXT record.

**Solution**: Delegate the `_acme-challenge` subdomain back to Vercel's nameservers via NS records in Route 53. This lets Vercel programmatically satisfy DNS-01 challenges for wildcard cert provisioning:

```hcl
# Wildcard TLS cert delegation — Vercel can manage _acme-challenge
resource "aws_route53_record" "acme_challenge_delegation" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = "_acme-challenge.0xhoneyjar.xyz"
  type    = "NS"
  ttl     = 300
  records = [
    "ns1.vercel-dns.com",
    "ns2.vercel-dns.com"
  ]
}

# Same pattern for the agents subdomain
resource "aws_route53_record" "acme_challenge_agents" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = "_acme-challenge.agents.0xhoneyjar.xyz"
  type    = "NS"
  ttl     = 300
  records = [
    "ns1.vercel-dns.com",
    "ns2.vercel-dns.com"
  ]
}
```

**This must be provisioned BEFORE the nameserver cutover for any domain using wildcard certificates.** Without it, wildcard cert renewal fails silently 60-90 days after migration.

### 7.4 Migration Priority Tiers

#### Tier 1: Critical (Migrate First)

| Domain | Why | Complexity |
|--------|-----|-----------|
| **0xhoneyjar.xyz** | Primary domain, 17+ subdomains, email, identity | HIGH — email MX, 20 subdomains, wildcards, SPF/DKIM/DMARC |
| **constructs.network** | Platform domain, API on Railway | MEDIUM — fewer records, but API CNAME critical |

#### Tier 2: Active Products

| Domain | Why | Complexity |
|--------|-----|-----------|
| **setandforgetti.io** | Active product, 3 subdomains, email | MEDIUM |
| **henlo.com** | Active product, GoDaddy registrar (different NS change process) | MEDIUM |
| **notinterpol.com** | Active product, 4 subdomains, GoDaddy | MEDIUM |
| **cubquests.com** | Active product, 3 subdomains | LOW |
| **beraflip.com** | Active product | LOW |
| **bera8.xyz** | Active product, **Vercel NS** (hardest to migrate) | HIGH |
| **arrakis.community** | Active product, **already on AWS** | LOW (just add Terraform) |

#### Tier 3: Supporting Domains

All other domains — parking pages, redirects, or unused. Migrate in bulk once Tier 1+2 proven.

### 7.5 Terraform Architecture: Scaled for 32 Domains

Managing 32 zones + 200+ records in a single Terraform state file causes plan/apply to take minutes (Route 53 API rate limit: 5 req/s for ChangeResourceRecordSets). The research confirms: **bifurcate state**.

#### State Architecture

```
infra-dns/
├── critical/                   # Dedicated state — fast plans, small blast radius
│   ├── 0xhoneyjar-xyz.tf      # Primary domain (email, 20+ subdomains)
│   ├── constructs-network.tf   # Platform domain (API CNAME)
│   └── backend.tf              # S3 backend, DynamoDB lock
│
├── products/                   # Second state — active product domains
│   ├── main.tf                 # for_each over domain map
│   ├── variables.tf            # Domain → record mappings
│   └── backend.tf
│
└── portfolio/                  # Third state — bulk secondary domains
    ├── main.tf                 # for_each flattening pattern
    ├── variables.tf
    └── backend.tf
```

#### Dynamic Record Management (for_each Flattening)

For the portfolio of 20+ secondary domains, use a single module with flattened iteration:

```hcl
variable "hosted_zones" {
  type = map(object({
    comment = string
    records = map(object({
      type    = string
      ttl     = number
      records = list(string)
    }))
  }))
}

locals {
  flattened_records = merge([
    for zone_name, zone_config in var.hosted_zones : {
      for record_name, record_config in zone_config.records :
      "${zone_name}_${record_name}_${record_config.type}" => {
        zone_name = zone_name
        name      = record_name
        type      = record_config.type
        ttl       = record_config.ttl
        records   = record_config.records
      }
    }
  ]...)
}

resource "aws_route53_zone" "zones" {
  for_each = var.hosted_zones
  name     = each.key
  comment  = each.value.comment
}

resource "aws_route53_record" "records" {
  for_each = local.flattened_records
  zone_id  = aws_route53_zone.zones[each.value.zone_name].zone_id
  name     = each.value.name
  type     = each.value.type
  ttl      = each.value.ttl
  records  = each.value.records
}
```

Import example:
```bash
terraform import 'aws_route53_record.records["0xhoneyjar.xyz_www_CNAME"]' Z4KAPRWWNC7JR_www_CNAME
```

#### Terraform HCL: 0xhoneyjar.xyz (Complete)

```hcl
resource "aws_route53_zone" "honeyjar" {
  name    = "0xhoneyjar.xyz"
  comment = "Primary THJ domain — managed by Terraform"
}

# --- Apex ---
resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = "0xhoneyjar.xyz"
  type    = "A"
  ttl     = 300
  records = ["76.76.21.21"]
}

# --- Wildcard catch-all → Vercel ---
resource "aws_route53_record" "wildcard" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = "*.0xhoneyjar.xyz"
  type    = "CNAME"
  ttl     = 300
  records = ["cname.vercel-dns.com"]
}

# --- Wildcard TLS: _acme-challenge delegation to Vercel ---
resource "aws_route53_record" "acme_challenge" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = "_acme-challenge.0xhoneyjar.xyz"
  type    = "NS"
  ttl     = 300
  records = ["ns1.vercel-dns.com", "ns2.vercel-dns.com"]
}

# --- Google Workspace Email ---
resource "aws_route53_record" "mx" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = "0xhoneyjar.xyz"
  type    = "MX"
  ttl     = 3600
  records = [
    "1 aspmx.l.google.com",
    "5 alt1.aspmx.l.google.com",
    "5 alt2.aspmx.l.google.com",
    "10 alt3.aspmx.l.google.com",
    "10 alt4.aspmx.l.google.com",
  ]
}

# --- SPF (PRUNED: remove Gandi include after confirming no forwarding) ---
resource "aws_route53_record" "txt" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = "0xhoneyjar.xyz"
  type    = "TXT"
  ttl     = 3600
  records = [
    "v=spf1 include:_spf.google.com ~all",
    "google-site-verification=Le1FtsBR0ydAKuaq1OM7cNSDymc61AWDBpKsPlaKkpE",
    "1password-site-verification=UVX2GYFY6BEWBO4OIYWSJG2LKU",
  ]
}

# --- DKIM (retrieve actual key from Google Admin Console) ---
resource "aws_route53_record" "dkim" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = "google._domainkey.0xhoneyjar.xyz"
  type    = "TXT"
  ttl     = 3600
  # 2048-bit DKIM keys exceed Route 53's 255-char string limit.
  # Split into multiple quoted segments within the same array element.
  records = [
    "v=DKIM1; k=rsa; p=<FIRST_255_CHARS>\" \"<REMAINING_CHARS>"
  ]
  # ACTION: Get actual key from Google Admin Console → Apps → Gmail → Authenticate Email
}

# --- DMARC (FIXED: real email, quarantine during migration) ---
resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = "_dmarc.0xhoneyjar.xyz"
  type    = "TXT"
  ttl     = 3600
  records = ["v=DMARC1; p=quarantine; rua=mailto:dmarc@0xhoneyjar.xyz; ruf=mailto:dmarc@0xhoneyjar.xyz; fo=1"]
  # Post-migration: once forensic reports confirm clean delivery, elevate to p=reject
}

# --- CAA ---
resource "aws_route53_record" "caa" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = "0xhoneyjar.xyz"
  type    = "CAA"
  ttl     = 3600
  records = [
    "0 issue \"letsencrypt.org\"",
    "0 issue \"pki.goog\"",
    "0 issue \"sectigo.com\"",
  ]
}

# --- constructs.network ---
resource "aws_route53_zone" "constructs" {
  name    = "constructs.network"
  comment = "Constructs marketplace — managed by Terraform"
}

resource "aws_route53_record" "constructs_apex" {
  zone_id = aws_route53_zone.constructs.zone_id
  name    = "constructs.network"
  type    = "A"
  ttl     = 300
  records = ["76.76.21.21"]
}

resource "aws_route53_record" "constructs_api" {
  zone_id = aws_route53_zone.constructs.zone_id
  name    = "api.constructs.network"
  type    = "CNAME"
  ttl     = 300
  records = ["z74r2ku7.up.railway.app"]
}
```

### 7.6 Vercel Terraform Provider: Unified Workflow

The Vercel Terraform Provider (`vercel/vercel ~> 2.0`) supports domain assignment via `vercel_project_domain`. This enables a **single `terraform apply`** that provisions both the Route 53 DNS record AND the Vercel project domain binding atomically:

```hcl
terraform {
  required_providers {
    aws    = { source = "hashicorp/aws",  version = "~> 5.0" }
    vercel = { source = "vercel/vercel",  version = "~> 2.0" }
  }
}

# Add a new subdomain — both DNS and Vercel in one apply
resource "vercel_project_domain" "new_product" {
  project_id = "prj_xxxxxxxxxxxx"
  domain     = "newproduct.0xhoneyjar.xyz"
}

resource "aws_route53_record" "new_product" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = vercel_project_domain.new_product.domain
  type    = "CNAME"
  ttl     = 300
  records = ["cname.vercel-dns.com"]
}
```

**Rate limit warning**: Vercel API limits domain additions to ~100/hour per team. This workflow is for structural domains only — NOT for the 100K+ agent provisioning (see Section 8).

### 7.7 Adapters: Vercel ↔ AWS Coexistence

For the team to **continue provisioning subdomains easily** after migration:

**Structural domains** (team products, marketing campaigns): Use the unified Terraform workflow above. Add to Route 53 + Vercel in one `terraform apply`.

**Existing wildcard**: Keep `*.0xhoneyjar.xyz → cname.vercel-dns.com` as a catch-all. Any new Vercel project added in the dashboard immediately works if assigned a `*.0xhoneyjar.xyz` subdomain — no DNS change needed. Terraform tracks the wildcard record; Vercel routes by Host header.

**Agent economy**: Delegated subdomain zone with wildcard + Edge Middleware (Section 8).

---

## 8. Agent Economy: 100K+ Subdomain Architecture (Definitive)

> *Research confirmed: individual DNS records per agent is an anti-pattern at this scale.*

### 8.1 Why NOT Individual DNS Records

| Constraint | Impact |
|-----------|--------|
| Route 53 default limit: 10K records/zone | Requires support ticket to increase |
| Route 53 API: 5 req/s for ChangeResourceRecordSets | 100K records = 5.5+ hours to provision sequentially |
| Route 53 pricing: $0.0015/record/month beyond 10K | 100K records = ~$135/month in storage alone |
| Terraform state: 100K resource blocks | Plan/apply takes hours, API rate-limits cascade |

### 8.2 The Architecture: Wildcard + Edge Middleware

**One DNS record. Zero propagation delay. Infinite scale.**

```
Route 53 (Terraform managed):
  *.agents.0xhoneyjar.xyz  CNAME  cname.vercel-dns.com    ← single record
  _acme-challenge.agents   NS     ns1.vercel-dns.com      ← wildcard TLS

Vercel Edge (application layer):
  middleware.ts intercepts requests by Host header
  agent-77.agents.0xhoneyjar.xyz → /agents/agent-77/
  agent-9999.agents.0xhoneyjar.xyz → /agents/agent-9999/
```

When a new dNFT agent is minted, the backend inserts a row in the database. The agent's website is **instantly available** — no DNS provisioning, no Terraform apply, no propagation delay.

### 8.3 Terraform: Agent Subdomain Zone

```hcl
# Wildcard DNS — routes entire agents namespace to Vercel
resource "aws_route53_record" "agents_wildcard" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = "*.agents.0xhoneyjar.xyz"
  type    = "CNAME"
  ttl     = 300
  records = ["cname.vercel-dns.com"]
}

# Wildcard TLS delegation
resource "aws_route53_record" "agents_acme" {
  zone_id = aws_route53_zone.honeyjar.zone_id
  name    = "_acme-challenge.agents.0xhoneyjar.xyz"
  type    = "NS"
  ttl     = 300
  records = ["ns1.vercel-dns.com", "ns2.vercel-dns.com"]
}
```

### 8.4 Edge Middleware: Application-Layer Routing

```typescript
// middleware.ts — executing on Vercel Edge Network
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get('host');

  // Route agent subdomains to dynamic pages
  if (hostname?.endsWith('.agents.0xhoneyjar.xyz')) {
    const agentId = hostname.split('.')[0];
    url.pathname = `/agents/${agentId}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
```

### 8.5 Vercel Limits for Multi-Tenant Scale

| Plan | Custom Domain Limit | Notes |
|------|-------------------|-------|
| Pro | 100,000 | Soft limit |
| Enterprise | 1,000,000 | Negotiable |

With the wildcard pattern, individual domains don't need to be registered in Vercel — the wildcard cert covers `*.agents.0xhoneyjar.xyz` and Edge Middleware handles routing entirely in application code.

---

## 9. Migration Runbook (Phased Timeline)

### T-48 Hours: Prepare (Lower TTLs)

Log into Gandi and GoDaddy control panels. Lower the TTL of ALL existing A, CNAME, MX, and TXT records to **60-300 seconds** (currently many are at default 10800s/3h or higher). This ensures global recursive resolvers drop their caches before the cutover.

```bash
# Verify TTL is lowered by querying the live record
dig 0xhoneyjar.xyz A +noall +answer
# Should show TTL value of 60-300 after propagation
```

**Wait a full 48 hours** to guarantee all global resolvers have seen the lower TTL at least once.

### T-24 Hours: Duplicate and Validate

Provision exact duplicate zones in AWS Route 53 using Terraform. For initial population, consider [OctoDNS](https://github.com/octodns/octodns) (by GitHub) to auto-extract from Gandi and push to Route 53.

Validate every record by querying the NEW Route 53 nameservers directly:

```bash
# Get the assigned AWS nameservers
aws route53 get-hosted-zone --id Z1234567890ABCDEF --query 'DelegationSet.NameServers'

# Query Route 53 directly (NOT the live internet)
dig A 0xhoneyjar.xyz @ns-123.awsdns-xx.com +short
# Expected: 76.76.21.21

dig MX 0xhoneyjar.xyz @ns-123.awsdns-xx.com +short
# Expected: 1 ASPMX.L.GOOGLE.COM. etc.

dig TXT 0xhoneyjar.xyz @ns-123.awsdns-xx.com +short
# Expected: SPF, verification records

dig CNAME hub.0xhoneyjar.xyz @ns-123.awsdns-xx.com +short
# Expected: cname.vercel-dns.com
```

**Test email**: Send a test email to/from 0xhoneyjar.xyz addresses and confirm delivery before proceeding.

### T-0: The Cutover

Update nameservers at each registrar to point to the 4 AWS Route 53 nameservers.

| Registrar | UI Path | Current NS | New NS |
|-----------|---------|-----------|--------|
| **Gandi** | Domain → Nameservers → External | `ns-*-{a,b,c}.gandi.net` | 4x `ns-*.awsdns-*.{com,net,org,co.uk}` |
| **GoDaddy** | Domain Settings → Nameservers → Custom | `ns{37,38}.domaincontrol.com` | Same 4x AWS NS |
| **Vercel** (bera8.xyz) | Vercel Dashboard → Domains → bera8.xyz | `ns{1,2}.vercel-dns.com` | Same 4x AWS NS |

**Do bera8.xyz LAST** — it's the only domain where Vercel currently owns all DNS records. Ensure `_acme-challenge` NS delegation is in Route 53 BEFORE this cutover.

### T+0 to T+48 Hours: Monitor

- Monitor propagation globally via [DNSChecker.org](https://dnschecker.org) or [WhatsMyDNS.net](https://whatsmydns.net)
- No downtime expected — both old and new NS return identical records during split-brain window
- Monitor email delivery (send test emails hourly)
- Monitor Vercel TLS cert status in dashboard
- Watch for CAA-related cert failures in Vercel project logs

### T+48 Hours: Decommission and Harden

1. Confirm 100% of global queries resolve against Route 53
2. Raise Route 53 TTLs to production values (3600s for records that rarely change, 300s for dynamic ones)
3. Import all Route 53 resources into Terraform state
4. Run `terraform plan` — must show **zero diff**
5. Set up nightly `terraform plan` in GitHub Actions — alert on drift (exit code 2)
6. Legacy Gandi/GoDaddy zones can be decommissioned (but keep registrar accounts — they still hold domain registration)

---

## 10. Google Workspace Email: Complete Migration Checklist

> *Email is the highest-risk component. Get this wrong and business communication stops.*

### 10.1 Required DNS Records in Route 53

| Record | Name | Type | Value | TTL |
|--------|------|------|-------|-----|
| MX 1 | `@` | MX | `1 aspmx.l.google.com` | 3600 |
| MX 2 | `@` | MX | `5 alt1.aspmx.l.google.com` | 3600 |
| MX 3 | `@` | MX | `5 alt2.aspmx.l.google.com` | 3600 |
| MX 4 | `@` | MX | `10 alt3.aspmx.l.google.com` | 3600 |
| MX 5 | `@` | MX | `10 alt4.aspmx.l.google.com` | 3600 |
| SPF | `@` | TXT | `v=spf1 include:_spf.google.com ~all` | 3600 |
| DKIM | `google._domainkey` | TXT | `v=DKIM1; k=rsa; p=<KEY>` | 3600 |
| DMARC | `_dmarc` | TXT | `v=DMARC1; p=quarantine; rua=mailto:dmarc@0xhoneyjar.xyz` | 3600 |
| Google verification | `@` | TXT | `google-site-verification=Le1FtsBR0ydAKuaq1OM7cNSDymc61AWDBpKsPlaKkpE` | 3600 |
| 1Password verification | `@` | TXT | `1password-site-verification=UVX2GYFY6BEWBO4OIYWSJG2LKU` | 3600 |

### 10.2 DKIM Key Retrieval

The DKIM private key lives inside Google — the public key is published in DNS. It does NOT need to be "migrated from Gandi." The source of truth is:

**Google Admin Console → Apps → Google Workspace → Gmail → Authenticate Email → DKIM**

1. Select `0xhoneyjar.xyz` domain
2. If no key exists, generate a 2048-bit key
3. Copy the TXT record value
4. For Route 53: split the key string at 255-char boundaries (AWS TXT record limit)

### 10.3 SPF Pruning

**Current**: `v=spf1 include:_mailcust.gandi.net include:_spf.google.com -all`

**After migration**: Remove `include:_mailcust.gandi.net` if Gandi is no longer acting as a mail forwarder. Retaining a decommissioned mail handler in SPF is a security risk — a compromised Gandi infrastructure could send authenticated spoofed mail.

**Migration strategy**: Keep Gandi include during the first 2 weeks post-cutover. Monitor DMARC forensic reports. Once confirmed no legitimate mail routes through Gandi, prune to `v=spf1 include:_spf.google.com ~all` (use `~all` softfail during transition, then tighten to `-all`).

### 10.4 DMARC Ramp

| Phase | Policy | When |
|-------|--------|------|
| Migration | `p=quarantine` | Day 0 — failing mail goes to spam, not rejected |
| Stabilization | `p=quarantine` with real `rua` email | Week 2 — collect and review reports |
| Production | `p=reject` | Week 4+ — once reports confirm clean delivery |

---

## 11. Security Considerations

### 11.1 DNSSEC

AWS Route 53 fully supports DNSSEC signing. Because Route 53 is the authoritative provider (not Vercel), the Vercel DNSSEC limitation is bypassed — AWS signs the records before traffic reaches Vercel.

```hcl
resource "aws_kms_key" "dnssec" {
  customer_master_key_spec = "ECC_NIST_P256"
  key_usage                = "SIGN_VERIFY"
  deletion_window_in_days  = 7
}

resource "aws_route53_key_signing_key" "ksk" {
  hosted_zone_id             = aws_route53_zone.honeyjar.id
  key_management_service_arn = aws_kms_key.dnssec.arn
  name                       = "honeyjar-ksk"
}

resource "aws_route53_hosted_zone_dnssec" "enable" {
  depends_on     = [aws_route53_key_signing_key.ksk]
  hosted_zone_id = aws_route53_key_signing_key.ksk.hosted_zone_id
}
```

After enabling, upload the DS (Delegation Signer) record to the registrar (Gandi) to complete the chain of trust.

### 11.2 Subdomain Takeover Prevention

**Risk**: If a Vercel project is deleted but the Route 53 CNAME record remains, the subdomain becomes a "dangling CNAME." An attacker could claim it on their own Vercel account.

**Mitigation**: The unified Terraform workflow (Section 7.6) binds `aws_route53_record` and `vercel_project_domain` together. Destroying the Vercel project destroys the DNS record atomically. For domains not managed via Terraform, run periodic audits:

```bash
# Check all CNAMEs — any pointing to Vercel with no project = takeover risk
for sub in $(dig axfr 0xhoneyjar.xyz @ns-123.awsdns-xx.com | grep CNAME | awk '{print $1}'); do
  echo "Checking $sub..."
  curl -sI "https://$sub" | head -5
done
```

### 11.3 Certificate Transparency Monitoring

During migration, monitor CT logs for unexpected certificate issuances:
- [crt.sh](https://crt.sh/?q=%.0xhoneyjar.xyz) — search for `%.0xhoneyjar.xyz`
- Set up alerts for new cert issuances during the migration window

### 11.4 Drift Detection (Post-Migration)

Implement a GitHub Actions workflow that runs nightly `terraform plan` and alerts on drift:

```yaml
# .github/workflows/dns-drift-check.yml
name: DNS Drift Detection
on:
  schedule:
    - cron: '0 6 * * *'  # Daily 6 AM UTC
jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
      - run: |
          terraform plan -detailed-exitcode -no-color 2>&1 | tee plan.out
          EXIT_CODE=$?
          if [ $EXIT_CODE -eq 2 ]; then
            # Drift detected — alert
            echo "DNS DRIFT DETECTED" >> $GITHUB_STEP_SUMMARY
            cat plan.out >> $GITHUB_STEP_SUMMARY
          fi
```

---

## 12. Findings Summary

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | DMARC placeholder email (`admin@yourdomain.com`) | **CRITICAL** | Fix immediately — DMARC reports going nowhere |
| 2 | `_acme-challenge` NS delegation required for wildcard TLS | **CRITICAL** | Must be in Route 53 before any NS cutover |
| 3 | `constructs.network` has no Vercel project linked | **HIGH** | Link `loa-constructs-explorer` to the domain in Vercel |
| 4 | No DKIM record found for 0xhoneyjar.xyz | **HIGH** | Check Google Admin Console — generate if missing |
| 5 | SPF includes decommissioned Gandi mail handler | **HIGH** | Prune `_mailcust.gandi.net` post-migration (security risk) |
| 6 | `apiologydao.0xhoneyjar.xyz` dual-assigned to 2 projects | **MEDIUM** | Clarify ownership before migration |
| 7 | `henlo.com` resolves to AWS Global Accelerator, not Vercel | **MEDIUM** | Investigate — may be intentional CDN |
| 8 | `arrakis.community` already on AWS Route 53 but misconfigured | **MEDIUM** | Complete the Vercel integration or use as migration template |
| 9 | Project-specific CNAME hashes used instead of `cname.vercel-dns.com` | **MEDIUM** | Normalize to generic target during migration |
| 10 | `bera8.xyz` on Vercel nameservers — hardest migration target | **LOW** | Plan separately, migrate last |
| 11 | Multiple domains show Vercel "not properly configured" warnings | **LOW** | Resolve during migration |
| 12 | ~10 domains appear completely unused (no projects, no DNS) | **LOW** | Audit and consider consolidation |

---

## 13. Immediate Pre-Migration Actions (Before jani Plans)

These can be done NOW, independent of the migration:

- [ ] **Fix DMARC** — change `admin@yourdomain.com` to `dmarc@0xhoneyjar.xyz` in Gandi DNS
- [ ] **Retrieve DKIM key** — Google Admin Console → Apps → Gmail → Authenticate Email → generate/copy key for `0xhoneyjar.xyz`
- [ ] **Link constructs.network** — add `constructs.network` as a domain in the `loa-constructs-explorer` Vercel project
- [ ] **Resolve apiologydao conflict** — decide: `apdao-auction-house` or `apdao-interface`?
- [ ] **Audit unused domains** — flag which of the ~10 dormant domains should be consolidated or dropped
- [ ] **Lower TTLs at Gandi** — start dropping TTLs to 300s on all 0xhoneyjar.xyz records (costs nothing, enables faster cutover later)

---

*"The person who maps every cable before the migration is the person who doesn't drop packets at 3 AM."*
