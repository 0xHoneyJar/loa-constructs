#!/usr/bin/env bash
# T2.9 fixture driver — the ONLY door the L4 proof uses to touch a trust ledger.
#
# All transitions go through the real graduated-trust lib (trust_grant /
# trust_record_override) — never a hand-edited field, never a raw audit_emit
# (agent-network-reference.md L4 constraints). The caller points the lib at a
# fixture ledger + config via LOA_TRUST_LEDGER_FILE / LOA_TRUST_CONFIG_FILE.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"
# shellcheck source=/dev/null
source "${repo_root}/.claude/scripts/lib/graduated-trust-lib.sh"

# macOS-compat shim (fixture-only, System Zone untouched): the lib's token regex
# uses {1,256}, but macOS libc ERE caps repetition bounds at RE_DUP_MAX=255, so
# the pattern never compiles here and every token is rejected. CI (glibc) runs
# the lib exactly as shipped; this override only tightens the max length by one.
# Upstream defect logged via log-discovered-issue.sh (sprint-228 T2.9).
if ! [[ "x" =~ ^[a-z]{1,256}$ ]] 2>/dev/null; then
    _L4_TOKEN_RE='^[A-Za-z0-9._/:@-]{1,255}$'
fi

cmd="${1:-}"
shift || true
case "$cmd" in
  grant)    trust_grant "$@" ;;
  override) trust_record_override "$@" ;;
  query)    trust_query "$@" ;;
  *)
    echo "usage: drive.sh grant|override|query <args…>" >&2
    exit 2
    ;;
esac
