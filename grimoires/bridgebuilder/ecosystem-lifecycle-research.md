# Ecosystem Lifecycle Research: Create, Develop, Publish, Install, Update

Deep research across five package/plugin ecosystems to extract structural patterns for construct lifecycle design.

**Date**: 2026-03-11
**Ecosystems studied**: Cargo (Rust), npm/pnpm, Shopify themes/apps, VS Code extensions, Homebrew formulas

---

## Part 1: The Manifest — What Must an Author Declare vs What the System Infers?

### Principle 1: The Manifest Has Exactly Three Tiers

Every successful ecosystem separates manifest fields into three tiers. The tiers are **not arbitrary** — they correspond to lifecycle phases.

| Tier | When It Matters | Cargo | npm | VS Code | Shopify | Homebrew |
|------|----------------|-------|-----|---------|---------|----------|
| **Identity** (required for existence) | `create` | `name` | `name` + `version` | `name` + `version` + `publisher` + `engines.vscode` | `shopify.app.toml` at root | `url` + `sha256` + `homepage` + `license` |
| **Publication** (required for registry) | `publish` | + `version` + `description` + `license` | (same as identity) | (same as identity) | + `scopes` + `commands.dev` | + `install` method |
| **Discovery** (strongly encouraged) | `install` by others | + `keywords` + `categories` + `readme` + `repository` | + `description` + `keywords` + `files` | + `displayName` + `description` + `categories` + `contributes` | + `extension capabilities` + `targets` | + `depends_on` + `desc` |

**Key insight**: Cargo and npm require almost nothing to *exist* locally. The registry demands more. Discovery demands the most. This graduated pressure means authors encounter validation only when they cross a boundary — not while creating.

### Principle 2: Infer Everything the Filesystem Already Knows

Every ecosystem aggressively infers from the filesystem rather than forcing declaration:

| What Gets Inferred | How |
|---|---|
| **Cargo**: README path | Scans for `README.md`, `README.txt`, `README` |
| **Cargo**: Build script | Auto-detects `build.rs` in root |
| **Cargo**: Binary/library targets | `src/main.rs` = binary, `src/lib.rs` = library, `src/bin/*.rs` = named bins |
| **Cargo**: Documentation URL | crates.io auto-links to docs.rs |
| **npm**: Package contents | Falls back to `.gitignore` if no `files` field |
| **VS Code**: Marketplace body | Root `README.md` auto-rendered as listing page |
| **VS Code**: Language association | Shared IDs between `languages`, `grammars`, `snippets` contributions — no explicit linkage needed |
| **Shopify**: Entry point | Scans for `index.{ts,js,tsx,jsx}` in extension dirs |
| **Shopify**: Webhook path | Defaults to `/api/webhooks` |
| **Shopify**: Port | Random assignment if omitted |
| **Shopify**: Web directories | Auto-scanned unless overridden |
| **Homebrew**: Formula name | Derived from URL filename |
| **Homebrew**: Version | Parsed from URL pattern |
| **Homebrew**: Class name | Derived from filename (`foo-bar.rb` -> `FooBar`) |
| **Homebrew**: Download strategy | Inferred from URL scheme and file extension |

**Design principle for constructs**: The manifest should never ask for information that can be derived from the directory structure, filenames, or existing files. A `construct.yaml` next to a `skills/` directory should auto-discover skills. A `README.md` should auto-become the registry description.

### Principle 3: Capability Declaration Is a Separate Concern from Identity

VS Code and Shopify treat capabilities as a structured sub-schema within the manifest, distinct from identity metadata:

**VS Code's `contributes` field** is a pure capability declaration. Each key declares *what the extension can do*:
```json
{
  "contributes": {
    "commands": [...],
    "languages": [...],
    "grammars": [...],
    "themes": [...],
    "debuggers": [...]
  }
}
```
The host (VS Code) uses this to:
1. Know what to show in the UI (commands in command palette, themes in theme picker)
2. Know when to activate the extension (`activationEvents` pairs with `contributes`)
3. Enable filtering/discovery on the marketplace

