---
name: Hardening
slug: hardening
version: "0.2.0"
category: security
type: untyped
schema_version: 3
skills: 11
commands: 0
tags:
  - construct
  - category/security
---

# Hardening

> The one that finds the holes before someone else does. Full-stack security across auth flows, data privacy, env secrets, and API surfaces. Pre-share audits prevent the breach. Post-incident defense contains the blast. 21-scan convergence — nothing slips through.

**Version**: 0.2.0 · **Category**: security · **Skills**: 11

## Install

```bash
loa install hardening
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/postmortem` | Create a structured PMR from an incident |
| `/triage` | Quick severity assessment connecting user reports to code |
| `/blast-radius` | Map impact surface of a change or regression |
| `/harden` | Generate defensive measures from a postmortem |
| `/regression-check` | Verify past hardening measures still hold |
| `/signal-audit` | Audit monitoring, test, and type coverage |
| `/audit-api` | Map and audit API attack surface |
| `/audit-data-privacy` | Check data privacy compliance |
| `/audit-env` | Scan for exposed environment secrets |
| `/audit-auth` | Audit authentication and authorization flows |
| `/correlating` | Correlate signals across incident data (inner process) |

## Relationships

### Depends On

- [Beehive](/constructs/observer) — user observation surfaces where security matters most

### Composes With

- [Beehive](/constructs/observer)

### Composition Paths

**Reads from:**
- `grimoires/laboratory/` (canvases inform security audit scope)

**Writes to:**
- `grimoires/hardening/` (audit reports, scan results)

## Operator Mode

Hardening maps to **ARCH mode** (persona: OSTROM). [See Operator Modes &rarr;](/network/operator)

## Verification Archetype

**Security construct** — findings should be real vulnerabilities. Verification checks true positive rate. [Verification guide &rarr;](/verification/verification-guide#_5-security-constructs-findings-are-real-vulnerabilities)

## Source

- **Repo**: `0xHoneyJar/construct-hardening`
- **Cache**: `.cache/construct-repos/construct-hardening/`
- **Grimoire**: `grimoires/hardening/`

---

[All Constructs](/constructs/) · [Topology](/architecture/topology) · [Network Health](/network/health)
