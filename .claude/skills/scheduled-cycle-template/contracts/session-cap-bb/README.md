# session-cap-bb — real bridgebuilder dispatch contract

L3 DispatchContract phase scripts wired by `session-cap-fanout.sh` for the
`bridgebuilder` post-reset fan-out phase (bd-fanout-real-dispatch-9jv6,
Tranche 1). Unlike the generic `../example-*.sh` no-ops, these fire a real
review.

| Phase | Behavior |
|-------|----------|
| `reader.sh` | Sanity-gates on the repo-root `.run/session-limit-state.json`: absent ⇒ noop-normal, present-but-corrupt ⇒ abort. Only a pending/retryable capture with one exact `repo + PR` target inside the bounded post-reset window is eligible. |
| `decider.sh` | **Fail-closed.** `action:dispatch` only if the capture is eligible and `sprint_plan.state` ∈ {RUNNING, HALTED}, or `bridge.state` ∈ {RUNNING, ITERATING, FINALIZING, HALTED}; else `action:noop`. |
| `dispatcher.sh` | Atomically claims `capture_id`, runs `bridgebuilder-review/resources/entry.sh --repo <owner/repo> --pr <number>`, and acknowledges only on success. It never broadens into repository discovery. Failures retry within a bounded budget; the capture id is the downstream idempotency key. |
| `awaiter.sh` | Pass-through — dispatch is synchronous under the phase timeout. |
| `logger.sh` | Records dispatched?/repo/exit-code into the `cycle.phase` payload; cleans the handoff dir. |

## Cross-phase handoff

`prior_phases_json` carries only an `output_hash` (a sha256 of stdout), never
the upstream output itself. State is therefore passed out-of-band through a
per-cycle temp dir `${TMPDIR:-/tmp}/loa-session-cap-bb.<cycle_id>/` that every
phase re-derives identically from the shared `cycle_id`. `TMPDIR` is on the L3
`env -i` allowlist, so the same path resolves under cron as interactively.

## Env overrides (test / operator)

| Var | Default | Purpose |
|-----|---------|---------|
| `LOA_SESSION_CAP_STATE_FILE` | `<repo>/.run/session-limit-state.json` | capture marker path (reader + dispatcher) |
| `LOA_SESSION_CAP_MAX_RESET_AGE_SECONDS` | `21600` (6h) | maximum post-reset age eligible for dispatch |
| `LOA_SESSION_CAP_NOW_EPOCH` | current epoch | deterministic freshness clock for tests |
| `LOA_SESSION_CAP_MAX_ATTEMPTS` | `3` | terminal failure threshold |
| `LOA_SESSION_CAP_CLAIM_LEASE_SECONDS` | `3600` | crash-recovery lease for an abandoned claim |
| `LOA_SESSION_CAP_RETRY_DELAY_SECONDS` | `300` | backoff after a nonzero dispatch |
| `LOA_SESSION_CAP_BB_REPO` | current git origin | exact `owner/repo` captured at cap time |
| `LOA_SESSION_CAP_BB_PR` | unique open PR for current branch | exact PR number captured at cap time |
| `LOA_SESSION_CAP_BB_ENTRY` | `../../../bridgebuilder-review/resources/entry.sh` | BB entrypoint (dispatcher) |

Under the L3 sandbox these are only visible if listed in
`LOA_L3_PHASE_ENV_PASSTHROUGH`; production runs rely on the defaults.

## Safety

Arming this (via `session_cap.post_reset_fanout.enabled: true`) posts **live PR
review comments unattended on cron**. The flag defaults to false. A capture
moves `pending → claimed → completed`; nonzero dispatches enter
`retryable_failure` and eventually `failed` after the bounded retry budget.
Claim leases recover crashes without changing the idempotency key.
