# Sprint Plan: Ruggy — Autonomous Ecosystem Intelligence Agent

**Cycle**: cycle-045
**PRD**: `grimoires/loa/prd.md`
**SDD**: `grimoires/loa/sdd.md`
**Team**: 1 developer (@janitooor)
**Sprint duration**: 2-3 days each

---

## Sprint 1: Foundation — Dixie Fork + Convex Extensions

**Goal**: Ruggy exists as a running service with sovereignty state tracking.

### Tasks

#### 1.1 Fork loa-dixie → construct-ruggy
- Fork `loa-dixie` repo under 0xHoneyJar org
- Replace `persona/oracle.md` → `persona/rugby.md` (BEAUVOIR identity from PRD §9)
- Replace `knowledge/oracle-binding.yaml` → `knowledge/rugby-binding.yaml`
- Replace `knowledge/sources.json` with Ruggy's 6-source corpus
- Create knowledge source files: `product-repos.md`, `signal-taxonomy.md`, `observer-workflow.md`, `linear-config.md`
- **Acceptance**: Fork boots, `bun run dev` starts without crash

#### 1.2 Oracle identity dehard-coding
- `app/src/routes/identity.ts`: parameterize `'oracle'` (3 occurrences) from binding
- `app/src/routes/chat.ts`: `agentId: 'oracle'` → read from binding
- `app/src/services/corpus-meta.ts`: replace `KNOWN_REPOS` at line 265 with 6 Ruggy repos
- **Acceptance**: `/api/health` returns Ruggy identity. Knowledge queries return Ruggy-domain results

#### 1.3 Run test suite, fix identity breakage
- Run `vitest run` — expect failures in Oracle-specific assertions
- Fix tests that assert "Oracle" strings → "Ruggy"
- If >50% break: timebox 4 hours, then write Ruggy-specific tests only
- **Acceptance**: Test suite passes or Ruggy-specific tests cover new code paths

#### 1.4 Convex schema extensions
- Add `signalOverrides` table (SDD §3.2) to `apps/explorer/convex/schema.ts`
- Add `sovereigntyState` table (SDD §3.2)
- Add `recordOverride` mutation
- Add `recalculateSovereignty` function + hourly cron
- Initialize `sovereigntyState` with all 6 repos at `constrained` tier (apdao at `standard` per SDD §3.3)
- **Acceptance**: `npx convex deploy` succeeds. Sovereignty state readable via Convex dashboard

#### 1.5 Origin validation for signal ingestion
- Add `ALLOWED_ORIGINS` map to `apps/explorer/app/api/signals/route.ts` (SDD §4.1)
- Check `Origin`/`Referer` header after key validation
- Allow `localhost:3000` for all repos in dev
- **Acceptance**: Requests from unknown origins return 403. Known origins pass through

#### 1.6 Provision API keys for 6 product repos
- Call `POST /v1/keys` with `scopes: ['write:signals']` and `appSlug` for each repo
- Store keys securely for distribution to product repos
- **Acceptance**: 6 keys created, each verified via `verifySignalKey`

---

## Sprint 2: Widget Integration — Connect Product Repos

**Goal**: User feedback from 4+ product repos flows into the Convex signal pipeline.

### Tasks

#### 2.1 set-and-forgetti fan-out integration
- File: `apps/web/app/api/feedback/route.ts`
- After `createFeedbackIssue()` succeeds, POST to `constructs.network/api/signals`
- Map S&F feedback fields → signal schema (category, severity derivation, description)
- Add `SIGNALS_API_KEY` env var to S&F deployment
- Log fan-out failures (not silent)
- **Acceptance**: Submit feedback in S&F → signal appears in Convex tagged `set-and-forgetti`

#### 2.2 apdao-auction-house fan-out integration
- File: `actions/create-feedback.ts`
- After `createIssue()` succeeds, POST to signals API
- Map apDAO feedback fields → signal schema
- Add `SIGNALS_API_KEY` env var
- **Acceptance**: Submit feedback in apDAO → signal in Convex tagged `apdao-auction-house`

