---
name: "source-command-sprint-plan"
description: "Create comprehensive sprint plan based on PRD and SDD.
Task breakdown, prioritization, acceptance criteria, assignments.
Registers sprints in the Sprint Ledger for global numbering.
Optionally integrates with Beads for task graph management."
---

# source-command-sprint-plan

Use this skill when the user asks to run the migrated source command `sprint-plan`.

## Command Template

# Sprint Plan

## Purpose

Create a comprehensive sprint plan based on PRD and SDD. Breaks down work into actionable tasks with acceptance criteria, priorities, and assignments.

## Invocation

```
/sprint-plan
/sprint-plan background
```

## Agent

Launches `planning-sprints` from `skills/planning-sprints/`.

See: `skills/planning-sprints/SKILL.md` for full workflow details.

## Prerequisites

- PRD created (`grimoires/loa/prd.md` exists)
- SDD created (`grimoires/loa/sdd.md` exists)

## Workflow

1. **Pre-flight**: Verify setup, PRD, and SDD exist
2. **Analysis**: Read PRD for requirements, SDD for architecture
3. **Breakdown**: Create sprint structure with actionable tasks
4. **Clarification**: Ask about team size, sprint duration, priorities
5. **Validation**: Confirm assumptions about capacity and scope
6. **Generation**: Create sprint plan at `grimoires/loa/sprint.md`
7. **Analytics**: Update usage metrics (THJ users only)

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `background` | Run as subagent for parallel execution | No |

## Outputs

| Path | Description |
|------|-------------|
| `grimoires/loa/sprint.md` | Sprint plan with tasks |

## Sprint Plan Sections

The generated plan includes:
- Sprint Overview (goals, duration, team structure)
- Sprint Breakdown with:
  - Sprint number and goals
  - Tasks with clear descriptions
  - Acceptance criteria (specific, measurable)
  - Estimated effort/complexity
  - Developer assignments
  - Dependencies and prerequisites
  - Testing requirements
- MVP Definition and scope
- Feature prioritization rationale
- Risk assessment and mitigation
- Success metrics per sprint
- Dependencies and blockers
- Buffer time for unknowns

## Task Format

Each task includes:
- Task ID and title
- Detailed description
- Acceptance criteria
- Estimated effort
- Assigned to
- Dependencies
- Testing requirements

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| "PRD not found" | Missing prd.md | Run `/plan-and-analyze` first |
| "SDD not found" | Missing sdd.md | Run `/architect` first |

## Planner Style

The planner will:
- Ask about team capacity and sprint duration
- Clarify MVP scope and feature priorities
- Present options for sequencing and dependencies
- Only generate plan when confident in breakdown

## Sprint Ledger Integration

When a Sprint Ledger exists (`grimoires/loa/ledger.json`):

1. **Registers Sprints**: Each sprint in the plan is registered with `add_sprint()`
2. **Global Numbering**: Sprints receive globally unique IDs across cycles
3. **Logging**: Shows "Registered sprint-1 as global sprint-N" for each sprint
4. **SDD Reference**: Updates the cycle's `sdd` field with `grimoires/loa/sdd.md`

### Example Output

```
Creating sprint plan...
Registered sprint-1 as global sprint-4
Registered sprint-2 as global sprint-5
Registered sprint-3 as global sprint-6
Sprint plan created with 3 sprints (global IDs: 4-6)
```

### Legacy Mode

Without a ledger, sprint-plan works exactly as before using local sprint numbers.

## Flatline Protocol Integration (v1.17.0)

After sprint plan generation completes, the Flatline Protocol may execute automatically for adversarial review.

### Automatic Trigger Conditions

The postlude runs if ALL conditions are met:
- `flatline_protocol.enabled: true` in `.loa.config.yaml`
- `flatline_protocol.auto_trigger: true` in `.loa.config.yaml`
- `flatline_protocol.phases.sprint: true` in `.loa.config.yaml`

### What Happens

1. **Knowledge Retrieval**: Searches local grimoires for relevant patterns
2. **Phase 1**: 4 parallel API calls reviewing sprint plan
3. **Phase 2**: Cross-scoring between models
4. **Consensus**: Identifies task gaps, missing acceptance criteria, estimation concerns
5. **Presentation**: Shows results with option to refine tasks

### Output

Results are saved to `grimoires/loa/a2a/flatline/sprint-review.json`

### Manual Alternative

If auto-trigger is disabled, run manually:
```bash
/flatline-review sprint
```

## Next Step

After sprint plan is complete:
```
/implement sprint-1
```

That's it. The implement command handles everything:
- **With Ledger**: Resolves sprint-1 to global ID, uses correct a2a directory
- **With beads_rust**: Automatically manages task lifecycle (br ready, update, close)
- **Without either**: Uses markdown-based tracking from sprint.md

**No manual `br` commands required.** The agent handles task state internally.

## beads_rust Integration

When beads_rust is installed, the agent will:
1. **Session Start**: `br sync --import-only` to import latest state
2. **Create Structure**: Use helper scripts for epic/task creation
3. **Session End**: `br sync --flush-only` before commit

**Protocol Reference**: See `.Codex/protocols/beads-integration.md`
