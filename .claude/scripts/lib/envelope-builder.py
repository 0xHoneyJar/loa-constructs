#!/usr/bin/env python3
"""
envelope-builder.py — Sprint 2 (S2-T1) — invocation + handoff envelope builder

Constructs invocation and handoff envelopes from the composition + manifest +
upstream handoffs (SDD §4.2, FR-1.2 / FR-2.2). Composes envelope-chain.py for
hash computation (S2-T2 — `compute_self_hash`, `compute_prev_hash`).

The builder is called per stage:
  - Pre-stage:  build the INVOCATION envelope, including prev_hash that links
                back to the prior stage's handoff (or null for first stage).
  - Post-stage: build the HANDOFF envelope, with the actual outputs the stage
                produced + status + prev_hash linking to the paired invocation.

Both envelopes are persisted at:
  .run/compose/<run_id>/envelopes/stage-<n>-pass-<m>.<invocation|handoff>.json

The builder does NOT execute stages — that's S3-T* (advisory tier) and
S4-T* (strict tier). The builder strictly assembles the envelope JSON,
populates required fields per the schema, and finalizes hashes via
envelope-chain.

CLI shapes:

    envelope-builder.py invocation \
        --composition <yaml> --stage <n> [--stage-pass <m>] [--run-id <id>] \
        [--prior-handoff <path>] [--manifest <path>] [--out <path>]

    envelope-builder.py handoff \
        --invocation <path> --status <success|failure|...> \
        [--outputs <json-array>] [--summary <text>] [--error <json>] [--out <path>]

Exit codes:
    0 — envelope built and persisted
    1 — required fields missing or contract violation (operator-fixable)
    2 — usage / parse error
    3 — environment problem (yq / pyyaml missing / referenced file not found)
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Errors + chain library import
# ---------------------------------------------------------------------------


class _ExitWith(Exception):
    def __init__(self, code: int, message: str) -> None:
        self.code = code
        self.message = message


def _err_env(message: str) -> _ExitWith:
    return _ExitWith(3, f"ENV: {message}")


def _err_usage(message: str) -> _ExitWith:
    return _ExitWith(2, f"USAGE: {message}")


def _err_contract(message: str) -> _ExitWith:
    return _ExitWith(1, f"CONTRACT: {message}")


# Import the chain library from the same directory.
# envelope-chain.py uses a hyphen in its filename; load via importlib.util.
import importlib.util  # noqa: E402

_THIS_DIR = Path(__file__).resolve().parent
_CHAIN_SPEC = importlib.util.spec_from_file_location(
    "envelope_chain", _THIS_DIR / "envelope-chain.py"
)
if _CHAIN_SPEC is None or _CHAIN_SPEC.loader is None:  # pragma: no cover
    raise _err_env("cannot locate envelope-chain.py adjacent to envelope-builder.py")
envelope_chain = importlib.util.module_from_spec(_CHAIN_SPEC)
# Register before exec so @dataclass can resolve cls.__module__ via sys.modules.
sys.modules["envelope_chain"] = envelope_chain
_CHAIN_SPEC.loader.exec_module(envelope_chain)


# ---------------------------------------------------------------------------
# I/O helpers
# ---------------------------------------------------------------------------


def _load_json(path: Path, label: str) -> dict[str, Any]:
    if not path.is_file():
        raise _err_env(f"{label} not found at {path}")
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise _err_usage(f"{label} at {path} is not valid JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise _err_usage(f"{label} at {path} must be a JSON object")
    return data


def _load_yaml(path: Path, label: str) -> dict[str, Any]:
    try:
        import yaml  # type: ignore[import-untyped]
    except ImportError as exc:
        raise _err_env(f"pyyaml required: {exc}") from exc
    if not path.is_file():
        raise _err_env(f"{label} not found at {path}")
    try:
        data = yaml.safe_load(path.read_text())
    except yaml.YAMLError as exc:
        raise _err_usage(f"{label} at {path} is not valid YAML: {exc}") from exc
    if not isinstance(data, dict):
        raise _err_usage(f"{label} at {path} must be a YAML mapping")
    return data


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# Stage extraction
# ---------------------------------------------------------------------------


def _stage_block(composition: dict[str, Any], stage_num: int) -> dict[str, Any]:
    chain = composition.get("chain")
    if not isinstance(chain, list):
        raise _err_usage("composition.chain[] missing")
    for entry in chain:
        if isinstance(entry, dict) and entry.get("stage") == stage_num:
            return entry
    raise _err_usage(f"stage {stage_num} not found in composition.chain[]")


def _resolve_manifest(slug: str, packs_dir: Path) -> dict[str, Any] | None:
    candidate = packs_dir / slug / "construct.yaml"
    if not candidate.is_file():
        return None
    try:
        return _load_yaml(candidate, f"manifest for {slug}")
    except _ExitWith:
        return None


# ---------------------------------------------------------------------------
# Invocation envelope builder
# ---------------------------------------------------------------------------


def build_invocation(
    composition_path: Path,
    stage_num: int,
    stage_pass: int,
    run_id: str,
    prior_handoff: dict[str, Any] | None,
    manifest_override: Path | None,
    packs_dir: Path | None,
) -> dict[str, Any]:
    composition = _load_yaml(composition_path, "composition")
    stage = _stage_block(composition, stage_num)

    construct_slug = stage.get("construct")
    if not isinstance(construct_slug, str) or not construct_slug:
        raise _err_contract(f"stage {stage_num} missing construct slug")

    # Manifest resolution (best-effort): explicit path override, else packs-dir lookup.
    manifest: dict[str, Any] | None = None
    if manifest_override is not None:
        manifest = _load_yaml(manifest_override, "manifest")
    elif packs_dir is not None:
        manifest = _resolve_manifest(construct_slug, packs_dir)

    composition_id = envelope_chain.composition_id(composition_path)

    # Stage id slug: prefer composition.name (semantic), fall back to filename
    # stem with dots replaced (the dry-run schema permits `^[A-Za-z0-9_-]+\.stage-[0-9]+$`,
    # i.e. one dot before `stage-N`).
    name_field = composition.get("name")
    if isinstance(name_field, str) and name_field and all(
        ch.isalnum() or ch in "-_" for ch in name_field
    ):
        stage_slug = name_field
    else:
        stage_slug = composition_path.stem.replace(".", "-")

    # Domain: stage-level wins over manifest-level.
    domain_block = stage.get("domain") or (manifest or {}).get("domain") or {}
    if isinstance(domain_block, str):
        domain_block = {"primary": domain_block}
    elif isinstance(domain_block, list):
        domain_block = {"primary": domain_block[0] if domain_block else None}

    # Context policy: stage-level wins, otherwise empty defaults that the
    # runner can override via tier-config. The builder ships safe defaults
    # (no network, fresh session, empty tool/env allowlists) so a missing
    # context_policy never silently grants permissions.
    cp = stage.get("context_policy") or {}
    if not isinstance(cp, dict):
        cp = {}
    context_policy = {
        "include_prior_transcript": bool(cp.get("include_prior_transcript", False)),
        "include_unread_stage_outputs": bool(cp.get("include_unread_stage_outputs", False)),
        "include_unlisted_grimoires": bool(cp.get("include_unlisted_grimoires", False)),
        "allowed_read_paths": list(cp.get("allowed_read_paths", []) or []),
        "allowed_write_paths": list(cp.get("allowed_write_paths", []) or []),
        "allowed_env_vars": list(cp.get("allowed_env_vars", []) or []),
        "allow_network": bool(cp.get("allow_network", False)),
        "allowed_egress": list(cp.get("allowed_egress", []) or []),
        "isolation_tier": cp.get("isolation_tier", "advisory"),
        "network_isolation_class": cp.get("network_isolation_class", "none"),
        "llm_session_strategy": cp.get("llm_session_strategy", "fresh"),
        "allowed_mcp_tools": list(cp.get("allowed_mcp_tools", []) or []),
    }

    # Input streams: synthesized from the prior handoff's outputs (chain) when
    # present, OR from the composition's top-level inputs[] for the first stage.
    input_streams: list[dict[str, Any]] = []
    if prior_handoff is not None:
        for o in prior_handoff.get("outputs", []) or []:
            if isinstance(o, dict):
                input_streams.append({
                    "type": o.get("type"),
                    "uri": o.get("uri"),
                    "schema_id": o.get("schema_id"),
                    "hash": o.get("hash"),
                })
    else:
        for entry in composition.get("inputs", []) or []:
            if isinstance(entry, dict):
                input_streams.append({
                    "type": entry.get("type"),
                    "uri": entry.get("uri"),
                    "schema_id": entry.get("schema_id"),
                    "hash": entry.get("hash"),
                })

    # Output contract: stage-level writes[] OR manifest-level owns.streams.
    contract_writes: list[dict[str, Any]] = []
    for w in stage.get("writes", []) or []:
        if isinstance(w, str):
            contract_writes.append({
                "type": w,
                "schema_id": f"loa.stream.{w}.v1",
                "destination": (
                    f".run/compose/{run_id}/stage-{stage_num}/output/{w.lower()}.json"
                ),
                "required": True,
            })
        elif isinstance(w, dict):
            contract_writes.append({
                "type": w.get("type"),
                "schema_id": w.get("schema_id") or f"loa.stream.{w.get('type', 'Unknown')}.v1",
                "destination": w.get("destination") or (
                    f".run/compose/{run_id}/stage-{stage_num}/output/"
                    f"{(w.get('type') or 'unknown').lower()}.json"
                ),
                "required": bool(w.get("required", True)),
            })

    # prev_hash:
    #   - First stage: null
    #   - Subsequent: hash of the prior handoff envelope (chain to prior stage)
    prev_hash: str | None = None
    if prior_handoff is not None:
        prev_hash = envelope_chain.compute_prev_hash(prior_handoff)

    envelope: dict[str, Any] = {
        "schema_version": "loa.construct.invocation.v0",
        "run_id": run_id,
        "composition_id": composition_id,
        "stage_id": f"{stage_slug}.stage-{stage_num}",
        "stage_pass": stage_pass,
        "construct_slug": construct_slug,
        "skill": stage.get("skill") or None,
        "domain": {
            "primary": domain_block.get("primary"),
            "active_language": list(domain_block.get("active_language", []) or []),
            "invariants": list(domain_block.get("invariants", []) or []),
        },
        "mode": stage.get("mode") or "fresh",
        "input_streams": input_streams,
        "context_policy": context_policy,
        "output_contract": {"writes": contract_writes},
        "audit_signed": bool(composition.get("audit_signed", False)),
        "prev_hash": prev_hash,
        "built_at": _now_iso(),
    }

    # Two-pass hash finalize.
    envelope = envelope_chain.populate_self_hash(envelope)
    return envelope


# ---------------------------------------------------------------------------
# Handoff envelope builder
# ---------------------------------------------------------------------------


_VALID_STATUSES = ("success", "failure", "timeout", "cancelled", "refused")


def build_handoff(
    invocation: dict[str, Any],
    status: str,
    outputs: list[dict[str, Any]],
    summary_text: str,
    error: dict[str, Any] | None,
    partial_outputs: dict[str, Any] | None,
    next_allowed_reads: list[str] | None,
) -> dict[str, Any]:
    if status not in _VALID_STATUSES:
        raise _err_usage(
            f"status must be one of {_VALID_STATUSES}; got '{status}'"
        )

    # Contract check: failure/timeout/cancelled/refused MUST have error populated;
    # success MUST have error null.
    if status == "success":
        if error is not None:
            raise _err_contract(
                "status=success but error is populated; handoff schema forbids this"
            )
    else:
        if not isinstance(error, dict):
            raise _err_contract(
                f"status='{status}' requires error block; got null/non-object"
            )

    invocation_hash = invocation.get("invocation_hash")
    if not isinstance(invocation_hash, str) or not invocation_hash.startswith("sha256:"):
        raise _err_contract("invocation envelope is missing invocation_hash")

    envelope: dict[str, Any] = {
        "schema_version": "loa.construct.handoff.v0",
        "run_id": invocation.get("run_id"),
        "composition_id": invocation.get("composition_id"),
        "stage_id": invocation.get("stage_id"),
        "stage_pass": invocation.get("stage_pass"),
        "construct_slug": invocation.get("construct_slug"),
        "skill": invocation.get("skill"),
        "status": status,
        "outputs": outputs,
        "summary": {"visible_to_operator": True, "text": summary_text},
        "next_allowed_reads": next_allowed_reads or [],
        "error": error,
        "partial_outputs": partial_outputs or {"disposition": "discarded", "count": 0},
        "prev_hash": invocation_hash,    # handoff links to its paired invocation
        "built_at": _now_iso(),
    }

    envelope = envelope_chain.populate_self_hash(envelope)
    return envelope


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _default_packs_dir() -> Path | None:
    here = Path(__file__).resolve()
    for ancestor in (here.parent, *here.parents):
        candidate = ancestor / ".claude" / "constructs" / "packs"
        if candidate.is_dir():
            return candidate
    return None


def _cmd_invocation(args: argparse.Namespace) -> int:
    prior_handoff = _load_json(args.prior_handoff, "prior handoff") if args.prior_handoff else None
    packs_dir = args.packs_dir or _default_packs_dir()
    envelope = build_invocation(
        composition_path=args.composition,
        stage_num=args.stage,
        stage_pass=args.stage_pass,
        run_id=args.run_id,
        prior_handoff=prior_handoff,
        manifest_override=args.manifest,
        packs_dir=packs_dir,
    )
    if args.out is not None:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(envelope, indent=2))
    if not args.quiet:
        print(json.dumps(envelope, indent=2))
    return 0


def _cmd_handoff(args: argparse.Namespace) -> int:
    invocation = _load_json(args.invocation, "invocation envelope")
    outputs = json.loads(args.outputs) if args.outputs else []
    if not isinstance(outputs, list):
        raise _err_usage("--outputs must be a JSON array")
    error = json.loads(args.error) if args.error else None
    partial_outputs = json.loads(args.partial_outputs) if args.partial_outputs else None
    next_allowed_reads = (
        [s.strip() for s in args.next_allowed_reads.split(",") if s.strip()]
        if args.next_allowed_reads
        else None
    )
    envelope = build_handoff(
        invocation=invocation,
        status=args.status,
        outputs=outputs,
        summary_text=args.summary or "",
        error=error,
        partial_outputs=partial_outputs,
        next_allowed_reads=next_allowed_reads,
    )
    if args.out is not None:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(envelope, indent=2))
    if not args.quiet:
        print(json.dumps(envelope, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build invocation + handoff envelopes (S2-T1, SDD §4.2).",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_inv = sub.add_parser("invocation", help="Build an invocation envelope")
    p_inv.add_argument("--composition", type=Path, required=True)
    p_inv.add_argument("--stage", type=int, required=True)
    p_inv.add_argument("--stage-pass", type=int, default=1)
    p_inv.add_argument("--run-id", type=str, required=True)
    p_inv.add_argument("--prior-handoff", type=Path, default=None)
    p_inv.add_argument("--manifest", type=Path, default=None)
    p_inv.add_argument("--packs-dir", type=Path, default=None)
    p_inv.add_argument("--out", type=Path, default=None)
    p_inv.add_argument("--quiet", action="store_true")
    p_inv.set_defaults(fn=_cmd_invocation)

    p_ho = sub.add_parser("handoff", help="Build a handoff envelope")
    p_ho.add_argument("--invocation", type=Path, required=True)
    p_ho.add_argument("--status", type=str, required=True, choices=_VALID_STATUSES)
    p_ho.add_argument("--outputs", type=str, default=None,
                      help="JSON array of output entries (uri, type, schema_id, hash, domain)")
    p_ho.add_argument("--summary", type=str, default=None)
    p_ho.add_argument("--error", type=str, default=None,
                      help="JSON object {code, message, recoverable}; required when status != success")
    p_ho.add_argument("--partial-outputs", type=str, default=None)
    p_ho.add_argument("--next-allowed-reads", type=str, default=None,
                      help="Comma-separated stream types")
    p_ho.add_argument("--out", type=Path, default=None)
    p_ho.add_argument("--quiet", action="store_true")
    p_ho.set_defaults(fn=_cmd_handoff)

    args = parser.parse_args()
    try:
        return args.fn(args)
    except _ExitWith as exc:
        print(exc.message, file=sys.stderr)
        return exc.code


if __name__ == "__main__":
    sys.exit(main())
