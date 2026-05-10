#!/usr/bin/env python3
"""adapter-generator.py — Construct adapter generator (Sprint 3, S3-T1..T6)

Reads .claude/constructs/packs/<slug>/construct.yaml + identity files,
renders .claude/scripts/templates/construct-adapter.template.md, writes
.claude/agents/construct-<slug>.md.

Idempotent: re-running with no manifest changes produces zero diff.

Usage (called by construct-adapter-gen.sh):
    python3 adapter-generator.py --slug artisan
    python3 adapter-generator.py --all
    python3 adapter-generator.py --check          # exit 1 if any diff
    python3 adapter-generator.py --slug X --check
"""

import argparse
import hashlib
import json
import string
import sys
import textwrap
from datetime import datetime, timezone
from pathlib import Path

import yaml

GEN_VERSION = "1.0.0"
PROJECT_ROOT = Path(__file__).resolve().parents[3]
PACKS_DIR = PROJECT_ROOT / ".claude" / "constructs" / "packs"
AGENTS_DIR = PROJECT_ROOT / ".claude" / "agents"
TEMPLATE_PATH = PROJECT_ROOT / ".claude" / "scripts" / "templates" / "construct-adapter.template.md"

BASELINE_TOOLS = ["Read", "Grep", "Glob", "Bash"]


def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return f"sha256:{h.hexdigest()}"


def load_manifest(slug: str) -> dict:
    manifest_path = PACKS_DIR / slug / "construct.yaml"
    if not manifest_path.exists():
        raise FileNotFoundError(f"manifest not found: {manifest_path}")
    return yaml.safe_load(manifest_path.read_text())


def find_persona_files(slug: str, manifest: dict) -> tuple[list[Path], list[str]]:
    """Returns (persona_paths, persona_names)."""
    identity_dir = PACKS_DIR / slug / "identity"
    persona_paths: list[Path] = []
    persona_names: list[str] = []

    if not identity_dir.exists():
        return persona_paths, persona_names

    declared = manifest.get("personas") or []
    if isinstance(declared, list) and declared:
        for name in declared:
            f = identity_dir / f"{name}.md"
            if f.exists():
                persona_paths.append(f)
                persona_names.append(name)

    if not persona_paths:
        for f in sorted(identity_dir.glob("*.md")):
            stem = f.stem
            if stem.upper() == stem and stem != "README":
                persona_paths.append(f)
                persona_names.append(stem)

    return persona_paths, persona_names


def resolve_tools(manifest: dict) -> tuple[list[str], list[str], list[str]]:
    """Returns (tools_allowlist, tools_denied, tools_required)."""
    tools_block = manifest.get("tools") or {}
    allowlist = list(tools_block.get("allowlist") or [])
    denylist = list(tools_block.get("denylist") or [])
    required = list(tools_block.get("required") or [])
    inherit_baseline = tools_block.get("inherit_baseline", True)

    if not allowlist:
        allowlist = list(BASELINE_TOOLS)
    elif inherit_baseline:
        for t in BASELINE_TOOLS:
            if t not in allowlist:
                allowlist.insert(0, t)

    allowlist = [t for t in allowlist if t not in denylist]
    return allowlist, denylist, required


def color_for(slug: str) -> str:
    palette = ["orange", "amber", "cyan", "blue", "purple", "magenta", "red", "green", "yellow", "pink", "teal", "lime"]
    h = int(hashlib.sha256(slug.encode()).hexdigest(), 16)
    return palette[h % len(palette)]


