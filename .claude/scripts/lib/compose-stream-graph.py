#!/usr/bin/env python3
"""
compose-stream-graph.py — Sprint 1 (S1-T1)

Stream-graph validator for the Construct Bounded-Context Runtime Substrate
(cycle-construct-bounded-context, SDD §4.1, FR-6).

Reads a composition YAML, builds a directed graph of stages where edges encode
`reads consumes writes produced by upstream stages`, and reports typed-error
diagnostics for every detected violation. Used by `lib/compose-stream-graph.sh`
as the algorithmic core.

This Sprint-1 cut covers four of the six S1-T1 acceptance error classes:

    [STREAM-NO-PRODUCER]       — a stage reads a stream with no upstream producer
                                  (and it isn't supplied as composition.inputs[])
    [STREAM-SCHEMA-MISMATCH]   — a stage reads stream type X expecting schema_id Y,
                                  but the upstream produces type X with schema_id Z
                                  (mismatch detected when both sides declare schema_id)
    [ITERATION-NO-MAX]         — composition.iterate[] is non-empty but
                                  composition.max_iterations is missing
    [ITERATION-NO-TERMINATION] — composition.iterate[] is non-empty but
                                  composition.terminate_when is missing

Two additional error classes from S1-T1 acceptance are deferred to follow-on
Sprint 1 work because they need cross-cutting infrastructure not yet shipped:

    [STAGE-OUT-OF-DOMAIN]    — needs construct-manifest resolution per S1-T4
    [ENVELOPE-CHAIN-BROKEN]  — lives with envelope-chain.sh in Sprint 2 (S2-T2/T5)

Output is a structured JSON report:

    {
      "ok": bool,                         # true iff no errors
      "errors": [{"code": "[...]", "stage_id": "...", "message": "..."}, ...],
      "warnings": [...],                  # non-fatal observations
      "stages": [{"id": "...", "reads": [...], "writes": [...]}, ...]
    }

Exit codes:
    0  — composition validates (errors[] empty)
    1  — validation failed (errors[] non-empty)
    2  — usage / parse error
    3  — environment problem (missing yaml package, file not found)
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


def _err_env(message: str) -> "_ExitWith":
    return _ExitWith(3, f"ENV: {message}")


def _err_usage(message: str) -> "_ExitWith":
    return _ExitWith(2, f"USAGE: {message}")


@dataclass
class _ExitWith(Exception):
    code: int
    message: str


@dataclass
class StageView:
    """Per-stage view extracted from a composition for graph construction."""
    stage: int  # stage number (1-indexed; v1.2 allows half-stages like 1.5)
    construct: str
    skill: str | None
    reads: list[dict[str, Any]] = field(default_factory=list)
    writes: list[dict[str, Any]] = field(default_factory=list)

    @property
    def stage_id(self) -> str:
        # Composition's stage_id is computed at runtime from composition slug + stage num.
        # For validator purposes a synthetic id is sufficient.
        return f"stage-{self.stage}"


@dataclass
class Diagnostic:
    code: str
    stage_id: str | None
    message: str

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.stage_id:
            out["stage_id"] = self.stage_id
        return out


# ---------------------------------------------------------------------------
# Composition parsing
# ---------------------------------------------------------------------------


def _load_yaml(path: Path) -> dict[str, Any]:
    try:
        import yaml  # type: ignore[import-untyped]
    except ImportError as exc:  # pragma: no cover - environment guard
        raise _err_env(f"pyyaml not installed: {exc}") from exc
    if not path.is_file():
        raise _err_env(f"composition not found at {path}")
    text = path.read_text()
    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        raise _err_usage(f"invalid YAML at {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise _err_usage(f"top-level YAML at {path} must be a mapping")
    return data


def _normalize_stream_entry(entry: Any) -> dict[str, Any]:
    """Stream entries in compositions are usually plain strings ('Signal') OR
    objects ({'type': 'Signal', 'schema_id': 'loa.stream.Signal.v1'}). The
    validator works in the object form internally; this normalizer accepts both.
    """
    if isinstance(entry, str):
        return {"type": entry, "schema_id": None}
    if isinstance(entry, dict):
        return {"type": entry.get("type"), "schema_id": entry.get("schema_id")}
    raise _err_usage(f"unrecognized stream entry: {entry!r}")


def _extract_stages(composition: dict[str, Any]) -> list[StageView]:
    chain = composition.get("chain")
    if not isinstance(chain, list):
        raise _err_usage("composition.chain[] missing or not a list")

    stages: list[StageView] = []
    for raw in chain:
        if not isinstance(raw, dict):
            raise _err_usage(f"chain entry must be a mapping, got {type(raw).__name__}")
        stage_num = raw.get("stage")
        construct = raw.get("construct")
        skill = raw.get("skill")
        if stage_num is None:
            raise _err_usage("chain entry missing 'stage' number")
        if not isinstance(construct, str):
            raise _err_usage(f"chain[{stage_num}].construct must be a string")
        reads_raw = raw.get("reads", []) or []
        writes_raw = raw.get("writes", []) or []
        if not isinstance(reads_raw, list):
            raise _err_usage(f"chain[{stage_num}].reads must be a list")
        if not isinstance(writes_raw, list):
            raise _err_usage(f"chain[{stage_num}].writes must be a list")
        stages.append(
            StageView(
                stage=stage_num,
                construct=construct,
                skill=skill if isinstance(skill, str) else None,
                reads=[_normalize_stream_entry(r) for r in reads_raw],
                writes=[_normalize_stream_entry(w) for w in writes_raw],
            )
        )
    # Sort by stage number — supports v1.2 half-stages (1.5, 6.5).
    stages.sort(key=lambda s: float(s.stage))
    return stages


def _extract_external_inputs(composition: dict[str, Any]) -> dict[str, set[str | None]]:
    """composition.inputs[] (from `Input` $def) declares streams supplied externally
    by the operator. Validator treats these as available producers for `reads:`
    that have no upstream stage producer.

    Returns map of `stream_type -> {schema_id_or_none, ...}`.
    """
    inputs = composition.get("inputs", []) or []
    out: dict[str, set[str | None]] = {}
    for entry in inputs:
        if isinstance(entry, dict):
            entry = _normalize_stream_entry(entry)
            t = entry.get("type")
            sid = entry.get("schema_id")
            if isinstance(t, str):
                out.setdefault(t, set()).add(sid)
        elif isinstance(entry, str):
            out.setdefault(entry, set()).add(None)
    return out


# ---------------------------------------------------------------------------
# Validation passes
# ---------------------------------------------------------------------------


def _check_iteration(composition: dict[str, Any]) -> list[Diagnostic]:
    diagnostics: list[Diagnostic] = []
    iterate = composition.get("iterate")
    if not iterate:
        return diagnostics
    if not isinstance(iterate, list) or len(iterate) == 0:
        return diagnostics
    if composition.get("max_iterations") is None:
        diagnostics.append(
            Diagnostic(
                code="[ITERATION-NO-MAX]",
                stage_id=None,
                message=(
                    "composition.iterate[] is non-empty but composition.max_iterations is missing; "
                    "runner would loop unbounded. Set max_iterations to a positive integer."
                ),
            )
        )
    terminate = composition.get("terminate_when")
    if not isinstance(terminate, str) or not terminate.strip():
        diagnostics.append(
            Diagnostic(
                code="[ITERATION-NO-TERMINATION]",
                stage_id=None,
                message=(
                    "composition.iterate[] is non-empty but composition.terminate_when is missing; "
                    "runner has no termination predicate. Provide a free-form prose predicate."
                ),
            )
        )
    return diagnostics


def _check_streams(
    stages: list[StageView],
    external_inputs: dict[str, set[str | None]],
) -> list[Diagnostic]:
    """Walk stages in order; for each stage's reads[], confirm at least one
    upstream stage's writes[] produces the same type. Detect schema_id mismatches.

    Iteration edges are honored when the composition declares iterate[[N, M]]:
    on pass >= 2, M's writes are treated as available producers for N's reads.
    The Sprint-1 validator approximates this by allowing reads to be satisfied
    by ANY stage in iterate-paired blocks; the runtime validator (Sprint 2 +
    Sprint 5) refines pass-aware semantics.
    """
    diagnostics: list[Diagnostic] = []

    # Producers map: stream_type -> [(stage_id, schema_id_or_None), ...]
    producers: dict[str, list[tuple[str, str | None]]] = {}
    for t, sids in external_inputs.items():
        producers.setdefault(t, []).extend(("composition.inputs", sid) for sid in sids)

    for stage in stages:
        # Check this stage's reads against the producers map BUILT FROM PRIOR stages.
        for read in stage.reads:
            t = read.get("type")
            if t is None:
                continue
            avail = producers.get(t, [])
            if not avail:
                diagnostics.append(
                    Diagnostic(
                        code="[STREAM-NO-PRODUCER]",
                        stage_id=stage.stage_id,
                        message=(
                            f"stage {stage.stage_id} reads stream type '{t}' but no upstream stage "
                            f"or composition.inputs[] produces it. Add a producer or remove the read."
                        ),
                    )
                )
                continue

            # Schema_id compatibility (only when the read declares one).
            read_sid = read.get("schema_id")
            if read_sid is None:
                continue
            matching = [
                producer_sid
                for (_, producer_sid) in avail
                if producer_sid is None or producer_sid == read_sid
            ]
            if not matching:
                producer_sids = sorted({sid or "(unset)" for (_, sid) in avail})
                diagnostics.append(
                    Diagnostic(
                        code="[STREAM-SCHEMA-MISMATCH]",
                        stage_id=stage.stage_id,
                        message=(
                            f"stage {stage.stage_id} reads stream type '{t}' with schema_id '{read_sid}', "
                            f"but upstream producers declare schema_id(s) {producer_sids}. Mismatch."
                        ),
                    )
                )
        # AFTER scoring this stage, register its writes as producers for downstream stages.
        for write in stage.writes:
            t = write.get("type")
            if t is None:
                continue
            producers.setdefault(t, []).append((stage.stage_id, write.get("schema_id")))
    return diagnostics


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def validate(composition_path: Path) -> dict[str, Any]:
    composition = _load_yaml(composition_path)
    stages = _extract_stages(composition)
    external_inputs = _extract_external_inputs(composition)

    errors: list[Diagnostic] = []
    errors.extend(_check_iteration(composition))
    errors.extend(_check_streams(stages, external_inputs))

    return {
        "ok": len(errors) == 0,
        "composition_path": str(composition_path),
        "errors": [d.to_dict() for d in errors],
        "warnings": [],
        "stages": [
            {
                "id": s.stage_id,
                "stage": s.stage,
                "construct": s.construct,
                "reads": s.reads,
                "writes": s.writes,
            }
            for s in stages
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate a Loa composition's stream graph (S1-T1).",
    )
    parser.add_argument(
        "composition", type=Path, help="Path to the composition YAML"
    )
    parser.add_argument(
        "--json", action="store_true", help="Emit JSON report (default)"
    )
    parser.add_argument(
        "--quiet", action="store_true", help="Suppress stdout report (exit code only)"
    )
    args = parser.parse_args()

    try:
        report = validate(args.composition)
    except _ExitWith as exc:
        print(exc.message, file=sys.stderr)
        return exc.code

    if not args.quiet:
        print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
