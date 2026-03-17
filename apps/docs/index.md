---
layout: home
hero:
  name: "Constructs Network"
  text: "Skills for AI coding agents."
  tagline: "23 constructs. 160 skills. Install one, compose many."
  actions:
    - theme: brand
      text: Browse All Constructs
      link: /constructs/
    - theme: alt
      text: How It Works
      link: /architecture/ecs
---

<div style="margin: 3rem auto; max-width: 900px; padding: 0 1.5rem;">

## What Are Constructs?

A construct is a self-contained skill pack for AI coding agents. Each one carries domain expertise — design systems, security audits, research synthesis, go-to-market — that an agent can install and invoke.

Constructs compose laterally. They don't import each other. They share state through grimoire paths and communicate through typed events. Add a construct to your project and it works alongside everything else without rewiring.

```bash
# Install a construct
loa install artisan

# Use its skills
/inscribe    # decompose a design into taste tokens
/feel        # analyze interface feel
```

## Network Topology

<div class="graph-container">
<ClientOnly>
  <NetworkGraph />
</ClientOnly>
</div>

</div>

<div style="margin: 3rem auto; max-width: 900px; padding: 0 1.5rem;">

## How Constructs Compose

The network uses **ECS composition** — entities carry components, systems run blind. [Read the full architecture &rarr;](/architecture/ecs)

| Pattern | Status | How It Works |
|---------|--------|-------------|
| **Skill Attachment** | Working | Add skills to any construct — no other construct needs to know |
| **Pipeline Composition** | Working | Constructs read/write shared grimoire paths — the path IS the interface |
| **Recursive Composition** | Working | Constructs invoke other constructs' skills via dependencies |
| **Event Composition** | Spec Only | 40+ forge events declared, zero dispatch mechanism |

## Verification

Every construct self-defines what "correct" means. [Echelon](/verification/echelon) runs those checks against reality. [Read the guide &rarr;](/verification/verification-guide)

`UNVERIFIED` &rarr; `BACKTESTED` &rarr; `PROVEN`

## Start Here

| If you want to... | Go to |
|-------------------|-------|
| Browse all 23 constructs | [Constructs overview](/constructs/) |
| Understand the composition model | [ECS Architecture](/architecture/ecs) |
| See governance and dependency chains | [Topology](/architecture/topology) |
| Find the right construct for your task | [Operator Modes](/network/operator) |
| Check network health and open issues | [Network Health](/network/health) |

</div>

<style>
.graph-container {
  width: 100%;
  height: 560px;
  border-radius: 0;
  overflow: hidden;
  border: 1px solid oklch(0.22 0.012 250);
}
</style>
