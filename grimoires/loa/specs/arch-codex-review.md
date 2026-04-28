# ARCH: codex-review — Lean Code-Review Construct + Composition

> **Mode**: ARCH (Ostrom) + craft lens (Alexander)
> **Date**: 2026-04-26 (v2 — refined after deep dig of existing scripts)
> **Persona placeholder**: FAGAN (after Michael Fagan, formal code inspection) — operator override welcome
> **Composes with**: codex-rescue (or CLI implementer), flatline (boundary, not overlap)

---

## v2 deep-dig findings that changed this spec

After reading lib-codex-exec.sh (full 417 lines), gpt-review-api.sh (full 302 lines), lib-security.sh, lib-content.sh, gpt-review-hook.sh, the schema, the re-review prompt, lib-curl-fallback.sh (skim), normalize-json.sh, inject-gpt-review-gates.sh, and diffing bonfire/.loa vs loa-constructs:

1. **Bonfire and loa-constructs gpt-review-api.sh are IDENTICAL** (`diff` returns empty). Bonfire mirrors loa-constructs. No divergence/cleanup work needed — source from loa-constructs as canonical.
2. **Vendor list is precise: 3 libs, not 1.** lib-codex-exec.sh + lib-security.sh + lib-content.sh. The `route_review` orchestration with curl/multipass/route-table fallbacks is overkill for V1.
3. **Re-review prompt is the load-bearing convergence asset** — every word earns its place. "VERIFY. DON'T REINVENT. CONVERGE." Adapting this verbatim with light edits is the right move.
4. **Auto-approval at API level** — gpt-review-api.sh handles `iter > MAX_ITERATIONS` internally by returning `{verdict:APPROVED, auto_approved:true}`. Composition just increments iter; cap enforcement is in the script. Inherit this.
5. **Schema is draft-07** in the canonical version, permissive (no `additionalProperties: false`). Match ecosystem; don't upgrade to 2020-12 for this construct.
6. **Hooks are intentionally being REMOVED in v2.0 of inject-gpt-review-gates.sh** — the comment says "No more skill/command file injection (fragile and redundant). The hooks are comprehensive enough." LOA team already learned the hook lesson. New construct: NO hooks, period.
7. **lib-content.sh is more sophisticated than I knew** — 4-tier file priority (P0=security, P1=business, P2=config, P3=docs/tests), `bytes/3` token estimation (code-aware), git-diff-aware splitting on `diff --git a/(.+) b/`, `.reviewignore` support via `review-scope.sh`. Inherit verbatim.
8. **lib-codex-exec.sh has Python3 fallback** for arbitrary-nesting JSON extraction (`raw_decode`). Critical for codex outputs that wrap JSON in markdown or prose.
9. **System Zone Alert** detects `.claude/` changes in diffs and elevates scrutiny. SKIP for the new construct — project-specific to Loa-mounted projects.
10. **Bonfire-specific config keys leak**: lib-security.sh reads `flatline_protocol.secret_scanning.patterns[]` — coupling that needs to be either dropped or renamed in the vendored copy.

---

## Reframe (read this first)

**Not** "resurrect the deprecated /gpt-review."
**Yes** "build a lean SWE-focused code-review construct that fills the diff-review gap flatline doesn't address."

PR #523 deprecated /gpt-review for honest reasons (orphan code, broken tests, silent hooks, flatline absorbed its primary value). Resurrecting verbatim re-fights a settled battle. The new construct learns from those failure modes and occupies a clean responsibility seam.

| Surface | Tool | When |
|---|---|---|
| PRD / SDD / Sprint planning | **Flatline Protocol** (Opus + GPT-5.3-codex + Gemini, 4-persona, scored arbitration) | High-stakes, slow, multi-model dissent |
| Code diff after implementation | **codex-review** (single GPT pass via codex CLI, single persona, structured JSON) | Lean, fast, composable as a stage |

Boundary is enforced by the construct's `when_to_use` doc and the composition's stage scope (diffs only). No overlap with flatline's territory.

---

## Invariants

What MUST NOT change:

- **contracts-as-bridges doctrine** — schemas are bridges, not glue. Composition schema stays in `loa-constructs/.claude/schemas/composition.schema.json`. The new construct's review-finding schema is locally-owned (lives with the construct, not in loa-constructs central schemas).
- **`lib-codex-exec.sh` is the canonical CLI primitive** — wrapped, never forked. Sourced via path or vendored with version pinning. This is what gives portability (no MCP plugin dependency).
- **Construct-* repo pattern** — `construct.yaml` at top level as source of truth, no `manifest.json` (loa-constructs cache generates it). Follow `construct-the-easel` shape.
- **No silently always-on hooks** — explicit invocation only. No PostToolUse fire-and-forget. (This was the primary noise generator that PR #523 removed.)
- **Tests must pass and reflect actual behavior** — no aspirational asserts. The 22 failing bats tests in the original gpt-review were the canary.
- **Single persona** — codex-review is one role: strict code reviewer. Flatline's 4-persona system is intentionally separate.
- **Convergence cap at 3 iterations** — matches gpt-review's pattern. Re-review converges toward approval (don't keep finding new issues post-iteration-1).
- **Structured JSON output, schema-validated** — never freeform text. The schema IS the prompt's prompt.

