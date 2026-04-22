# L2 · Mode Invocation Contract (cycle-004)

> *"It's unclear to me which constructs are being called and how consistent they are."* — operator 2026-04-21-late
>
> This spec documents the current deterministic dispatch contract post-L2. 2 known-debt gaps noted.

---

## The contract

An operator utterance resolves to a construct through **five ordered tiers**. First match wins; collisions warn explicitly.

| Tier | Matches on | Example | Source |
|---|---|---|---|
| 1 | **Slug** (exact) | `artisan` | `construct.yaml:slug` |
| 2 | **Name** (case-insensitive) | `Artisan` / `ARTISAN` | `construct.yaml:name` |
| 3 | **Command** (strips leading `/`) | `/feel` / `feel` | `construct.yaml:commands[].name` |
| 4 | **Persona handle** (strips leading `@`, case-insensitive) | `@ALEXANDER` / `alexander` | `identity/<HANDLE>.md` filenames |
| 5 | **No match** | `feel` (when no pack declares it) | returns explicit failure |

**Collision behavior**: if multiple constructs match at any tier, resolver warns + returns first match deterministically. Operator sees the conflict; dispatch proceeds with a stated choice rather than silent routing.

**Deterministic guarantee** (doctrine §16.3 dispatch side): same utterance → same construct every time, assuming the index is up-to-date.

**NOT guaranteed** (per flatline SKP-002/004 deferred to cycle-005): output reproducibility. Same construct invoked twice with same input may produce different LLM output; that's output-variance, not dispatch-variance. Separate concern.

---

## Verified resolution (cycle-004 L2 test matrix, 2026-04-21)

14 utterance forms tested against the 28-pack global index:

| Utterance | Resolves to | Tier |
|---|---|---|
| `artisan` | artisan (Artisan) | slug |
| `Artisan` / `ARTISAN` | artisan (Artisan) | name (case-insensitive) |
| `ALEXANDER` / `@ALEXANDER` / `alexander` | artisan (Artisan) | persona |
| `STAMETS` / `@STAMETS` | k-hole (K-Hole) | persona |
| `OSTROM` / `BARTH` | the-arcade (The Arcade) | persona |
| `/dig` / `dig` | k-hole (K-Hole) | command |
| `GECKO` | gecko (Gecko) | name |
| `KEEPER` | observer OR beehive ⚠️ | persona (COLLISION — see §"Known debt") |
| `feel` | No match ✗ | (F28 — see §"Known debt") |

**12/14 deterministic. 2 known-debt.**

---

## Known debt

### §1 · `KEEPER` persona collision (beehive ↔ observer)

Both `beehive` and `observer` declare `identity/KEEPER.md`. Origin: observer was renamed to beehive; the old observer pack remained installed. This is **GECKO PT-1 from cycle-001** — dual-slug ecosystem drift.

Current behavior: resolver warns the operator + returns observer (alphabetical first).

Remediation path:
- Upstream: pick one, deprecate the other (operator call)
- Tooling: no change needed; warning is correct

### §2 · `/feel` not resolvable without artisan PR (F28)

`artisan/construct.yaml` declares no `commands:` and has no `commands/` directory. The operator invokes `/feel` via the global Operator OS modes table (`~/.claude/CLAUDE.md`) which maps FEEL mode → artisan — a **user-layer binding**, not a pack-layer declaration.

Current behavior: `/feel` returns "No match" unless artisan declares a `feel` command.

**Doctrine §16.1 implication**: Operator OS is a **starter template**, not canonical. Its modes table is one operator's workflow. Other operators might not bind `/feel` to artisan at all. Making artisan declare `/feel` as a canonical command would overreach — it would push one operator's workflow into the pack contract.

Two ways to resolve cleanly:
- **(a) Pack-layer binding**: artisan upstream PR declares `commands: [{name: feel, path: commands/feel.md}]`. Makes `/feel` → artisan a *pack-declared* route, independent of operator preference. Appropriate if artisan considers `/feel` its canonical entry command.
- **(b) Operator-layer binding**: keep modes as operator-local. Resolve `/feel` → artisan *only* when the operator's CLAUDE.md declares that mapping. Requires an Operator-OS-aware resolver layer (cycle-005+).

**Cycle-004 does not force a choice.** Documenting the gap; let operator decide which path fits their distribution model. If publishing Operator OS as a template per §16.1, option (b) aligns better — template shows the mapping, but other operators can rebind.

---

## Frame conflict resolution

Per doctrine v4 §16.3 (third failure mode — frames conflicting).

When multiple mode/lens/construct combinations could apply to one session:

| Conflict type | Resolution |
|---|---|
| **Two modes active** (e.g., FEEL + TEND) | Agent reports both in `constructs-active --orient`; operator disambiguates via latest explicit invocation |
| **Mode vs direct invocation** (e.g., FEEL mode + `@OSTROM`) | Direct invocation wins. Modes are orchestration hints; explicit routing is dispatch. |
| **Lens conflict** (e.g., craft lens + keeper lens) | Layered. Lenses compose, they don't override. Both questions are asked. |
| **Persona collision** (e.g., KEEPER in both beehive + observer) | Resolver warns + picks deterministically (first alphabetical). Operator can disambiguate by slug. |

**Invariant**: an operator can always see what's active via `constructs-active --orient`; conflicts are visible, not hidden.

---

## Implementation

Shipped this leg:

- `.claude/scripts/construct-index-gen.sh` — auto-fallback to `~/.loa/constructs/packs/` when project-local empty (F27); extracts persona handles from `identity/<HANDLE>.md` filenames
- `.claude/scripts/construct-resolve.sh` — Tier 4 persona matching added; `/` and `@` prefix stripping

Verification: 12/14 deterministic resolutions across the test matrix above. Index now contains 28 packs with persona handles populated.

---

## References

- Doctrine v4 §16.3–16.4 · composition determinism + transparency invariant
- Doctrine v4 §16.1 · Operator OS as starter-template (why pack-layer ≠ user-layer bindings)
- cycle-001 PT-1 · observer/beehive dual-slug drift
- cycle-003 F28 · artisan declares no commands
- Flatline SKP-002 · dispatch-determinism vs output-reproducibility (deferred cycle-005)
