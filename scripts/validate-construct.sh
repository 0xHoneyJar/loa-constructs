#!/usr/bin/env bash
# validate-construct.sh — Validate construct.yaml against canonical JSON Schema
# Usage: ./scripts/validate-construct.sh <construct.yaml> [schema.json]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_SCHEMA="$REPO_ROOT/.claude/schemas/construct.schema.json"

usage() {
  echo "Usage: $0 <construct.yaml> [schema.json]"
  echo ""
  echo "Validates a construct.yaml file against the canonical JSON Schema."
  echo ""
  echo "Arguments:"
  echo "  construct.yaml   Path to the YAML file to validate"
  echo "  schema.json      Path to schema (default: .claude/schemas/construct.schema.json)"
  echo ""
  echo "Requires: yq (v4+), node"
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

YAML_FILE="$1"
SCHEMA_FILE="${2:-$DEFAULT_SCHEMA}"

if [[ ! -f "$YAML_FILE" ]]; then
  echo "ERROR: File not found: $YAML_FILE" >&2
  exit 1
fi

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "ERROR: Schema not found: $SCHEMA_FILE" >&2
  exit 1
fi

if ! command -v yq &>/dev/null; then
  echo "ERROR: yq is required (brew install yq)" >&2
  exit 1
fi

# Convert YAML to JSON
JSON_DATA=$(yq -o json "$YAML_FILE")

# Validate using Node.js with AJV (available in monorepo deps)
node -e "
const Ajv2020 = require('$REPO_ROOT/apps/api/node_modules/ajv/dist/2020');
const addFormats = require('$REPO_ROOT/apps/api/node_modules/ajv-formats');
const schema = require('$SCHEMA_FILE');
const data = JSON.parse(process.argv[1]);

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);

const validate = ajv.compile(schema);
const valid = validate(data);

if (valid) {
  console.log(process.argv[2] + ' valid');
  process.exit(0);
} else {
  console.error(process.argv[2] + ' invalid');
  for (const err of validate.errors) {
    console.error('  ' + (err.instancePath || '/') + ': ' + err.message);
  }
  process.exit(1);
}
" "$JSON_DATA" "$(basename "$YAML_FILE")"
