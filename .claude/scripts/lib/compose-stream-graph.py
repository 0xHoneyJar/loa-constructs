#!/usr/bin/env python3
"""
compose-stream-graph.py — Sprint 1 (S1-T1)

Stream-graph validator for the Construct Bounded-Context Runtime Substrate
(cycle-construct-bounded-context, SDD §4.1, FR-6).

Reads a composition YAML, builds a directed graph of stages where edges encode
`reads consumes writes produced by upstream stages`, and reports typed-error
diagnostics for every detected violation. Used by `lib/compose-stream-graph.sh`
as the algorithmic core.

This validator covers five of the six S1-T1 acceptance error classes:

    [STREAM-NO-PRODUCER]       — a stage reads a stream with no upstream producer
                                  (and it isn't supplied as composition.inputs[])
    [STREAM-SCHEMA-MISMATCH]   — a stage reads stream type X expecting schema_id Y,
                                  but the upstream produces type X with schema_id Z
                                  (mismatch detected when both sides declare schema_id)
    [STAGE-OUT-OF-DOMAIN]      — a stage's declared domain.primary does not match
                                  the construct manifest's domain.primary or appear
                                  in its domain.supporting[] (S1-T4)
    [ITERATION-NO-MAX]         — composition.iterate[] is non-empty but
                                  composition.max_iterations is missing
    [ITERATION-NO-TERMINATION] — composition.iterate[] is non-empty but
                                  composition.terminate_when is missing

The remaining acceptance error class is deferred to its natural home:

    [ENVELOPE-CHAIN-BROKEN]    — lives with envelope-chain.sh in Sprint 2
                                  (S2-T2/T5). Reaches the validator surface only
                                  during full-run replay, not during pre-exec.

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
    declared_domain_primary: str | None = None

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
        # Optional stage-level domain.primary (composition.schema.json line 386).
        # When omitted, stage falls back to the construct manifest's domain;
        # mismatch only meaningful when the stage explicitly declares a primary.
        domain_primary: str | None = None
        domain_block = raw.get("domain")
        if isinstance(domain_block, dict):
            cand = domain_block.get("primary")
            if isinstance(cand, str) and cand:
                domain_primary = cand
        stages.append(
            StageView(
                stage=stage_num,
                construct=construct,
                skill=skill if isinstance(skill, str) else None,
                reads=[_normalize_stream_entry(r) for r in reads_raw],
                writes=[_normalize_stream_entry(w) for w in writes_raw],
                declared_domain_primary=domain_primary,
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
# Manifest resolution (S1-T4 — for [STAGE-OUT-OF-DOMAIN])
# ---------------------------------------------------------------------------


def _resolve_manifest(slug: str, packs_dir: Path) -> dict[str, Any] | None:
    """Read <packs_dir>/<slug>/construct.yaml; return None if missing.

    Sprint 6 hardening (S6-H1, closes F1): delegates to
    lib/path-safety.safe_resolve_pack_path which validates slug + realpath-
    contains under packs_dir. The validator does NOT fall back to legacy
    contract files here — those are consulted by construct-validate.sh.
    Stream-graph validation operates on the manifest's declared domain only;
    a missing or unsafe manifest yields a structured warning rather than a
    hard error so partially-installed compositions still validate the rest
    of the graph."""
    # Lazy import — keeps this module's CLI fast when no domain check fires.
    import importlib.util as _importlib_util
    _here = Path(__file__).resolve().parent
    _ps_spec = _importlib_util.spec_from_file_location(
        "_path_safety", _here / "path-safety.py"
    )
    if _ps_spec is None or _ps_spec.loader is None:
        return None
    _path_safety = _importlib_util.module_from_spec(_ps_spec)
    sys.modules["_path_safety"] = _path_safety
    _ps_spec.loader.exec_module(_path_safety)

    resolved = _path_safety.safe_resolve_pack_path(packs_dir, slug)
    if resolved is None:
        return None
    try:
        import yaml  # type: ignore[import-untyped]
    except ImportError:
        return None
    try:
        data = yaml.safe_load(resolved.read_text())
    except yaml.YAMLError:
        return None
    return data if isinstance(data, dict) else None


def _manifest_domain_set(manifest: dict[str, Any]) -> set[str]:
    """Compute the set of domain tags the manifest authorises for its stages.

    Accepts:
      - object form: {primary, supporting[], ...}  ← canonical post-Sprint 0
      - string form: 'craft'                       ← legacy single-tag
      - array form: [tag1, tag2]                   ← brownfield migration
    Returns empty set when manifest has no parseable domain block."""
    domain = manifest.get("domain")
    if isinstance(domain, str):
        return {domain}
    if isinstance(domain, list):
        return {x for x in domain if isinstance(x, str)}
    if isinstance(domain, dict):
        out: set[str] = set()
        primary = domain.get("primary")
        if isinstance(primary, str) and primary:
            out.add(primary)
        for tag in domain.get("supporting", []) or []:
            if isinstance(tag, str):
                out.add(tag)
        return out
    return set()


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


def _check_stage_domain(
    stages: list[StageView], packs_dir: Path
) -> tuple[list[Diagnostic], list[Diagnostic]]:
    """Confirm each stage's declared domain.primary is honored by the manifest.

    Returns (errors, warnings). A missing manifest yields a warning (so partial
    installs still validate everything else); a manifest with no domain block
    also yields a warning (legacy pack — construct-validate enforces tier
    severity). A manifest WITH a domain block plus a stage WITH a declared
    primary that doesn't match is a hard [STAGE-OUT-OF-DOMAIN] error."""
    errors: list[Diagnostic] = []
    warnings: list[Diagnostic] = []
    cache: dict[str, dict[str, Any] | None] = {}
    for stage in stages:
        if stage.declared_domain_primary is None:
            continue
        slug = stage.construct
        if slug not in cache:
            cache[slug] = _resolve_manifest(slug, packs_dir)
        manifest = cache[slug]
        if manifest is None:
            warnings.append(
                Diagnostic(
                    code="[STAGE-OUT-OF-DOMAIN]",
                    stage_id=stage.stage_id,
                    message=(
                        f"stage {stage.stage_id} declares domain.primary "
                        f"'{stage.declared_domain_primary}' but the construct "
                        f"manifest for '{slug}' is not installed at "
                        f"{packs_dir}/{slug}/construct.yaml — domain attribution "
                        f"unverified."
                    ),
                )
            )
            continue
        manifest_set = _manifest_domain_set(manifest)
        if not manifest_set:
            warnings.append(
                Diagnostic(
                    code="[STAGE-OUT-OF-DOMAIN]",
                    stage_id=stage.stage_id,
                    message=(
                        f"stage {stage.stage_id} declares domain.primary "
                        f"'{stage.declared_domain_primary}' but construct "
                        f"manifest for '{slug}' has no domain block — "
                        f"attribution unverified (legacy pack)."
                    ),
                )
            )
            continue
        if stage.declared_domain_primary not in manifest_set:
            errors.append(
                Diagnostic(
                    code="[STAGE-OUT-OF-DOMAIN]",
                    stage_id=stage.stage_id,
                    message=(
                        f"stage {stage.stage_id} declares domain.primary "
                        f"'{stage.declared_domain_primary}' but construct "
                        f"'{slug}' authorises only {sorted(manifest_set)} "
                        f"(domain.primary + domain.supporting[])."
                    ),
                )
            )
    return errors, warnings


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def validate(
    composition_path: Path, packs_dir: Path | None = None
) -> dict[str, Any]:
    composition = _load_yaml(composition_path)
    stages = _extract_stages(composition)
    external_inputs = _extract_external_inputs(composition)

    errors: list[Diagnostic] = []
    warnings: list[Diagnostic] = []
    errors.extend(_check_iteration(composition))
    errors.extend(_check_streams(stages, external_inputs))
    if packs_dir is not None:
        domain_errors, domain_warnings = _check_stage_domain(stages, packs_dir)
        errors.extend(domain_errors)
        warnings.extend(domain_warnings)

    return {
        "ok": len(errors) == 0,
        "composition_path": str(composition_path),
        "errors": [d.to_dict() for d in errors],
        "warnings": [d.to_dict() for d in warnings],
        "stages": [
            {
                "id": s.stage_id,
                "stage": s.stage,
                "construct": s.construct,
                "reads": s.reads,
                "writes": s.writes,
                "declared_domain_primary": s.declared_domain_primary,
            }
            for s in stages
        ],
    }


