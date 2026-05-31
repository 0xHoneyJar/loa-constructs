#!/usr/bin/env python3
"""
envelope-chain.py — Sprint 2 (S2-T2) — hash chain library

Implements the two-pass hash algorithm + prev_hash topology + chain validator
for the Construct Bounded-Context Runtime Substrate (cycle-construct-bounded-context,
SDD §3.1, FR-1.6).

Core operations:

    compute_self_hash(envelope_dict, hash_field) -> "sha256:..."
        Strip the existing self-hash field (if any), JCS-canonicalize, sha256.
        Two-pass design closes the self-reference paradox: first canonicalize
        WITHOUT the hash field, then write the result back into the field.

    compute_prev_hash(prior_envelope_dict) -> "sha256:..."
        prev_hash links the current envelope to the prior envelope's COMPLETE
        canonical form (with that prior envelope's self-hash already populated).
        For first stage's invocation, prev_hash = null.

    validate_chain(envelopes_in_order) -> ValidationResult
        Walks the full chain. For each envelope, verifies:
          (a) self-hash recomputes correctly (envelope is intact),
          (b) prev_hash equals the prior envelope's stored self-hash,
          (c) for handoff envelopes, prev_hash equals the paired invocation's
              invocation_hash (handoff → paired invocation).
          (d) for invocation envelopes after the first, prev_hash equals the
              prior stage's handoff_hash (invocation → prior handoff).

Chain topology (per SDD §3.1):

    stage 1 invocation (prev_hash=null,    invocation_hash=I1)
       ↓ (paired by stage)
    stage 1 handoff    (prev_hash=I1,      handoff_hash=H1)
       ↓ (chain to next stage)
    stage 2 invocation (prev_hash=H1,      invocation_hash=I2)
       ↓
    stage 2 handoff    (prev_hash=I2,      handoff_hash=H2)

The library is consumed by:
  - lib/envelope-builder.sh (S2-T1) — to compute hashes when constructing envelopes
  - the composition runner — to validate the chain at run startup + per-stage
  - tests/composition/envelopes/run.bats (S2-T6) — for tampering-detection tests

CLI shapes:

    envelope-chain.py self-hash   --envelope <path> [--field invocation_hash|handoff_hash]
    envelope-chain.py prev-hash   --prior <path>
    envelope-chain.py validate    --chain-dir <dir>          (validates all *.json in order)
    envelope-chain.py validate    --envelopes <path> [<path>...]
    envelope-chain.py compose-id  --composition <yaml-path>  (S2-T3)

Exit codes:
    0 — operation succeeded (chain validates / hash printed)
    1 — chain validation failed ([ENVELOPE-CHAIN-BROKEN])
    2 — usage / parse error
    3 — environment problem
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

# Sibling-module load: jcs-fallback.py (S6-H2 shared canonicalizer).
# Same loading pattern as envelope-builder uses for envelope-chain.
_THIS_DIR = Path(__file__).resolve().parent
_JCS_SPEC = importlib.util.spec_from_file_location(
    "_jcs_fallback", _THIS_DIR / "jcs-fallback.py"
)
if _JCS_SPEC is None or _JCS_SPEC.loader is None:  # pragma: no cover
    raise SystemExit("ENV: cannot locate jcs-fallback.py adjacent to envelope-chain.py")
_jcs_fallback = importlib.util.module_from_spec(_JCS_SPEC)
sys.modules["_jcs_fallback"] = _jcs_fallback
_JCS_SPEC.loader.exec_module(_jcs_fallback)


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


@dataclass
class _ExitWith(Exception):
    code: int
    message: str


def _err_env(message: str) -> _ExitWith:
    return _ExitWith(3, f"ENV: {message}")


def _err_usage(message: str) -> _ExitWith:
    return _ExitWith(2, f"USAGE: {message}")


# ---------------------------------------------------------------------------
# JCS canonicalization
# ---------------------------------------------------------------------------


def _jcs_canonical_bytes(value: Any, *, audit_signed: bool = False) -> bytes:
    """JCS canonicalizer — delegates to lib/jcs-fallback.py (S6-H2 closes F3+B-002).

    Single shared definition across the substrate. When audit_signed=True and
    rfc8785 is missing, raises JCSStrictModeRequired (caller MUST handle).
    """
    return _jcs_fallback.jcs_canonical_bytes(value, audit_signed=audit_signed)


def _sha256_hex(data: bytes) -> str:
    return _jcs_fallback.sha256_hex(data)


# ---------------------------------------------------------------------------
# Hash field discovery
# ---------------------------------------------------------------------------


SELF_HASH_FIELDS = ("invocation_hash", "handoff_hash")


def _self_hash_field(envelope: dict[str, Any]) -> str:
    """Return the canonical self-hash field name for an envelope.

    Per SDD §3.1 / §3.2: invocation envelopes store their self-hash in
    `invocation_hash`, handoff envelopes in `handoff_hash`. The schema
    discriminator is the schema_version field (loa.construct.invocation.v0
    vs loa.construct.handoff.v0). We tolerate envelopes that already have
    either field present — useful for round-trip validation."""
    schema = envelope.get("schema_version", "")
    if isinstance(schema, str):
        if "invocation" in schema:
            return "invocation_hash"
        if "handoff" in schema:
            return "handoff_hash"
    # Fallback heuristic: presence of `outputs` field implies handoff;
    # presence of `output_contract` implies invocation. Used only when
    # schema_version is missing — primarily test fixtures.
    if "output_contract" in envelope:
        return "invocation_hash"
    if "outputs" in envelope or "status" in envelope:
        return "handoff_hash"
    raise _err_usage(
        f"cannot determine self-hash field; envelope has neither "
        f"recognized schema_version nor output_contract/outputs"
    )


# ---------------------------------------------------------------------------
# Two-pass self-hash computation
# ---------------------------------------------------------------------------


def compute_self_hash(envelope: dict[str, Any], hash_field: str | None = None) -> str:
    """Compute the JCS-canonical sha256 of `envelope`, EXCLUDING the self-hash
    field. The result is then written into that field by the caller — that's
    the second pass.

    Per SDD §3.1 algorithm step 4: "self_hash = sha256(jcs_canonicalize(E))
    — note E does NOT yet have invocation_hash/handoff_hash field set."

    The function is idempotent: passing an envelope that already has the
    field populated yields the same hash as passing the same envelope before
    the field was set, because we strip the field before canonicalization.
    """
    if hash_field is None:
        hash_field = _self_hash_field(envelope)
    if hash_field not in SELF_HASH_FIELDS:
        raise _err_usage(
            f"hash_field must be one of {SELF_HASH_FIELDS}; got '{hash_field}'"
        )
    stripped = {k: v for k, v in envelope.items() if k != hash_field}
    return _sha256_hex(_jcs_canonical_bytes(stripped))


def populate_self_hash(envelope: dict[str, Any]) -> dict[str, Any]:
    """Return a new envelope dict with the self-hash field populated.

    Two-pass concrete API: caller passes envelope WITHOUT the hash field;
    receives envelope WITH the field set. Convenience wrapper around
    compute_self_hash for callers that want a single function call to
    finalize an envelope."""
    hash_field = _self_hash_field(envelope)
    digest = compute_self_hash(envelope, hash_field)
    out = dict(envelope)
    out[hash_field] = digest
    return out


# ---------------------------------------------------------------------------
# prev_hash topology (linkage between envelopes)
# ---------------------------------------------------------------------------


def compute_prev_hash(prior_envelope: dict[str, Any]) -> str:
    """Compute the prev_hash that the NEXT envelope should carry, given the
    current (prior) envelope.

    Important: the prev_hash points at the prior envelope's COMPLETE canonical
    form — i.e. the envelope WITH its own self-hash field populated.

    Per SDD §3.1: prev_hash = sha256(jcs_canonicalize(prior_envelope)).

    For the first stage's invocation envelope, the caller should NOT use this
    function — prev_hash is null.
    """
    if not isinstance(prior_envelope, dict):
        raise _err_usage("prior envelope must be a dict")
    return _sha256_hex(_jcs_canonical_bytes(prior_envelope))


# ---------------------------------------------------------------------------
# composition_id derivation (S2-T3)
# ---------------------------------------------------------------------------


def composition_id(yaml_path: Path) -> str:
    """Derive the deterministic composition_id per SDD §3.1 / IMP-001.

    Format: `{basename(path)}@sha256:{first_12_hex(sha256(jcs(yaml_content)))}`

    YAML content is the parsed-then-canonicalized form (JCS-canonical), not
    raw bytes. This makes the id stable across formatting changes (whitespace,
    key reordering) while changing on any semantic mutation."""
    if not yaml_path.is_file():
        raise _err_env(f"composition not found at {yaml_path}")
    try:
        import yaml  # type: ignore[import-untyped]
    except ImportError as exc:
        raise _err_env(f"pyyaml required: {exc}") from exc
    try:
        data = yaml.safe_load(yaml_path.read_text())
    except yaml.YAMLError as exc:
        raise _err_usage(f"invalid YAML at {yaml_path}: {exc}") from exc
    if not isinstance(data, dict):
        raise _err_usage(f"top-level YAML must be a mapping, got {type(data).__name__}")
    canonical = _jcs_canonical_bytes(data)
    digest = hashlib.sha256(canonical).hexdigest()
    return f"{yaml_path.name}@sha256:{digest[:12]}"


# ---------------------------------------------------------------------------
# Chain validation (S2-T5 entry point)
# ---------------------------------------------------------------------------


@dataclass
class ChainEvent:
    """Single observation produced during chain validation."""
    severity: str  # "error" | "warning"
    code: str      # "[ENVELOPE-CHAIN-BROKEN]" or specific subcode
    envelope_path: str
    message: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "severity": self.severity,
            "code": self.code,
            "envelope_path": self.envelope_path,
            "message": self.message,
        }


@dataclass
class ChainValidationResult:
    ok: bool = True
    events: list[ChainEvent] = field(default_factory=list)
    chain_length: int = 0

    def add(self, ev: ChainEvent) -> None:
        self.events.append(ev)
        if ev.severity == "error":
            self.ok = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "chain_length": self.chain_length,
            "events": [e.to_dict() for e in self.events],
        }


def _stage_pair_key(envelope: dict[str, Any]) -> tuple[str | None, int | None]:
    """Pair invocation + handoff envelopes by (stage_id, stage_pass)."""
    return (
        envelope.get("stage_id") if isinstance(envelope.get("stage_id"), str) else None,
        envelope.get("stage_pass") if isinstance(envelope.get("stage_pass"), int) else None,
    )


def _is_invocation(envelope: dict[str, Any]) -> bool:
    schema = envelope.get("schema_version", "")
    if isinstance(schema, str) and "invocation" in schema:
        return True
    return "output_contract" in envelope


def _is_handoff(envelope: dict[str, Any]) -> bool:
    schema = envelope.get("schema_version", "")
    if isinstance(schema, str) and "handoff" in schema:
        return True
    return "outputs" in envelope or "status" in envelope


def validate_chain(envelopes: Iterable[tuple[Path, dict[str, Any]]]) -> ChainValidationResult:
    """Walk envelopes in chain order; verify self-hash + prev_hash linkage.

    Caller provides envelopes as (path, dict) tuples in the order they were
    produced (alphabetical by stage-N-pass-M.{invocation,handoff}.json works
    when stage numbers are zero-padded). The validator does not re-sort —
    chain order is the caller's responsibility. This keeps the validator
    composable with arbitrary persistence layouts.
    """
    result = ChainValidationResult()
    prior_self_hash: str | None = None
    prior_kind: str | None = None  # "invocation" or "handoff"
    invocation_self_hashes_by_stage: dict[tuple[str | None, int | None], str] = {}

    for path, envelope in envelopes:
        path_s = str(path)
        result.chain_length += 1

        if not isinstance(envelope, dict):
            result.add(ChainEvent(
                severity="error",
                code="[ENVELOPE-CHAIN-BROKEN]",
                envelope_path=path_s,
                message="envelope is not a JSON object",
            ))
            continue

        if _is_invocation(envelope):
            kind = "invocation"
            hash_field = "invocation_hash"
        elif _is_handoff(envelope):
            kind = "handoff"
            hash_field = "handoff_hash"
        else:
            result.add(ChainEvent(
                severity="error",
                code="[ENVELOPE-CHAIN-BROKEN]",
                envelope_path=path_s,
                message="envelope shape is neither invocation nor handoff",
            ))
            continue

        stored_hash = envelope.get(hash_field)
        if not isinstance(stored_hash, str) or not stored_hash.startswith("sha256:"):
            result.add(ChainEvent(
                severity="error",
                code="[ENVELOPE-CHAIN-BROKEN]",
                envelope_path=path_s,
                message=f"missing or malformed {hash_field}",
            ))
            continue

        # (a) Self-hash recompute.
        recomputed = compute_self_hash(envelope, hash_field)
        if recomputed != stored_hash:
            result.add(ChainEvent(
                severity="error",
                code="[ENVELOPE-CHAIN-BROKEN]",
                envelope_path=path_s,
                message=(
                    f"self-hash mismatch: stored {stored_hash}, "
                    f"recomputed {recomputed} — envelope tampered"
                ),
            ))
            continue

        # (b) prev_hash linkage.
        prev_hash = envelope.get("prev_hash")
        if kind == "invocation":
            stage_key = _stage_pair_key(envelope)
            invocation_self_hashes_by_stage[stage_key] = stored_hash

            if result.chain_length == 1:
                # First envelope must be an invocation with prev_hash null.
                if prev_hash is not None:
                    result.add(ChainEvent(
                        severity="error",
                        code="[ENVELOPE-CHAIN-BROKEN]",
                        envelope_path=path_s,
                        message=(
                            f"first invocation envelope must have prev_hash null; "
                            f"found {prev_hash}"
                        ),
                    ))
                    continue
            else:
                # Subsequent invocation: prev_hash links to PRIOR HANDOFF's hash.
                if prior_kind != "handoff":
                    result.add(ChainEvent(
                        severity="error",
                        code="[ENVELOPE-CHAIN-BROKEN]",
                        envelope_path=path_s,
                        message=(
                            f"invocation envelope follows a non-handoff envelope "
                            f"(prior kind={prior_kind}); chain order broken"
                        ),
                    ))
                    continue
                if prev_hash != prior_self_hash:
                    result.add(ChainEvent(
                        severity="error",
                        code="[ENVELOPE-CHAIN-BROKEN]",
                        envelope_path=path_s,
                        message=(
                            f"invocation prev_hash {prev_hash} does not match "
                            f"prior handoff_hash {prior_self_hash}"
                        ),
                    ))
                    continue
        else:
            # Handoff envelope: prev_hash MUST link to its paired invocation.
            stage_key = _stage_pair_key(envelope)
            paired_invocation_hash = invocation_self_hashes_by_stage.get(stage_key)
            if paired_invocation_hash is None:
                result.add(ChainEvent(
                    severity="error",
                    code="[ENVELOPE-CHAIN-BROKEN]",
                    envelope_path=path_s,
                    message=(
                        f"handoff envelope has no paired invocation envelope "
                        f"(stage_id={stage_key[0]}, stage_pass={stage_key[1]})"
                    ),
                ))
                continue
            if prev_hash != paired_invocation_hash:
                result.add(ChainEvent(
                    severity="error",
                    code="[ENVELOPE-CHAIN-BROKEN]",
                    envelope_path=path_s,
                    message=(
                        f"handoff prev_hash {prev_hash} does not match paired "
                        f"invocation_hash {paired_invocation_hash}"
                    ),
                ))
                continue

        prior_self_hash = stored_hash
        prior_kind = kind

    return result


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError as exc:
        raise _err_env(f"file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise _err_usage(f"invalid JSON at {path}: {exc}") from exc


def _cmd_self_hash(args: argparse.Namespace) -> int:
    envelope = _load_json(args.envelope)
    digest = compute_self_hash(envelope, args.field)
    print(digest)
    return 0


def _cmd_prev_hash(args: argparse.Namespace) -> int:
    prior = _load_json(args.prior)
    digest = compute_prev_hash(prior)
    print(digest)
    return 0


def _cmd_validate(args: argparse.Namespace) -> int:
    if args.chain_dir is not None:
        if not args.chain_dir.is_dir():
            raise _err_env(f"chain dir not found: {args.chain_dir}")
        paths = sorted(args.chain_dir.glob("*.json"))
    elif args.envelopes:
        paths = [Path(p) for p in args.envelopes]
    else:
        raise _err_usage("provide --chain-dir or --envelopes")
    pairs = [(p, _load_json(p)) for p in paths]
    result = validate_chain(pairs)
    print(json.dumps(result.to_dict(), indent=2))
    return 0 if result.ok else 1


def _cmd_compose_id(args: argparse.Namespace) -> int:
    print(composition_id(args.composition))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Envelope hash chain library (S2-T2, S2-T3, S2-T5).",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_self = sub.add_parser("self-hash", help="Compute self-hash for an envelope")
    p_self.add_argument("--envelope", type=Path, required=True)
    p_self.add_argument("--field", choices=SELF_HASH_FIELDS, default=None)
    p_self.set_defaults(fn=_cmd_self_hash)

    p_prev = sub.add_parser("prev-hash", help="Compute prev_hash for the NEXT envelope")
    p_prev.add_argument("--prior", type=Path, required=True)
    p_prev.set_defaults(fn=_cmd_prev_hash)

    p_val = sub.add_parser("validate", help="Validate a chain of envelopes")
    p_val.add_argument("--chain-dir", type=Path, default=None)
    p_val.add_argument("--envelopes", nargs="+", default=None)
    p_val.set_defaults(fn=_cmd_validate)

    p_id = sub.add_parser("compose-id", help="Derive composition_id from a YAML")
    p_id.add_argument("--composition", type=Path, required=True)
    p_id.set_defaults(fn=_cmd_compose_id)

    args = parser.parse_args()
    try:
        return args.fn(args)
    except _ExitWith as exc:
        print(exc.message, file=sys.stderr)
        return exc.code


if __name__ == "__main__":
    sys.exit(main())
