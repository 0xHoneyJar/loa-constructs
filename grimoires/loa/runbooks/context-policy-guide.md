# Context Policy Operator Guide

**Sprint 6, S6-T7** — Operator-facing documentation for `context_policy` fields,
isolation tier choice, and prerequisite check. SDD §3.1, §2.1, FR-1.2, FR-4.

---

## Overview

Every stage in a composition declares a `context_policy` block that governs:
- What context the stage subprocess can read or write
- Which environment variables are visible
- Whether network egress is permitted and to which hosts
- Which LLM session strategy applies
- Which MCP tools are available
- What isolation tier enforces these constraints

The policy is embedded in the invocation envelope at build time and is immutable
for the duration of that stage. Changing a composition's `context_policy` changes
its `composition_id`.

---

## context_policy Fields Reference

### Transcript / Context Leakage Controls

| Field | Type | Default | Description |
|---|---|---|---|
| `include_prior_transcript` | bool | `false` | Include operator's prior conversation turns. **Advisory limit**: only controls the envelope declaration; strict tier enforces at subprocess level. |
| `include_unread_stage_outputs` | bool | `false` | Allow stage to read outputs from prior stages NOT listed in `reads:`. |
| `include_unlisted_grimoires` | bool | `false` | Allow stage to read any grimoire file, not just those in `allowed_read_paths`. |

All three default to `false`. Set to `true` only when the stage genuinely needs
ambient context — be explicit about the tradeoff.

### Filesystem Controls

| Field | Type | Description |
|---|---|---|
| `allowed_read_paths` | `string[]` | Glob patterns the stage subprocess may read. Evaluated via `realpath` to close symlink traversal (SDD §4.3, Flatline HIGH-3). |
| `allowed_write_paths` | `string[]` | Glob patterns the stage subprocess may write. Paths outside this list produce `[POLICY-VIOLATION-WRITE]` on strict tier; logged-only on advisory. |

**Template variables**: use `{{run_id}}` and `{{target_artifact}}` for paths that
vary per run. The envelope builder substitutes these at invocation time.

**Example**:
```yaml
allowed_read_paths:
  - ".claude/constructs/packs/artisan/skills/decomposing-feel/**"
  - "grimoires/loa/runs/{{run_id}}/input/**"
  - "{{target_artifact}}"
allowed_write_paths:
  - ".run/compose/{{run_id}}/stage-1/output/**"
```

### Environment Variable Controls

| Field | Type | Description |
|---|---|---|
| `allowed_env_vars` | `string[]` | Explicit allowlist. Subprocess invoked with `env -i` + these variables only. |

Minimum safe allowlist for most stages:
```yaml
allowed_env_vars:
  - PATH
  - HOME
  - LANG
  - LC_ALL
```

Add provider-specific variables (e.g. `ANTHROPIC_API_KEY`) only when the stage
invokes a model directly rather than via cheval.

### Network Controls

| Field | Type | Default | Description |
|---|---|---|---|
| `allow_network` | bool | `false` | Permit outbound network connections from the stage subprocess. |
| `allowed_egress` | `{host, port}[]` | `[]` | Host:port pairs permitted when `allow_network: true`. |
| `network_namespace` | bool | `false` | Linux-only opt-in for kernel-boundary network isolation. Requires `CAP_NET_ADMIN`. |

**Default is deny-all.** When `allow_network: false`, the egress proxy blocks
all connections. When `allow_network: true` and `allowed_egress` is populated,
only listed host:port pairs are reachable via HTTP_PROXY.

**Advisory-tier scope**: The HTTP_PROXY mechanism only covers HTTP_PROXY-aware
code paths. It does NOT cover raw sockets, DNS-over-UDP, SSH, git CLI, or
TLS-pinned clients. Declare `network_namespace: true` on Linux with
`CAP_NET_ADMIN` for kernel-boundary enforcement.

```yaml
allow_network: true
allowed_egress:
  - host: api.anthropic.com
    port: 443
  - host: api.openai.com
    port: 443
```

### LLM Session Controls

| Field | Type | Default | Description |
|---|---|---|---|
| `llm_session_strategy` | `fresh\|continue` | `fresh` | `fresh` starts a new session ID per stage; `continue` reuses the prior stage's session. Use `continue` only when intentional cross-stage context is desired. |

