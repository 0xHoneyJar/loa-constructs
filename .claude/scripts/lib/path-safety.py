#!/usr/bin/env python3
"""
path-safety.py — Sprint 6 (S6-H1) — shared slug + realpath containment helper

Closes the cycle's carry-forward Finding F1 (slug path traversal in 4 caller
sites): compose-stream-graph._resolve_manifest, envelope-builder._resolve_manifest,
output-gate._stream_schema_path, persistent-state._validate_slug.

Single helper. Parameterized regex per call-site shape. Realpath-bounded
containment under a configurable root. Applied uniformly so a future
contributor can't reintroduce the gap by writing yet another path join.

The library is consumed via importlib.util by the four caller sites
(matching Sprint 2's envelope-builder pattern for sibling-module loading).

API:

    safe_resolve_pack_path(packs_dir: Path, slug: str) -> Path | None
        Resolve `<packs_dir>/<slug>/construct.yaml`. Validates slug against
        the pack-slug regex; canonicalizes via realpath; verifies the result
        is REL-PATH-CONTAINED inside packs_dir. Returns None on validation
        failure (callers MUST check; documented in docstring).

    safe_resolve_schema_path(schemas_dir: Path, schema_id: str) -> Path | None
        Resolve `<schemas_dir>/<type-kebab>.schema.json` for `loa.stream.<Type>.v<N>`.
        Validates schema_id against the schema-id regex AND validates parts[2]
        against `^[A-Za-z]+$` (closes F2 absolute-path traversal via Type
        component). Returns None on validation failure.

    safe_resolve_state_path(root: Path, *components: str) -> Path | None
        Resolve a multi-component composite-key path under root. Each
        component is regex-validated against the state-key regex (broader
        than pack-slug because composition_id carries `@:`). Returns None
        on validation failure.

    validate_slug(slug: str, *, kind: str = "pack") -> bool
        Pure regex check. kind ∈ {"pack", "schema-type", "composition-id",
        "state-key"}. Used by callers that DO their own path resolution but
        want centralized regex parameterization.

Regex constants (one source of truth):

    PACK_SLUG_RE       = ^[a-z0-9][a-z0-9-/]*[a-z0-9]$
    SCHEMA_TYPE_RE     = ^[A-Za-z]+$              (parts[2] of schema_id)
    SCHEMA_ID_RE       = ^loa\\.stream\\.[A-Za-z]+\\.v[0-9]+$
    COMPOSITION_ID_RE  = ^[A-Za-z0-9_./-]+@sha256:[0-9a-f]{12,64}$
    STATE_KEY_RE       = ^[A-Za-z0-9][A-Za-z0-9_./@:-]{0,255}$

CLI (for shell callers):

    path-safety.py validate-slug --kind <kind> <value>
        Exit 0 if valid; exit 1 if invalid; prints diagnostic on stderr.

    path-safety.py resolve-pack-path --packs-dir <dir> --slug <slug>
        Print absolute path on success; exit 0. Print empty + exit 1 on failure.

    path-safety.py resolve-schema-path --schemas-dir <dir> --schema-id <id>
        Same shape.

Exit codes:
    0   operation succeeded
    1   validation failed (slug malformed, traversal detected, etc.)
    2   usage / parse error
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Final


# ---------------------------------------------------------------------------
# Regex constants — single source of truth across the substrate
# ---------------------------------------------------------------------------


PACK_SLUG_RE: Final = re.compile(r"^[a-z0-9][a-z0-9-/]*[a-z0-9]$")
SCHEMA_TYPE_RE: Final = re.compile(r"^[A-Za-z]+$")
SCHEMA_ID_RE: Final = re.compile(r"^loa\.stream\.[A-Za-z]+\.v[0-9]+$")
COMPOSITION_ID_RE: Final = re.compile(r"^[A-Za-z0-9_./-]+@sha256:[0-9a-f]{12,64}$")
STATE_KEY_RE: Final = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_./@:-]{0,255}$")


_KIND_TO_REGEX: Final = {
    "pack": PACK_SLUG_RE,
    "schema-type": SCHEMA_TYPE_RE,
    "schema-id": SCHEMA_ID_RE,
    "composition-id": COMPOSITION_ID_RE,
    "state-key": STATE_KEY_RE,
}


# ---------------------------------------------------------------------------
# Validation primitives
# ---------------------------------------------------------------------------


def validate_slug(slug: str, *, kind: str = "pack") -> bool:
    """Pure regex check.

    Returns True if `slug` matches the regex for `kind`. Returns False otherwise.
    Also rejects any input containing `..` (path traversal vector — the regex
    SHOULD catch this but explicit double-rejection is cheap defense-in-depth).
    """
    if not isinstance(slug, str) or not slug:
        return False
    if ".." in slug:
        return False
    pattern = _KIND_TO_REGEX.get(kind)
    if pattern is None:
        return False
    return bool(pattern.match(slug))


def _is_contained_under(child: Path, parent: Path) -> bool:
    """Realpath-aware containment check. Resolves both sides to canonical
    absolute paths before comparing; then asserts child is parent OR a
    descendant. Handles symlink-resolved cases that string-prefix compare
    misses."""
    try:
        child_resolved = child.resolve(strict=False)
        parent_resolved = parent.resolve(strict=False)
    except (OSError, RuntimeError):
        return False
    try:
        child_resolved.relative_to(parent_resolved)
    except ValueError:
        return False
    return True


# ---------------------------------------------------------------------------
# Higher-level resolvers
# ---------------------------------------------------------------------------


def safe_resolve_pack_path(packs_dir: Path, slug: str) -> Path | None:
    """Resolve `<packs_dir>/<slug>/construct.yaml` with traversal containment.

    Returns the canonical absolute path on success, None on:
      - slug fails PACK_SLUG_RE
      - slug contains `..`
      - resolved path falls outside packs_dir (symlink escape)
      - construct.yaml not present at resolved path

    Callers MUST handle None — there is no exception path. The contract is
    "None means refuse, no logging needed at the caller's layer."
    """
    if not validate_slug(slug, kind="pack"):
        return None
    candidate = packs_dir / slug / "construct.yaml"
    if not _is_contained_under(candidate, packs_dir):
        return None
    if not candidate.is_file():
        return None
    return candidate.resolve(strict=False)


def safe_resolve_schema_path(schemas_dir: Path, schema_id: str) -> Path | None:
    """Resolve a stream schema file from `loa.stream.<Type>.v<N>` schema_id.

    Validation:
      - schema_id matches SCHEMA_ID_RE (loa.stream.<Type>.v<N>)
      - parts[2] (Type) matches SCHEMA_TYPE_RE (alpha-only — closes F2
        absolute-path traversal via `loa.stream./etc/passwd.v1`)
      - resolved path is contained under schemas_dir

    Maps Type to kebab-case (OperatorModel → operator-model). Returns None
    on any validation failure.
    """
    if not validate_slug(schema_id, kind="schema-id"):
        return None
    parts = schema_id.split(".")
    # SCHEMA_ID_RE already enforces structure; defensive parse below for
    # the rare regex-bypass case (won't happen, but cheap).
    if len(parts) != 4 or parts[0] != "loa" or parts[1] != "stream":
        return None
    type_name = parts[2]
    if not validate_slug(type_name, kind="schema-type"):
        return None
    # Map ClassCase → kebab-case.
    snake_chars: list[str] = []
    for i, ch in enumerate(type_name):
        if ch.isupper() and i > 0:
            snake_chars.append("-")
        snake_chars.append(ch.lower())
    file_stem = "".join(snake_chars)
    candidate = schemas_dir / f"{file_stem}.schema.json"
    if not _is_contained_under(candidate, schemas_dir):
        return None
    if not candidate.is_file():
        return None
    return candidate.resolve(strict=False)


def safe_resolve_state_path(root: Path, *components: str) -> Path | None:
    """Resolve a composite-key state path under root.

    Each component validated against STATE_KEY_RE (broader than pack-slug —
    composition_ids carry `@:`). Resolved path must be contained under root.
    """
    for component in components:
        if not validate_slug(component, kind="state-key"):
            return None
    candidate = root.joinpath(*components)
    if not _is_contained_under(candidate, root):
        return None
    return candidate


# ---------------------------------------------------------------------------
# CLI for shell callers (single source of truth across bash + python)
# ---------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Slug + path-safety helper (S6-H1, closes cycle F1+F2)."
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_v = sub.add_parser("validate-slug", help="Pure regex check; exit 0/1")
    p_v.add_argument("--kind", choices=list(_KIND_TO_REGEX.keys()), required=True)
    p_v.add_argument("value")
    p_v.set_defaults(fn=lambda a: 0 if validate_slug(a.value, kind=a.kind) else 1)

    p_pack = sub.add_parser("resolve-pack-path", help="Resolve <packs>/<slug>/construct.yaml safely")
    p_pack.add_argument("--packs-dir", type=Path, required=True)
    p_pack.add_argument("--slug", required=True)

    def _cmd_pack(a: argparse.Namespace) -> int:
        result = safe_resolve_pack_path(a.packs_dir, a.slug)
        if result is None:
            return 1
        print(result)
        return 0

    p_pack.set_defaults(fn=_cmd_pack)

    p_sch = sub.add_parser("resolve-schema-path", help="Resolve stream schema from schema_id")
    p_sch.add_argument("--schemas-dir", type=Path, required=True)
    p_sch.add_argument("--schema-id", required=True)

    def _cmd_sch(a: argparse.Namespace) -> int:
        result = safe_resolve_schema_path(a.schemas_dir, a.schema_id)
        if result is None:
            return 1
        print(result)
        return 0

    p_sch.set_defaults(fn=_cmd_sch)

    args = parser.parse_args()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
