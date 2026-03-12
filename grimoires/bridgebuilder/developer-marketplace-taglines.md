# Developer Marketplace Tagline Patterns

> Dig session 2026-03-12 | 70 Gemini grounded searches | depth: +
> Via `dig-search.ts` — real sources with provenance

## The NP/VP Schism

Developer marketplace taglines split into two linguistic camps, and the split isn't random — it maps to the tool's relationship with its user.

| Pattern | Platform | Example | Signals |
|---------|----------|---------|---------|
| **Noun Phrase (Identity)** | Homebrew, Docker Hub | "A package manager" | *What is this?* — Infrastructure tools |
| **Verb Phrase (Agency)** | VS Code, GitHub Actions | "Format your code" | *What can I do?* — Workflow tools |
| **Hybrid ("S" Rule)** | GitHub Marketplace | "Manages your issues" | Action-as-property — bridges both |

**Homebrew** is the strictest enforcer. `brew audit` programmatically rejects verb phrases, marketing language ("best," "fastest," "amazing"), and descriptions that start with articles. The `desc` field must be a noun phrase. This isn't style preference — it's automated linting that treats prose like code.

### Identity vs. Agency Pattern

Infrastructure tools (Homebrew, Docker) prefer noun phrases — *What is this?*
Workflow tools (VS Code, GitHub Actions) prefer verb phrases — *What can I do with this?*

**Constructs are infrastructure-adjacent** — noun phrases fit better. "Design systems craft" > "Craft design systems."

## Character Limits

The 80-character ceiling originated with **Debian (1994)** — preventing wrapping in 80-column terminal displays via `apt-cache search`. Modern platforms maintain similar limits for skimmability, not terminal width.

| Platform | Short Desc Limit | Long Desc | Author-Controlled? |
|----------|-----------------|-----------|-------------------|
| npm | ~80 chars (soft) | README.md | Yes (package.json `description`) |
| VS Code Marketplace | ~100 chars (soft) | README.md | Yes (package.json `description`) |
| Docker Hub | 100 chars (hard) | Full README | Yes (manual or Dockerfile LABEL) |
| Homebrew | ~80 chars (enforced by `brew audit`) | Cask info page | Yes (formula `desc` field) |
| GitHub Marketplace | ~100 chars (soft) | Full page | Yes (action.yml `description`) |
| App Store | 30 chars subtitle | 4000 char desc | Yes (App Store Connect) |

## Key Findings

### Metadata Rot
Researcher **Maleknaz Nayebi** identifies a "knowledge mobilization gap" — developers struggle to condense complex utilities into tagline limits. Result: descriptions drift from actual functionality over time ("metadata rot"). Tools like **AbstractSum** and **PatchExplainer** now derive taglines from code changes to keep the marketing hook in sync with actual functionality.

### Marketing Allergy
**Sarah Drasner** and **Anne Gentle** document the phenomenon: developers are repelled by traditional marketing copy but highly responsive to "utility-first" micro-copy. Words like "best," "fastest," "amazing" are banned by `brew audit` for a reason — they signal noise, not signal.

The most effective format is the **Label-Summary-Purpose (LSP) template** — identified by **Hellman et al.** as the structural framework that bridges the early terminal-based "Indexing Phase" of the 1990s and the modern "Trust & Branding Phase."

### The Professionalization of the Tagline
Taglines have transitioned from "technical metadata for grep" to "trust signals for humans." The shift toward automated linting (Spectral, Super-Linter) means the "vibe" of a marketplace is now managed through code-like enforcement, not editorial style guides.

### Terminal Legacy as UX Standard
Constraints born from 1990s hardware (80-column terminals) have survived as best practices for modern web discovery. Early technical limitations set the permanent "cognitive rhythm" of a field.

## Takeaways for Constructs Network

1. **Noun phrases fit our constructs** — they're infrastructure (identity), not workflow apps (agency)
2. **80 chars is the right ceiling** — our schema uses `max(80)`, aligning with the Debian/Homebrew lineage
3. **Consider automated linting** — a `construct.yaml` validator could enforce tagline quality (no articles, no superlatives, noun-phrase preference)
4. **The "S" Rule** is worth adopting for constructs that straddle identity and agency (Observer *does* research AND *is* a research tool)
5. **Front-load the differentiator** — NNG's F-shaped scanning research says value must land in the first 11 characters
6. **Guard against metadata rot** — our override map in seed-forge-packs.ts is the first defense; construct.yaml `short_description` field is the long-term fix

## Pull Threads

- **Brew Audit Prose Style Guidelines** — the most rigid automated linguistic enforcement in any ecosystem
- **Metadata Rot vs. Derived Summarization** — why manual manifests fail and how code-derived descriptions could work
- **LSP (Label-Summary-Purpose) Template** — standardizable across manifest formats
- **Keyword Front-Loading for DX** — borrowing ASO techniques for developer marketplace scannability
- **The "S" Rule in GitHub Marketplace** — turning imperative actions into descriptive properties

## Provenance

Gemini grounded search via `construct-k-hole/scripts/dig-search.ts`
Trail file: `construct-k-hole/scripts/research-output/dig-session-2026-03-12.md`