---

## Construct repo design

### Repo

`construct-codex-review` — public, MIT license, `0xHoneyJar` org. Follows construct-* convention.

### Structure

```
construct-codex-review/
├── README.md
├── CLAUDE.md
├── construct.yaml                     ← source of truth (schema_version 3)
├── identity/
│   ├── persona.yaml                   ← FAGAN (or operator pick)
│   └── expertise.yaml
├── skills/
│   ├── reviewing-diffs/               ← primary skill
│   │   ├── SKILL.md
│   │   └── index.yaml
│   └── reviewing-files/               ← secondary (review specific files, no diff)
│       ├── SKILL.md
│       └── index.yaml
├── scripts/
│   ├── codex-review-api.sh            ← lean wrapper (~100 lines)
│   ├── lib/                           ← VENDORED from loa-constructs/.claude/scripts/
│   │   ├── lib-codex-exec.sh          ← codex CLI execution backend (cycle-033)
│   │   ├── lib-security.sh            ← auth + secret redaction + curl auth config
│   │   └── lib-content.sh             ← 4-tier file priority + token budgeting
│   └── tests/
│       └── *.bats                     ← all green, all reflect actual behavior
├── prompts/
│   ├── code-review.md                 ← first-review prompt (lean SWE focus)
│   └── re-review.md                   ← convergence prompt (template substitutions)
├── schemas/
│   └── codex-review-finding.schema.json  ← draft-07, locally-owned
└── VENDOR.md                          ← attribution + version pin for lib-* sources
```

### Vendor list — precise

After deep dig of gpt-review-api.sh (302 lines, sources 9 libs), the LEAN V1 wrapper sources only THREE:

| Lib | Why vendor | Adaptations needed for portability |
|---|---|---|
| `lib-codex-exec.sh` | Foundation — codex CLI capability detection, single invocation, output parsing (incl. Python3 raw_decode fallback for arbitrary nesting), workspace setup with allow-list | None — already portable. Sources lib-security.sh which we also vendor. |
| `lib-security.sh` | `ensure_codex_auth` (env-only, no .env reads), `redact_secrets` (jq-based key-preserving), `is_sensitive_file` (deny list), `write_curl_auth_config` (header injection guards) | Drop the `flatline_protocol.secret_scanning.patterns[]` config lookup — bonfire-coupled. Use `codex_review.secret_patterns[]` instead, OR drop config-driven extras entirely (V1: hardcoded patterns only). |
| `lib-content.sh` | 4-tier priority (P0 security / P1 business / P2 config / P3 docs+tests), `estimate_tokens` (bytes/3 code-aware), `prepare_content` (diff-aware truncation), optional `review-scope.sh` integration | None — already portable. Optional `.reviewignore` support if `review-scope.sh` is also vendored. |

### What NOT to vendor (V1)

- **`lib-curl-fallback.sh`** (348 lines) — direct OpenAI API + Hounfour model-invoke. V1 requires codex CLI; if missing, fail with install hint. Add fallback in V2 if needed.
- **`lib-multipass.sh`** — multipass orchestration (repeated/refining queries). Single-pass is sufficient for diff review.
- **`lib-route-table.sh`** — declarative route table with precedence chain. Overkill for single-backend codex CLI.
- **`normalize-json.sh`** — separate utility; lib-codex-exec.sh has its own `parse_codex_output` with the same logic.
- **`invoke-diagnostics.sh`** — debugging only.
- **`bash-version-guard.sh`** — Loa-specific.
- **All hook infrastructure** (`gpt-review-hook.sh`, `inject-gpt-review-gates.sh`, `gpt-review-toggle.sh`, template). The `inject-gpt-review-gates.sh` v2.0 comment EXPLICITLY says "No more skill/command file injection (fragile and redundant)." Loa team already learned the hook lesson. New construct: NO hooks at any layer.

### `VENDOR.md` shape

```markdown
# Vendored libraries

These files are vendored from
[loa-constructs](https://github.com/0xHoneyJar/loa-constructs)
`/.claude/scripts/` at commit <SHA>. Do not edit in place — propose
upstream changes via PR to loa-constructs first, then re-vendor.

| File | Source | Version | Adaptations |
|---|---|---|---|
| lib/lib-codex-exec.sh | loa-constructs/.claude/scripts/lib-codex-exec.sh | <SHA> | None |
| lib/lib-security.sh | loa-constructs/.claude/scripts/lib-security.sh | <SHA> | Removed flatline_protocol.secret_scanning.patterns lookup |
| lib/lib-content.sh | loa-constructs/.claude/scripts/lib-content.sh | <SHA> | None |

To re-vendor: `bash scripts/revendor.sh <commit-sha>`.
```