**Shopify's `[extensions.capabilities]`** follows the same pattern:
```toml
[extensions.capabilities]
api_access = true
network_access = true
block_progress = true
```
These are permission-gates: declaring `network_access` means the extension can make HTTP calls, but also *triggers additional review requirements before publishing*.

**Cargo's `[features]`** is the dependency-side version of this: consumers declare which capabilities they want from a package, and the package conditionally compiles based on which features are activated.

**Design principle for constructs**: Separate `capabilities` from `identity` from `discovery_metadata` in the manifest schema. Capabilities should be machine-readable declarations that the runtime uses for routing, permission-gating, and feature-flag composition.

---

## Part 2: Scaffolding — What Makes "Getting Started" Feel Frictionless?

### Principle 4: Scaffold the Minimum Viable Structure, Not the Maximum Possible Structure

| Ecosystem | Scaffold Command | What It Creates | What It Does NOT Create |
|-----------|-----------------|-----------------|------------------------|
| **Cargo** | `cargo new my-crate` | `Cargo.toml`, `src/main.rs`, `.gitignore` | No CI, no README, no tests dir, no examples |
| **npm** | `npm init` | `package.json` (via prompts) | Nothing else — just the manifest |
| **npm** | `npx create-*` | Full project (template-specific) | Varies by template |
| **VS Code** | `yo code` | `package.json`, `src/extension.ts`, `.vscode/`, `tsconfig.json`, `.gitignore`, `README.md` | No CI, no test fixtures |
| **Shopify** | `shopify app init` | `shopify.app.toml`, `package.json`, `app/`, template code | Extensions are added later via `shopify app generate extension` |
| **Homebrew** | `brew tap-new user/tap` | Git repo with `Formula/`, `.github/workflows/`, template CI | No formulas — those come from `brew create` |

**The pattern**: Scaffold produces exactly what you need to run `dev` immediately. Nothing more. Extensions/plugins/additions come via separate generation commands.

Cargo is the gold standard: three files, immediately compilable. `cargo new` + `cargo run` = working program in under 5 seconds.

**Anti-pattern**: Scaffolding that produces 20+ files with configuration for CI, linting, testing, and deployment. This front-loads decisions the author hasn't made yet.

### Principle 5: Two-Phase Scaffolding — Shell First, Extensions Later

Shopify's model is the most relevant for constructs:

1. **Phase 1 — `shopify app init`**: Creates the app shell (manifest + entry points)
2. **Phase 2 — `shopify app generate extension`**: Adds capability modules one at a time

This separates "I exist" from "I can do X". The author never sees a blank extension they didn't ask for.

VS Code follows the same pattern with Extension Packs: `yo code` can scaffold either a single extension or a pack that bundles multiple extensions.

**Design principle for constructs**: `create-construct` should produce `construct.yaml` + `README.md` + one skill stub. Additional skills are added via `construct add skill <name>`. Never scaffold empty capability directories.

---

## Part 3: Local Development to Registry — The Publish Boundary

### Principle 6: `pack` Before `publish` — Always Let Authors Preview

Every ecosystem provides a dry-run mechanism that shows exactly what will be published:

| Ecosystem | Preview Command | What It Shows |
|-----------|----------------|---------------|
| **Cargo** | `cargo package --list` | Lists every file in the `.crate` tarball |
| **Cargo** | `cargo publish --dry-run` | Full validation without upload |
| **npm** | `npm pack --dry-run` | Lists tarball contents without creating file |
| **npm** | `npm pack` | Creates `.tgz` locally for inspection |
| **VS Code** | `vsce package` | Creates `.vsix` locally (installable) |
| **VS Code** | `.vscodeignore` | Explicit exclusion file for packaging |
| **Homebrew** | `brew install --build-from-source user/tap/formula` | Tests the formula locally |

**The critical DX insight**: The gap between "works locally" and "works when published" is the #1 source of ecosystem frustration. Every ecosystem that has survived has a way to close this gap.

