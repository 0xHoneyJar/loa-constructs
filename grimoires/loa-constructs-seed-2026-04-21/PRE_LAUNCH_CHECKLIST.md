# Pre-Launch Checklist — loa-constructs Public Visibility

> Generated: 2026-02-15 | Repo: 0xHoneyJar/loa-constructs

## Blockers (Must Complete Before Flipping Public)

- [ ] **BLOCKER-1**: Rotate OpenAI API key (found in security audit)
- [ ] **BLOCKER-2**: Rotate Supabase + JWT credentials (found in security audit)

## Warnings (Should Complete Before or Shortly After)

- [ ] **WARNING-3**: Remove `default.profraw` from git tracking (`git rm --cached default.profraw` + add to `.gitignore`)
- [ ] **WARNING-4**: Update CONTRIBUTING.md — currently describes "Loa template repository" pattern, not loa-constructs SaaS platform
- [ ] **WARNING-5**: License inconsistency — `apps/sandbox/package.json` declares `MIT` while root is `AGPL-3.0`
- [ ] **WARNING-6**: Discord invite links are placeholders — verify `discord.gg/loa-constructs` and `discord.gg/thehoneyjar` resolve correctly
- [ ] **WARNING-7**: `docs/SOFT-LAUNCH-OPERATIONS.md` contains internal operational details (manual user creation, THJ team seeding, Fly.dev URLs) — consider moving to internal wiki or marking as internal

## Recommended Pre-Launch Actions

- [ ] Review README.md for public audience (see audit notes below)
- [ ] Verify LICENSE (AGPL-3.0) is intentional for open-source registry
- [ ] Set repo description: "Constructs Network — AI agent expertise, composable."
- [ ] Set repo topics: `ai`, `constructs`, `loa`, `agents`, `registry`, `claude-code`, `skills`, `ai-agents`
- [ ] Enable GitHub Issues
- [ ] Enable GitHub Discussions (recommended for community Q&A)
- [ ] Disable GitHub Wiki (docs live in repo)
- [ ] Disable GitHub Projects (use Issues for tracking)
- [ ] Confirm CI passes on main branch
- [ ] One final `git log --all --oneline | grep -i secret` scan
- [ ] Verify `.gitignore` covers all sensitive patterns

## Final Step (Manual by Maintainer)

- [ ] **FLIP REPO TO PUBLIC** (Settings > Danger Zone > Change visibility)
