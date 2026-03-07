# construct-base Template Review — Ecosystem-Wide Structural Gaps

> Reviewer: Bridgebuilder + Gecko
> Date: 2026-03-07
> Scope: construct-base template, Social Oracle harness, K-Hole invocation diagnosis
> PR context: 0xHoneyJar/construct-social-oracle#2

---

## Summary

The construct-base template is structurally incomplete. It teaches construct authors to build manifests, skills, and identity files that pass CI validation — but omits three runtime conventions that the Loa framework actually depends on for reliable dispatch. Every construct built from the template inherits these gaps. The K-Hole invocation inconsistency is a symptom, not the disease.

---

## Findings

### [CRITICAL-1] Command files missing routing frontmatter

**Severity**: critical
**Category**: quality
**File**: `construct-base/commands/example-command.md`

The template's command file is prose-only — no YAML frontmatter. But the Loa runtime dispatches commands via frontmatter fields:

```yaml
---
agent: "skill-name"
agent_path: "skills/skill-name"
context_files:
  - path: "CLAUDE.md"
    required: true
---
```

Without `agent`/`agent_path`, the runtime has no machine-parseable binding from `/command` → `skills/*/SKILL.md`. It must infer the connection from prose, which works sometimes and fails sometimes. This is almost certainly the root cause of K-Hole's inconsistent `/dig` invocation.

**Evidence**: Every working Loa command (`analyze-market.md`, `plan-launch.md`, `implement.md`) has this frontmatter. Every construct-base-derived command (`dig.md`, `forge.md`, `generate.md`) does not.

**Google's gRPC team faced this exact problem**: machine-readable service descriptors vs. prose-documented endpoints. The moment you rely on human reading to discover the binding, you've introduced non-determinism.

**Fix**: Update `commands/example-command.md` to include the full frontmatter pattern with `agent`, `agent_path`, `arguments`, and `context_files`.

---

### [CRITICAL-2] No `context_files` means identity doesn't auto-load

**Severity**: critical
**Category**: quality
**File**: `construct-base/commands/example-command.md`

When a command fires, the `context_files` frontmatter array tells the runtime which files to inject into context. Without it, the construct's `CLAUDE.md`, identity narrative, and domain context don't load. The agent executes the SKILL.md mechanically without embodying the construct's persona.

**Metaphor**: It's like a session musician sight-reading sheet music perfectly but never hearing the album the song belongs to. Technically correct, musically empty.

This explains why some constructs feel "flat" on invocation — the skill workflow runs but the identity doesn't activate. K-Hole's resonance protocol, for instance, lives in `persona.yaml` under `resonanceProtocol` — but nothing in the dispatch chain tells the agent to read it before executing `/dig`.

**Fix**: Add `context_files` to the command template with standard entries: `CLAUDE.md` (required), identity narrative (optional), domain context (optional).

---

### [HIGH-1] Skill index.yaml missing `triggers` field

**Severity**: high
**Category**: quality
**File**: `construct-base/skills/example-full/index.yaml`

Working Loa skills have `triggers` — natural language patterns for proactive discovery:

```yaml
triggers:
  - "/analyze-market"
  - "market research"
  - "competitive analysis"
```

The template omits this field entirely. Without it, constructs are invisible to natural language routing. A user who says "I need to research this market" won't get routed to `analyzing-market` unless they know the exact slash command.

**Fix**: Add `triggers` to both `example-full/index.yaml` and `example-simple/index.yaml` with examples showing the pattern.

---

### [HIGH-2] K-Hole construct.yaml missing `commands` declaration

**Severity**: high
**Category**: quality
**File**: `construct-k-hole/construct.yaml`

K-Hole's `construct.yaml` declares 5 skills but zero commands. The `commands/` directory exists with `dig.md`, `forge.md`, `discover.md`, `config.md`, `research.md` — but they're not declared in the manifest. The install script uses the `commands` array to create symlinks. No declaration = no symlinks = no slash commands registered.

**Fix**: Add `commands` array to K-Hole's `construct.yaml`:
```yaml
commands:
  - name: dig
    path: commands/dig.md
  - name: forge
    path: commands/forge.md
  - name: discover
    path: commands/discover.md
  - name: config
    path: commands/config.md
  - name: research
    path: commands/research.md
```

And add routing frontmatter to each command file.

---

### [HIGH-3] `description` field in index.yaml should follow the Loa convention

**Severity**: high
**Category**: quality
**File**: `construct-base/skills/example-full/index.yaml`

Working Loa skills use the description field as a routing instruction:

```yaml
description: |
  Use this skill IF user invokes `/analyze-market` OR needs market research,
  competitive analysis, TAM/SAM/SOM sizing, or ICP development.

  Produces research artifacts to `gtm-grimoire/research/`:
  - market-landscape.md
  - competitive-analysis.md
```

The template shows a one-liner. The "Use this skill IF..." pattern is how the runtime makes routing decisions when multiple skills could match. Without it, multi-skill constructs have ambiguous routing.

**Fix**: Update the template's `description` to show the `Use this skill IF...` pattern with conditional triggers and output artifacts.

---

### [MEDIUM-1] Identity narrative has no runtime integration point

**Severity**: medium
**Category**: quality
**File**: `construct-base/` (structural gap)

The L2 validation checks that an identity narrative exists (`identity/*.md`), but nothing in the runtime references it. It's validated but never used. The Artisan has `identity/ALEXANDER.md`, K-Hole's persona has deep resonance protocol fields — but the dispatch chain doesn't load these unless manually specified in `context_files`.