Cargo's approach is the most elegant: `cargo publish --dry-run` runs every validation step (including building the package from the tarball) without uploading. Authors get the exact same error messages they'd get on the registry, locally.

### Principle 7: The Whitelist/Blacklist Split for Published Content

Two competing strategies for controlling what enters the registry:

| Strategy | Ecosystem | Mechanism |
|----------|-----------|-----------|
| **Whitelist** (opt-in) | npm `files` field, VS Code `.vscodeignore` (inverted), Cargo `include` | Author explicitly lists what ships |
| **Blacklist** (opt-out) | npm `.npmignore`/`.gitignore` fallback, Cargo `exclude` | Everything ships except what's excluded |
| **Declarative** (fixed structure) | Homebrew, Shopify | The formula/TOML IS the published artifact — no separate content selection |

**npm's lesson learned**: Having both whitelist (`files`) and blacklist (`.npmignore`) causes confusion. Adding `.npmignore` *replaces* `.gitignore` entirely — a common source of accidentally publishing secrets. The ecosystem has converged on recommending `files` (whitelist) as the correct approach.

**Cargo's lesson**: `include` and `exclude` are mutually exclusive. You pick one strategy. This avoids the npm problem entirely.

**Design principle for constructs**: Use whitelist-only (`files` or `include` in construct.yaml). The construct manifest should declare exactly what ships to the registry. No blacklist, no `.constructignore`.

### Principle 8: Authentication Is a One-Time Ceremony

| Ecosystem | Auth Flow | Token Storage |
|-----------|-----------|---------------|
| **Cargo** | `cargo login` (paste API token from crates.io) | `~/.cargo/credentials.toml` |
| **npm** | `npm login` (interactive) or `npm token create` | `~/.npmrc` |
| **VS Code** | Azure DevOps PAT + `vsce login <publisher>` | Local vsce config |
| **Shopify** | `shopify auth login` → browser OAuth | `.env` + session |
| **Homebrew** | Git push to your own repo | Standard git credentials |

Homebrew is unique: there is no central auth. You publish by pushing to your own Git repository. The "registry" is just Git.

**Design principle for constructs**: Auth should happen once and persist. `construct login` stores a token. Subsequent `construct publish` never prompts.

---

## Part 4: Namespace Protocols — How Identity Works at Scale

### Principle 9: Namespace = Trust Boundary

| Ecosystem | Namespace Model | Trust Signal |
|-----------|----------------|-------------|
| **Cargo** | Flat (first-come, first-served) | crates.io account ownership |
| **npm** | Scoped (`@org/pkg`) or flat | Org membership for scoped |
| **VS Code** | `publisher.extension-name` | Publisher verification badge |
| **Shopify** | Partner org → app → extension | Partner account + app approval |
| **Homebrew** | `user/tap/formula` | Git repo ownership |

**The patterns that work**:

1. **npm scoped packages (`@org/pkg`)**: The scope IS the namespace. `@angular/core` communicates trust through the `@angular` scope being a verified org. Scoped packages default to private, requiring explicit `"access": "public"` to publish publicly. This makes "private by default" the safe failure mode.

2. **Homebrew taps (`user/tap`)**: The namespace IS the Git repo. `brew install alice/homebrew-tools/my-tool` means "from alice's repository called homebrew-tools, install my-tool." No central approval. Trust comes from knowing the repo owner.

3. **VS Code publishers**: Publishers can be verified (checkmark badge). Unverified publishers can still publish, but verified publishers rank higher in search.

**Anti-pattern**: Cargo's flat namespace leads to name-squatting. `cargo` has no scoping mechanism beyond crate name uniqueness. This forces workarounds like `tokio-*` prefix conventions.

**Design principle for constructs**: Use a two-level namespace: `@namespace/construct-name`. The namespace maps to a GitHub org (like npm scopes). `@0xHoneyJar/k-hole` is unambiguous. Flat names (`k-hole`) resolve through a search/popularity algorithm but warn about ambiguity.

---

## Part 5: The Update Cycle — "I Changed Something, Now the World Should Know"

### Principle 10: Version Bump Is the Only Gate Between Local and Published