### `construct.yaml` (schema_version 3)

Following `construct-the-easel`:

```yaml
schema_version: 3
name: "Codex Review"
slug: "codex-review"
version: "0.1.0"
description: "Lean adversarial code review for diffs and implementations. Single GPT pass via codex CLI, structured JSON findings, convergence loop. Composes with codex-rescue or any implementer for implement+review workflows."
short_description: "Diff-scoped code review via codex CLI"
author: "0xHoneyJar"
license: "MIT"
type: "skill-pack"
visibility: public
repository: https://github.com/0xHoneyJar/construct-codex-review.git

skills:
  - slug: reviewing-diffs
    path: skills/reviewing-diffs
  - slug: reviewing-files
    path: skills/reviewing-files

identity:
  persona: identity/persona.yaml
  expertise: identity/expertise.yaml

domain: [engineering, code-review, adversarial-review]

expertise:
  - diff-scoped code review
  - structured-output review findings
  - codex CLI integration
  - convergence loop discipline

compose_with:
  - codex-rescue          # implementer counterpart (Anthropic's codex MCP)
  - artisan               # craft-gate cousin (different surface; can compose for UI code reviews)
  - flatline              # boundary, not overlap (flatline = planning; codex-review = code)

events:
  emits:
    - codex-review.finding.created
    - codex-review.verdict.changed
    - codex-review.iteration.completed
  consumes:
    - implement.diff.created    # any implementer's signal that work is ready to review

golden_path:
  commands:
    - "/codex:review-diff <path-to-diff>"
    - "/codex:review-files <file1> <file2> ..."
```

### Persona