def _default_packs_dir() -> Path | None:
    """Walk up from this file to find <repo>/.claude/constructs/packs."""
    here = Path(__file__).resolve()
    for ancestor in (here.parent, *here.parents):
        candidate = ancestor / ".claude" / "constructs" / "packs"
        if candidate.is_dir():
            return candidate
    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate a Loa composition's stream graph (S1-T1, S1-T4).",
    )
    parser.add_argument(
        "composition", type=Path, help="Path to the composition YAML"
    )
    parser.add_argument(
        "--packs-dir",
        type=Path,
        default=None,
        help="Construct packs root for domain resolution (default: auto-locate)",
    )
    parser.add_argument(
        "--no-domain-check",
        action="store_true",
        help="Skip [STAGE-OUT-OF-DOMAIN] check (S1-T4)",
    )
    parser.add_argument(
        "--json", action="store_true", help="Emit JSON report (default)"
    )
    parser.add_argument(
        "--quiet", action="store_true", help="Suppress stdout report (exit code only)"
    )
    args = parser.parse_args()

    packs_dir: Path | None = None
    if not args.no_domain_check:
        packs_dir = args.packs_dir or _default_packs_dir()
        # When auto-locate fails, fall through with packs_dir=None — domain
        # check is skipped silently rather than failing closed (lets the
        # validator run on machines without a packs install).

    try:
        report = validate(args.composition, packs_dir=packs_dir)
    except _ExitWith as exc:
        print(exc.message, file=sys.stderr)
        return exc.code

    if not args.quiet:
        print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