| Ecosystem | Update Flow | Version Strategy |
|-----------|-------------|-----------------|
| **Cargo** | Edit code → bump version in Cargo.toml → `cargo publish` | Manual semver in manifest |
| **npm** | Edit code → `npm version patch/minor/major` → `npm publish` | CLI helper or manual |
| **VS Code** | Edit code → `vsce publish minor` | CLI auto-bumps + commits + tags |
| **Shopify** | Edit code → `shopify app deploy` | No user-facing versioning (platform-managed) |
| **Homebrew** | Update formula URL + sha256 → push → `brew update` picks it up | Version derived from URL |

**VS Code has the best DX here**: `vsce publish minor` does everything in one command — bumps version in `package.json`, creates a git commit, creates a git tag, packages, and uploads. The author's mental model is "I'm releasing a minor version" — everything else is automated.

**Homebrew has an interesting alternative**: `brew bump-formula-pr` automates the entire update for core formulae. It detects the new version, computes the sha256, and creates a PR to the tap. The author doesn't even have to edit the formula.

**Shopify's approach** is the most radical: there is no user-facing version number. `shopify app deploy` uses the `uid` field in `shopify.extension.toml` to determine if an extension is being created, updated, or deleted. Versioning is implicit.

**Design principle for constructs**: Provide `construct publish patch|minor|major` that bumps version, tags, and publishes in one command. Also support `construct publish` with explicit version. The version should live in `construct.yaml` and the CLI should handle the git ceremony.

### Principle 11: The Registry Must Be Eventually Consistent, Not Synchronous

Cargo's publish flow exposes this clearly:
1. Upload the `.crate` file to the registry
2. Registry validates server-side
3. Client polls for the package to appear in the index
4. Timeout on polling does NOT mean the upload failed

**npm** works similarly — `npm publish` can succeed but the package takes minutes to appear in search results.

**Homebrew** sidesteps this entirely: the "registry" is just a Git repo. `git push` + user runs `brew update` = propagation. No indexing delay.

**Design principle for constructs**: If using a centralized registry, the publish flow should return a URL to the package page immediately (even if search indexing is delayed). If using Git-based distribution (like Homebrew taps), propagation is instant and should be preferred for the initial ecosystem phase.

---

## Part 6: Capability Declaration — How the Platform Knows What You Can Do

### Principle 12: Capabilities Should Be Additive Flags, Not Configuration Schemas

Three models for capability declaration:

**Model A — Contribution Points (VS Code)**
The extension declares what UI surfaces it extends:
```json
{
  "contributes": {
    "commands": [{ "command": "extension.helloWorld", "title": "Hello World" }],
    "menus": { "editor/context": [{ "command": "extension.helloWorld" }] }
  }
}
```
The platform reads this at install time and wires up the UI. The extension code runs only when activated.

**Model B — Permission Gates (Shopify)**
The extension declares what dangerous things it needs:
```toml
[extensions.capabilities]
api_access = true
network_access = true
block_progress = true
```
Each capability triggers additional review requirements. `network_access` requires explicit Shopify approval before publish.

**Model C — Feature Flags (Cargo)**
Capabilities are consumer-selected:
```toml
[features]
default = ["std"]
std = []
serde = ["dep:serde"]
```
The consumer chooses which capabilities to activate: `cargo add my-crate --features serde`.

**Key insight**: VS Code contributes = "what I extend", Shopify capabilities = "what I need", Cargo features = "what the consumer activates." These are three different vectors:
- **Outward** (what I provide to the platform)
- **Inward** (what the platform grants me)
- **Lateral** (what the consumer selects)

**Design principle for constructs**: The `capabilities` stanza in construct manifests should distinguish:
```yaml
capabilities:
  # What the construct provides to the runtime (VS Code model)
  provides:
    - code-review
    - sprint-planning
  # What the construct requires from the runtime (Shopify model)
  requires:
    tool_calling: true
    vision: false
    network_access: false
  # What the consumer can toggle (Cargo model)
  features:
    default: [core]
    core: []
    extended: [deep-research]
```

