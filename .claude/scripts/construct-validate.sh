#!/usr/bin/env bash
# =============================================================================
# construct-validate.sh — manifest validator + tier enforcement (cycle-005 L4 + S1-T4)
# =============================================================================
# Validates a construct pack directory against the cycle-005 manifest checks
# AND the bounded-context Sprint-1 tier enforcement rules from
# `.claude/data/construct-validation-tiers.yaml` (FR-3.3, SDD §3.4).
#
# Tiers govern how strictly each pack is enforced:
#   strict        — top-12 + post-cutoff packs must ship a complete domain block;
#                   missing pieces escalate from medium/low to high (fail closed
#                   in golden-path). Compatibility-contract files are forbidden.
#   compatibility — legacy packs that opt in via .claude/data/legacy-domain-contracts/<slug>.yaml.
#                   Missing contract → critical; bootstrap-only contracts → high.
#   advisory      — pre-substrate packs without contract; warn-only, but
#                   `runner_eligibility: golden_path_blocked` surfaces in output
#                   so compose-run refuses to schedule them in golden compositions.
#
# Usage:
#   construct-validate.sh <pack-path> [--json] [--strict] [--tier-config PATH]
#
# Checks:
#   1. construct.yaml present + parseable
#   2. required fields: schema_version, slug, name, version, description
#   3. skills[].path resolves to a filesystem directory
#   4. persona routes declared: identity/<HANDLE>.md file OR personas: list
#   5. /-commands OR persona handles exist (route-declaration closure)
#   6. streams declared: reads / writes not empty (severity tier-conditional)
#   7. domain declared: domain.primary preferred (severity tier-conditional)
#   8. capabilities/context_policy declared (severity tier-conditional)
#   9. CLAUDE.md contains an explicit grimoires read/write declaration
#  10. tier-conditional: contract presence (compat) / absence (strict),
#      bootstrap-only contract rejection, runner_eligibility marker
#
# Severity tiers:
#   critical — missing construct.yaml; missing compatibility contract;
#              forbidden contract on strict pack
#   high     — missing required field, broken skill path; strict-tier domain
#              gaps; bootstrap-only compat contract
#   medium   — no routes declared, missing grimoires section, advisory-tier
#              domain gaps; strict-tier capability/context_policy gaps
#   low      — empty streams/capability/context-policy on advisory tier
#   info     — pack passes all hard checks; runner_eligibility marker
#
# Exit codes:
#   0 = no high or critical findings
#   1 = at least one high/critical (or medium if --strict)
#   2 = pack path does not exist
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
SCHEMA_VERSION="1.0.0"

OUTPUT_JSON=0
STRICT=0
PACK_PATH=""
TIER_CONFIG="${LOA_TIER_CONFIG:-$PROJECT_ROOT/.claude/data/construct-validation-tiers.yaml}"

usage() { sed -n '2,52p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)        usage; exit 0 ;;
    --json)           OUTPUT_JSON=1; shift ;;
    --strict)         STRICT=1; shift ;;
    --tier-config)    TIER_CONFIG="$2"; shift 2 ;;
    -*) echo "[construct-validate] ERROR: unknown flag $1" >&2; exit 2 ;;
    *) if [[ -z "$PACK_PATH" ]]; then PACK_PATH="$1"; else echo "[construct-validate] ERROR: unexpected positional: $1" >&2; exit 2; fi; shift ;;
  esac
done

[[ -n "$PACK_PATH" ]] || { usage >&2; exit 2; }
PACK_PATH="$(cd "$PACK_PATH" 2>/dev/null && pwd)" || { echo "[construct-validate] ERROR: pack path does not exist: $PACK_PATH" >&2; exit 2; }

command -v yq >/dev/null 2>&1 || { echo "[construct-validate] ERROR: yq v4+ required" >&2; exit 2; }
command -v jq >/dev/null 2>&1 || { echo "[construct-validate] ERROR: jq required" >&2; exit 2; }

# -----------------------------------------------------------------------------
# Tier resolution (S1-T4)
# -----------------------------------------------------------------------------
# Order: explicit_packs in strict > contract file present (compatibility) >
# default_tier (advisory).
TIER="advisory"
TIER_REASON="default"
RUNNER_ELIGIBILITY="golden_path_blocked"
CONTRACT_PATH=""

