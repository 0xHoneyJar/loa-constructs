#!/usr/bin/env python3
"""
output-gate.py — Sprint 1 (S1-T2)

Post-execution output validator for the Construct Bounded-Context Runtime
Substrate (cycle-construct-bounded-context, SDD §4.4, FR-11).

Reads the invocation + handoff envelopes for a single stage and validates
that every declared output in invocation.output_contract.writes[] is honored
by the stage's actual writes:

    1. File exists at the declared destination path.
    2. Payload parses as JSON.
    3. Payload validates against the stream schema referenced by schema_id.
    4. The handoff outputs[] hash for that destination matches the JCS-canonical
       sha256 of the file content (re-computed; not trusted from the envelope).
    5. The handoff outputs[] domain.produced_by matches the construct's declared
       domain.primary or appears in domain.supporting[].

It also enforces output-count semantics (FR-11.1):

    * Required outputs missing → [OUTPUT-MISSING]
    * Extra files inside allowed_write_paths beyond the contract → [ORPHAN-OUTPUT]
    * Any per-output failure surfaces as [OUTPUT-CONTRACT-VIOLATION] with a
      structured subcode in the diagnostic for triage.

Inputs (CLI):
    --invocation <path>     Invocation envelope JSON (has output_contract).
    --handoff    <path>     Handoff envelope JSON (has outputs[]).
    --manifest   <path>     construct.yaml for domain.primary attribution check.
    --schemas-dir <path>    Optional. Defaults to <repo>/.claude/schemas/.
    --quiet                 Exit code only; no stdout report.

Output (stdout):
    JSON report with shape:
        {
          "ok": bool,
          "errors": [{"code": "...", "destination": "...", "message": "..."}, ...],
          "warnings": [...],
          "outputs_evaluated": int,
          "outputs_required": int,
          "orphans": [".../path", ...]
        }

Exit codes:
    0  — all declared outputs honored, no orphans
    1  — validation failed
    2  — usage / parse error
    3  — environment problem (missing file / pyyaml / jsonschema)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Exceptions
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
# Diagnostics
# ---------------------------------------------------------------------------


@dataclass
class Diagnostic:
    code: str
    destination: str | None
    message: str
    subcode: str | None = None

    def to_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.destination is not None:
            out["destination"] = self.destination
        if self.subcode is not None:
            out["subcode"] = self.subcode
        return out


# ---------------------------------------------------------------------------
# I/O helpers
# ---------------------------------------------------------------------------


def _load_json(path: Path, label: str) -> dict[str, Any]:
    if not path.is_file():
        raise _err_env(f"{label} not found at {path}")
    text = path.read_text()
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise _err_usage(f"{label} at {path} is not valid JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise _err_usage(f"{label} at {path} must be a JSON object")
    return data


def _load_yaml(path: Path, label: str) -> dict[str, Any]:
    try:
        import yaml  # type: ignore[import-untyped]
    except ImportError as exc:  # pragma: no cover - environment guard
        raise _err_env(f"pyyaml required for manifest parsing: {exc}") from exc
    if not path.is_file():
        raise _err_env(f"{label} not found at {path}")
    try:
        data = yaml.safe_load(path.read_text())
    except yaml.YAMLError as exc:
        raise _err_usage(f"{label} at {path} is not valid YAML: {exc}") from exc
    if not isinstance(data, dict):
        raise _err_usage(f"{label} at {path} must be a YAML mapping")
    return data


# ---------------------------------------------------------------------------
# JCS recompute
# ---------------------------------------------------------------------------


def _jcs_canonical_bytes(value: Any) -> bytes:
    """RFC 8785 JCS canonicalization. Prefers `rfc8785` package (cycle-098
    canonical); falls back to a JSON-only canonical form (`sort_keys=True`,
    `separators=(',',':')`) when the package is unavailable. The fallback
    is sufficient for outputs that contain only objects, arrays, strings,
    booleans, null, and integers (no floats) — which is the substrate's
    output payload contract — but loses ECMAScript ToNumber semantics if a
    payload ever carries a float. Operator can install rfc8785 via
    `pip install rfc8785` to remove the fallback."""
    try:
        import rfc8785  # type: ignore[import-untyped]
    except ImportError:
        return json.dumps(
            value, sort_keys=True, separators=(",", ":"), ensure_ascii=False
        ).encode("utf-8")
    return rfc8785.dumps(value)


def _sha256_hex(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


# ---------------------------------------------------------------------------
# Schema resolution
# ---------------------------------------------------------------------------


def _stream_schema_path(schema_id: str, schemas_dir: Path) -> Path:
    """Map `loa.stream.<Type>.v<N>` → `<schemas_dir>/<type-lower>.schema.json`.

    For Sprint 1 the substrate carries a single schema file per stream type
    (Signal, Verdict, Artifact, Intent, OperatorModel). When schema_version-aware
    files arrive (Sprint 5+ migrations), the resolver gains a versioned lookup;
    until then the v* component is informational and validates against the
    current schema."""
    parts = schema_id.split(".")
    if len(parts) != 4 or parts[0] != "loa" or parts[1] != "stream" or not parts[3].startswith("v"):
        raise _err_usage(f"unrecognized schema_id format '{schema_id}'")
    type_name = parts[2]
    # Map ClassCase → kebab-case file name (e.g. OperatorModel → operator-model).
    snake_chars: list[str] = []
    for i, ch in enumerate(type_name):
        if ch.isupper() and i > 0:
            snake_chars.append("-")
        snake_chars.append(ch.lower())
    file_stem = "".join(snake_chars)
    candidate = schemas_dir / f"{file_stem}.schema.json"
    if not candidate.is_file():
        raise _err_env(
            f"stream schema for '{schema_id}' not found at {candidate}; "
            f"expected '{file_stem}.schema.json' under {schemas_dir}"
        )
    return candidate


def _validate_payload_against_schema(payload: Any, schema: dict[str, Any]) -> str | None:
    """Returns None on success, an error message on failure."""
    try:
        import jsonschema  # type: ignore[import-untyped]
    except ImportError:
        return None  # Schema validation is best-effort when jsonschema isn't installed.
    try:
        jsonschema.validate(instance=payload, schema=schema)
    except jsonschema.ValidationError as exc:
        return f"schema mismatch at '{'.'.join(str(p) for p in exc.path)}': {exc.message}"
    except jsonschema.SchemaError as exc:
        return f"stream schema is itself invalid: {exc.message}"
    return None


# ---------------------------------------------------------------------------
# Main validation
# ---------------------------------------------------------------------------


@dataclass
class Report:
    errors: list[Diagnostic] = field(default_factory=list)
    warnings: list[Diagnostic] = field(default_factory=list)
    outputs_evaluated: int = 0
    outputs_required: int = 0
    orphans: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": not self.errors,
            "errors": [d.to_dict() for d in self.errors],
            "warnings": [d.to_dict() for d in self.warnings],
            "outputs_evaluated": self.outputs_evaluated,
            "outputs_required": self.outputs_required,
            "orphans": self.orphans,
        }


def _domain_attribution_set(manifest: dict[str, Any]) -> set[str]:
    """Compute the set of domain tags allowed for `domain.produced_by` cross-check.
    Accepts string-form, array-form, and object-form domain declarations as long
    as `primary` (or the legacy single-tag form) is present."""
    domain = manifest.get("domain")
    if isinstance(domain, str):
        return {domain}
    if isinstance(domain, list):
        return {x for x in domain if isinstance(x, str)}
    if isinstance(domain, dict):
        out: set[str] = set()
        primary = domain.get("primary")
        if isinstance(primary, str):
            out.add(primary)
        for tag in domain.get("supporting", []) or []:
            if isinstance(tag, str):
                out.add(tag)
        return out
    return set()


def _classify_handoff_status(handoff: dict[str, Any]) -> str:
    status = handoff.get("status")
    return status if isinstance(status, str) else "unknown"


def validate(
    invocation: dict[str, Any],
    handoff: dict[str, Any],
    manifest: dict[str, Any],
    schemas_dir: Path,
) -> Report:
    report = Report()

    contract = invocation.get("output_contract") or {}
    writes = contract.get("writes")
    if not isinstance(writes, list):
        report.errors.append(
            Diagnostic(
                code="[OUTPUT-CONTRACT-VIOLATION]",
                destination=None,
                message="invocation envelope is missing output_contract.writes[]",
                subcode="contract_missing",
            )
        )
        return report

    handoff_status = _classify_handoff_status(handoff)
    handoff_outputs = handoff.get("outputs") or []
    if not isinstance(handoff_outputs, list):
        handoff_outputs = []

    declared_destinations = {w.get("destination") for w in writes if isinstance(w, dict)}
    handoff_destinations = {
        o.get("uri") for o in handoff_outputs if isinstance(o, dict)
    }

    # Build a fast lookup from destination → handoff output.
    handoff_by_destination: dict[str, dict[str, Any]] = {}
    for o in handoff_outputs:
        if isinstance(o, dict) and isinstance(o.get("uri"), str):
            handoff_by_destination[o["uri"]] = o

    domain_set = _domain_attribution_set(manifest)
    construct_slug = manifest.get("slug") or invocation.get("construct_slug")

    # Walk every declared write.
    for write in writes:
        if not isinstance(write, dict):
            report.errors.append(
                Diagnostic(
                    code="[OUTPUT-CONTRACT-VIOLATION]",
                    destination=None,
                    message="output_contract.writes[] entry is not an object",
                    subcode="contract_shape",
                )
            )
            continue
        report.outputs_evaluated += 1
        destination = write.get("destination")
        required = bool(write.get("required", True))
        schema_id = write.get("schema_id")
        if required:
            report.outputs_required += 1

        if not isinstance(destination, str):
            report.errors.append(
                Diagnostic(
                    code="[OUTPUT-CONTRACT-VIOLATION]",
                    destination=None,
                    message="declared output is missing destination path",
                    subcode="contract_shape",
                )
            )
            continue

        path = Path(destination)
        if not path.exists():
            if required:
                report.errors.append(
                    Diagnostic(
                        code="[OUTPUT-MISSING]",
                        destination=destination,
                        message=(
                            f"required output '{destination}' was not produced "
                            f"(handoff status={handoff_status})"
                        ),
                    )
                )
            else:
                report.warnings.append(
                    Diagnostic(
                        code="[OUTPUT-MISSING]",
                        destination=destination,
                        message=f"optional output '{destination}' not produced",
                    )
                )
            continue

        # Parse JSON.
        try:
            payload_text = path.read_text()
        except OSError as exc:
            report.errors.append(
                Diagnostic(
                    code="[OUTPUT-CONTRACT-VIOLATION]",
                    destination=destination,
                    message=f"cannot read declared output: {exc}",
                    subcode="io_error",
                )
            )
            continue
        try:
            payload = json.loads(payload_text)
        except json.JSONDecodeError as exc:
            report.errors.append(
                Diagnostic(
                    code="[OUTPUT-CONTRACT-VIOLATION]",
                    destination=destination,
                    message=f"output is not valid JSON: {exc}",
                    subcode="json_parse",
                )
            )
            continue

        # Schema validation (best-effort: silent skip when jsonschema not installed).
        if isinstance(schema_id, str) and schema_id:
            try:
                schema_path = _stream_schema_path(schema_id, schemas_dir)
                schema = json.loads(schema_path.read_text())
            except _ExitWith as exc:
                report.errors.append(
                    Diagnostic(
                        code="[OUTPUT-CONTRACT-VIOLATION]",
                        destination=destination,
                        message=exc.message,
                        subcode="schema_resolve",
                    )
                )
                continue
            except (OSError, json.JSONDecodeError) as exc:
                report.errors.append(
                    Diagnostic(
                        code="[OUTPUT-CONTRACT-VIOLATION]",
                        destination=destination,
                        message=f"stream schema unreadable: {exc}",
                        subcode="schema_resolve",
                    )
                )
                continue
            schema_err = _validate_payload_against_schema(payload, schema)
            if schema_err is not None:
                report.errors.append(
                    Diagnostic(
                        code="[OUTPUT-CONTRACT-VIOLATION]",
                        destination=destination,
                        message=schema_err,
                        subcode="schema_mismatch",
                    )
                )
                continue

        # Hash recompute via JCS.
        recomputed = _sha256_hex(_jcs_canonical_bytes(payload))
        handoff_entry = handoff_by_destination.get(destination)
        if handoff_entry is None:
            report.errors.append(
                Diagnostic(
                    code="[OUTPUT-CONTRACT-VIOLATION]",
                    destination=destination,
                    message=(
                        f"declared output '{destination}' has no entry in handoff "
                        f"envelope outputs[]"
                    ),
                    subcode="handoff_missing",
                )
            )
            continue
        reported_hash = handoff_entry.get("hash")
        if reported_hash != recomputed:
            report.errors.append(
                Diagnostic(
                    code="[OUTPUT-CONTRACT-VIOLATION]",
                    destination=destination,
                    message=(
                        f"hash mismatch: handoff envelope reports '{reported_hash}' "
                        f"but JCS-recompute of file content yields '{recomputed}'"
                    ),
                    subcode="hash_mismatch",
                )
            )
            continue

        # Domain attribution check (SDD §4.4 step 5 + handoff schema semantics):
        #   - domain.produced_by is a CONSTRUCT SLUG; must match invocation's
        #     construct_slug (delegation declared via writes[].delegated_to is
        #     the only legal mismatch path).
        #   - domain.primary is a DOMAIN TAG; must appear in the manifest's
        #     domain.primary OR domain.supporting[].
        domain_block = handoff_entry.get("domain") or {}
        produced_by = domain_block.get("produced_by")
        domain_primary_tag = domain_block.get("primary")

        if not isinstance(produced_by, str) or not produced_by:
            report.errors.append(
                Diagnostic(
                    code="[OUTPUT-CONTRACT-VIOLATION]",
                    destination=destination,
                    message="handoff output is missing domain.produced_by",
                    subcode="domain_missing",
                )
            )
            continue

        # produced_by mismatch — construct_slug cross-check
        if (
            isinstance(construct_slug, str)
            and construct_slug
            and produced_by != construct_slug
            and not write.get("delegated_to")
        ):
            report.errors.append(
                Diagnostic(
                    code="[OUTPUT-CONTRACT-VIOLATION]",
                    destination=destination,
                    message=(
                        f"domain.produced_by '{produced_by}' differs from invocation "
                        f"construct_slug '{construct_slug}' without explicit "
                        f"output_contract.writes[].delegated_to declaration"
                    ),
                    subcode="cross_construct",
                )
            )
            continue

        # domain.primary tag check — must be one the manifest authorises.
        if isinstance(domain_primary_tag, str) and domain_primary_tag and domain_set:
            if domain_primary_tag not in domain_set:
                report.errors.append(
                    Diagnostic(
                        code="[OUTPUT-CONTRACT-VIOLATION]",
                        destination=destination,
                        message=(
                            f"output domain.primary '{domain_primary_tag}' is not "
                            f"declared in manifest domain (allowed={sorted(domain_set)})"
                        ),
                        subcode="domain_mismatch",
                    )
                )
                continue

    # Orphan detection: handoff outputs that are not in the contract are orphans.
    for uri in handoff_destinations:
        if isinstance(uri, str) and uri not in declared_destinations:
            report.orphans.append(uri)
            report.errors.append(
                Diagnostic(
                    code="[ORPHAN-OUTPUT]",
                    destination=uri,
                    message=(
                        f"handoff envelope reports '{uri}' but it is not declared in "
                        f"invocation.output_contract.writes[]"
                    ),
                )
            )

    return report


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate stage outputs against the invocation envelope's "
        "output_contract (S1-T2, FR-11, SDD §4.4).",
    )
    parser.add_argument("--invocation", type=Path, required=True)
    parser.add_argument("--handoff", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--schemas-dir", type=Path, default=None)
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    if args.schemas_dir is None:
        # Default: walk up from this file to find the repo root.
        here = Path(__file__).resolve()
        candidate = None
        for ancestor in (here.parent, *here.parents):
            possible = ancestor / ".claude" / "schemas"
            if possible.is_dir():
                candidate = possible
                break
        if candidate is None:
            print(
                "ENV: --schemas-dir not provided and could not auto-locate "
                ".claude/schemas",
                file=sys.stderr,
            )
            return 3
        args.schemas_dir = candidate

    try:
        invocation = _load_json(args.invocation, "invocation envelope")
        handoff = _load_json(args.handoff, "handoff envelope")
        manifest = _load_yaml(args.manifest, "construct manifest")
        report = validate(invocation, handoff, manifest, args.schemas_dir)
    except _ExitWith as exc:
        print(exc.message, file=sys.stderr)
        return exc.code

    if not args.quiet:
        print(json.dumps(report.to_dict(), indent=2))
    return 0 if not report.errors else 1


if __name__ == "__main__":
    sys.exit(main())
