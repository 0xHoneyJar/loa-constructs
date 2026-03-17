---
layout: home
hero:
  name: "Constructs Network"
  text: "Skills for AI coding agents."
  tagline: "23 constructs. 160 skills. Lateral composition."
  actions:
    - theme: brand
      text: Explore Constructs
      link: /constructs/artisan
    - theme: alt
      text: View Architecture
      link: /architecture/ecs
---

<div style="margin: 2rem auto; max-width: 900px;">

## Network Topology

<NetworkGraph />

</div>

<div style="margin: 2rem auto; max-width: 900px;">

## Architecture

The construct network uses **ECS composition** — entities carry components, systems run blind. [Read more &rarr;](/architecture/ecs)

| Pattern | Status | How It Works |
|---------|--------|-------------|
| **Component Attachment** | Working | Add skills to any construct — no other construct needs to know |
| **Pipeline Composition** | Working | Constructs communicate through shared grimoire paths |
| **Event Composition** | Spec Only | 40+ forge events declared, zero dispatch mechanism |
| **Recursive Composition** | Working | Constructs invoke other constructs' skills via dependencies |

## Verification

Every construct defines what "correct" means. [Echelon](/verification/echelon) verifies whether the claim is true. [Read the guide &rarr;](/verification/verification-guide)

`UNVERIFIED` &rarr; `BACKTESTED` &rarr; `PROVEN`

</div>
