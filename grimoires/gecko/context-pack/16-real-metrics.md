# Real Metrics — What Actually Matters

> downloads weighted at 0.1 was the right call. depth over breadth, always.

## The Vanity Trap

the first version of the week-1 spec had metrics like "repos with widget installed: 5/5" and "discord commands responding: 4/4." those are checkboxes. they tell you a thing was deployed, not whether it was worth deploying.

the bazaar doesn't care how many stalls are open. it cares whether anyone found water.

## Metrics That Matter

### M1: Time to Awareness (TTA)

**How long between something breaking and someone knowing?**

this is the core metric for ecosystem intelligence. if a product repo has a bug that users hit for 3 days before anyone notices, ruggy failed. if ruggy surfaces it in 30 minutes, ruggy justified its existence.

| Measurement | How |
|-------------|-----|
| Bug report timestamp (user widget submission) | Convex signal `created_at` |
| First human eyeball (Linear issue viewed) | Linear activity timestamp |
| TTA = viewed - created | Should trend toward minutes, not days |

**Target**: <4 hours for HIGH severity. <1 hour for CRITICAL.

**Why this isn't vanity**: it measures the gap between reality and awareness. the whole point of ruggy is closing that gap. if TTA doesn't improve, nothing else matters.

### M2: Human Override Rate

**How often does a human change Ruggy's classification or close its issues?**

this is the real accuracy metric. not "did haiku say bug" but "did the human agree it was a bug."

| Signal | What It Means |
|--------|---------------|
| Issue relabelled after creation | Ruggy misclassified severity or category |
| Issue closed as wontfix/duplicate | Ruggy created noise |
| Issue assigned and worked | Ruggy created signal |

**Target**: <25% override rate by end of month 1. <15% by month 2.

**Why this isn't vanity**: it measures trust. if the team starts ignoring ruggy's issues because they're usually wrong, the system is dead regardless of how many signals it processes. the override rate IS the sovereignty signal — when it's low enough, ruggy earns more autonomy.

### M3: Signal-to-Action Ratio

**Of signals ingested, what % led to someone doing something?**

not "led to a Linear issue" — led to a code change, a design decision, a conversation, a fix. this is harder to measure but more honest.

| Measurement | How |
|-------------|-----|
| Signals ingested | Convex signal count |
| Issues created | Linear issue count (ruggy-created) |
| Issues resolved (not just closed) | Linear issue status → done |
| PRs linked to issues | GitHub PR → Linear issue link |
| Actions = resolved issues + linked PRs | The denominator that matters |

**Target**: >10% of signals lead to action within 7 days. (This sounds low but most feedback in most systems leads to nothing. 10% that actually moves the needle is exceptional.)

**Why this isn't vanity**: it measures whether the pipeline produces outcomes, not just artifacts. 1000 linear issues that nobody reads is worse than 10 that each fix a real problem.

### M4: Coverage Gap Detection

**Are there failures happening in repos Ruggy ISN'T watching?**

this is the metric for what you're NOT seeing. the most dangerous failure mode for an observability system is blind spots.

| Measurement | How |
|-------------|-----|
| Unmonitored repo incidents | GitHub issues filed directly (not from Ruggy) in monitored repos |
| User reports via other channels | Discord messages about bugs that didn't come through the widget |
| Post-incident analysis | After an incident: did Ruggy see it? If not, why? |

**Target**: 0 CRITICAL incidents that Ruggy missed. (aspirational but the right north star.)

**Why this isn't vanity**: the thing you're not measuring is the thing that kills you. this metric forces ruggy to confront its own blind spots.

### M5: Cost Per Actionable Signal

**Total Ruggy spend / number of signals that led to action.**

| Measurement | How |
|-------------|-----|
| API spend (Anthropic) | Anthropic dashboard, daily |
| Infrastructure spend (Railway/Convex) | Provider dashboards |
| Actionable signals | From M3 |
| Cost per action = total spend / actionable signals | Should trend down |

**Target**: <$5 per actionable signal. (At ~$1/day and 10+ actionable signals/month, this is achievable.)

**Why this isn't vanity**: it grounds the system in economics. if ruggy costs $30/day and produces 2 actionable signals/month, that's $450/signal — a human scanning Discord for 10 minutes would be cheaper. the cost must justify the awareness.

## Metrics We Explicitly DON'T Track

| Metric | Why Not |
|--------|---------|
| Total signals ingested | Volume without quality is noise. A system that ingests 10,000 signals and acts on 3 is worse than one that ingests 100 and acts on 30. |
| Widget install count | Checkbox. Tells you deployment happened, not value delivered. |
| Discord command usage | Engagement metric. If nobody uses `/ruggy status` but the alerts save the team 2 hours/week, that's fine. |
| Uptime percentage | Process staying alive is infrastructure, not intelligence. Monitor it, don't celebrate it. |
| Classification speed | Haiku classifies in <2 seconds. It will never be the bottleneck. Don't optimize what isn't slow. |
| Number of Linear issues created | More issues ≠ more value. Could easily mean more noise. |

## The Sovereignty Ladder

the override rate (M2) IS the sovereignty signal. this creates a natural progression:

```
Override rate >40%    → CONSTRAINED (human reviews everything)
Override rate 15-40%  → STANDARD (ruggy creates LOW/MEDIUM autonomously)
Override rate <15%    → AUTONOMOUS (ruggy has full triage authority)
```

this isn't a manual promotion. it's not earned-reputation complexity. it's one metric, one threshold, one transition. the human can always override the tier manually, but the default is: the data decides.

## Weekly Health Report

instead of a dashboard full of charts, ruggy produces one thing per week:

```
ruggy weekly — 2026-03-19

signals: 47 ingested, 12 classified as bug, 35 as utc
actions: 8 linear issues created, 5 resolved, 1 overridden
tta: avg 2.3h (target <4h) ✓
override rate: 12.5% (target <25%) ✓
cost: $6.20 / 5 actionable = $1.24/signal (target <$5) ✓
gaps: 0 critical incidents missed ✓

that's it. the rest is noise.
```
