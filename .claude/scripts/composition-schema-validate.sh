#!/usr/bin/env bash
# composition-schema-validate.sh — Sprint 0 verification gate
#
# Walks every fixture under tests/composition/schemas/fixtures/ and asserts
# its filename-encoded validation outcome against the matching schema:
#   <schema-slug>.valid.<label>.{json,yaml}        → schema MUST accept
#   <schema-slug>.invalid.<label>.{json,yaml}      → schema MUST reject
#
# Currently covers the 4 net-new JSON Schema files from S0-T1, S0-T2, S0-T3,
# S0-T5 plus a smoke test of the YAML config from S0-T4. The S0-T6/T7/T8
# extension fixtures land alongside the validator that consumes them in
# Sprint 1 (S1-T6).
#
# Exit codes:
#   0 = all fixtures behaved as expected
#   1 = at least one fixture mismatched its filename-encoded expectation
#   2 = environment issue (missing python3 or jsonschema package)
#
# Usage:
#   .claude/scripts/composition-schema-validate.sh         # full matrix
#   .claude/scripts/composition-schema-validate.sh --json  # JSON report
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
[[ -d "$REPO_ROOT/.claude" ]] || REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

FIXTURE_DIR="$REPO_ROOT/tests/composition/schemas/fixtures"
JSON_OUTPUT=false
[[ "${1:-}" == "--json" ]] && JSON_OUTPUT=true

# Map fixture filename prefix → schema path
declare -A SCHEMA_MAP=(
  ["construct-invocation-v0"]=".claude/schemas/runtime/construct-invocation-v0.schema.json"
  ["construct-handoff-v0"]=".claude/schemas/runtime/construct-handoff-v0.schema.json"
  ["legacy-domain-contract"]=".claude/schemas/network/legacy-domain-contract.schema.json"
  ["dry-run-fixture"]=".claude/data/dry-run-fixture.schema.json"
)

# Fixture filename grammar:
#   <prefix>.valid[.<suffix>].<ext>     → must validate
#   <prefix>.invalid.<suffix>.<ext>     → must NOT validate
parse_fixture_metadata() {
  local fname="$1"
  local prefix expectation
  if [[ "$fname" =~ ^([a-z0-9-]+)\.(valid|invalid)(\..+)?\.(json|yaml)$ ]]; then
    prefix="${BASH_REMATCH[1]}"
    expectation="${BASH_REMATCH[2]}"
    echo "$prefix $expectation"
  else
    echo ""
  fi
}

# Use python3 + jsonschema (Draft 7 + Draft 2020-12 supported by package).
# YAML fixtures are converted to JSON first via python yaml.safe_load.
python_validator='
import json, sys, pathlib
try:
    import jsonschema
except ImportError:
    print("ENV_MISSING jsonschema package not installed", file=sys.stderr)
    sys.exit(2)

schema_path, fixture_path = sys.argv[1], sys.argv[2]
schema = json.load(open(schema_path))

ext = pathlib.Path(fixture_path).suffix.lower()
if ext == ".yaml" or ext == ".yml":
    try:
        import yaml
    except ImportError:
        print("ENV_MISSING pyyaml package not installed", file=sys.stderr)
        sys.exit(2)
    instance = yaml.safe_load(open(fixture_path))
else:
    instance = json.load(open(fixture_path))

# Strip private _test_intent annotation if present (used to document
# rejection rationale inside fixtures themselves).
if isinstance(instance, dict):
    instance.pop("_test_intent", None)

# Pick validator class compatible with the schema metadata.
draft = schema.get("$schema", "")
if "2020-12" in draft:
    Validator = jsonschema.Draft202012Validator
elif "2019-09" in draft:
    Validator = jsonschema.Draft201909Validator
else:
    Validator = jsonschema.Draft7Validator

errors = list(Validator(schema).iter_errors(instance))
if errors:
    for e in errors[:3]:
        print(f"VALIDATION_ERROR {e.message}", file=sys.stderr)
    sys.exit(1)
sys.exit(0)
'

declare -i pass=0 fail=0 skip=0
declare -a results

shopt -s nullglob
for fixture in "$FIXTURE_DIR"/*; do
  fname="$(basename "$fixture")"
  meta=$(parse_fixture_metadata "$fname")
  if [[ -z "$meta" ]]; then
    skip+=1
    continue
  fi
  read -r prefix expectation <<<"$meta"

  # Special case: validation-tiers fixture has no JSON Schema (it IS a config,
  # not data conforming to a schema). Smoke-validate by parsing only.
  if [[ "$prefix" == "construct-validation-tiers" ]]; then
    if python3 -c "import yaml; yaml.safe_load(open('$fixture'))" 2>/dev/null; then
      pass+=1
      results+=("PASS yaml-parse $fname")
    else
      fail+=1
      results+=("FAIL yaml-parse $fname")
    fi
    continue
  fi

  schema="${SCHEMA_MAP[$prefix]:-}"
  if [[ -z "$schema" ]]; then
    skip+=1
    results+=("SKIP unmapped $fname")
    continue
  fi

  if python3 -c "$python_validator" "$REPO_ROOT/$schema" "$fixture" 2>/tmp/_csv_err; then
    actual="valid"
  else
    rc=$?
    if [[ $rc -eq 2 ]]; then
      echo "ENV: $(cat /tmp/_csv_err)" >&2
      exit 2
    fi
    actual="invalid"
  fi

  if [[ "$expectation" == "$actual" ]]; then
    pass+=1
    results+=("PASS $expectation $fname")
  else
    fail+=1
    results+=("FAIL expected=$expectation actual=$actual $fname")
    [[ -s /tmp/_csv_err ]] && results+=("       $(head -1 /tmp/_csv_err)")
  fi
done
shopt -u nullglob

if $JSON_OUTPUT; then
  printf '{ "pass": %d, "fail": %d, "skip": %d, "results": [\n' "$pass" "$fail" "$skip"
  first=true
  for r in "${results[@]}"; do
    $first || printf ',\n'
    first=false
    printf '  %s' "$(jq -Rn --arg s "$r" '$s')"
  done
  printf '\n] }\n'
else
  for r in "${results[@]}"; do
    echo "$r"
  done
  echo "---"
  echo "pass=$pass fail=$fail skip=$skip"
fi

[[ $fail -eq 0 ]]
