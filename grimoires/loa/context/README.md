# Context Directory

> **cycle-0 update (2026-05-09)**: this directory now has a tracked **`INDEX.md`** that classifies all files into Active / Reference-Only / Operator-Private / Archive. Skills consuming context SHOULD read INDEX.md's "Active Context Files" section as the allowlist; ambient-loading the directory is no longer the default. See `grimoires/loa/runbooks/upstream-issue-tracker.md` Issue #818 F1 for the upstream zone-enforcement hook.

This directory is for user-provided context that feeds into the PRD discovery process (`/plan-and-analyze`).

## What to Put Here

- Product briefs, specs, or requirements documents
- Market research or competitive analysis
- Technical constraints or architecture notes
- Stakeholder feedback or user research
- Any documents that inform what you want to build

## Important: Files Are Not Tracked

**All files in this directory are gitignored EXCEPT three tracked exceptions: this `README.md`, `INDEX.md` (cycle-0 active-context allowlist), and `composition-audit.json` (audit output).**

This is intentional because:
1. Context files are user-specific and project-specific
2. They may contain sensitive business information
3. Loa is a template - your context shouldn't pollute the framework

## How It Works

When you run `/plan-and-analyze`, the discovering-requirements agent should:
1. Read **`INDEX.md`** to find the active-context allowlist (cycle-0 introduction)
2. Load only files listed in the "Active Context Files" section
3. Use those as input for generating your PRD
4. Ask clarifying questions based on what it finds

(Ambient-loading of the entire directory is the legacy behavior; the cycle-0 INDEX.md filter ships project-side until upstream Loa Issue #818 F1 lands the shared-substrate enforcement.)

## Supported Formats

- Markdown (`.md`)
- Text files (`.txt`)
- PDFs (`.pdf`)
- Images (`.png`, `.jpg`) - for mockups or diagrams

Place your context files here, then run `/plan-and-analyze` to begin discovery.
