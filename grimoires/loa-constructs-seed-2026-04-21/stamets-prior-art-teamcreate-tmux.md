# STAMETS Prior Art — TeamCreate + Tmux + Rewind for Alt-Backend Dispatch

> **Research agent report · 2026-04-23**
> Commissioned during cycle-006 L-research.
> Output target: cycle-007 `--backend teamcreate` implementation handoff.
> **Scope lock (cycle-006 SEED)**: research-only. NO implementation.
> TeamCreate-as-backend remains an optional alternative; default stays
> `headless-tmux` (Unix-native, forkable per doctrine v6 §18.4).

---

## 0 · Research question

**What would make `compose-run --backend teamcreate` viable in a future cycle, using Claude Code's agent-teams feature + tmux + rewind primitives?**

Specifically: what primitives exist today, what do they guarantee, what would a stage-executor honoring the agent-teams runtime look like, and where are the gaps?

---

## 1 · TeamCreate API surface (Claude Code Agent Teams)

Claude Code Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) exposes a runtime for multi-agent coordination via typed tools. Catalogued from tool schemas available in the cycle-006 authoring session:

### 1.1 · Spawning + teardown

| Tool | Signature (summarized) | Behavior |
|---|---|---|
| `TeamCreate` | `{team_name, agents[{name, subagent_type, prompt}]}` | Spawns N named agents in one team. Each agent loads its subagent-type config + initial prompt. |
| `TeamDelete` | `{team_name}` | Tears down a team. All named agents are stopped. |
| `Agent` (top-level) | `{description, subagent_type, prompt, name?, run_in_background?}` | Spawns one agent (not in a team). With `name:` it becomes addressable via SendMessage. |

### 1.2 · Addressing + coordination

| Tool | Signature | Behavior |
|---|---|---|
| `SendMessage` | `{to: <agent_name>, message}` | Delivers a message to a named agent (in any team or standalone). Recipient receives it as input to continue work. |
| `TaskCreate` | `{subject, description, ...}` | Creates a team task. Visible to all agents in the team. |
| `TaskUpdate` | `{taskId, status, owner?, ...}` | Updates task status. Supports `addBlocks` / `addBlockedBy` for dependency DAGs. |
| `TaskList` / `TaskGet` / `TaskOutput` | — | Reading task state + agent-produced output. |

### 1.3 · What TeamCreate buys that headless-tmux doesn't

- **Persistent named agents**: an agent named "artisan-teammate" survives across multiple SendMessage invocations. Its internal context accumulates. This is the org-metaphor model ([[agent-teams-as-pipes]] §"persistent teammates") without the bash-history-file simulation that cycle-006 uses.
- **Structured coordination via TaskList**: shared state visible to all agents. The team lead dispatches tasks; teammates pick them up. Similar to a shared kanban inside the team runtime.
- **Claude-native idempotency**: if a teammate fails or rewinds, TeamCreate handles the agent lifecycle. No external process management.
- **Safety integration**: the `team-role-guard.sh` and `team-role-guard-write.sh` hooks already enforce lead-vs-teammate boundaries (System Zone writes, beads access). A `backend: teamcreate` composition inherits these for free.

### 1.4 · What TeamCreate doesn't buy

- **Fork-ability**: requires Claude Code + agent-teams feature active. `claude -p` + bash + tmux runs anywhere the Claude CLI runs (doctrine v6 §18.4).
- **Visible stage panes by default**: TeamCreate spawns agents invisible-by-default; the tmux display surface is a Claude Code operator preference layered on top. The headless-tmux backend makes pane visibility load-bearing, not optional.
- **Process-level isolation per stage**: a TeamCreate agent shares the runtime process with the lead; fresh-mode `claude -p` gives true subprocess isolation. For cycle-006's fresh stages this is cleaner.

---

## 2 · Tmux primitives relevant to alt-backend wiring

Tmux 3.x primitives cycle-006 already uses + additional ones relevant for teammate-bound panes:

### 2.1 · Session + window + pane lifecycle