#### 2.3 midi-interface (mibera-dimensions) fan-out integration
- File: `app/actions/feedback.ts`
- After Supabase `score_feedback` insert, POST to signals API
- Map pulse widget fields (bad/fine/good + note) → signal schema
- Severity derivation: "bad" → high, "fine" → low, "good" → low (praise)
- Add `SIGNALS_API_KEY` env var
- **Acceptance**: Submit feedback in midi-interface → signal in Convex tagged `midi-interface`

#### 2.4 mcv-interface Convex HTTP action
- File: `convex/feedback.ts`
- After `submit` mutation succeeds, schedule Convex HTTP action to POST to signals API
- Map vault feedback fields (bad/fine/good + note) → signal schema
- **Acceptance**: Submit vault feedback in mcv → signal in Convex tagged `mcv-interface`

#### 2.5 cubquests-interface new widget
- Create feedback button component in `components/layout/`
- Mount in `navbar.tsx` (right side, before connect wallet)
- On submit: POST directly to `constructs.network/api/signals`
- Match cubquests design system (BoldenVan font, existing color tokens)
- Add `SIGNALS_API_KEY` env var
- **Acceptance**: Feedback widget visible in cubquests navbar. Submission creates signal tagged `cubquests-interface`

#### 2.6 mibera-honeyroad new widget
- Create floating feedback button component
- Mount in `(main)/layout.tsx` (no persistent navbar exists)
- On submit: POST directly to `constructs.network/api/signals`
- Match honeyroad design system
- Add `SIGNALS_API_KEY` env var
- **Acceptance**: Feedback widget visible in honeyroad. Submission creates signal tagged `mibera-honeyroad`

---

## Sprint 3: Enhanced Classification + Sovereignty Logic

**Goal**: Haiku classification is context-aware. Sovereignty tier system is operational.

### Tasks

#### 3.1 Enhanced classification prompt
- Update `apps/explorer/convex/signals.ts:classify` function
- Add per-app context snippets (what the app does, known issues)
- Add `type` field to classification output (bug vs UTC)
- Add `severity` and `category` fields to classification schema
- Store app context snippets as Convex environment variable or inline map
- **Acceptance**: Classification output includes `type`, `severity`, `category`. Context-appropriate for each app

#### 3.2 Sovereignty-gated escalation
- Modify escalation path: after classification, check `sovereigntyState` for app's tier
- CONSTRAINED: mark signal as `needs_review`, don't auto-create Linear issue
- STANDARD: auto-escalate LOW/MEDIUM, mark HIGH/CRITICAL as `needs_review`
- AUTONOMOUS: auto-escalate all, circuit breaker active
- **Acceptance**: Signal with `sovereigntyTierAtCreation` field set. CONSTRAINED signals require dashboard action to escalate

#### 3.3 Circuit breaker implementation
- Track consecutive failures per repo in Convex
- 5 consecutive classification failures → set repo to `halted` state
- Same error message 3× → halt
- Add `/ruggy reset [repo]` Discord command to clear halt
- **Acceptance**: Simulated failures trigger halt. Reset clears it

#### 3.4 Override tracking integration
- Modify `updateStatusFromDashboard` to detect classification changes
- When human changes classification labels/severity → write to `signalOverrides`
- Trigger `recalculateSovereignty` after override
- **Acceptance**: Changing a signal's classification in dashboard creates override record. Sovereignty recalculation reflects it

#### 3.5 Pipeline error alerting
- After 3 failed `linearCreationAttempts`, alert Discord #ops channel
- New Convex function: `alertPipelineError`
- Include signal ID, app slug, error details in embed
- **Acceptance**: Simulated Linear failure triggers Discord alert after 3rd attempt

---

## Sprint 4: Discord Slash Commands + E2E

**Goal**: Team can query ecosystem health via Discord. Full pipeline tested end-to-end.

### Tasks