The template should demonstrate how the identity narrative connects to the runtime: via `context_files` in command frontmatter.

---

### [MEDIUM-2] construct-base doesn't model the grimoire pattern

**Severity**: medium
**Category**: quality
**File**: `construct-base/` (structural gap)

Several real constructs use grimoire directories for domain knowledge:
- Social Oracle: `grimoires/shared/`, `grimoires/<project>/`
- Observer: `contexts/base/`, `contexts/overlays/`
- Herald: `contexts/base/`
- Beacon: `contexts/overlays/`

The template has no example of this pattern. Construct authors discover it by reading other constructs or never discover it at all. A `contexts/` or `grimoires/` template directory with a README explaining the pattern would help.

---

### [MEDIUM-3] SKILL.md frontmatter inconsistency across constructs

**Severity**: medium
**Category**: quality

SKILL.md frontmatter varies across constructs:
- construct-base template: `name`, `description`, `user-invocable`, `allowed-tools`
- K-Hole: same pattern
- Loa native skills: `parallel_threshold`, `timeout_minutes`, `zones` (completely different)

The native Loa skills use an operational frontmatter format (zones, timeouts, guardrails). The construct template uses a declarative format. Both work because Claude reads them as context — but the inconsistency means construct authors don't know which convention to follow, and runtime features like zone-scoped permissions only apply to the native format.

**Recommendation**: Document both formats in CONTRIBUTING.md. The declarative format is simpler and sufficient for most constructs. The operational format is for constructs that need guardrails or zone restrictions.

---

## Positive Callouts

### The grimoire architecture in Social Oracle is genuinely good

Shared rules + project overrides + platform skill layers is a clean separation. The 3-layer filter (rules → heuristics → aggregation) is smart engineering — progressive cost filtering that avoids paying for AI evaluation on noise. This is the same pattern Netflix uses for recommendation pre-filtering.

### K-Hole's resonance protocol is novel

`resonanceProtocol` in persona.yaml — treating a user config file as an "epistemological fingerprint" rather than a relevance filter — is a design decision that deserves recognition. No other construct treats the user's identity as input to cognition. This is what Gecko means by "the first artifact that represents the user, not the project."

### The CLAUDE.md-as-identity pattern works well when loaded

Observer's and Artisan's CLAUDE.md files follow a consistent structure: Who I Am → What I Know → Available Skills → Workflow → Boundaries. When these actually get loaded into context (via `context_files`), the agent's behavior is noticeably more consistent. The pattern is right — the injection mechanism is what's missing.

---

## Network-Wide Audit Results

Audit script: `scripts/audit-construct-routing.sh`

| Construct | Commands (manifest/disk) | Frontmatter | Triggers | Status |
|-----------|--------------------------|-------------|----------|--------|
| GTM Collective | 14/14 | Yes | Yes | Clean |
| Observer | 0/0 | N/A | Yes | Clean (skill-only) |
| Artisan | 0/0 | N/A | Yes | Clean (skill-only) |
| Crucible | 0/0 | N/A | Yes | Clean (skill-only) |
| Beacon | 0/0 | N/A | Yes | Clean (skill-only) |
| Herald | 0/0 | N/A | Yes | Clean (skill-only) |
| Hardening | 0/0 | N/A | Yes | Clean (skill-only) |
| WebGL Particles | 0/0 | N/A | Yes | Clean (skill-only) |
| **Protocol** | 2/2 | No→Yes | Yes | **Fixed** (PR #3) |
| **Dynamic Auth** | 2/2 | No→Yes | No→Yes | **Fixed** (PR #3) |
| **The Easel** | 0/0 | N/A | No→Yes | **Fixed** (PR #1) |
| **K-Hole** | 0→5/5 | No→Yes | No→Yes | **Fixed** (PR #5) |
| **Social Oracle** | 3/3 | Yes | Yes | **Built correct** (PR #2) |

All 13 constructs in the network now pass the routing audit. 8 were already clean (skill-only with triggers), 5 were fixed via PRs.

---

## PRs Shipped

| Repo | PR | What |
|------|-----|------|
| `construct-base` | [#4](https://github.com/0xHoneyJar/construct-base/pull/4) | Template fix — routing frontmatter, triggers, context_files, CONTRIBUTING.md |
| `construct-k-hole` | [#5](https://github.com/0xHoneyJar/construct-k-hole/pull/5) | Commands declaration + routing frontmatter + triggers |
| `construct-social-oracle` | [#2](https://github.com/0xHoneyJar/construct-social-oracle/pull/2) | New construct with correct conventions |
| `construct-protocol` | [#3](https://github.com/0xHoneyJar/construct-protocol/pull/3) | Routing frontmatter on commands |
| `construct-dynamic-auth` | [#3](https://github.com/0xHoneyJar/construct-dynamic-auth/pull/3) | Routing frontmatter + triggers |
| `construct-the-easel` | [#1](https://github.com/0xHoneyJar/construct-the-easel/pull/1) | Triggers on all skills |

---

## Remaining Recommendations

1. **Add a `contexts/` or `grimoires/` pattern to the template** — not required, but a README explaining when and how to use domain context directories.

2. **Document the two SKILL.md frontmatter formats** — declarative (construct-base) vs operational (native Loa) — so construct authors know which to use and when.