**Name**: FAGAN (placeholder — operator picks)
**Lineage**: Michael Fagan invented formal code inspection at IBM (1976). His method shaped modern code review.
**Disposition**: Strict, evidence-based, line-numbered. Calls fabrication where it exists. Provides actual code fixes, not descriptions. Converges toward approval on re-review (doesn't introduce new issues to delay convergence).

`identity/persona.yaml` shape:
```yaml
name: FAGAN
construct: codex-review
role: strict code reviewer
voice: precise, line-anchored, fix-first
authority: |
  Find bugs, security issues, and fabrication. Provide actual code fixes for
  every finding. Ignore style/naming/"could be cleaner" — that's craft-gate
  territory. Re-review: focus ONLY on whether previous issues were fixed;
  converge toward approval.
mandates:
  - Every finding includes current_code + fixed_code + explanation
  - Severity is binary: critical | major (no minor; if it's not a bug, don't flag it)
  - Fabrication check on every review (hardcoded values, stubbed functions, faked results)
  - Three-iteration cap; re-review converges toward approval
forbidden:
  - Style preferences
  - Naming nits unless genuinely confusing
  - "Could be cleaner" suggestions
  - Discovering new issues on iteration 2+ unless the fix introduced them
```

### Skills

#### `reviewing-diffs` (primary)

`skills/reviewing-diffs/SKILL.md`:
```markdown
---
name: reviewing-diffs
description: Adversarial code review of a unified diff via codex CLI. Returns structured JSON findings with line-anchored fixes. Convergence loop with 3-iteration cap.
allowed-tools: [Bash, Read]
user-invocable: true
---

# /reviewing-diffs — Diff Code Review

Single-pass GPT code review of a diff. Returns structured JSON.

## Inputs
- `diff_path` (required) — path to a unified diff file OR `-` for stdin
- `iteration` (optional, default 1) — for convergence loop; re-review uses iteration ≥ 2 prompt
- `context_files` (optional) — additional files to load alongside the diff

## Invocation
`bash scripts/codex-review-api.sh review-diff <diff_path> [--iteration N] [--context-file path]`

## Output
JSON conforming to `schemas/codex-review-finding.schema.json`:
- `verdict`: APPROVED | CHANGES_REQUIRED
- `summary`: one-sentence
- `findings[]`: each with severity, file, line, description, current_code, fixed_code, explanation
- `fabrication_check`: passed + concerns

## When to use
- After an implementer (codex-rescue, codex-cli implementer, etc.) ships a diff
- Inside the `code-implement-and-review.yaml` composition (stage 2)
- Standalone: operator wants a single review pass on a PR diff before merge

## When NOT to use
- For PRD/SDD/Sprint planning review — use Flatline Protocol
- For style/lint feedback — use the project's linter
- For UI/UX feel — use artisan/feel-iterate
```

#### `reviewing-files` (secondary)

Same shape but takes file paths instead of a diff. Use case: review a specific module without a diff context (e.g., "audit auth.ts before we ship").

### `scripts/codex-review-api.sh`

Lean wrapper, ~100 lines. Sources 3 vendored libs. Single backend (codex CLI). No fallback chains in V1.

```bash
#!/usr/bin/env bash
# codex-review-api.sh <command> [args]
# Commands: review-diff, review-files
# Exit codes: 0=approved 1=changes_required 2=input_error 3=api_failure 4=auth 5=format
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONSTRUCT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROMPTS_DIR="$CONSTRUCT_ROOT/prompts"
SCHEMA_PATH="$CONSTRUCT_ROOT/schemas/codex-review-finding.schema.json"

source "$SCRIPT_DIR/lib/lib-security.sh"     # auth + redaction
source "$SCRIPT_DIR/lib/lib-content.sh"      # token budgeting + priority
source "$SCRIPT_DIR/lib/lib-codex-exec.sh"   # codex CLI execution

# Defaults
CODEX_REVIEW_MODEL="${CODEX_REVIEW_MODEL:-gpt-5.3-codex}"
CODEX_REVIEW_TIMEOUT="${CODEX_REVIEW_TIMEOUT:-300}"
CODEX_REVIEW_MAX_ITERATIONS="${CODEX_REVIEW_MAX_ITERATIONS:-3}"
CODEX_REVIEW_MAX_TOKENS="${CODEX_REVIEW_MAX_TOKENS:-30000}"

# Parse args: --iteration N, --previous <findings.json>, --output <file>
# (See main() below)

main() {
  # 1. Validate inputs (diff/file path, OPENAI_API_KEY)
  ensure_codex_auth || { error "OPENAI_API_KEY not set"; exit 4; }

  # 2. Inherit auto-approval pattern from gpt-review-api.sh:lines 264-269
  #    If iter > MAX_ITERATIONS, return auto-approved verdict without invoking model
  if [[ "$iter" -gt "$CODEX_REVIEW_MAX_ITERATIONS" ]]; then
    printf '{"verdict":"APPROVED","summary":"Auto-approved after %s iterations","auto_approved":true,"iteration":%s}\n' \
      "$CODEX_REVIEW_MAX_ITERATIONS" "$iter"
    exit 0
  fi

  # 3. Build prompt
  if [[ "$iter" -eq 1 ]]; then
    sp=$(cat "$PROMPTS_DIR/code-review.md")
  else
    [[ -n "$previous_findings_file" ]] || { error "Re-review requires --previous"; exit 2; }
    # Awk-based safe template substitution (vision-002 pattern)
    sp=$(awk -v iter="$iter" -v findings="$(cat "$previous_findings_file")" \
      '{gsub(/\{\{ITERATION\}\}/, iter); gsub(/\{\{PREVIOUS_FINDINGS\}\}/, findings); print}' \
      "$PROMPTS_DIR/re-review.md")
  fi

  # 4. Token budget the diff content (priority-based truncation if needed)
  raw=$(cat "$diff_path")
  prepared=$(prepare_content "$raw" "$CODEX_REVIEW_MAX_TOKENS")

  # 5. Execute codex CLI
  workspace=$(setup_review_workspace "")
  out=$(mktemp "${workspace}/out-$$.XXXXXX")
  full_prompt=$(printf '%s\n\n---\n\n## CONTENT TO REVIEW:\n\n%s\n\n---\n\nRespond with valid JSON only.' "$sp" "$prepared")

  codex_exec_single "$full_prompt" "$CODEX_REVIEW_MODEL" "$out" "$workspace" "$CODEX_REVIEW_TIMEOUT"

  # 6. Parse + redact + emit
  raw_response=$(cat "$out")
  cleanup_workspace "$workspace"
  resp=$(parse_codex_output "$raw_response")
  resp=$(echo "$resp" | jq --arg i "$iter" '. + {iteration: ($i | tonumber)}')
  resp=$(redact_secrets "$resp" "json")

  # 7. Optional: validate against schema (jq + ajv if available)
  # ajv validate -s "$SCHEMA_PATH" -d <(echo "$resp") || warn "Schema validation failed"

  echo "$resp"

  # Exit code maps verdict
  verdict=$(echo "$resp" | jq -r '.verdict')
  case "$verdict" in
    APPROVED) exit 0 ;;
    CHANGES_REQUIRED) exit 1 ;;
    *) exit 5 ;;
  esac
}

main "$@"
```

Key inheritance from gpt-review-api.sh:

- **Auto-approval at API level** (lines 264-269 of original) — `iter > MAX` returns approved without invoking model. Composition just increments iter; cap enforcement is INSIDE the script. Cleaner than composition-level cap logic.
- **Awk-based safe template substitution** (line 90 of original) — `{{ITERATION}}` and `{{PREVIOUS_FINDINGS}}` substituted via awk so shell metacharacters in findings don't break the prompt. Vision-002 pattern.
- **`prepare_content` for token budget** — git-diff-aware splitting + priority sort + truncation summary. P0 (security, .claude/) first, P3 (docs/tests) last. Inherits the entire 4-tier discipline from lib-content.sh.
- **`parse_codex_output` chain** — direct JSON → markdown fenced → greedy regex → Python3 `raw_decode` fallback. The Python3 fallback is critical for outputs that wrap JSON in prose with arbitrary nesting.
- **`redact_secrets` on response** — jq-based key-preserving redaction. Strips OpenAI/Anthropic/GitHub/AWS/JWT patterns from the response BEFORE it's emitted.

### `prompts/re-review.md` — convergence prompt

The re-review prompt is the LOAD-BEARING convergence asset. Adapting bonfire's verbatim with light edits:

**Substitutions**: `{{ITERATION}}`, `{{PREVIOUS_FINDINGS}}` (awk-safe).

**Invariants from the original** (preserve verbatim):

1. "**DO NOT find new nitpicks** — You already had your chance on the first review."
2. "**DO NOT raise the bar** — If something was acceptable before, it's acceptable now."
3. "**New concerns ONLY if truly blocking** — The fix broke something critical, not 'I noticed something else.'"
4. "**APPROVE** if previous issues are reasonably fixed, even if not perfect."
5. "**NO DECISION_NEEDED on re-review** — Design questions should have been raised on first review." (Aligns with our binary-verdict schema.)
6. "**Claude has more context than you.** If Claude's explanation is reasonable, accept it."
7. "**Default to APPROVED if the fixes are reasonable. Don't require perfection.**"
8. Closing: "**VERIFY. DON'T REINVENT. CONVERGE.**"

**Edits for the new construct**:
- Remove "5.2" model reference (we use 5.3-codex default)
- Remove DECISION_NEEDED reference from response format (binary verdict)
- Remove `blocking_issues` reference (code-only)
- Tighten to diff-only context (strip PRD/SDD/Sprint generality)

The convergence DISCIPLINE is what makes the iteration cap work without needing composition-level intervention. Without these prompt invariants, models drift into finding new issues on iteration 2+, and the loop never converges. **This prompt is the construct's most important asset — treat as canon, change with care.**

### `prompts/code-review.md` (the lean reviewer prompt)

Adapted from bonfire's gpt-review code-review prompt with these changes:
- Strip flatline-specific routing language
- Strip references to deprecated /gpt-review commands
- Tighten the WHAT TO IGNORE section (lean = aggressive on scope)
- Add explicit boundary statement: "This is diff-scoped code review. PRD/SDD review = different prompt; not your job here."

Single canonical version. No phase variants (the original had prd/sdd/sprint/code/re-review). For codex-review, only `code-review.md` and `re-review.md`.

### `schemas/codex-review-finding.schema.json` (locally-owned)

Aligned with the existing `gpt-review-response.schema.json` (draft-07, permissive) for ecosystem consistency. Major differences from the deprecated schema: no `SKIPPED`/`DECISION_NEEDED` verdicts (code review is binary — fixes, not discussions), no `blocking_issues` (code-only construct), no `new_blocking_concerns` on re-review (the convergence prompt explicitly forbids new concerns unless TRULY blocking).

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://0xhoneyjar.github.io/construct-codex-review/schemas/codex-review-finding.schema.json",
  "title": "Codex Review Finding",
  "description": "Structured output contract for codex-review reviewer skills. Diff-scoped code review only.",
  "type": "object",
  "required": ["verdict"],
  "properties": {
    "verdict": {
      "type": "string",
      "enum": ["APPROVED", "CHANGES_REQUIRED"],
      "description": "Code review verdict. Binary by design — bugs get fixed, not discussed."
    },
    "summary": {
      "type": "string",
      "description": "One sentence assessment"
    },
    "findings": {
      "type": "array",
      "description": "Code review findings (each with line-anchored fix)",
      "items": {
        "type": "object",
        "required": ["severity", "file", "description", "fixed_code"],
        "properties": {
          "severity": { "type": "string", "enum": ["critical", "major"] },
          "file": { "type": "string" },
          "line": { "type": "integer" },
          "description": { "type": "string" },
          "current_code": { "type": "string" },
          "fixed_code": { "type": "string" },
          "explanation": { "type": "string" }
        }
      }
    },
    "fabrication_check": {
      "type": "object",
      "description": "Fabrication detection (hardcoded values, stubbed functions, faked results)",
      "properties": {
        "passed": { "type": "boolean" },
        "concerns": { "type": "array", "items": { "type": "string" } }
      }
    },
    "previous_issues_status": {
      "type": "array",
      "description": "Per-issue status on re-review (iteration > 1)",
      "items": {
        "type": "object",
        "required": ["original_issue", "status"],
        "properties": {
          "original_issue": { "type": "string" },
          "status": { "type": "string", "enum": ["fixed", "rejected_with_valid_reason", "not_fixed"] },
          "notes": { "type": "string" }
        }
      }
    },
    "iteration": { "type": "integer", "description": "Review iteration number" },
    "auto_approved": { "type": "boolean", "description": "True when iteration > MAX_ITERATIONS triggered API-level auto-approval" },
    "note": { "type": "string", "description": "Additional notes appended by the API script" }
  }
}
```

**Permissive by design** (no `additionalProperties: false`). The wrapper script appends `iteration`, `auto_approved`, `note`, and other meta-fields after the model returns; strict mode would reject these. Strict validation can run on the model's RAW output (before wrapper enrichment) if needed.

Public `$id` URL via GitHub Pages on the construct repo. Follows the contracts-as-bridges pattern at the construct level — schema lives WITH the construct (cohesive impl), referenced via `$id` by consumers.

---

## Composition design

### YAML

`loa-compositions/compositions/delivery/code-implement-and-review.yaml`:

```yaml
schema_version: "1.0"
kind: workflow
name: code-implement-and-review
description: >
  Implement code changes, then run adversarial code review against the
  diff. Iterate until reviewer approves OR max 3 iterations reached.