#### 4.1 Discord application setup
- Create Discord application in developer portal
- Configure slash commands: `/ruggy status`, `/ruggy signals`, `/ruggy escalations`, `/ruggy repos`
- Set interactions endpoint URL to Dixie fork
- **Acceptance**: Discord app exists with registered commands

#### 4.2 Discord interactions endpoint
- `construct-ruggy/app/src/routes/discord.ts`
- Ed25519 signature verification
- PING/PONG handler
- Route to subcommand handlers
- **Acceptance**: Discord verification succeeds. PING returns PONG

#### 4.3 `/ruggy status` command
- Query Convex `statusCounts()` + `sovereigntyState`
- Return embed: health summary, signal volumes (24h/7d), tier per repo, active incidents
- **Acceptance**: `/ruggy status` in Discord returns accurate ecosystem snapshot

#### 4.4 `/ruggy signals [repo]` command
- Query Convex `byApp(appSlug)` with limit
- Return embed: recent signals with classification, severity color coding
- **Acceptance**: `/ruggy signals set-and-forgetti` returns S&F signals

#### 4.5 `/ruggy escalations` command
- Query Convex for `status: 'escalated'` signals
- Return embed: open Linear issues with links, severity, age
- **Acceptance**: Shows current open escalations

#### 4.6 `/ruggy repos` command
- Query Convex `statusCounts()`
- Return embed: all 6 repos with signal counts, tier, last signal timestamp
- **Acceptance**: Shows all monitored repos with stats

#### 4.7 Deploy Dixie fork to Railway
- Configure Railway service with environment variables (SDD §7.1)
- Set Discord interactions endpoint to Railway URL
- Health check endpoint responds
- **Acceptance**: Dixie fork running on Railway. Discord commands work via Railway endpoint

#### 4.8 Deploy Convex changes
- `npx convex deploy` from `apps/explorer/`
- Verify new tables, functions, crons are active
- **Acceptance**: Convex dashboard shows new tables. Sovereignty cron running

#### 4.9 E2E integration test
- Submit feedback from set-and-forgetti dev environment
- Verify: signal in Convex → classified → sovereignty check → Linear issue → Discord alert
- Test override: change classification in dashboard → override recorded → sovereignty recalculated
- Test circuit breaker: simulate failures → halt triggered
- **Acceptance**: Full pipeline works end-to-end. Override tracking functional. Circuit breaker operational

---

## Sprint Summary

| Sprint | Focus | Repos Touched | Key Risk |
|--------|-------|---------------|----------|
| 1 | Foundation | construct-ruggy (new), loa-constructs | Dixie fork test breakage |
| 2 | Widget Integration | 6 product repos | Cross-repo coordination, mcv Convex pattern |
| 3 | Classification + Sovereignty | loa-constructs (Convex) | Sovereignty edge cases, low volume |
| 4 | Discord + E2E | construct-ruggy, Discord | Discord API complexity, integration timing |

## Dependencies

```
Sprint 1 ──→ Sprint 2 (keys needed for widgets)
Sprint 1 ──→ Sprint 3 (Convex tables needed for sovereignty)
Sprint 3 ──→ Sprint 4.9 (sovereignty needed for E2E test)
Sprint 1 ──→ Sprint 4.7 (Dixie fork needed for Railway deploy)
```

Sprints 2 and 3 can run in parallel after Sprint 1 completes.

## Success Criteria (Week 1 Close)

- [ ] Ruggy Dixie fork deployed on Railway, health check passing
- [ ] 4+ product repos forwarding feedback to Convex signal pipeline
- [ ] Haiku classification includes type (bug/UTC), severity, category
- [ ] Sovereignty state tracked for all 6 repos (5 CONSTRAINED, 1 STANDARD)
- [ ] Override tracking operational (human changes → sovereignty recalculation)
- [ ] Circuit breaker halts on failure patterns
- [ ] `/ruggy status` returns ecosystem health in Discord
- [ ] E2E test passes: widget → signal → classify → Linear → Discord alert