| Command | Purpose |
|---|---|
| `tmux new-session -d -s NAME` | Create detached session (compose-panes.sh uses this) |
| `tmux split-window -h -t NAME -p N` | Split with percentage (compose-panes.sh uses this) |
| `tmux select-pane -t NAME:WINDOW.N` | Focus a specific pane |
| `tmux kill-session -t NAME` | Tear down session |
| `tmux has-session -t NAME` | Check existence (compose-panes.sh guards with this) |
| `tmux list-panes -t NAME -F FORMAT` | Enumerate panes with custom format fields |

### 2.2 · Send / capture

| Command | Purpose |
|---|---|
| `tmux send-keys -t NAME:W.P "text" Enter` | Send keystrokes to a pane (interactive dispatch) |
| `tmux capture-pane -t NAME:W.P -p` | Capture pane contents to stdout (for marker-based completion detection) |
| `tmux pipe-pane -t NAME:W.P "cat > file"` | Stream pane output to a file (useful for trajectory tail-follow when teammate emits trajectory rows) |

### 2.3 · Visual treatment

| Command | Purpose |
|---|---|
| `tmux set-option -p -t NAME:W.P pane-border-style fg=colour99` | Per-pane border color (per-construct color integration) |
| `tmux set-option -t NAME status-left "..."` | Status line (compose-panes.sh uses this) |
| `tmux set-option -t NAME window-active-style bg=...` | Active pane visual emphasis |

### 2.4 · Gap identified

**Completion detection on persistent panes**: when `tmux send-keys` delivers a prompt to a long-lived Claude Code session, there's no native "prompt complete" signal. Cycle-006's file-accumulated persistent mode avoids this; a real `backend: teamcreate` implementation would need one of:
- Marker-based: instruct the LLM to emit a specific sentinel line at completion; `tmux capture-pane` + poll / tail for the marker
- File-based: instruct the LLM to write its output to a known path; watch the path for completion
- Claude Code IPC: if/when Claude Code exposes a "session idle" signal via a file or hook, use that

Each approach has fragility surface. TeamCreate's SendMessage may offer a natural completion signal (response delivery is the completion event); this is the cleaner path.

---

## 3 · Rewind — Claude Code native primitive

### 3.1 · What rewind does

Claude Code supports rewinding a session to an earlier turn. The operator invokes rewind (keybinding or slash command) to roll back conversation state + any tool effects that didn't touch disk. This is per-session, not per-team.

### 3.2 · Relevance to composition runtime

- **Per-pane rewind** (cycle-006 L-frontend AC-frontend.6): each pane holds its own Claude Code session; rewinding that pane rolls back its stage work without touching other stages. This is the "undo-at-stage" semantics named in [[agent-teams-as-pipes]].
- **Persistent-teammate rewind**: if a persistent teammate goes off-track, rewinding their pane to an earlier turn restores cleaner accumulated context. The cycle-006 file-history simulation doesn't support this cleanly — rewinding a file requires either explicit snapshotting or git-tracked history.
- **Dispatch-determinism preservation**: rewind doesn't affect the trajectory JSONL (already written to disk). So the orchestrator's view stays consistent; rewinding a teammate pane doesn't invalidate prior trajectory rows — it just means the next stage invocation starts from an earlier state.

### 3.3 · Gap identified

**Rewind orchestration**: no API to programmatically rewind a specific pane from the orchestrator. The operator rewinds manually. A future `rewind-pane` capability (either via Claude Code tooling or tmux send-keys + a rewind slash command) would let the orchestrator issue rewinds as a failure-recovery policy (doctrine v5 §17.2 retry primitive).

---

## 4 · Proposed `--backend teamcreate` shape (cycle-007+)

**Not implemented this cycle.** Shape sketch for future-cycle consumption:

### 4.1 · compose-run changes

- `backend: teamcreate` accepted in composition YAML
- Runner creates a team at dispatch time: `TeamCreate({team_name: "compose-<run_id>", agents: [<one per persistent stage>]})`
- Each persistent stage maps to a named agent with the construct's persona + skill as initial prompt
- Each fresh stage stays as `claude -p` subprocess (NOT team member — isolation preserved)

### 4.2 · stage-executor-teamcreate.sh (new script)

