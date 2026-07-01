---
name: Lab Canvas
description: User truth canvas or experiment artifact with hivemind frontmatter
title: "[CANVAS] "
labels: ["[AT] user-truth-canvas", "[WS] discovery"]
body:
  - type: markdown
    attributes:
      value: |
        Lab artifact — `hivemind:` block in frontmatter is validated by CI (#248 Phase A).
  - type: textarea
    id: body
    attributes:
      label: Canvas body
      description: Write the canvas content below the frontmatter block.
      value: |
        ---
        hivemind:
          schema_version: "1.0"
          artifact_type: user-truth-canvas
          workstream: discovery
          priority: medium
          product_area: Constructs Network
          learning_status: hypothesis-failed
          source: team-internal
        ---

        ## ⚡ GLANCE

        ## 🧭 ORIENT

        ## 🔧 INTERVENE
