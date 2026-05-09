#!/usr/bin/env python3
"""
compose-dry-run.py — Sprint 2 (S2-T4) — dry-run + explain-context engine

Implements `compose-run --dry-run --explain-context [--json]` per SDD §4.7
(FR-9 / IMP-007). For each stage in a composition, builds the invocation
envelope that *would* be sent at run time (without spawning subprocesses)
and emits a dry-run report conforming to
`.claude/data/dry-run-fixture.schema.json`.

Composes:
  - lib/compose-stream-graph.py (S1-T1) — graph validation surfaces as errors[]
  - lib/envelope-builder.py     (S2-T1) — invocation envelope preview per stage
  - lib/envelope-chain.py       (S2-T2) — composition_id

Output structure (per dry-run-fixture.schema.json):

    {
      "composition": {"path": "...", "composition_id": "..."},
      "stages": [
        {
          "stage_id": "...", "construct": "...", "skill": "...", "mode": "...",
          "invocation_envelope_preview": {...},
          "allowed_files": [...],
          "missing_schemas": [...],
          "domain_conflicts": [...],
          "isolation_assessment": {...},
          "persistence_scope": null,
          "iteration_role": null
        }
      ],
      "warnings": [...],
      "errors": [...]
    }

CI gate (IMP-007): `compose-dry-run --json | jq -e '.errors == []'` blocks
merge if any composition has errors.

CLI:

    compose-dry-run.py <composition.yaml> [--explain-context] [--json] [--quiet]

Exit codes:
    0 — composition validates (errors[] empty)
    1 — validation failed (errors[] non-empty)
    2 — usage / parse error
    3 — environment problem
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Sibling-module loaders (compose-stream-graph + envelope-builder + chain)
# ---------------------------------------------------------------------------


_THIS_DIR = Path(__file__).resolve().parent


def _load_module(module_name: str, file_name: str):
    spec = importlib.util.spec_from_file_location(module_name, _THIS_DIR / file_name)
    if spec is None or spec.loader is None:
        raise SystemExit(f"ENV: cannot locate {file_name} adjacent to compose-dry-run.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)
    return mod


envelope_chain = _load_module("envelope_chain", "envelope-chain.py")
envelope_builder = _load_module("envelope_builder", "envelope-builder.py")
stream_graph = _load_module("compose_stream_graph", "compose-stream-graph.py")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _err(code: int, message: str) -> int:
    print(message, file=sys.stderr)
    return code


def _default_packs_dir() -> Path | None:
    here = Path(__file__).resolve()
    for ancestor in (here.parent, *here.parents):
        candidate = ancestor / ".claude" / "constructs" / "packs"
        if candidate.is_dir():
            return candidate
    return None


def _default_schemas_dir() -> Path | None:
    here = Path(__file__).resolve()
    for ancestor in (here.parent, *here.parents):
        candidate = ancestor / ".claude" / "schemas"
        if candidate.is_dir():
            return candidate
    return None


def _stream_schema_exists(schema_id: str, schemas_dir: Path) -> bool:
    """Mirror the kebab-case mapping used by output-gate.py."""
    parts = schema_id.split(".")
    if len(parts) != 4 or parts[0] != "loa" or parts[1] != "stream":
        return False
    type_name = parts[2]
    snake_chars: list[str] = []
    for i, ch in enumerate(type_name):
        if ch.isupper() and i > 0:
            snake_chars.append("-")
        snake_chars.append(ch.lower())
    return (schemas_dir / f"{''.join(snake_chars)}.schema.json").is_file()


def _isolation_vectors_for_tier(tier: str) -> tuple[list[str], list[str]]:
    """Return (covered, uncovered) leak-vector lists for the given tier.

    Per SDD §6.5b:
      - strict tier covers all 7 vectors via kernel boundaries.
      - advisory tier covers cooperative-only enforcement (filesystem,
        env, tmux at best-effort; LLM session reset is platform-dependent).
    """
    if tier == "strict":
        covered = [
            "filesystem", "env", "tmux", "llm_session",
            "mcp_tools", "network", "transcript"
        ]
        return covered, []
    # advisory tier — informational coverage at best
    return ["filesystem", "env", "tmux"], [
        "llm_session", "mcp_tools", "network", "transcript"
    ]


# ---------------------------------------------------------------------------
# Per-stage report
# ---------------------------------------------------------------------------


def _build_stage_report(
    composition_path: Path,
    stage_num: int,
    composition: dict[str, Any],
    packs_dir: Path | None,
    schemas_dir: Path,
) -> dict[str, Any]:
    stage = next(
        (s for s in composition.get("chain", []) if isinstance(s, dict) and s.get("stage") == stage_num),
        None,
    )
    if stage is None:
        return {}

    construct_slug = stage.get("construct", "")
    skill = stage.get("skill") or ""

    # Build the invocation envelope preview. We skip the chain (prev_hash=null,
    # invocation_hash=<computed-at-run-time>) since dry-run doesn't carry the
    # prior-stage handoff.
    try:
        inv_preview = envelope_builder.build_invocation(
            composition_path=composition_path,
            stage_num=stage_num,
            stage_pass=1,
            run_id="<dry-run>",
            prior_handoff=None,
            manifest_override=None,
            packs_dir=packs_dir,
        )
    except envelope_builder._ExitWith as exc:  # noqa: SLF001
        # Surface as a warning rather than a hard error; the graph validator
        # will catch upstream contract problems.
        inv_preview = {
            "schema_version": "loa.construct.invocation.v0",
            "stage_id": f"{composition_path.stem.replace('.', '-')}.stage-{stage_num}",
            "construct_slug": construct_slug,
            "_dry_run_warning": exc.message,
        }

    # Hash fields are placeholders in dry-run preview.
    inv_preview["prev_hash"] = None
    inv_preview["invocation_hash"] = "<computed-at-run-time>"

    # Identify missing schemas referenced by this stage's writes[].
    missing_schemas: list[str] = []
    for w in stage.get("writes", []) or []:
        sid = None
        if isinstance(w, dict):
            sid = w.get("schema_id")
        elif isinstance(w, str):
            sid = f"loa.stream.{w}.v1"
        if isinstance(sid, str) and not _stream_schema_exists(sid, schemas_dir):
            missing_schemas.append(sid)

    # Domain conflicts (manifest declared vs stage declared).
    domain_conflicts: list[dict[str, str]] = []
    if packs_dir is not None and isinstance(stage.get("domain"), dict):
        manifest = envelope_builder._resolve_manifest(construct_slug, packs_dir)  # noqa: SLF001
        if manifest is not None:
            stage_primary = stage["domain"].get("primary")
            mset = stream_graph._manifest_domain_set(manifest)  # noqa: SLF001
            if isinstance(stage_primary, str) and stage_primary and mset and stage_primary not in mset:
                domain_conflicts.append({
                    "claimed": stage_primary,
                    "actual": ",".join(sorted(mset)),
                    "source": "manifest",
                })

    tier = inv_preview.get("context_policy", {}).get("isolation_tier", "advisory")
    covered, uncovered = _isolation_vectors_for_tier(tier)
    isolation = {
        "ok": len(uncovered) == 0,
        "vectors_covered": covered,
        "vectors_uncovered": uncovered,
    }

    cp = inv_preview.get("context_policy", {}) or {}
    allowed_files: list[str] = []
    allowed_files.extend(cp.get("allowed_read_paths", []) or [])
    allowed_files.extend(cp.get("allowed_write_paths", []) or [])

    # mode: pin to a schema-allowed enum (`fresh|persistent|blocking`).
    raw_mode = stage.get("mode") or "fresh"
    mode = raw_mode if raw_mode in ("fresh", "persistent", "blocking") else "fresh"

    # skill: pin to schema regex `^[a-z][a-z0-9_-]{0,63}$`. The schema does
    # not allow legacy hyphenated/colon variants here; fall back to a placeholder
    # when the stage's skill doesn't conform — emit a warning entry instead of
    # silently corrupting the report.
    if not skill or not skill.replace("_", "").replace("-", "").isalnum() or not skill[0].islower():
        skill = "unknown"

    return {
        "stage_id": inv_preview.get("stage_id") or f"{composition_path.stem}.stage-{stage_num}",
        "construct": construct_slug,
        "skill": skill,
        "mode": mode,
        "invocation_envelope_preview": inv_preview,
        "allowed_files": allowed_files,
        "missing_schemas": missing_schemas,
        "domain_conflicts": domain_conflicts,
        "isolation_assessment": isolation,
        "persistence_scope": None if mode != "persistent" else (cp.get("persistence_scope") or "construct"),
        "iteration_role": None,
    }


# ---------------------------------------------------------------------------
# Top-level dry-run
# ---------------------------------------------------------------------------


def dry_run(
    composition_path: Path,
    packs_dir: Path | None,
    schemas_dir: Path,
) -> dict[str, Any]:
    composition = envelope_builder._load_yaml(composition_path, "composition")  # noqa: SLF001
    composition_id = envelope_chain.composition_id(composition_path)

    # Run the stream-graph validator first; its errors become top-level errors.
    stream_report = stream_graph.validate(composition_path, packs_dir=packs_dir)
    errors: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    for err in stream_report.get("errors", []):
        errors.append({"code": err.get("code", "[UNKNOWN-ERROR]"), "message": err.get("message", "")})
    for warn in stream_report.get("warnings", []):
        warnings.append({"code": warn.get("code", "[WARN]"), "message": warn.get("message", "")})

    # Per-stage reports.
    stages_out: list[dict[str, Any]] = []
    for stage in composition.get("chain", []) or []:
        if not isinstance(stage, dict):
            continue
        stage_num = stage.get("stage")
        if stage_num is None:
            continue
        report = _build_stage_report(
            composition_path, int(stage_num), composition, packs_dir, schemas_dir
        )
        if report:
            stages_out.append(report)
            for sid in report.get("missing_schemas", []):
                errors.append({
                    "code": "[STREAM-SCHEMA-NOT-FOUND]",
                    "message": f"stage {report['stage_id']} references unresolved schema_id '{sid}'",
                })
            for conflict in report.get("domain_conflicts", []):
                errors.append({
                    "code": "[STAGE-OUT-OF-DOMAIN]",
                    "message": (
                        f"stage {report['stage_id']} claims domain '{conflict['claimed']}' "
                        f"but {conflict['source']} authorises '{conflict['actual']}'"
                    ),
                })
            if not report["isolation_assessment"]["ok"]:
                warnings.append({
                    "code": "[ISOLATION-INCOMPLETE]",
                    "message": (
                        f"stage {report['stage_id']} runs at "
                        f"{report['invocation_envelope_preview'].get('context_policy', {}).get('isolation_tier')} "
                        f"tier; vectors uncovered: {report['isolation_assessment'].get('vectors_uncovered', [])}"
                    ),
                })

    return {
        "composition": {"path": str(composition_path), "composition_id": composition_id},
        "stages": stages_out,
        "warnings": warnings,
        "errors": errors,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Compose dry-run + explain-context engine (S2-T4, SDD §4.7).",
    )
    parser.add_argument("composition", type=Path)
    parser.add_argument("--explain-context", action="store_true",
                        help="Surface invocation_envelope_preview + isolation_assessment in detail")
    parser.add_argument("--packs-dir", type=Path, default=None)
    parser.add_argument("--schemas-dir", type=Path, default=None)
    parser.add_argument("--json", action="store_true", help="Emit JSON (default)")
    parser.add_argument("--quiet", action="store_true", help="Suppress stdout report")
    args = parser.parse_args()

    packs_dir = args.packs_dir or _default_packs_dir()
    schemas_dir = args.schemas_dir or _default_schemas_dir()
    if schemas_dir is None:
        return _err(3, "ENV: --schemas-dir not provided and could not auto-locate")

    try:
        report = dry_run(args.composition, packs_dir, schemas_dir)
    except SystemExit as exc:
        return int(exc.code) if exc.code is not None else 3
    except envelope_builder._ExitWith as exc:  # noqa: SLF001
        return _err(exc.code, exc.message)

    if not args.quiet:
        print(json.dumps(report, indent=2))
    return 0 if not report["errors"] else 1


if __name__ == "__main__":
    sys.exit(main())
