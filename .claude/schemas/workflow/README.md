# workflow/ — Loa framework workflow gates

Schemas for **the artifacts the Loa framework produces** as work moves through the gates.

| Schema | What it validates |
|---|---|
| `prd.schema.json` | Product Requirements Document — output of `/plan-and-analyze` |
| `sdd.schema.json` | Software Design Document — output of `/architect` |
| `sprint.schema.json` | Sprint Plan — output of `/sprint-plan` |
| `trajectory-entry.schema.json` | Agent reasoning trace — emitted during `/run` and other autonomous flows |
| `feedback-v3.schema.json` | Reviewer / auditor feedback — output of `/review-sprint` and `/audit-sprint` |

These artifacts cross the Loa workflow seam — between `/plan-and-analyze`, `/architect`, `/sprint-plan`, `/implement`, `/review-sprint`, `/audit-sprint`. Each gate produces a typed artifact the next gate consumes.

**Doctrine**: per [naming-is-diagnostic](https://github.com/zkSoju/hivemind/blob/main/wiki/concepts/naming-is-diagnostic.md), naming the workflow's artifacts crisply (PRD → SDD → Sprint) is what lets the gates compose.
