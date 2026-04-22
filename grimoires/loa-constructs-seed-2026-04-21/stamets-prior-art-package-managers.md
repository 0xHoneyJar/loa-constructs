# STAMETS Prior Art — Package-Manager Onboarding UX

> **Research agent report · 2026-04-22**
> Commissioned during cycle-005 close, pre-cycle-006 SEED dispatch.
> Source research (web, agent-synthesized). Preserved per OTLET for
> cycle-006 SEED `stamets-prior-art` section.

---

# Package Manager Onboarding — Prior Art for Loa Constructs Starter Bundle

## Homebrew (brew)

- **First-encounter surface**: Install script shows a diff-style list of directories it will create, prompts for RETURN-to-continue, installs Xcode CLT if missing, ends with "Installation successful!" followed by explicit **"Next steps"** shell config lines (`eval "$(brew shellenv)"`). The script itself is the onboarding — no welcome wizard afterward, `brew` is installed empty.
- **Bundled defaults**: Zero formulae pre-installed. `brew list` is empty until the user picks something. `brew help` and `brew search` are the discovery surface — no "try this first" nudge.
- **Self-upgrade**: Implicit. `brew install` and `brew upgrade` silently run `brew update` beforehand (unless `HOMEBREW_NO_AUTO_UPDATE=1`). Users almost never type `brew update` deliberately — it hides inside every install.
- **Meta-packages**: `brew bundle` + `Brewfile` is the canonical "team onboarding" primitive. Declarative state file supports Homebrew, Cask, Mac App Store, VS Code extensions, Go, Cargo, `uv` tools, Flatpak, krew. `brew bundle dump` snapshots a machine; `brew bundle install` is idempotent.
- **Steal for Loa**: The Brewfile pattern — one declarative file that cross-cuts *multiple* ecosystems (constructs + skills + personas + grimoires) with a single `install` verb. And hide self-update inside `constructs install` the way brew hides `update` inside `install`.

## npm / npx / pnpm / bun

- **First-encounter surface**: Installing Node gives you `npm` + `npx` with no global packages. The community norm is **not** `npm install -g <thing>` — it's `npx create-<thing>`, which downloads-then-executes into an ephemeral env. `create-next-app` launches an interactive wizard (TS? ESLint? Tailwind? App Router?) and bootstraps a project in ~1 second with offline-cache fallback.
- **Bundled defaults**: npm itself ships empty. The *convention* is the bundle — `create-*` scaffolds an opinionated project with dozens of transitive deps, not the client.
- **`pnpm dlx` vs `npm install -g`**: `dlx`/`npx` = run-without-install, always latest, self-cleaning, no version drift. `install -g` = permanent system-wide install, conflicts across projects. Ecosystem has decisively migrated toward `dlx` for one-shot scaffolding and away from `-g` for anything but truly long-lived CLIs.
- **Self-discovery**: `npm search`, registry website, and — more honestly — `npx create-*` tab-complete-style convention (`create-react-app`, `create-next-app`, `create-t3-app`).
- **Steal for Loa**: The `create-*` pattern. A `constructs create <template>` that spins up a scaffolded repo with the right constructs *already installed* is higher leverage than any "starter bundle" — the template IS the bundle.

## cargo (Rust)

- **First-encounter surface**: `cargo new my-project` scaffolds a working `Cargo.toml` + `src/main.rs` with a `println!("Hello, world!")`. `cargo run` works immediately. No wizard, no interactive prompts — convention over configuration.
- **Bundled defaults**: Zero crates. `cargo add <crate>` (merged into cargo core in v1.62) is the one-liner onramp to crates.io. Historical `cargo-edit` subcommand pattern was absorbed into the tool itself — a telling signal that "popular third-party tool → core" is a legitimate evolution path.
- **Self-upgrade**: `rustup update` handles the toolchain; cargo doesn't self-update. Clean separation of "installer" (rustup) from "package manager" (cargo).
- **Meta-packages**: `[workspaces]` in `Cargo.toml` is the native composition primitive. No official curated starter set — community projects like `cargo-quickstart` and `cargo-install-favorites` fill the gap, but they're fringe.
- **Steal for Loa**: The `cargo new` baseline — the first command produces a *runnable, non-empty* thing. And the "third-party tool gets absorbed into core" evolutionary pattern is a healthy model for Loa construct promotion.

## pip + pipx + uv

