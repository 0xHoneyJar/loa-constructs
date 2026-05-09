#!/usr/bin/env python3
"""
jcs-fallback.py — Sprint 6 (S6-H2) — shared JCS canonicalizer

Closes the cycle's carry-forward Finding F3 (JCS fallback breadth grew to
4 sites: envelope-chain, envelope-builder, output-gate, compose-dry-run)
AND Bridgebuilder B-002 (JCS canonicalization defined twice — divergence
risk if a future contributor optimizes one but not the other).

Single function. All four callers import from here. Adds the audit_signed
fail-closed guard that Sprint 1 audit's CONCERN-2 / Sprint 2 audit F3
recommended: when `audit_signed: true` AND `rfc8785` is missing, refuse
rather than silently fall back to JSON-only canonical (which diverges on
floats from RFC 8785's ECMAScript ToNumber semantics).

API:

    jcs_canonical_bytes(value: Any, *, audit_signed: bool = False) -> bytes
        Returns the JCS-canonical UTF-8 bytes of `value`. Prefers `rfc8785`
        package when available (cycle-098 canonical). Falls back to
        `json.dumps(sort_keys=True, separators=(",",":"), ensure_ascii=False)`
        when rfc8785 is missing.

        When `audit_signed=True` AND rfc8785 is missing, raises
        `JCSStrictModeRequired` — caller must handle (the substrate's
        audit-grade signed envelopes MUST use the canonical implementation
        because cycle-098's audit_emit_signed uses it).

    sha256_hex(data: bytes) -> str
        Convenience: `"sha256:" + hashlib.sha256(data).hexdigest()`. Used by
        every callsite that combines canonicalization with hashing.

Backward-compatibility shim:

    Each existing site (envelope-chain.py, envelope-builder.py,
    output-gate.py, compose-dry-run.py) keeps its `_jcs_canonical_bytes`
    function name BUT delegates to this module via importlib.util. Net
    diff at each callsite: ~4 lines (drop the local definition, add the
    import + delegate).

CLI (for shell callers + tests):

    jcs-fallback.py canonicalize [--audit-signed] [--input -|<path>]
        Read JSON from stdin (or `--input <path>`); print canonical bytes
        to stdout. Exit 1 if --audit-signed and rfc8785 missing. Exit 0
        otherwise.

    jcs-fallback.py sha256 [--audit-signed] [--input -|<path>]
        Read JSON; print "sha256:<hex>" of the canonical bytes.

Exit codes:
    0   succeeded
    1   strict-mode required (rfc8785 missing AND audit_signed)
    2   usage / parse error
    3   environment problem (input file missing)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


class JCSStrictModeRequired(RuntimeError):
    """Raised when audit_signed=True AND rfc8785 is missing.

    The cycle's audit-signed envelopes MUST use the rfc8785 canonical
    because cycle-098's `audit_emit_signed` uses it; falling back to the
    JSON-only canonical would produce a hash that diverges on float values
    (and on large integers, depending on the encoder), breaking chain
    replay across substrate components.

    Operators install rfc8785 via:
        pip install rfc8785
    """


def jcs_canonical_bytes(value: Any, *, audit_signed: bool = False) -> bytes:
    """Single shared JCS canonicalizer.

    Prefers `rfc8785` package (cycle-098 canonical). Falls back to
    `json.dumps(sort_keys=True, separators=(",",":"), ensure_ascii=False)`
    when rfc8785 is missing.

    The fallback is byte-equivalent to RFC 8785 JCS for objects, arrays,
    strings, booleans, null, and integers — i.e. the substrate's typed-streams
    payload contract. It diverges only on floats (RFC 8785 mandates
    ECMAScript ToNumber semantics, which `json.dumps` does not implement).
    The substrate doesn't currently carry floats, so the fallback is
    materially correct for non-audit-signed paths.

    When `audit_signed=True` AND rfc8785 is missing, raises
    `JCSStrictModeRequired` instead of silently falling back. Audit-signed
    envelopes pair with cycle-098's `audit_emit_signed` which uses rfc8785
    for hash computation — a fallback hash here would diverge from the
    audit log's hash, breaking chain replay.
    """
    try:
        import rfc8785  # type: ignore[import-untyped]
    except ImportError:
        if audit_signed:
            raise JCSStrictModeRequired(
                "rfc8785 package required when audit_signed=True; "
                "install via `pip install rfc8785`. The substrate's "
                "audit-grade chain must use the canonical implementation "
                "because cycle-098 audit_emit_signed uses it."
            )
        return json.dumps(
            value, sort_keys=True, separators=(",", ":"), ensure_ascii=False
        ).encode("utf-8")
    return rfc8785.dumps(value)


def sha256_hex(data: bytes) -> str:
    """Compute a `sha256:<hex>` digest of bytes.

    Used by every site that combines JCS canonicalization with sha256 hashing
    (envelope self-hash, envelope prev_hash, output-gate hash recompute).
    """
    return "sha256:" + hashlib.sha256(data).hexdigest()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _read_input(input_arg: str) -> Any:
    if input_arg == "-":
        text = sys.stdin.read()
    else:
        path = Path(input_arg)
        if not path.is_file():
            print(f"ENV: input file not found at {path}", file=sys.stderr)
            sys.exit(3)
        text = path.read_text()
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        print(f"USAGE: invalid JSON: {exc}", file=sys.stderr)
        sys.exit(2)


def _cmd_canonicalize(args: argparse.Namespace) -> int:
    value = _read_input(args.input)
    try:
        sys.stdout.buffer.write(jcs_canonical_bytes(value, audit_signed=args.audit_signed))
    except JCSStrictModeRequired as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


def _cmd_sha256(args: argparse.Namespace) -> int:
    value = _read_input(args.input)
    try:
        canonical = jcs_canonical_bytes(value, audit_signed=args.audit_signed)
    except JCSStrictModeRequired as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print(sha256_hex(canonical))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Shared JCS canonicalizer (S6-H2, closes F3 + B-002).",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_can = sub.add_parser("canonicalize", help="Print JCS-canonical bytes")
    p_can.add_argument("--audit-signed", action="store_true",
                       help="Fail-closed when rfc8785 missing (audit-grade signing requires it)")
    p_can.add_argument("--input", default="-", help="JSON input path or '-' for stdin (default '-')")
    p_can.set_defaults(fn=_cmd_canonicalize)

    p_sha = sub.add_parser("sha256", help="Print sha256:<hex> of JCS-canonical bytes")
    p_sha.add_argument("--audit-signed", action="store_true")
    p_sha.add_argument("--input", default="-")
    p_sha.set_defaults(fn=_cmd_sha256)

    args = parser.parse_args()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
