# STAMETS Prior Art — Modpack Launcher Onboarding UX

> **Research agent report · 2026-04-22**
> Commissioned during cycle-005 close, pre-cycle-006 SEED dispatch.
> Source research (web, agent-synthesized). Preserved per OTLET for
> cycle-006 SEED `stamets-prior-art` section.
>
> Companion report: `stamets-prior-art-package-managers.md`. These two
> were commissioned in parallel. The synthesis at the bottom of this file
> should be read against the PM synthesis — they converge on the same
> design answer in two different cultural vocabularies.

---

# Modpack Launcher Landscape — Prior Art for Loa Meta-Packs

## 1. Prism Launcher (open-source, MultiMC fork)

- **First-encounter surface**: empty instance grid + giant "Add Instance" button. No feed, no discovery, no noise. The launcher is a shell; content lives behind that one button.
- **Curation layers**: inside Add Instance, a left rail of *sources* (Vanilla / Modrinth / CurseForge / ATLauncher / Technic / FTB / Import from zip). Curation is federated — Prism doesn't host anything, it aggregates other people's indexes.
- **Composition model**: instance is the atom. A pack is an instance-template. Individual mods are second-class — added via right-click → Edit → Mods → Download, or drag-and-drop a `.jar`. Nesting is flat (no packs-of-packs).
- **"Oh, that's the move" moment**: right-click any instance → "Export Instance" → pick `.mrpack` or CurseForge zip. You just shipped a pack. Authoring is an export operation on a thing you already have, not a separate authoring UI.
- **For Loa**: the left-rail-of-sources pattern. Registry should be federated, not centralized — `install from: loa-official | honeyhive | github-url | local-zip` in one modal.

## 2. Modrinth App

- **First-encounter surface**: "Home" with an empty-state prompt and a prominent "Browse" button. Instance tabs gained icons + a Worlds empty-state with "add server / browse" in 2025.
- **Curation layers**: fully integrated marketplace (Prism points at Modrinth; Modrinth App *is* Modrinth). Featured/trending/popular live one click from the launcher.
- **Composition model**: `.mrpack` = zip with `modrinth.index.json` + optional `overrides/` tree. Required fields are minimal: `formatVersion`, `game`, `versionId`, `name`, `files[]`, `dependencies`. Files reference external URLs with SHA1+SHA512; overrides are bundled. Distribution has two tiers: *listed* (moderated, 24–48h review) vs. *unlisted* (share the `.mrpack` via Drive/Dropbox).
- **"Oh, that's the move" moment**: the informal `.mrpack`-over-Dropbox path. A pack is a file you can DM.
- **For Loa**: the manifest minimum (≤6 fields), hash-verified external refs + bundled overrides, and crucially the *two-tier publish* — moderated registry AND shareable file. World-builders will build packs for 3 friends before they ever want to "publish."

## 3. CurseForge Launcher

- **First-encounter surface**: dashboard with editorial/featured carousel, categories, "trending." Commercial feel — ads, account prompts, Overwolf shell.
- **Curation layers**: deepest catalog (incumbent). Editorial featured, categories, author pages. Windows-first, ad-supported.
- **Composition model**: "Custom Profile" is the authoring unit. Same primitive as Prism's instance but named as an authoring artifact from the start. Export via "Share Profile" → zip, or generate a 7-day **profile code** for ephemeral transfer.
- **"Oh, that's the move" moment**: "Create Custom Profile" appears in the same menu as "Install a Pack." Authoring is not hidden in settings — it's a sibling of consumption.
- **For Loa**: the **profile code** pattern — a short-lived, copy-pasteable handle that encodes a whole pack. For agents/CLIs this is the ideal UX: `loa install <code>`.

## 4. MultiMC (historical root)

- **What it proved**: *instance isolation*. Each instance has its own mods/saves/config/java-version. The insight: shared libraries under the hood, siloed state on top. Every modern launcher inherits this. Prism is a fork; Modrinth App re-implemented it.
- **For Loa**: construct installations must be instance-isolated. A "meta-pack" is a named environment, not a global mutation of `~/.claude`.

## 5. Fabric / NeoForge Installers (the loader, not the launcher)

- **First-encounter surface**: a tiny Swing installer with radio buttons (Client/Server), a path field, one OK button. Three seconds.
- **After "installed, now what?"**: a dead end. The installer only patches the vanilla launcher profile. User sees an empty `mods/` folder. They must *know* to drop `.jar`s in, *know* Fabric also needs `fabric-api.jar`. The launcher ecosystem exists specifically to fill this void.
- **For Loa**: the framework-installer-alone creates an empty-room problem. A meta-pack exists to make the moment-after-install non-empty.

## 6. Manifest formats (`modrinth.index.json`, `manifest.json`)