Cheval passes `--session-id "stage-{run_id}-{stage_id}"` when strategy is `fresh`.
Provider memory disable flags (`--memory-disabled`, `--no-chatgpt-memory`,
`--no-saved-info`) are applied when `llm_session_strategy: fresh`. See SDD §4.3.

### MCP Tool Controls

| Field | Type | Default | Description |
|---|---|---|---|
| `allowed_mcp_tools` | `string[]` | `[]` | Explicit MCP tool allowlist. Empty = no MCP tools. Passed to cheval as `--allowed-mcp-tools`. |

---

## Isolation Tier Choice

### `isolation_tier: advisory`

- **Platform**: Linux (without bwrap), macOS, Windows
- **Enforcement**: cooperative constructs only — env scrub + in-process path checks
- **Does NOT prevent**: foreign binary bypass, direct syscalls, raw socket egress
- **When to use**: Non-adversarial constructs on developer machines; prototyping

```yaml
isolation_tier: advisory
```

### `isolation_tier: strict`

- **Platform**: Linux + bwrap + CAP_NET_ADMIN only
- **Enforcement**: kernel-boundary filesystem namespace + network namespace + verified provider memory disable
- **Prerequisite check**: runs at composition validation time, aborts with `[STRICT-TIER-PREREQ-MISSING]` exit 78 if bwrap or CAP_NET_ADMIN missing
- **When to use**: Compositions handling sensitive context; production CI; untrusted or adversarial construct packs

```yaml
isolation_tier: strict
```

**Prerequisite check** runs before any stage executes:
1. Verifies `bwrap` is installed (`command -v bwrap`)
2. Verifies `CAP_NET_ADMIN` (`getcap` or effective UID 0)
3. Verifies cheval adapters support memory-disable flags for all configured providers

Failure exits with code 78 (`EX_CONFIG`). See `grimoires/loa/runbooks/strict-tier-deployment.md`.

---

## Choosing the Right Tier

| Scenario | Recommended tier |
|---|---|
| Developer workflow on macOS | `advisory` |
| CI on standard GitHub-hosted runners | `advisory` |
| Production CI with sensitive context | `strict` (dedicated self-hosted runner) |
| Untrusted or third-party construct pack | `strict` |
| Prototyping a new composition | `advisory`, then migrate to `strict` |

---

## Common Configuration Examples

### Minimal (no network, no MCP, fresh session)
```yaml
context_policy:
  include_prior_transcript: false
  include_unread_stage_outputs: false
  include_unlisted_grimoires: false
  allowed_read_paths:
    - ".claude/constructs/packs/{{construct}}/skills/{{skill}}/**"
    - ".run/compose/{{run_id}}/input/**"
  allowed_write_paths:
    - ".run/compose/{{run_id}}/{{stage_id}}/output/**"
  allowed_env_vars: [PATH, HOME, LANG, LC_ALL]
  allow_network: false
  allowed_egress: []
  llm_session_strategy: fresh
  allowed_mcp_tools: []
  isolation_tier: advisory
```

### With API egress (advisory tier)
```yaml
context_policy:
  allow_network: true
  allowed_egress:
    - host: api.anthropic.com
      port: 443
  isolation_tier: advisory
```

### Strict tier (Linux CI)
```yaml
context_policy:
  isolation_tier: strict
  # All other fields apply — strict tier ENFORCES them at kernel boundary
```

---

## Error Codes

| Code | Trigger |
|---|---|
| `[STRICT-TIER-PREREQ-MISSING]` | Strict tier requested but bwrap / CAP_NET_ADMIN absent |
| `[POLICY-VIOLATION-READ]` | Stage read a path outside `allowed_read_paths` |
| `[POLICY-VIOLATION-WRITE]` | Stage wrote to a path outside `allowed_write_paths` |
| `[POLICY-VIOLATION-NETWORK]` | Stage attempted egress to unlisted host:port |
| `[EGRESS-PROXY-DOWN]` | Egress proxy died mid-stage; stage SIGKILL'd |
| `[AUDIT-KEYS-NOT-BOOTSTRAPPED]` | `audit_signed: true` but keys not bootstrapped |

---

## See Also

- `grimoires/loa/runbooks/strict-tier-deployment.md` — host hardening for strict tier
- `grimoires/loa/runbooks/envelope-schema-migration.md` — upgrading envelope schema version
- `lib/egress-filter.py` — egress proxy implementation (SDD §2.3)
- `lib/persistent-state.sh` — per-skill state management (SDD §4.5)
