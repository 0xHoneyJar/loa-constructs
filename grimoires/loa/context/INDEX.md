# Loa Context Index

**Authority**: cycle-0 SDD §2 (`grimoires/loa/context/INDEX.md` Frontmatter Schema)
**Cycle**: cycle-0-zone-hygiene
**Last classified**: 2026-05-09
**Last reviewed by**: @janitooor
**Total files classified**: 38

---

## Purpose

This index is the **active-context allowlist** for `grimoires/loa/context/`. The directory is operator-private by default (gitignored per `.gitignore:117`); this INDEX.md is the **only file in the directory that's tracked alongside README.md and composition-audit.json**.

Skills that consume context (e.g., `/plan-and-analyze`, `/architect`, `/sprint-plan`, `/bridgebuilder-review`) SHOULD filter their input set to files listed under "Active Context Files" below. Files in other sections (Reference-Only, Archive, Operator-Private) MUST NOT be loaded into shared agent context by default.

The shared-substrate enforcement of this rule lands cycle-1+ via upstream Loa Issue #818 F1 (`zone-write-guard.sh` hook + skill-side allowlist filter). Until then, this INDEX.md is documentation-only enforcement: operators/agents MAY honor the allowlist; nothing currently blocks loading outside it.

---

## 🟢 Active Context Files (6)

Files actively load-bearing for current cycle work. Frequently loaded by planning skills.

| File | Status | Owner | Provenance | Consumer | TTL Until Review |
|---|---|---|---|---|---|
| `README.md` | active | @janitooor | dir purpose / structural | structural | 2026-08-09 |
| `construct-bounded-context-runtime-audit.md` | active | @janitooor | substrate audit 2026-05-08 | substrate planning | 2026-08-09 |
| `construct-runtime-schema-alignment.md` | active | @janitooor | layer-ownership audit 2026-05-08 | substrate planning | 2026-08-09 |
| `next-cycle-rooms-ddd-bounded-context-learnings.md` | active | @janitooor | distillation 2026-05-08 | future cycles | 2026-08-09 |
| `rfc-construct-composition-prd-flow.md` | active | @janitooor | RFC 2026-05-08 | future cycles | 2026-08-09 |
| `loa-constructs-release-hygiene-audit-2026-05-09.md` | active | @janitooor | THIS CYCLE'S anchor 2026-05-09 | cycle-0 | 2026-05-23 (until cycle-0 closes) |

NB: 5 of 6 active files are gitignored per project convention. Frontmatter on these files (per SDD §2.2) is local-only operator self-documentation. Tracked files (README.md only) carry frontmatter that's visible cross-clone.

## 🟡 Reference-Only (8)

Useful but not actively loaded. Operators may read manually; skills should NOT default-load.

| File | Reason |
|---|---|
| `claims-to-verify.md` | auto-gen by /ride 2026-05-05; useful for verification work |
| `construct-composability-diagnostic.md` | older composability analysis 2026-03-13 (tracked legacy) |
| `construct-manifest-methodology.md` | manifest authoring methodology 2026-03-14 (tracked legacy) |
| `construct-network-cohesion.md` | older network audit 2026-03-11 |
| `construct-as-repo-architecture.md` | construct-as-expert-clone vision; substantive plan |
| `construct-extraction-plan.md` | extraction-from-monorepo plan |
| `construct-short-description-system.md` | description-system spec |
| `public-private-network-separation.md` | network-separation architecture 2026-03-07 |

## 🟣 Operator-Private (3 — moved to `private/` subdir)

These files contain vault-doctrine references or operator-personal content. Moved to `grimoires/loa/context/private/` (gitignored). Loa context-loading skills MUST NOT load these.

| File | Reason |
|---|---|
| `private/constructs-network-migration-brief-2026-05-05.md` | 125 KB, 16 vault refs (huge mixed doctrine per audit Finding 3) |
| `private/rfc-construct-rooms-invocation-boundaries.md` | 3 vault refs, explicitly Operator OS doctrine per audit |
| `private/construct-native-subagent-invocation-boundaries-2026-05-09.md` | frontmatter `status: operator-brief` |

## 🟠 Archive (21)

Older work superseded by current cycles, or product-specific context that shouldn't drive substrate design. Files stay in place per cycle-0 operator decision; INDEX.md classifications mark them as out-of-active-loading.

| File | Reason |
|---|---|
| `construct-sandbox-prd.md` | superseded by bounded-context substrate (audit recommendation) |
| `design-system-architecture.md` | product design system; not core construct runtime context |
| `ecosystem-brand-origins.md` | branding/worldview (audit recommendation) |
| `prd-cycle-038-visibility.md` | older PRD (audit recommendation) |
| `prd-cycle-044-signals.md` | older PRD |
| `prd-cycle-047-structural-alignment.md` | older PRD |
| `cycle-045-closeout-plan.md` | older cycle close-out |
| `cycle-b-plan.md` | older unnumbered cycle |
| `dashboard-current-state.md` | older dashboard state |
| `gecko-health-dashboard-plan.md` | older gecko dashboard plan |
| `internal-dashboard-convex-plan.md` | older convex dashboard plan |
| `marketplace-consolidation.md` | older consolidation plan |
| `mibera-world-consolidation.md` | mibera product context (audit recommendation) |
| `sprawlos-moodboard-analysis.md` | sprawlos product context (audit recommendation) |
| `ruggy-ecosystem-intelligence.md` | ruggy product context |
| `ruggy-signal-architecture.md` | ruggy product context |
| `ruggy-structural-alignment.md` | ruggy product context |
| `rektdrop-brutalism-patterns.md` | rektdrop product context (audit recommendation) |
| `dynamic-labs-auth-integration.md` | older auth integration work |
| `api-test-stability-baseline.md` | older API test stability work |
| `user-description.md` | auto-gen `/plan` for old "Signals Observatory" cycle |

## 🔴 Delete-Candidate (0)

No files queued for deletion in cycle-0. Sprint 1+ may revisit archive files for promotion to delete-candidate if they're confirmed unused.

---

## Update Protocol

When a file's classification changes:

1. Update its row in the appropriate section above
2. If active → reference/archive: remove frontmatter (or update `status` field)
3. If reference/archive → operator-private: `mv` into `private/` subdir
4. If anything → delete-candidate: queue for Sprint 1+ deletion review

When new files are added to `grimoires/loa/context/`:

1. Add to this index in the appropriate section
2. Default new files to "Reference-Only" until classification is intentional
3. Files without an entry here SHOULD NOT be loaded by skills

## Cross-references

- cycle-0 PRD FR-5 (active-context allowlist)
- cycle-0 SDD §2 (INDEX.md frontmatter schema + loader filter)
- `grimoires/loa/zones.yaml::operator-private` (zone classification of private/ subdir)
- Audit Finding 2 (context/ active boundary)
- Audit Finding 3 (vault-doctrine bleeding)
- Upstream Loa Issue #818 F1 (zone-write-guard hook for shared-substrate enforcement)