intent: >
  "Operator delegates a coding task. Implementer ships a diff. Reviewer
   runs FAGAN over it, returns line-anchored findings with fixes.
   Implementer applies fixes. Reviewer re-reads, converges. Operator gets
   reviewed code, not raw output."

backend: headless-tmux

hivemind_labels:
  product_area: "Engineering — composable code review for compositions"
  workstream: delivery
  priority: high
  jtbd:
    category: personal
    description: "Reassure Me This Is Safe — implementer output gets a strict gate before reaching prod"
  source: team-internal

depends_on:
  constructs:
    - codex-rescue        # Anthropic's codex MCP — primary implementer
    - codex-review        # the new lean reviewer (FAGAN)
  tools:
    - codex-cli           # both stages depend on codex CLI being installed

inputs:
  - type: Intent
    name: task
    description: What the operator wants implemented
    required: true
  - type: Artifact
    name: scope
    description: Files / modules to limit changes to (avoid scope creep)
    required: false
  - type: Operator-Model
    name: operator_context
    required: false

iterate:
  - [1, 2]                 # implement ↔ review until approved or cap

chain:
  - stage: 1
    name: implement
    construct: codex-rescue
    skill: implement
    persona: CODEX-RESCUE
    mode: persistent
    reads: [Intent, Artifact, Verdict]   # Verdict from previous review iteration
    writes: [Artifact, Signal]           # Diff + trajectory
    role: primary
    iterates_with: 2
    thinking_effort: high
    notes: >
      First iteration: implement against the operator's task within scope.
      Subsequent iterations: read the previous review Verdict, apply
      every finding's fixed_code, re-emit Diff. Don't introduce new
      changes outside of fix scope unless the fix requires them.

  - stage: 2
    name: review
    construct: codex-review
    skill: reviewing-diffs
    persona: FAGAN
    mode: fresh                          # fresh context per iteration — no memory of previous reviews
    reads: [Artifact]                    # the diff
    writes: [Verdict, Signal]
    role: craft-gate
    iterates_with: 1
    thinking_effort: high
    notes: >
      Stage 1 emits Diff; this stage runs codex-review-api.sh review-diff
      against it. Returns structured JSON Verdict (APPROVED |
      CHANGES_REQUIRED + findings[]). On APPROVED, composition completes.
      On CHANGES_REQUIRED, loop back to stage 1 with findings as context.
      Iteration cap: 3 total reviews. After cap: emit Verdict with note
      "iteration-cap-reached" and surface to operator.