resolve_tier() {
  local slug="$1"
  if [[ ! -f "$TIER_CONFIG" ]]; then
    return  # No tier config → fall back to legacy advisory behavior
  fi
  # Default tier
  local default_tier
  default_tier=$(yq eval '.default_tier // "advisory"' "$TIER_CONFIG" 2>/dev/null)
  TIER="$default_tier"
  TIER_REASON="default_tier"

  # Strict explicit packs
  local in_strict
  in_strict=$(yq eval ".tiers.strict.explicit_packs[] // \"\" | select(. == \"$slug\")" "$TIER_CONFIG" 2>/dev/null | head -n1)
  if [[ -n "$in_strict" ]]; then
    TIER="strict"
    TIER_REASON="explicit_top_12"
  fi

  # Compatibility: contract file present
  local template
  template=$(yq eval '.tiers.compatibility.contract_path_template // ""' "$TIER_CONFIG" 2>/dev/null)
  if [[ -n "$template" ]]; then
    local contract_candidate="${template/\{slug\}/$slug}"
    if [[ "$contract_candidate" != /* ]]; then
      contract_candidate="$PROJECT_ROOT/$contract_candidate"
    fi
    if [[ -f "$contract_candidate" ]]; then
      CONTRACT_PATH="$contract_candidate"
      # If pack is in strict's explicit_packs AND has a contract, that's a
      # configuration conflict — strict tier forbids contracts. Stay in strict
      # so the validator surfaces the contract-presence finding as critical.
      if [[ "$TIER" != "strict" ]]; then
        TIER="compatibility"
        TIER_REASON="contract_present"
      fi
    fi
  fi

  # Strict cutoff_date: if pack's construct.yaml `created` field is post-cutoff
  # AND tier is still default (advisory), upgrade to strict. Best-effort —
  # legacy packs without `created` field are NOT auto-upgraded.
  if [[ "$TIER" == "advisory" && -f "$PACK_PATH/construct.yaml" ]]; then
    local cutoff created
    cutoff=$(yq eval '.tiers.strict.cutoff_date // ""' "$TIER_CONFIG" 2>/dev/null)
    created=$(yq eval '.created // ""' "$PACK_PATH/construct.yaml" 2>/dev/null)
    if [[ -n "$cutoff" && -n "$created" && "$created" > "$cutoff" ]]; then
      TIER="strict"
      TIER_REASON="post_cutoff_${cutoff}"
    fi
  fi

  # Resolve runner_eligibility from the tier's enforcement block
  local eligibility
  eligibility=$(yq eval ".tiers.${TIER}.enforcement.runner_eligibility // \"\"" "$TIER_CONFIG" 2>/dev/null)
  if [[ "$eligibility" == "golden_path_allowed" ]]; then
    RUNNER_ELIGIBILITY="golden_path_allowed"
  else
    RUNNER_ELIGIBILITY="golden_path_blocked"
  fi
}

# Severity escalation per tier — used when emitting findings tied to a check
# whose strictness varies (domain, streams, capabilities, context_policy).
escalate() {
  # escalate <check> <baseline_severity>
  local check="$1" base="$2"
  case "$TIER:$check" in
    strict:domain)             echo "high" ;;
    strict:streams)            echo "high" ;;
    strict:capabilities)       echo "medium" ;;
    strict:context_policy)     echo "medium" ;;
    compatibility:domain)      echo "$base" ;;  # Contract supplies it; baseline is fine.
    compatibility:streams)     echo "$base" ;;
    *)                         echo "$base" ;;
  esac
}

declare -a FINDINGS=()

emit_finding() {
  local severity="$1" check="$2" message="$3" evidence="${4:-}"
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local row
  row=$(jq -n \
    --arg sv "$severity" --arg ck "$check" --arg msg "$message" \
    --arg ev "$evidence" --arg ts "$ts" \
    --arg schema_version "$SCHEMA_VERSION" --arg pack "$PACK_PATH" \
    '{
      stream_type: "Verdict",
      schema_version: $schema_version,
      timestamp: $ts,
      source: "construct-validate",
      verdict: ("[" + $ck + "] " + $msg),
      severity: $sv,
      evidence: ([$ev] | map(select(. != ""))),
      subject: $pack,
      tags: [$ck]
    }')
  FINDINGS+=("$row")
}

PACK_YAML="$PACK_PATH/construct.yaml"
if [[ ! -f "$PACK_YAML" ]]; then
  emit_finding critical construct_yaml "construct.yaml not found in pack root" "$PACK_PATH"
else
  PACK_JSON=$(yq -o=json '.' "$PACK_YAML" 2>/dev/null) || PACK_JSON=""
  if [[ -z "$PACK_JSON" ]]; then
    emit_finding critical construct_yaml "construct.yaml failed to parse" "$PACK_YAML"
  else
    # Resolve tier from the pack's slug BEFORE applying tier-conditional severity.
    PACK_SLUG=$(echo "$PACK_JSON" | jq -r '.slug // empty')
    if [[ -n "$PACK_SLUG" ]]; then
      resolve_tier "$PACK_SLUG"
    fi

    # Tier-conditional contract presence rules (S1-T4):
    # - strict tier MUST NOT have a legacy compat contract → critical
    # - compatibility tier MUST have a contract → critical
    # - bootstrap-only contracts (empty out_of_domain) on compat → high
    if [[ "$TIER" == "strict" && -n "$CONTRACT_PATH" ]]; then
      emit_finding critical tier_contract_forbidden \
        "strict tier pack has compatibility contract at $CONTRACT_PATH (forbidden — strict packs must declare domain in manifest, not via contract)" \
        "$CONTRACT_PATH"
    fi
    if [[ "$TIER" == "compatibility" && -z "$CONTRACT_PATH" ]]; then
      template=$(yq eval '.tiers.compatibility.contract_path_template // ""' "$TIER_CONFIG" 2>/dev/null)
      expected="${template/\{slug\}/$PACK_SLUG}"
      emit_finding critical tier_contract_required \
        "compatibility tier pack is missing contract; expected at $expected" \
        "$PACK_YAML"
    fi
    if [[ "$TIER" == "compatibility" && -n "$CONTRACT_PATH" ]]; then
      out_of_domain_count=$(yq eval '(.out_of_domain // []) | length' "$CONTRACT_PATH" 2>/dev/null || echo 0)
      invariants_count=$(yq eval '(.invariants // []) | length' "$CONTRACT_PATH" 2>/dev/null || echo 0)
      if [[ "$out_of_domain_count" == "0" && "$invariants_count" == "0" ]]; then
        emit_finding high tier_contract_bootstrap \
          "compatibility contract is bootstrap-only (empty out_of_domain + invariants); operator must complete before pack can run in golden-path" \
          "$CONTRACT_PATH"
      fi
    fi

    # Required fields
    for field in schema_version slug name version description; do
      val=$(echo "$PACK_JSON" | jq -r --arg f "$field" '.[$f] // empty')
      [[ -z "$val" ]] && emit_finding high required_field "construct.yaml missing required field '$field'" "$PACK_YAML"
    done

    # skills[].path resolution
    mapfile -t skills < <(echo "$PACK_JSON" | jq -r '(.skills // [])[] | .path // empty')
    for s in "${skills[@]}"; do
      [[ -z "$s" ]] && continue
      if [[ ! -d "$PACK_PATH/$s" && ! -L "$PACK_PATH/$s" ]]; then
        emit_finding high skill_path "skills[].path does not resolve: $s" "$PACK_YAML"
      fi
    done

    # Commands consistency (if declared) — every commands[].path must exist
    mapfile -t cmd_paths < <(echo "$PACK_JSON" | jq -r '(.commands // [])[] | .path // empty')
    for c in "${cmd_paths[@]}"; do
      [[ -z "$c" ]] && continue
      if [[ ! -f "$PACK_PATH/$c" ]]; then
        emit_finding high command_path "commands[].path does not resolve: $c" "$PACK_YAML"
      fi
    done

    # F28 gate — pack must declare at least one route: commands OR persona handles
    cmd_count=$(echo "$PACK_JSON" | jq '(.commands // []) | length')
    persona_count=0
    if [[ -d "$PACK_PATH/identity" ]]; then
      persona_count=$(find "$PACK_PATH/identity" -maxdepth 1 -name '*.md' -print | while read -r f; do base=$(basename "$f" .md); [[ "$base" =~ ^[A-Z][A-Z0-9_]+$ ]] && echo 1; done | wc -l | tr -d ' ')
    fi
    listed_personas=$(echo "$PACK_JSON" | jq '(.personas // []) | length')
    if (( cmd_count == 0 && persona_count == 0 && listed_personas == 0 )); then
      emit_finding medium route_declared "F28: pack declares neither commands: nor personas — operator can only route by slug/name" "$PACK_YAML"
    fi

    # Stream declarations — severity tier-conditional
    reads_count=$(echo "$PACK_JSON" | jq '(.reads // .streams.reads // []) | length')
    writes_count=$(echo "$PACK_JSON" | jq '(.writes // .streams.writes // []) | length')
    streams_severity=$(escalate streams low)
    if (( reads_count == 0 )); then
      emit_finding "$streams_severity" streams "construct declares no 'reads:' stream types — pipe composition will be ambiguous" "$PACK_YAML"
    fi
    if (( writes_count == 0 )); then
      emit_finding "$streams_severity" streams "construct declares no 'writes:' stream types — pipe composition will be ambiguous" "$PACK_YAML"
    fi

    # Domain declaration — every construct should name its bounded context.
    # Legacy domain forms are accepted for brownfield compatibility, but the
    # object form lets DDD concepts compose with Hounfour/Finn runtime routing.
    domain_type=$(echo "$PACK_JSON" | jq -r 'if has("domain") then (.domain | type) else "missing" end')
    domain_missing_severity=$(escalate domain medium)
    case "$domain_type" in
      missing)
        emit_finding "$domain_missing_severity" domain "construct.yaml missing domain declaration — constructs must declare a bounded domain model" "$PACK_YAML"
        ;;
      string)
        emit_finding low domain "construct.yaml uses legacy single domain tag; prefer domain.primary/supporting/ubiquitous_language/out_of_domain" "$PACK_YAML"
        ;;
      array)
        domain_len=$(echo "$PACK_JSON" | jq '(.domain // []) | length')
        if (( domain_len == 0 )); then
          emit_finding "$domain_missing_severity" domain "construct.yaml domain array is empty" "$PACK_YAML"
        else
          emit_finding low domain "construct.yaml uses legacy domain tag array; prefer domain.primary/supporting/ubiquitous_language/out_of_domain" "$PACK_YAML"
        fi
        ;;
      object)
        primary=$(echo "$PACK_JSON" | jq -r '.domain.primary // empty')
        if [[ -z "$primary" ]]; then
          emit_finding "$domain_missing_severity" domain "construct.yaml domain object missing domain.primary" "$PACK_YAML"
        elif [[ "$primary" =~ ^TODO ]]; then
          emit_finding "$domain_missing_severity" domain "construct.yaml domain.primary still contains scaffold placeholder" "$PACK_YAML"
        fi

        ubiquitous_count=$(echo "$PACK_JSON" | jq '(.domain.ubiquitous_language // []) | length')
        if (( ubiquitous_count == 0 )); then
          emit_finding low domain "construct.yaml domain missing ubiquitous_language terms" "$PACK_YAML"
        elif echo "$PACK_JSON" | jq -e '(.domain.ubiquitous_language // []) | any(type == "string" and startswith("TODO"))' >/dev/null; then
          emit_finding low domain "construct.yaml domain.ubiquitous_language still contains scaffold placeholder" "$PACK_YAML"
        fi

        boundary_count=$(echo "$PACK_JSON" | jq '(.domain.out_of_domain // []) | length')
        if (( boundary_count == 0 )); then
          emit_finding low domain "construct.yaml domain missing out_of_domain boundary declarations" "$PACK_YAML"
        elif echo "$PACK_JSON" | jq -e '(.domain.out_of_domain // []) | any(type == "string" and startswith("TODO"))' >/dev/null; then
          emit_finding low domain "construct.yaml domain.out_of_domain still contains scaffold placeholder" "$PACK_YAML"
        fi
        ;;
      *)
        emit_finding medium domain "construct.yaml domain must be an object or legacy string/array tag declaration" "$PACK_YAML"
        ;;
    esac

    # Runtime/schema alignment hints — severity tier-conditional.
    capability_severity=$(escalate capabilities low)
    capability_type=$(echo "$PACK_JSON" | jq -r 'if has("capabilities") then (.capabilities | type) else "missing" end')
    if [[ "$capability_type" == "missing" ]]; then
      emit_finding "$capability_severity" capabilities "construct.yaml missing capabilities metadata — map construct powers toward Hounfour CapabilitySchema" "$PACK_YAML"
    elif [[ "$capability_type" != "object" ]]; then
      emit_finding low capabilities "construct.yaml capabilities should be an object with schema-aligned metadata" "$PACK_YAML"
    fi

    context_policy_severity=$(escalate context_policy low)
    context_policy_type=$(echo "$PACK_JSON" | jq -r 'if has("context_policy") then (.context_policy | type) else "missing" end')
    if [[ "$context_policy_type" == "missing" ]]; then
      emit_finding "$context_policy_severity" context_policy "construct.yaml missing context_policy — runtime isolation rules should be declared, even if enforcement lives in Finn/compose-run" "$PACK_YAML"
    elif [[ "$context_policy_type" != "object" ]]; then
      emit_finding low context_policy "construct.yaml context_policy should be an object" "$PACK_YAML"
    fi

    # Surface tier resolution for compose-run consumers (info, never blocks).
    emit_finding info tier_resolution "tier=$TIER reason=$TIER_REASON runner_eligibility=$RUNNER_ELIGIBILITY" "$PACK_YAML"
  fi
fi

# Grimoires-section convention — CLAUDE.md must carry an explicit
# grimoires/<path> declaration paired with a read/write directive. The
# grimoire-path declarations ARE the pack's interface contract: every other
# construct in the network reads them to learn what state this pack reads
# and writes.
CLAUDE_MD="$PACK_PATH/CLAUDE.md"
if [[ -f "$CLAUDE_MD" ]]; then
  if ! grep -qiE 'grimoires?/' "$CLAUDE_MD"; then
    emit_finding medium grimoires_section \
      "CLAUDE.md contains no grimoires/ path reference — the grimoire path IS the pack's interface contract" \
      "$CLAUDE_MD"
  else
    # Must reference at least one of: 'Writes to', 'Reads from', 'writes:' or 'reads:'
    if ! grep -qiE '(writes to|reads from|writes:|reads:)' "$CLAUDE_MD"; then
      emit_finding medium grimoires_section \
        "CLAUDE.md mentions grimoires/ but lacks explicit read/write declaration" \
        "$CLAUDE_MD"
    fi
  fi
else
  emit_finding medium claude_md "pack is missing CLAUDE.md — operator-facing description not declared" "$PACK_PATH"
fi

# Exit-code calculation
worst="info"
for row in "${FINDINGS[@]}"; do
  sev=$(echo "$row" | jq -r '.severity')
  case "$sev" in
    critical) worst="critical" ;;
    high) [[ "$worst" != "critical" ]] && worst="high" ;;
    medium) [[ "$worst" != "critical" && "$worst" != "high" ]] && worst="medium" ;;
    low) [[ "$worst" == "info" ]] && worst="low" ;;
  esac
done

# Output
if (( OUTPUT_JSON == 1 )); then
  if (( ${#FINDINGS[@]} == 0 )); then
    findings_json="[]"
  else
    findings_json=$(printf '%s\n' "${FINDINGS[@]}" | jq -s '.')
  fi
  jq -n \
    --arg pack "$PACK_PATH" \
    --arg tier "$TIER" \
    --arg reason "$TIER_REASON" \
    --arg eligibility "$RUNNER_ELIGIBILITY" \
    --arg contract "$CONTRACT_PATH" \
    --arg worst "$worst" \
    --argjson findings "$findings_json" \
    '{
      pack: $pack,
      tier: $tier,
      tier_reason: $reason,
      runner_eligibility: $eligibility,
      contract_path: (if ($contract | length) > 0 then $contract else null end),
      worst_severity: $worst,
      findings: $findings
    }'
else
  echo "# construct-validate · $PACK_PATH"
  echo "# tier: $TIER ($TIER_REASON) · runner_eligibility: $RUNNER_ELIGIBILITY"
  if (( ${#FINDINGS[@]} == 0 )); then
    echo "  ✓ all checks passed"
  else
    for row in "${FINDINGS[@]}"; do
      sev=$(echo "$row" | jq -r '.severity')
      msg=$(echo "$row" | jq -r '.verdict')
      ev=$(echo "$row" | jq -r '.evidence[0] // "-"')
      printf "  [%s] %s\n    → %s\n" "$sev" "$msg" "$ev"
    done
  fi
  echo "# worst: $worst · total: ${#FINDINGS[@]}"
fi

case "$worst" in
  critical|high) exit 1 ;;
  medium)        (( STRICT )) && exit 1 || exit 0 ;;
  *) exit 0 ;;
esac