- For persistent mode: `SendMessage({to: <stage_agent_name>, message: <prompt>})`; wait for response (TeamCreate delivers teammate output back); transform to schema-valid row
- For fresh mode: delegate to existing `stage-executor-tmux.sh` (reuse the `claude -p` path)
- On iteration-loop pass: re-SendMessage same teammate with deepened context; no file-accumulation needed — the teammate's internal context persists

### 4.3 · Renderer integration

- compose-panes-render.sh already tails orchestrator.jsonl; teamcreate backend emits same event shape
- Additional event types for teamcreate-specific signals (agent_spawned, agent_rewound) — extends the contract additively per docs/integration/compose-trajectory-contract.md §3

### 4.4 · Operator experience

- Same `compose-run website-scaffold --target X` invocation
- Operator sees persistent stage panes in tmux (tmux display layer unchanged)
- TeamCreate agents DO their work invisibly to tmux; their output flows through SendMessage response → orchestrator trajectory → renderer
- Operator can Agent-Team's SendMessage directly into a persistent stage to steer mid-flight (the "pipe as HITL surface" pattern from [[agent-teams-as-pipes]])

### 4.5 · Remaining unknowns for cycle-007 research

- **SendMessage latency**: what's round-trip time on SendMessage? If it's slow (seconds), the persistent-mode advantage over `claude -p` diminishes
- **TeamCreate teardown semantics**: does TeamDelete on a mid-work team corrupt any state? Does it cleanly release teammate resources?
- **Rewind in Team mode**: can individual team members be rewound, or is rewind global to the team?
- **Team size limits**: is there a cap on agents per team? Website-scaffold has 4 persistent stages = 4 persistent agents, probably fine; a 20-stage composition might hit limits

---

## 5 · Synthesis

| Axis | headless-tmux (cycle-006) | teamcreate (cycle-007+) |
|---|---|---|
| Runtime dependency | bash + tmux + `claude` CLI | Claude Code + agent-teams feature |
| Fork-ability | Anyone with Unix + claude | Requires Claude Code specifically |
| Persistent teammate | File-accumulated history | Native agent context |
| Fresh stages | `claude -p` subprocess | `claude -p` subprocess (same) |
| Completion detection | Subprocess exit (fresh) / file marker (persistent, future) | SendMessage response (native) |
| Rewind | Per-pane (operator-manual) | Per-teammate + programmatic (future) |
| Visibility | tmux panes (mandatory by design) | Optional (tmux layer bolted on) |
| Cross-teammate coordination | None (pipes only) | TaskCreate + shared state |
| Safety enforcement | External hooks | team-role-guard hooks (integrated) |
| Cycle-006 status | **Shipped** | **Research only** |

Both are valid. The scope-lock rule (cycle-006 SEED §1) picks headless-tmux as default because substrate-nativity + fork-ability matter more than the specific wins TeamCreate offers. TeamCreate becomes opt-in when an operator wants native persistent teammates + integrated safety hooks.

**Cycle-007 would land `backend: teamcreate` as an opt-in via a new `stage-executor-teamcreate.sh` that honors the same argv + stdin/stdout contract as `stage-executor-tmux.sh`.** The compose-run.sh dispatcher would branch on `backend:` field. The trajectory contract stays unchanged. The composition YAML stays unchanged (except the one `backend:` field). All frontends keep working.

---

## 6 · References

- Cycle-006 SEED: `grimoires/loa-constructs-seed-2026-04-21/cycle-006-SEED-agentic-fullstack-runtime.md` (L-research AC)
- [[agent-teams-as-pipes]] — three-layer architecture + operator pattern that this research serves
- Claude Code agent-teams docs (operator-local): `.claude/loa/reference/agent-teams-reference.md`
- Tmux 3.x man pages (system-local)
- Companion doctrine: `bonfire-construct-pipe-doctrine.md` v5 (cycle-007 amendment may incorporate teamcreate-specific primitives)

---

*Cycle-006 L-research close · 2026-04-23. Scope-lock preserved — no implementation. Primitives catalogued, gaps named, shape-sketch ready for cycle-007 handoff.*