outputs:
  - type: Artifact
    destination: <repo>/<changed-files>
    description: The implemented + reviewed code changes
    hivemind_labels:
      artifact_type: product-spec
      learning_status: strongly-validated
  - type: Verdict
    destination: .run/compose/<run_id>/codex-review-trail.jsonl
    description: Per-iteration review verdicts + findings
    schema: https://0xhoneyjar.github.io/construct-codex-review/schemas/codex-review-finding.schema.json
  - type: Signal
    destination: .run/compose/<run_id>/orchestrator.jsonl
    description: Orchestrator trajectory (stage transitions, iteration counts)

compose_with:
  - codex-rescue
  - codex-review

composes_symmetrically_with:
  - codex-rescue ↔ codex-review   # implement ↔ review — load-bearing pair

invocation_examples:
  - operator_utterance: "implement the perf pass and review it"
    resolves_to: full chain stages 1-2 with iteration loop
  - operator_utterance: "review this diff"
    resolves_to: stage 2 only with operator-supplied Diff Artifact
  - operator_utterance: "skip review, just implement"
    resolves_to: stage 1 only (operator opts out of gate — surface as warning)

when_to_use: >
  - Implementer just shipped code (perf pass, refactor, feature)
  - Pre-merge gate on a PR diff
  - Any composition where "implement then verify" is the shape
  - NOT for PRD/SDD/Sprint review (use Flatline Protocol)
  - NOT for UI feel iteration (use feel-iterate)
  - NOT for architecture audits (use audit-feel or other audit-pair compositions)

known_limitations:
  - "Iteration cap of 3 is advisory; on culturetech-loose surfaces operator halts dictate progress; on defi-strict the cap enforces. See surface_class."
  - "Reviewer has no memory of previous reviews (mode: fresh per iteration). Convergence relies on the re-review prompt's discipline. If reviewer keeps finding NEW issues post-iteration-1, that's a prompt drift bug to file."
  - "Implementer (codex-rescue) requires the Anthropic codex MCP plugin installed. For environments without the plugin, swap with a CLI implementer (use the same codex CLI primitive directly)."