---

## Part 7: Validation — How Systems Prevent Mistakes Without Blocking Creativity

### Principle 13: Validate at the Boundary, Not in the Editor

| Ecosystem | When Validation Runs | What It Checks |
|-----------|---------------------|----------------|
| **Cargo** | `cargo publish` (or `--dry-run`) | Required fields, SPDX license validity, keyword limits, category slug matching, version format, dirty working directory |
| **npm** | `npm publish` | Name uniqueness, version uniqueness, `private: true` block, lifecycle hooks |
| **VS Code** | `vsce package` / `vsce publish` | Icon format (no SVG), badge URL allowlist, HTTPS-only images, README/CHANGELOG presence |
| **Shopify** | `shopify app deploy` | Extension TOML schema, capability requirements (e.g., network_access needs approval), build output existence |
| **Homebrew** | `brew audit` / CI on PR | License presence, homepage existence, dependency correctness, URL validity, sha256 match |

**No ecosystem validates during `create` or `dev`.** You can have an incomplete manifest, missing fields, even syntax errors in your code — and the scaffold/dev commands don't complain. Validation only fires at the publish boundary.

This is deliberate: creativity requires incomplete states. An author iterating on a new construct shouldn't be told "you need a description" until they're ready to share it.

**Cargo's graduated validation** is exemplary:
- `cargo build`: Only checks syntax and types
- `cargo package`: Checks manifest completeness
- `cargo publish`: Checks manifest + registry rules + dirty state

Each step adds validation. The author escalates by choosing to cross a boundary.

### Principle 14: Validation Errors Must Be Actionable, Not Just Descriptive

Homebrew's `brew audit` is the best example. When a formula fails audit:
- It tells you exactly which check failed
- It often suggests the fix
- `brew bump-formula-pr` can auto-fix version bumps entirely

Cargo's error messages include the required field, the SPDX format expected, and the URL to the category slug list.

**Anti-pattern**: npm's publish errors can be opaque (especially around lifecycle hook failures and scope permissions).

---

## Part 8: Cross-Ecosystem Design Principles Summary

### The 10 Structural Patterns

1. **Graduated manifest tiers**: Identity (create) < Publication (publish) < Discovery (install). Never front-load fields.

2. **Filesystem inference over declaration**: If the directory structure implies it, don't make the author say it.

3. **Separate capabilities from identity**: Machine-readable capability declarations enable runtime routing, permission gating, and marketplace filtering.

4. **Scaffold the minimum**: Three files to first `dev` run. Zero configuration decisions front-loaded.

5. **Two-phase scaffolding**: Shell first (`init`), capabilities later (`generate`/`add`). Never scaffold empty capability directories.

6. **Preview before publish**: `pack`/`package --list`/`--dry-run` must exist. The gap between local and registry is the ecosystem's biggest DX risk.

7. **Whitelist-only for published content**: Blacklists cause accidental inclusion. Declare what ships, not what doesn't.

8. **Namespace = trust boundary**: Two-level namespaces (`@org/name` or `user/tap/formula`) communicate provenance. Flat namespaces invite squatting.

9. **One-command publish with version ceremony**: `publish minor` should bump, tag, build, validate, and upload. Minimize steps between "I'm done" and "it's live."

10. **Validate at boundaries, not in editors**: `create` and `dev` should never block on incomplete manifests. `publish` should block on everything.

### The Meta-Pattern: "The Ecosystem Handles the Plumbing"

The feeling of "the ecosystem handles the plumbing while I focus on my craft" comes from a specific structural property: **the system makes the common path require zero configuration, and the uncommon path require exactly one declaration.**

| Common path (zero-config) | Uncommon path (one declaration) |
|---|---|
| Cargo infers `src/main.rs` as binary | `[[bin]]` table to declare multiple bins |
| npm falls back to `.gitignore` for package contents | `files` field to whitelist |
| VS Code auto-renders `README.md` as marketplace body | `README.md` path override in manifest |
| Shopify auto-discovers extension entry points | `extension_directories` in TOML to override |
| Homebrew infers version from URL | `version` field when URL parsing fails |

