#!/usr/bin/env bash
# Extract a hivemind: YAML block from markdown (frontmatter OR embedded block) and pipe to validator.
# Usage: extract-hivemind-block.sh <file>
set -euo pipefail

FILE="${1:?usage: extract-hivemind-block.sh <markdown-file>}"
VALIDATOR="$(cd "$(dirname "$0")/validator" && pwd)/hivemind-labels-validate"

python3 - "$FILE" <<'PY' | "$VALIDATOR" --stdin --strict
import re, sys
text = open(sys.argv[1], encoding="utf-8", errors="replace").read()
fm = re.match(r"^---\r?\n([\s\S]*?)\r?\n---", text)
if fm and re.search(r"(?m)^hivemind:", fm.group(1)):
    print("---")
    print(fm.group(1).rstrip())
    print("---")
    sys.exit(0)
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
        print("\n".join(lines))
        sys.exit(0)
sys.stderr.write("extract-hivemind-block: no hivemind block found\n")
sys.exit(1)
PY