surface_class:
  default: unspecified
  enum: [culturetech-loose, defi-strict, mixed, unspecified]
  affects_in_this_composition:
    - iteration cap — advisory on culturetech-loose, enforced on defi-strict
    - severity threshold — major-only on culturetech-loose, all findings on defi-strict

thinking_effort:
  default: high
  rationale: "Both stages are multi-step synthesis (implement = production code; review = bug-finding + fix-authoring)."

version: "1.0.0"
authored_at: "2026-04-26"
authored_by: kickoff session 1 — codex-review
```

---

## Blast radius

| Artifact | Change | Risk | Repo |
|---|---|---|---|
| `construct-codex-review/` | NEW REPO (entire) | Low — isolated | new |
| `loa-constructs/registry.yaml` | MODIFIED — add codex-review entry | Low — append-only | loa-constructs |
| `loa-compositions/compositions/delivery/code-implement-and-review.yaml` | NEW | Low — isolated | loa-compositions |
| `loa-compositions/docs/SHAPES.md` | OPTIONAL: document implement-review pair as observed pattern | Low | loa-compositions |
| `loa-constructs/.claude/scripts/lib-codex-exec.sh` | UNCHANGED — vendored into construct repo with version-pin attribution | Zero | loa-constructs |
| Existing /gpt-review scripts in loa-constructs | UNCHANGED — stay soft-retired | Zero | loa-constructs |
| Flatline ecosystem | UNCHANGED — different responsibility | Zero | loa-constructs |

**No deletions.** No breaking changes. Existing flatline / gpt-review remain as-is.

---

## Build sequence (Barth — V1 ship now)

### V1 — Ship Now

1. **Create repo `construct-codex-review`** on 0xHoneyJar org. Public, MIT.
2. **Author `construct.yaml`** following construct-the-easel shape (schema_version 3, slug, version 0.1.0, skills + identity + persona refs).
3. **Author `identity/persona.yaml` + `identity/expertise.yaml`** (FAGAN placeholder; operator can rename).
4. **Author `prompts/code-review.md`** (lean SWE focus; strip flatline-specific routing; tighten WHAT TO IGNORE).
5. **Author `prompts/re-review.md`** (convergence-toward-approval prompt).
6. **Author `schemas/codex-review-finding.schema.json`** (verdict, findings[], fabrication_check, previous_issues_status).
7. **Vendor 3 libs** from `loa-constructs/.claude/scripts/` into `scripts/lib/`: `lib-codex-exec.sh`, `lib-security.sh`, `lib-content.sh`. Pin to a specific commit SHA. Write `VENDOR.md` with attribution + adaptations log. Adapt `lib-security.sh` to drop the `flatline_protocol.secret_scanning.patterns` config lookup (or rename to `codex_review.secret_patterns`).
8. **Author `scripts/codex-review-api.sh`** (~100 lines) — sources the 3 vendored libs, single backend (codex CLI only, no curl fallback in V1), inherits auto-approval pattern from gpt-review-api.sh:264-269, awk-safe template substitution for re-review prompt, validates response against schema.
9. **Author `skills/reviewing-diffs/SKILL.md` + `index.yaml`** — primary skill.
10. **Author `skills/reviewing-files/SKILL.md` + `index.yaml`** — secondary skill.
11. **Author bats tests** — only assertions that reflect actual behavior. Start with happy-path + 1-2 error cases. NO aspirational tests.
12. **Register in `loa-constructs/registry.yaml`** — add codex-review entry under `constructs:`.
13. **Author `loa-compositions/compositions/delivery/code-implement-and-review.yaml`** — pair codex-rescue + codex-review with iterate [[1, 2]].
14. **Run the composition end-to-end** on a real diff (henlo-monorepo would be the natural test bed — last night's perf pass left a clear "this should have had a review gate" gap).
15. **Verify the gate fires meaningfully** — run on intentionally buggy code, confirm CHANGES_REQUIRED returned with actionable findings.

### V2 — After Feedback

- **CLI implementer alternative**: an implementer that uses codex exec directly (no MCP plugin dep) for environments without codex-rescue
- **Pre-dispatch validation**: wire the construct's schema into compose-run.sh so malformed Verdict streams fail fast
- **Hivemind log entry** if the construct earns its place via real usage
- **MCP wrapper** for the construct (per `mcp-wraps-cli-pattern`)

### Cut from V1

- **Hooks** — no PostToolUse, no Stop hook, no auto-fire. Explicit invocation only. (Lesson from PR #523.)
- **Multi-persona expansion** — codex-review stays single-persona. Flatline-style multi-persona is a different construct, not a layer on this one.
- **Phase-aware prompts** (prd/sdd/sprint variants) — single code-review.md only. Other phases = Flatline territory.
- **Toggle commands** (/toggle-codex-review) — opt-in is via composition selection, not a global toggle.

---

## Failure modes to avoid (PR #523 archaeology)

1. **No silent always-on hooks**. The original PostToolUse hook fired on every Edit/Write but early-exited because config was null — pure noise in settings.json. Don't repeat.
2. **Tests must reflect reality**. The original 22 failing bats tests asserted behavior that contradicted the script's own design note. New tests are happy-path-first; assertions match implementation.
3. **No orphan code**. The original was deprecated because nothing invoked it. The new construct MUST have at least one composition consuming it (`code-implement-and-review.yaml`) before merging the construct repo.
4. **Clear scope from flatline**. The original gpt-review overlapped with flatline's territory. The new construct's `when_to_use` explicitly defers PRD/SDD/Sprint to Flatline.
5. **Working defaults**. The original config was NULL in distribution template. The new construct ships with a sensible default config that works out-of-the-box.
6. **Convergence discipline**. The original re-review prompt drifted into finding new issues on iteration 2+. The new prompt explicitly says "focus ONLY on whether previous issues were fixed."

---

## Verify

```bash
# After construct repo + composition land:
cd ~/Documents/GitHub/construct-codex-review
bun install                           # if it has node deps for tests
bash scripts/tests/run-all.sh         # bats tests, all green