- **First-encounter surface**: `uv` installs via a single curl-bash or `pip install uv`, then `uv init` creates a project, `uv add <pkg>` installs into a virtualenv-in-a-hidden-folder, and `uv python install` bootstraps Python itself. No Python needed first — the Rust binary bootstraps the runtime. One `uv sync` = fully working env.
- **Bundled defaults**: Zero. uv is explicitly a *client*, not a distribution. Contrast with Anaconda, which bundles a scientific stack — a deliberately rejected model in the uv pitch.
- **Self-discovery**: `uv tool install` (persistent) vs `uvx` (ephemeral, cached, disposable) — direct parallel to `npm install -g` vs `npx`. Same design, same lesson: ephemeral won.
- **Meta-packages**: `pyproject.toml` with `[tool.uv.workspaces]` — inherited from the cargo/npm workspace pattern. uv is positioned to replace pip + pip-tools + pipx + poetry + pyenv + virtualenv + twine: **consolidation as onboarding UX**.
- **Steal for Loa**: The "replaces N tools" pitch. If Loa's `constructs` CLI can absorb skill install + grimoire seed + persona sync + project scaffold into one verb chain, that IS the onboarding story.

## rubygems (`gem install`)

- **First-encounter surface**: Historical canonical first-use: `gem install rails` → `rails new myapp` → `bundle install` → `rails server`. Three-step ritual, universally memorized, taught in every tutorial for ~15 years.
- **Bundled defaults**: `gem` ships empty. `rails` was the de-facto starter bundle — installing it pulled ~30 transitive gems and registered generators (`rails generate scaffold User`).
- **Self-discovery**: `gem search`, rubygems.org. Weak by modern standards.
- **Meta-packages**: `Gemfile` + Bundler is the pattern everyone else copied. Locked versions, `bundle install`, per-project isolation — shipped ~2010 and became the template for npm's `package-lock.json`, cargo's `Cargo.lock`, uv's lockfile.
- **Steal for Loa**: The **named ritual**. "Install X, run `X new`, cd in, `bundle`." Three memorized commands that anyone can recite. A Loa starter bundle needs a three-command ritual more than it needs a big curated list.

---

## Synthesis

- **Every successful PM ships the client empty and relies on a convention to populate it.** Homebrew=nothing, cargo=nothing, npm=nothing, uv=nothing, gem=nothing. The "bundle" is always either (a) a declarative manifest (`Brewfile`, `Cargo.toml`, `package.json`, `Gemfile`, `pyproject.toml`) or (b) a scaffold generator (`create-*`, `cargo new`, `rails new`, `uv init`). **Never** a pre-populated client.
- **Every successful PM hides self-update inside the install command.** Users don't remember to `brew update`, `rustup update`, or re-run installers. `install` transparently refreshes the index; the lockfile makes this safe. Loa should do the same in `constructs install`.
- **Every successful PM has a lockfile-plus-manifest pair.** `Brewfile` (no lock) is the weak link and gets criticized for drift. Manifest declares intent; lockfile pins reality. Any Loa "starter bundle" should be a manifest file, not a meta-pack — and should pin versions.
- **The controversial / varying pattern: ephemeral vs. persistent global install.** `npx`/`pnpm dlx`/`uvx`/`cargo-binstall` all implement run-without-permanent-install, explicitly rejecting `npm -g`/`pip install --user`/`cargo install`. Ruby never built this and is worse for it. Homebrew has no equivalent. **Decision point for Loa**: does `constructs try <pack>` (ephemeral, cached, disposable) belong alongside `constructs install`? The younger ecosystems say yes; the older ones regret not building it.

**Bottom line for the starter-bundle question**: the prior art says *don't* ship a curated pack of network-level tooling. Ship a `Constructfile` schema, a `constructs create <template>` scaffolder, and a three-command ritual. Let the community's Brewfiles/package.jsons become the de facto starter sets.

Sources:
- [Homebrew Installation docs](https://docs.brew.sh/Installation)
- [Homebrew Bundle / Brewfile](https://docs.brew.sh/Brew-Bundle-and-Brewfile)
- [Homebrew FAQ — auto-update behavior](https://docs.brew.sh/FAQ)
- [create-next-app CLI reference](https://nextjs.org/docs/app/api-reference/cli/create-next-app)
- [pnpm dlx docs](https://pnpm.io/cli/dlx)
- [pnpm vs npm feature comparison](https://pnpm.io/pnpm-vs-npm)
- [cargo add — The Cargo Book](https://doc.rust-lang.org/cargo/commands/cargo-add.html)
- [cargo-edit on crates.io](https://crates.io/crates/cargo-edit)
- [cargo-binstall](https://github.com/cargo-bins/cargo-binstall)
- [uv installation docs (Astral)](https://docs.astral.sh/uv/getting-started/installation/)
- [uv Tools concept](https://docs.astral.sh/uv/concepts/tools/)
- [uv GitHub README](https://github.com/astral-sh/uv)
- [pipx homepage](https://pipx.pypa.io/stable/)
- [RubyGems Basics](https://guides.rubygems.org/rubygems-basics/)
- [Rails Getting Started Guide](https://guides.rubyonrails.org/v5.0/getting_started.html)
