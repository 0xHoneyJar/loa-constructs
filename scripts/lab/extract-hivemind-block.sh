#!/usr/bin/env bash
# Extract a hivemind: YAML block from markdown (frontmatter OR embedded block) and pipe to validator.
# Usage: extract-hivemind-block.sh <file>
set -euo pipefail

FILE="${1:?usage: extract-hivemind-block.sh <markdown-file>}"
VALIDATOR="$(cd "$(dirname "$0")/validator" && pwd)/hivemind-labels-validate"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

python3 - "$FILE" "$TMP" <<'PY'
import re, sys
out_path = sys.argv[2]
text = open(sys.argv[1], encoding="utf-8", errors="replace").read()
block = None
fm = re.match(r"^---\r?\n([\s\S]*?)\r?\n---", text)
if fm and re.search(r"(?m)^hivemind:", fm.group(1)):
    block = "---\n" + fm.group(1).rstrip() + "\n---"
else:
    m = re.search(r"(?m)^(\s*)hivemind:\s*$", text)
    if m:
        base = len(m.group(1))
        lines = ["hivemind:"]
        for ln in text[m.end():].splitlines():
            if not ln.strip():
                continue
            indent = len(ln) - len(ln.lstrip())
            if indent <= base and ln.strip():
                break
            lines.append(ln)
        if len(lines) > 1:
            block = "\n".join(lines)
if not block:
    sys.stderr.write("extract-hivemind-block: no hivemind block found\n")
    sys.exit(1)
open(out_path, "w", encoding="utf-8").write(block)
PY

"$VALIDATOR" --stdin --strict < "$TMP"