# Validate schema against draft 2020-12
ajv validate -s schemas/codex-review-finding.schema.json -d test-fixtures/sample-finding.json

# Smoke test: review a known-buggy diff
bash scripts/codex-review-api.sh review-diff test-fixtures/buggy.diff
# Expected: verdict CHANGES_REQUIRED, ≥1 finding with current/fixed code

# Composition end-to-end:
cd ~/bonfire/loa-compositions
yq eval '.' compositions/delivery/code-implement-and-review.yaml > /dev/null   # YAML valid
# Validate against composition.schema.json
ajv validate -s https://raw.githubusercontent.com/0xHoneyJar/loa-constructs/main/.claude/schemas/composition.schema.json -d compositions/delivery/code-implement-and-review.yaml.json

# Run composition on real diff
loa compose-run code-implement-and-review --task "fix the off-by-one in foo.ts"
# Expected: stage 1 implements, stage 2 reviews, iterates if needed, completes with verdict trail
```

---

## Key references

| Topic | File / URL |
|---|---|
| contracts-as-bridges doctrine | `~/hivemind/wiki/concepts/contracts-as-bridges.md` |
| composition-schema-as-bridge doctrine | `~/hivemind/wiki/concepts/composition-schema-as-bridge.md` |
| Existing arch spec on schema sync | `loa-constructs/grimoires/loa/specs/arch-composition-schema-sync.md` |
| Composition schema (the bridge we consume) | `loa-constructs/.claude/schemas/composition.schema.json` |
| CLI primitive to wrap | `loa-constructs/.claude/scripts/lib-codex-exec.sh` |
| Construct repo template to follow | `~/Documents/GitHub/construct-the-easel/` |
| PR #523 deprecation context | commit `e25128ba` in loa-constructs |
| First-review prompt source (canonical) | `loa-constructs/.../prompts/gpt-review/base/code-review.md` (mirrors bonfire) |
| Re-review prompt source (canonical) | `loa-constructs/.../prompts/gpt-review/base/re-review.md` (mirrors bonfire) |
| Schema source (draft-07, permissive) | `loa-constructs/.claude/schemas/gpt-review-response.schema.json` |
| Vendor source — codex execution | `loa-constructs/.claude/scripts/lib-codex-exec.sh` (cycle-033) |
| Vendor source — auth + redaction | `loa-constructs/.claude/scripts/lib-security.sh` (cycle-033) |
| Vendor source — token budget + priority | `loa-constructs/.claude/scripts/lib-content.sh` (PR #235, Bridgebuilder Finding #1 extraction) |
| Reference wrapper (study, don't fork) | `loa-constructs/.claude/scripts/gpt-review-api.sh` (302 lines, has deprecation warning) |
| Existing composition example (pattern reference) | `~/bonfire/loa-compositions/compositions/delivery/feel-iterate.yaml` |
| Bonfire vs loa-constructs sync status | **identical** — `diff` returns empty. Source from loa-constructs. |

---

## Open questions to resolve in build session

1. **Persona name** — FAGAN is placeholder. Operator override?
2. **Construct repo name** — `construct-codex-review` proposed. Alternative: `construct-codex-reviewer` / `construct-adversarial-review` / something punchier?
3. **lib-codex-exec.sh: vendor vs source** — vendoring with version pin is cleaner (no runtime path dep); sourcing is simpler (auto-updates with loa-constructs). Lean toward vendor.
4. **Test-bed**: run the first composition end-to-end against henlo-monorepo? It's the natural test (perf pass left a clear gate-shaped hole). Or use a synthetic test fixture?
5. **Hivemind log entry** — write a `~/hivemind/wiki/concepts/codex-review-vs-flatline.md` page documenting the responsibility split? (Avoids future confusion.)