def yaml_inline(value) -> str:
    """Render a value as inline YAML."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        if not value:
            return "[]"
        return "[" + ", ".join(yaml_inline(v) for v in value) + "]"
    if isinstance(value, dict):
        return yaml.safe_dump(value, default_flow_style=True).strip()
    return str(value)


def yaml_block_under_key(items: list, indent: int = 4) -> str:
    if not items:
        return "[]"
    pad = " " * indent
    lines = [f"\n{pad}- {item}" for item in items]
    return "".join(lines)


def short_persona_intro(persona_path: Path) -> str:
    if not persona_path.exists():
        return "_No persona file._"
    text = persona_path.read_text()
    lines = text.splitlines()
    in_identity = False
    captured: list[str] = []
    for line in lines:
        if line.strip().startswith("## "):
            heading = line.strip().lstrip("#").strip().lower()
            if heading.startswith("identity") or heading.startswith("the keeper") or heading.startswith("identity & ") or heading == "identity":
                in_identity = True
                continue
            if in_identity:
                break
        if in_identity and line.strip():
            captured.append(line.rstrip())
            if len(captured) >= 6:
                break
    if not captured:
        for line in lines[1:30]:
            if line.startswith(">") or line.startswith("---"):
                continue
            if line.strip():
                captured.append(line.rstrip())
                if len(captured) >= 4:
                    break

    return "\n".join(captured) if captured else "_(persona file present at the path above; see for full Identity content)_"


def short_persona_voice(persona_path: Path) -> str:
    if not persona_path.exists():
        return ""
    text = persona_path.read_text()
    lines = text.splitlines()
    in_voice = False
    captured: list[str] = []
    for line in lines:
        if line.strip().startswith("## ") and "voice" in line.lower():
            in_voice = True
            continue
        if in_voice:
            if line.strip().startswith("## ") and "voice" not in line.lower():
                break
            if line.strip():
                captured.append(line.rstrip())
                if len(captured) >= 8:
                    break
    return "\n".join(captured) if captured else ""


def build_skills_yaml_block(skills: list, indent: int = 4) -> str:
    if not skills:
        return "[]"
    pad = " " * indent
    out = []
    for s in skills:
        slug = s.get("slug") if isinstance(s, dict) else str(s)
        if slug:
            out.append(f"\n{pad}- {slug}")
    return "".join(out) if out else "[]"


def build_skills_prose(skills: list) -> str:
    if not skills:
        return "_(No skills declared in manifest.)_"
    return "\n".join(f"- **{s.get('slug') if isinstance(s, dict) else s}**" for s in skills)


def build_streams_inline(streams_value) -> str:
    if not streams_value:
        return "[]"
    return "[" + ", ".join(streams_value) + "]"


def build_persona_intro_block(persona_paths: list[Path], persona_names: list[str]) -> str:
    if not persona_paths:
        return "_(No persona declared. You operate as the construct itself, without an embodied persona.)_"
    if len(persona_paths) == 1:
        intro = short_persona_intro(persona_paths[0])
        return f"You embody **{persona_names[0]}**:\n\n{intro}\n\nFull persona content lives at `{persona_paths[0].relative_to(PROJECT_ROOT)}`."
    blocks: list[str] = []
    blocks.append(f"This construct has multiple personas. Default: **{persona_names[0]}**.\n")
    for name, path in zip(persona_names, persona_paths):
        blocks.append(f"\n### {name}\n")
        blocks.append(short_persona_intro(path))
        blocks.append(f"\nFull persona at `{path.relative_to(PROJECT_ROOT)}`.\n")
    blocks.append(f"\nIf the room activation packet's `persona` field is set to one of {persona_names[1:]}, embody that persona instead of the default ({persona_names[0]}).")
    return "\n".join(blocks)


def build_persona_voice_block(persona_paths: list[Path], persona_names: list[str]) -> str:
    if not persona_paths:
        return ""
    voice = short_persona_voice(persona_paths[0])
    if not voice:
        return ""
    name = persona_names[0]
    return f"\n## Voice ({name} default)\n\n{voice}"


def description_block_text(description: str) -> str:
    if not description:
        return ""
    return textwrap.fill(description.strip(), width=110, replace_whitespace=False)


def render(slug: str, manifest: dict) -> str:
    manifest_path = PACKS_DIR / slug / "construct.yaml"
    manifest_relpath = manifest_path.relative_to(PROJECT_ROOT)
    manifest_checksum = sha256_of_file(manifest_path)

    persona_paths, persona_names = find_persona_files(slug, manifest)

    name = manifest.get("name") or slug.title()
    description = manifest.get("description") or ""
    description_quoted = json.dumps(description) if description else '""'

    allowlist, denylist, required = resolve_tools(manifest)
    tools_list = ", ".join(allowlist)

    adapter_block = manifest.get("adapter") or {}
    color = adapter_block.get("color") or color_for(slug)
    model = adapter_block.get("model") or "inherit"
    foreground_default = adapter_block.get("foreground_default", True)
    invocation_modes = adapter_block.get("invocation_modes") or ["room"]

    skills = manifest.get("skills") or []
    skill_slugs = [s.get("slug") if isinstance(s, dict) else str(s) for s in skills]

    reads = manifest.get("reads") or []
    writes = manifest.get("writes") or []
    primary_write = writes[0] if writes else "Verdict"

    domain_block = manifest.get("domain") if isinstance(manifest.get("domain"), dict) else {}
    if not domain_block and manifest.get("domain"):
        domain_value = manifest["domain"]
        if isinstance(domain_value, list):
            domain_block = {"primary": domain_value[0] if domain_value else "general"}
        else:
            domain_block = {"primary": str(domain_value)}

    domain_primary = domain_block.get("primary") if isinstance(domain_block, dict) else "general"
    if not domain_primary:
        domain_primary = "general"
    domain_language = domain_block.get("ubiquitous_language") or [] if isinstance(domain_block, dict) else []
    domain_out_of = domain_block.get("out_of_domain") or [] if isinstance(domain_block, dict) else []

    persona_path_or_null = (
        f'"{persona_paths[0].relative_to(PROJECT_ROOT)}"' if persona_paths else "null"
    )
    default_persona_or_null = persona_names[0] if persona_names else "null"
    persona_or_null_json = json.dumps(persona_names[0]) if persona_names else "null"

    persona_header_suffix = f", embodying **{persona_names[0]}**" if len(persona_paths) == 1 else ""
    persona_authority_suffix = f" / {persona_names[0]}" if persona_names else ""
    persona_mention_suffix = (
        f' or "{persona_names[0]}"' if persona_names else ""
    )

    skills_yaml = build_skills_yaml_block(skills, indent=4)
    skills_prose = build_skills_prose(skills)

    personas_yaml = "[]"
    if persona_names:
        personas_yaml = "".join(f"\n    - {p}" for p in persona_names)

    invocation_modes_inline = "[" + ", ".join(invocation_modes) + "]"
    tools_required_inline = "[" + ", ".join(required) + "]"
    tools_denied_inline = "[" + ", ".join(denylist) + "]"

    domain_language_yaml = "[]"
    if domain_language:
        domain_language_yaml = "".join(f"\n      - {item}" for item in domain_language)
    domain_out_of_yaml = "[]"
    if domain_out_of:
        domain_out_of_yaml = "".join(f"\n      - {item}" for item in domain_out_of)

    domain_language_prose = ", ".join(domain_language) if domain_language else "_(none declared)_"
    domain_out_of_prose = ", ".join(domain_out_of) if domain_out_of else "_(none declared)_"

    persona_intro_block = build_persona_intro_block(persona_paths, persona_names)
    persona_voice_block = build_persona_voice_block(persona_paths, persona_names)

    description_block = description_block_text(description)

    template_text = TEMPLATE_PATH.read_text()
    tpl = string.Template(template_text)

    # BB review F005: use a content-addressable sentinel that cannot collide with
    # legitimate adapter content (sha256-shaped placeholder). Compute the real
    # checksum from canonical_input AFTER substitution but BEFORE the sentinel
    # rewrite, so the hash is deterministic and the rewrite is exactly one match.
    checksum_sentinel = "sha256:0000000000000000000000000000000000000000000000000000000000000000"
    placeholders = {
        "GEN_VERSION": GEN_VERSION,
        "GEN_TIMESTAMP": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "MANIFEST_PATH": str(manifest_relpath),
        "MANIFEST_CHECKSUM": manifest_checksum,
        "ADAPTER_CHECKSUM": checksum_sentinel,
        "SLUG": slug,
        "NAME": name,
        "DESCRIPTION_QUOTED": description_quoted,
        "DESCRIPTION_BLOCK": description_block,
        "TOOLS_LIST": tools_list,
        "MODEL": model,
        "COLOR": color,
        "MANIFEST_SCHEMA_VERSION": str(manifest.get("schema_version", 3)),
        "PERSONA_PATH_OR_NULL": persona_path_or_null,
        "PERSONAS_YAML": personas_yaml,
        "DEFAULT_PERSONA_OR_NULL": default_persona_or_null,
        "SKILLS_YAML": skills_yaml,
        "STREAMS_READS": build_streams_inline(reads),
        "STREAMS_WRITES": build_streams_inline(writes),
        "INVOCATION_MODES": invocation_modes_inline,
        "FOREGROUND_DEFAULT": "true" if foreground_default else "false",
        "TOOLS_REQUIRED": tools_required_inline,
        "TOOLS_DENIED": tools_denied_inline,
        "DOMAIN_PRIMARY": domain_primary,
        "DOMAIN_LANGUAGE": domain_language_yaml,
        "DOMAIN_OUT_OF": domain_out_of_yaml,
        "DOMAIN_LANGUAGE_PROSE": domain_language_prose,
        "DOMAIN_OUT_OF_PROSE": domain_out_of_prose,
        "PERSONA_HEADER_SUFFIX": persona_header_suffix,
        "PERSONA_INTRO_BLOCK": persona_intro_block,
        "PERSONA_AUTHORITY_SUFFIX": persona_authority_suffix,
        "PERSONA_MENTION_SUFFIX": persona_mention_suffix,
        "PERSONA_VOICE_BLOCK": persona_voice_block,
        "PERSONA_OR_NULL_JSON": persona_or_null_json,
        "SKILLS_PROSE": skills_prose,
        "PRIMARY_WRITE_STREAM": primary_write,
    }

    rendered = tpl.safe_substitute(placeholders)
    body_only = rendered.split("# DO NOT EDIT", 1)
    if len(body_only) == 2:
        canonical_input = body_only[1]
    else:
        canonical_input = rendered
    adapter_checksum = "sha256:" + hashlib.sha256(canonical_input.encode()).hexdigest()
    # BB review F005: replace the sha256-shaped sentinel exactly once. The sentinel
    # is content-addressable and cannot collide with persona prose or manifest values
    # (it's the literal "sha256:0..0"), so a 1-shot replace is safe.
    if checksum_sentinel not in rendered:
        raise RuntimeError(f"adapter-generator: checksum sentinel missing for {slug}")
    rendered = rendered.replace(checksum_sentinel, adapter_checksum, 1)

    return rendered


def write_adapter(slug: str, content: str) -> tuple[Path, bool]:
    AGENTS_DIR.mkdir(parents=True, exist_ok=True)
    target = AGENTS_DIR / f"construct-{slug}.md"
    if target.exists():
        existing = target.read_text()
        # Compare canonical portion (timestamp-stripped) for idempotency
        if _canonical_portion(existing) == _canonical_portion(content):
            return target, False
        if "# generated-by:" not in existing.split("\n", 1)[0] and "# generated-by:" not in existing[:200]:
            raise RuntimeError(
                f"refusing to overwrite hand-edited file (no '# generated-by:' header): {target}\n"
                "Pass --force to override."
            )
    target.write_text(content)
    return target, True


def _canonical_portion(text: str) -> str:
    """Strip the volatile header (generated-at timestamp) before comparison.

    The canonical portion is everything from the `# DO NOT EDIT` marker onwards.
    The checksum is also computed over this portion, so equivalent content =
    equivalent canonical body, regardless of when --check was last run.
    """
    marker = "# DO NOT EDIT"
    idx = text.find(marker)
    if idx < 0:
        return text
    return text[idx:]


def check_adapter(slug: str, content: str) -> tuple[Path, bool]:
    target = AGENTS_DIR / f"construct-{slug}.md"
    if not target.exists():
        return target, False
    return target, _canonical_portion(target.read_text()) == _canonical_portion(content)


def main():
    parser = argparse.ArgumentParser(description="Construct adapter generator")
    parser.add_argument("--slug", help="Generate adapter for one construct")
    parser.add_argument("--all", action="store_true", help="Generate adapters for all constructs in packs/")
    parser.add_argument("--check", action="store_true", help="Diff-only (exit 1 if any adapter would change)")
    parser.add_argument("--force", action="store_true", help="Overwrite hand-edited files")
    parser.add_argument("--dry-run", action="store_true", help="Print what would happen, do not write")
    args = parser.parse_args()

    if not args.slug and not args.all:
        parser.error("either --slug or --all required")

    targets: list[str] = []
    if args.all:
        for pack_dir in sorted(PACKS_DIR.iterdir()):
            if not pack_dir.is_dir():
                continue
            if (pack_dir / "construct.yaml").exists():
                targets.append(pack_dir.name)
    else:
        targets = [args.slug]

    failures: list[dict] = []
    diffs: list[str] = []
    written: list[str] = []
    skipped: list[str] = []

    for slug in targets:
        try:
            manifest = load_manifest(slug)
            content = render(slug, manifest)

            if args.check:
                target, matches = check_adapter(slug, content)
                if matches:
                    skipped.append(slug)
                else:
                    diffs.append(slug)
            elif args.dry_run:
                print(f"[dry-run] would write adapter for {slug} ({len(content)} bytes)")
                skipped.append(slug)
            else:
                target, was_written = write_adapter(slug, content)
                if was_written:
                    written.append(slug)
                else:
                    skipped.append(slug)
        except Exception as e:
            failures.append({"slug": slug, "error": str(e)})

    summary = {
        "version": GEN_VERSION,
        "mode": "check" if args.check else ("dry_run" if args.dry_run else "write"),
        "total": len(targets),
        "written": written,
        "skipped": skipped,
        "diffs": diffs,
        "failures": failures,
    }

    print(json.dumps(summary, indent=2))

    if failures:
        sys.exit(2)
    if args.check and diffs:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
