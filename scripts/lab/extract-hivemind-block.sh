#!/usr/bin/env bash
# extract-hivemind-block.sh — pull the `hivemind:` YAML block from a markdown file.
#
# Handles three shapes the operator authors in practice:
#   1. YAML frontmatter at top of file (between --- markers)
#   2. YAML code fence (```yaml ... ```) anywhere in the body
#   3. Embedded YAML block at column 0 of a markdown section
#
# Output: the CHILDREN of the hivemind: key (un-prefixed), suitable for piping
# to a labels validator that expects the keys at root.
#
# Used by: scripts/lab/validate-hivemind-labels.sh
# Origin:  #248 Phase A wire-up (loa-constructs TEND cycle 2026-05-27)
# Doctrine: extract-wrapper approach (vs frontmatter-only convention); preserves
#           operator flexibility to embed the block in different shapes.
#
# Exit codes:
#   0  block found + extracted
#   2  usage / I/O error
#   3  no hivemind: block found in input

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 <markdown-file>" >&2
  echo "       outputs the hivemind block contents to stdout (or exit 3 if not found)" >&2
  exit 2
fi

input="$1"

if [[ ! -r "$input" ]]; then
  echo "$0: cannot read $input" >&2
  exit 2
fi

output=$(awk '
  BEGIN { capturing = 0; child_indent = -1 }

  # Block header: `hivemind:` at column 0, optionally with trailing whitespace.
  /^hivemind:[[:space:]]*$/ {
    if (capturing == 0) {
      capturing = 1
      next
    }
  }

  capturing == 1 {
    # Code-fence close ends the block.
    if ($0 ~ /^[[:space:]]*```/) {
      capturing = 2
      next
    }
    # Skip blank lines (do not include in output, keeps it tight).
    if ($0 ~ /^[[:space:]]*$/) {
      next
    }
    # A child line must start with whitespace.
    if (match($0, /^[[:space:]]+/)) {
      this_indent = RLENGTH
      if (child_indent == -1) {
        child_indent = this_indent
      }
      if (this_indent < child_indent) {
        # De-indented past the block — end.
        capturing = 2
        next
      }
      # Strip the detected child indent (preserves relative inner indent).
      print substr($0, child_indent + 1)
    } else {
      # Non-indented non-blank = end of block.
      capturing = 2
    }
  }
' "$input")

if [[ -z "$output" ]]; then
  echo "$0: no hivemind: block found in $input" >&2
  exit 3
fi

echo "$output"
