#!/usr/bin/env python3
"""Migrate a construct pack manifest to strict-tier substrate shape (#227).

Converts legacy `domain: [tag, ...]` to object form and adds validation_tier,
context_policy, and migrated_to_substrate provenance.

Usage:
  migrate-strict-manifest.py /path/to/construct-repo [--dry-run]
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML required: pip install pyyaml", file=sys.stderr)
    sys.exit(2)


UBIQUITOUS_BY_SLUG: dict[str, list[str]] = {
    "gecko": ["drift", "patrol", "estate", "STATUS|SIGNAL|MISMATCH", "construct health"],
    "artisan": ["feel", "material", "motion", "accessibility", "taste"],
    "observer": ["user truth", "friction", "journey", "feedback"],
    "protocol": ["contract", "ABI", "on-chain", "frontend drift"],
    "beacon": ["trust", "markdown export", "agent-readable"],
    "mibera-codex": ["mibera", "trait", "archetype", "lore"],
    "k-hole": ["research", "resonance", "depth", "source"],
    "the-easel": ["visual direction", "moodboard", "reference"],
    "crucible": ["journey", "playwright", "verification"],
    "hardening": ["security", "audit", "postmortem", "triage"],
    "kansei": ["animation", "haptic", "interaction feel"],
    "showcase": ["landing page", "visual metaphor", "narrative layout"],
}


def load_manifest(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    if not isinstance(data, dict):
        raise ValueError("construct.yaml must be a mapping")
    return data


def normalize_streams(manifest: dict) -> dict:
    reads = manifest.get("reads") or manifest.get("streams", {}).get("reads") or []
    writes = manifest.get("writes") or manifest.get("streams", {}).get("writes") or []
    if isinstance(reads, str):
        reads = [reads]
    if isinstance(writes, str):
        writes = [writes]
    manifest.pop("reads", None)
    manifest.pop("writes", None)
    manifest["streams"] = {"reads": list(reads), "writes": list(writes)}
    return manifest


def migrate_domain(manifest: dict, slug: str) -> dict:
    domain = manifest.get("domain")
    tags: list[str] = []
    if isinstance(domain, str):
        tags = [domain]
    elif isinstance(domain, list):
        tags = [str(t) for t in domain]
    elif isinstance(domain, dict) and "primary" in domain:
        return manifest

    primary = tags[0] if tags else slug
    supporting = tags[1:] if len(tags) > 1 else []
    lang = UBIQUITOUS_BY_SLUG.get(slug, tags or [slug])
    reads = manifest.get("streams", {}).get("reads", [])
    writes = manifest.get("streams", {}).get("writes", [])

    manifest["domain"] = {
        "primary": primary,
        "supporting": supporting,
        "ubiquitous_language": lang,
        "owns": {
            "streams": list(dict.fromkeys([*reads, *writes])),
            "invariants": [
                f"{slug} operates within its declared bounded context",
                "sense-only constructs never gate operator decisions",
            ],
        },
        "out_of_domain": [
            "implementation in consumer world repos",
            "schema changes in loa-constructs unless explicitly owned",
        ],
    }
    return manifest


def migrate(path: Path, dry_run: bool) -> None:
    manifest_path = path / "construct.yaml"
    if not manifest_path.exists():
        raise FileNotFoundError(manifest_path)

    manifest = load_manifest(manifest_path)
    slug = str(manifest.get("slug") or path.name.replace("construct-", ""))

    manifest = normalize_streams(manifest)
    manifest = migrate_domain(manifest, slug)
    manifest["validation_tier"] = "strict"
    manifest["context_policy"] = manifest.get("context_policy") or {
        "mode": "fresh",
        "persistence_scope": "stage",
        "allowed_context": [f"grimoires/{slug}/"],
    }
    manifest["migrated_to_substrate"] = dt.date.today().isoformat()

    if dry_run:
        print(yaml.dump(manifest, sort_keys=False, allow_unicode=True))
        return

    backup_path = manifest_path.with_suffix(manifest_path.suffix + ".bak")
    backup_path.write_text(manifest_path.read_text(encoding="utf-8"), encoding="utf-8")
    with manifest_path.open("w", encoding="utf-8") as f:
        yaml.dump(manifest, f, sort_keys=False, allow_unicode=True)
    print(f"migrated: {manifest_path} (backup: {backup_path})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pack_path", type=Path, help="Path to construct repo root")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    migrate(args.pack_path.resolve(), args.dry_run)


if __name__ == "__main__":
    main()