- **Modrinth** (modern): `formatVersion`, `game`, `versionId`, `name`, `files[]` (path + hashes{sha1,sha512} + env + downloads[]), `dependencies{minecraft, fabric-loader|neoforge}`. Plus `overrides/` directory for config.
- **CurseForge**: `manifest.json` with `minecraft.version`, `modLoaders[]`, `files[] {projectID, fileID}`, `overrides`. Project/file ID references only — can't sideload unlisted mods.
- **Minimum shareable**: ~6 fields + one file entry + one dependency. The schema is *aggressively small*.
- **For Loa**: manifest must be YAML/JSON with ≤10 required keys, support both registry-refs and direct URLs, hash every remote asset, and reserve an `overrides/` slot for bundled config/taste/canon files.

---

## Synthesis

- **Load-bearing invariant across all six**: *the instance is the atom, not the mod.* Every successful modpack tool treats a named, isolated environment as the primary primitive. Mods are contents; packs are environments. Loa should resist any design where "install a construct" mutates a global `~/.claude` — packs are named rooms.
- **The essential difference between "install a mod" and "install a modpack"**: intent. A mod is a *capability*; a modpack is a *world with opinions* (version pins, config overrides, a curated stack, a name). Modpacks carry **taste**. This is exactly why world-builders gravitate to them: the pack is a *statement*, not a dependency.
- **The DX pattern they all borrow from npm/brew**: a **manifest + lockfile + registry + local install** pipeline, with the crucial extra of **override trees bundled alongside remote refs** (brew casks and npm workspaces only half do this). The pack format is `package.json` + `node_modules/` flattened into one zip — and critically, *every one of them supports unlisted sharing* (the `.mrpack` over Dropbox, the CurseForge profile code, the Prism export). The registry is optional; the file format is load-bearing.

Sources:
- [Prism Launcher wiki — Modpacks](https://prismlauncher.org/wiki/getting-started/download-modpacks/)
- [Prism Launcher wiki — Mods](https://prismlauncher.org/wiki/getting-started/download-mods/)
- [Modrinth App help — Modpacks](https://support.modrinth.com/en/articles/8802250-modpacks-on-modrinth)
- [Modrinth .mrpack format spec](https://support.modrinth.com/en/articles/8802351-modrinth-modpack-format-mrpack)
- [Modrinth — Sharing modpacks](https://support.modrinth.com/en/articles/8797522-sharing-modpacks)
- [MultiMC official site](https://multimc.org/)
- [How to Geek — MultiMC instance management](https://www.howtogeek.com/202661/how-to-manage-minecraft-instances-and-mods-with-multimc/)
- [CurseForge support — Exporting/Importing Modpacks](https://support.curseforge.com/support/solutions/articles/9000198501-exporting-and-importing-modpacks)
- [Switchblade — Forge vs Fabric vs NeoForge](https://www.switchbladegaming.com/minecraft/forge-vs-fabric/)
- [Space-node — CurseForge vs Modrinth vs Prism 2026](https://space-node.net/blog/curseforge-vs-modrinth-vs-prism-launcher-2026)

---

## Cross-tradition synthesis (added post-research, 2026-04-22)

Read against the companion package-manager report, the two traditions converge on the SAME structural answer in different vocabularies:

| Abstraction | Developer-PM name | World-builder name |
|---|---|---|
| Named environment | project / workspace | instance / profile / modpack |
| Declarative manifest | `Cargo.toml` / `package.json` / `Gemfile` / `Brewfile` | `modrinth.index.json` / `manifest.json` |
| Remote refs + local overrides | `package.json` + `node_modules/` + `.npmrc` | `files[]` (URL+hash) + `overrides/` |
| Two-tier publish | registry + file-share (Brewfile email) | moderated registry + `.mrpack` via Dropbox |
| Bundled curated starters | **No** (Anaconda rejected; uv explicit about this) | **No** (modpacks are author-curated, not vendor-curated) |

**Where the traditions diverge** (load-bearing for Loa):

- **World-builder tradition treats the pack as a taste statement** ("a world with opinions"). Developer-PM tradition is more utilitarian ("a dep list with versions"). Loa's target cohorts span both — artisan / the-arcade operators care about taste; protocol / noether operators care about reproducibility. The `Constructfile` schema should honor both: mandatory `name` + `description` fields, optional `taste_tokens` or similar, plus the standard dep declarations.

- **World-builder tradition has robust unlisted-sharing** (profile code, `.mrpack` DM). Developer-PM tradition has weaker P2P (you commit your `Brewfile` / `package.json` to git, or nothing). Loa should honor the unlisted path early — `.constructfile` you can DM is higher-value than a registry listing for the first six months of ecosystem growth.

**Bottom line for cycle-006 design**: both traditions reject the "pre-populated meta-pack" model. Neither wants a vendor-curated starter bundle. Both want a manifest format + scaffold generator. The operator's `construct-network-tools` pack resolves to an **exemplar pack** — a fully-authored, taste-carrying construct that demonstrates the authorship conventions, not a toolbox of scripts.