**This is the golden ratio**: zero-config defaults with single-field escape hatches. Not zero-config-or-full-config. Not convention-with-no-override. The sweet spot is: the filesystem IS the configuration, and the manifest is for exceptions.

---

## Part 9: Implications for Construct Lifecycle

### What the construct.yaml should look like (synthesized from all five ecosystems)

**Tier 1 — Identity (required for `construct create`)**:
```yaml
name: k-hole
```
That's it. One field. Everything else inferred from filesystem.

**Tier 2 — Publication (required for `construct publish`)**:
```yaml
name: k-hole
version: 1.0.0
description: "Pair-research construct for non-extractive deep dives"
license: MIT
```
Validated only at publish time.

**Tier 3 — Discovery (recommended for registry listing)**:
```yaml
name: k-hole
version: 1.0.0
description: "Pair-research construct for non-extractive deep dives"
license: MIT
namespace: "@0xHoneyJar"
keywords: [research, deep-dive, pair-programming]
categories: [knowledge]
repository: "https://github.com/0xHoneyJar/construct-k-hole"

capabilities:
  provides: [pair-research, batch-research]
  requires:
    model_tier: opus
    tool_calling: true
    vision: false
  features:
    default: [dig]
    dig: []
    forge: [batch-mode]
```

**What gets inferred**:
- Skills discovered from `skills/` directory
- README from `README.md`
- Commands from `commands/` directory with frontmatter
- Entry points from `index.{ts,js,yaml}` in each skill directory
- Schema version from the manifest format itself

### The lifecycle commands (synthesized)

```
construct create <name>          # Tier 1 manifest + one skill stub
construct dev                    # Local development, no validation
construct add skill <name>       # Two-phase scaffolding
construct pack --list            # Preview what would be published
construct publish [patch|minor|major]  # Validate + version + tag + upload
construct install @ns/name       # Install from registry
construct update                 # Update installed constructs
```

---

## Sources

- [The Manifest Format - The Cargo Book](https://doc.rust-lang.org/cargo/reference/manifest.html)
- [cargo publish - The Cargo Book](https://doc.rust-lang.org/cargo/commands/cargo-publish.html)
- [Features - The Cargo Book](https://doc.rust-lang.org/cargo/reference/features.html)
- [Dependency Resolution - The Cargo Book](https://doc.rust-lang.org/cargo/reference/resolver.html)
- [cargo new - The Cargo Book](https://doc.rust-lang.org/cargo/commands/cargo-new.html)
- [package.json | npm Docs](https://docs.npmjs.com/cli/v7/configuring-npm/package-json/)
- [Creating and publishing scoped public packages | npm Docs](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [npm-publish | npm Docs](https://docs.npmjs.com/cli/v11/commands/npm-publish/)
- [Files & Ignores - npm CLI Wiki](https://github.com/npm/cli/wiki/Files-&-Ignores)
- [Extension Manifest | VS Code API](https://code.visualstudio.com/api/references/extension-manifest)
- [Contribution Points | VS Code API](https://code.visualstudio.com/api/references/contribution-points)
- [Publishing Extensions | VS Code API](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Your First Extension | VS Code API](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Extension Marketplace | VS Code](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace)
- [Scaffold an app | Shopify.dev](https://shopify.dev/docs/apps/build/scaffold-app)
- [App structure | Shopify.dev](https://shopify.dev/docs/apps/build/cli-for-apps/app-structure)
- [Configure app extensions | Shopify.dev](https://shopify.dev/docs/apps/build/app-extensions/configure-app-extensions)
- [Manage access scopes | Shopify.dev](https://shopify.dev/docs/apps/build/authentication-authorization/app-installation/manage-access-scopes)
- [Formula Cookbook | Homebrew Docs](https://docs.brew.sh/Formula-Cookbook)
- [How to Create and Maintain a Tap | Homebrew Docs](https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap)
- [Taps (Third-Party Repositories) | Homebrew Docs](https://docs.brew.sh/Taps)
