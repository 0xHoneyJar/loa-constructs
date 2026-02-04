---
name: "announce-release"
version: "1.0.0"
description: |
  Generate launch content from release artifacts.
  Creates blog post, social media, and email announcements.

arguments:
  - name: "version"
    type: "string"
    required: false
    description: "Release version (e.g., v1.0.0)"
  - name: "sprint"
    type: "string"
    required: false
    description: "Sprint to announce (e.g., sprint-5)"

agent: "crafting-narratives"
agent_path: ".claude/skills/crafting-narratives"

context_files:
  - path: "gtm-grimoire/strategy/positioning.md"
    required: false
  - path: "gtm-grimoire/context/product-reality.md"
    required: false
  - path: "CHANGELOG.md"
    required: false
  - path: "RELEASE_NOTES.md"
    required: false

pre_flight:
  - check: "file_exists"
    path: ".loa-setup-complete"
    error: "Loa setup has not been completed. Run /setup first."

  - check: "dir_exists"
    path: "gtm-grimoire"
    error: "GTM Collective not installed. Run mount-gtm.sh first."

outputs:
  - path: "gtm-grimoire/execution/release-announcement.md"
    type: "file"
    description: "Complete release announcement content"

mode:
  default: "foreground"
  background: false
---

# Announce Release

## Purpose

Generate professional release announcement content for multiple channels.
Uses positioning strategy to ensure messaging consistency.

## Invocation

```
/announce-release
/announce-release v1.0.0
/announce-release sprint-5
```

## When to Use

- After sprint marked COMPLETED
- After version release cut
- When launching new features
- For major announcements

## Agent

This command routes to the `crafting-narratives` skill for content generation.

## Workflow

### Step 1: Gather Release Context

Identify what's being released:

**From arguments**:
- Version number (if provided)
- Sprint ID (if provided)

**From files**:
- `CHANGELOG.md` - Version history
- `RELEASE_NOTES.md` - Detailed release notes
- `loa-grimoire/a2a/{sprint}/reviewer.md` - Sprint implementation report
- `loa-grimoire/a2a/{sprint}/COMPLETED` - Sprint completion marker

### Step 2: Load Positioning Context

Read GTM strategy for messaging alignment:
- `gtm-grimoire/strategy/positioning.md` - Positioning framework
- `gtm-grimoire/context/product-reality.md` - Grounding document
- `gtm-grimoire/research/icp-profiles.md` - Target audience

### Step 3: Extract Key Changes

From release notes/sprint report, identify:
- New features (user-facing changes)
- Improvements (enhancements to existing)
- Bug fixes (if significant)
- Breaking changes (if any)

Categorize by:
- Impact level (major/minor/patch)
- ICP relevance (which audiences care)
- Positioning alignment (which claims supported)

### Step 4: Generate Announcement Content

Create `gtm-grimoire/execution/release-announcement.md`:

```markdown
# Release Announcement: [Version/Sprint]

**Release**: [version or sprint ID]
**Date**: YYYY-MM-DD
**Type**: [Major Release / Feature Update / Maintenance]

---

## Blog Post Draft

### Title Options

1. [Option 1 - benefit-focused]
2. [Option 2 - feature-focused]
3. [Option 3 - audience-focused]

### Blog Content

**Headline**: [Compelling headline]

**Subheadline**: [Supporting context]

**Opening Paragraph**:
[Hook that connects to reader pain point, introduces the release]

**What's New**:

#### [Feature/Change 1]
[Description focused on user benefit, not technical details]
[Example or use case]

#### [Feature/Change 2]
[Description focused on user benefit]
[Example or use case]

**Why This Matters**:
[Connect to broader positioning, value proposition]

**Getting Started**:
[Clear CTA - how to access the new features]

**What's Next**:
[Brief preview of roadmap without overpromising]

**Closing**:
[Thank community, invite feedback]

---

## Social Media Posts

### Twitter/X Thread

**Tweet 1 (Announcement)**:
[Emoji] [Product] [Version] is here!

[Key benefit in <200 chars]

Thread [arrow]

**Tweet 2 (Feature 1)**:
[Feature highlight with benefit]

**Tweet 3 (Feature 2)**:
[Feature highlight with benefit]

**Tweet 4 (CTA)**:
[Link to blog/docs/try it]

### LinkedIn Post

[Professional tone, ~150 words]
- Opening hook
- Key value delivered
- Brief feature highlights
- Call to action
- Relevant hashtags

### Discord/Community Post

[Casual tone, emoji-friendly]
- Excitement opener
- Feature bullets
- Link to full release notes
- Invite for feedback

---

## Email Announcement

### Subject Line Options

1. [Option 1]
2. [Option 2]
3. [Option 3]

### Email Body

**Preview Text**: [40-90 chars for email preview]

---

Hi [First Name],

[Personal opening - 1 sentence]

**[Product] [Version] is now available** with [key benefit summary].

**What's new:**

- **[Feature 1]**: [Benefit-focused description]
- **[Feature 2]**: [Benefit-focused description]
- **[Feature 3]**: [Benefit-focused description]

[Optional: Screenshot or GIF placeholder]

**Get started now**: [CTA button text] → [Link]

[Optional: Quick tip for existing users]

Questions? Reply to this email or join us in [community channel].

[Signature]

---

## Developer Changelog Entry

For technical documentation:

```
## [Version] - YYYY-MM-DD

### Added
- [Feature 1] (#PR)
- [Feature 2] (#PR)

### Changed
- [Change 1] (#PR)

### Fixed
- [Fix 1] (#PR)

### Breaking Changes
- [If any]
```

---

## Asset Checklist

- [ ] Blog post published
- [ ] Social media scheduled
- [ ] Email sent to list
- [ ] Changelog updated
- [ ] Community notified
- [ ] Documentation updated

---

## Positioning Alignment Check

| Content Element | Aligned With |
|-----------------|--------------|
| Headlines | [Positioning pillar] |
| Feature descriptions | [Value prop] |
| CTAs | [ICP journey stage] |

**Grounding Ratio**: All claims verified against product-reality.md

---
*Generated via /announce-release*
*Review before publishing*
```

### Step 5: Grounding Verification

Before finalizing:
- Verify all feature claims against product-reality.md
- Ensure no capabilities are overstated
- Check that benefits are achievable with current state
- Flag any [PROJECTION] content clearly

## Output Summary

After generation:
- Complete blog post draft
- Social media content for 3+ platforms
- Email announcement template
- Developer changelog entry
- Asset checklist for launch

## Next Steps

After announcement generated:
- Review and edit content for brand voice
- Get stakeholder approval
- Schedule social media posts
- Send email announcement
- Update public documentation
