# Product Brief: Loa Registry

## Product Overview

**Loa Constructs** is a skill pack registry for AI agents—specifically designed for Claude Code users. It provides pre-built, production-ready agent workflows (called "skills") that developers can install via CLI to extend their AI coding assistant's capabilities.

### What It Does
- **Skill Pack Registry**: Marketplace for downloadable agent skill packs
- **CLI Installation**: `loa pack-install <pack-name>` adds skills directly to Claude Code
- **Subscription Tiers**: Free tier + Pro ($29/mo) for premium packs
- **Multi-Domain Skills**: Not just coding—GTM, documentation, security auditing, deployment

### What Problem It Solves
Developers using Claude Code have to:
1. Build custom prompts/workflows from scratch
2. Manage complex multi-step agent instructions manually
3. Lack structured methodology for non-code tasks (GTM, docs, etc.)

Loa Constructs provides ready-to-use, expert-designed agent workflows that turn Claude Code into a full product development platform.

### Unique Value Proposition
"Pre-built agent skills that extend Claude Code beyond coding—into GTM, docs, and strategy."

---

## Target Market

### Primary Audience
- **Solo developers and founders** building products with AI agents
- **Dev teams at startups** (2-20 people) looking to move faster

### Company Size
- Indie/Solo developers
- Early-stage startups (1-50 employees)

### User Profile
- Technical founders who code
- Developers who use Claude Code daily
- Teams adopting AI-assisted development
- Power users seeking structured agent workflows

---

## Competitive Landscape

### Current Alternatives
| Alternative | Gap Loa Constructs Fills |
|-------------|-------------------------|
| Custom prompts/workflows | No structure, no version control, hard to share |
| Cursor/other AI IDEs | Limited to code completion, no multi-step workflows |
| Traditional dev tools | No AI augmentation |
| MCP servers | Infrastructure-focused, not workflow-focused |

### Primary Differentiation
1. **Pre-built agent workflows**: Ready-to-use multi-step skills (not just prompts)
2. **Beyond code**: GTM, documentation, security, deployment skills
3. **Managed framework**: AWS Projen-style scaffolding that maintains consistency
4. **Subscription model**: Sustainable business with free tier for adoption

### Key Competitors to Watch
- Anthropic's own Claude Code extensions (if any)
- Cursor's custom rules/workflows
- GitHub Copilot extensions
- Generic prompt marketplaces

---

## Constraints

### Timeline
- **Target Launch**: This month (January 2026)
- **Current Status**: Core infrastructure complete, GTM Collective pack ready

### Budget
- **Marketing Budget**: Bootstrapped ($0-1K)
- **Strategy**: Organic growth, community-first, content marketing

### Team
- Small team (presumed 1-3 people based on bootstrapped status)
- Focus on technical content and developer relations

---

## Launch Goals

### Primary Objectives
1. **Community Building**: Establish presence in Claude Code / AI developer community
2. **User Acquisition**: Drive registrations to validate product-market fit

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Registered users | 100+ | Account signups |
| Paid subscribers | 10+ | Pro tier conversions |
| Organic reach | TBD | Twitter/X followers, GitHub stars |

### Secondary Goals
- Validate pricing ($29/mo Pro tier)
- Gather feedback for roadmap prioritization
- Establish "Loa" brand in AI tooling space

---

## Technical Reality

Based on existing PRD/SDD:

### Current Infrastructure
- **API**: Hono-based REST API on Fly.io
- **Database**: PostgreSQL (Neon)
- **Storage**: Cloudflare R2 for pack files
- **CLI**: `loa-registry` npm package with `pack-install` command
- **Auth**: JWT-based with subscription tier checking

### First Premium Pack
**GTM Collective** - 8 skills, 14 commands for go-to-market strategy:
- Market analysis
- Positioning
- Pricing strategy
- Launch planning
- DevRel strategy
- Partnership planning
- Executive communication
- GTM review

### Pricing Structure
- **Free**: Basic access (TBD what's included)
- **Pro**: $29/month - Access to premium packs like GTM Collective
- **Team**: $99/month - Multi-user features (future)

---

## Website Content Needs

### Sections Needed
1. **Hero**: Clear value prop for Claude Code users
2. **How It Works**: CLI installation flow
3. **Packs Catalog**: Available skills with descriptions
4. **Pricing**: Free vs Pro comparison
5. **Documentation**: Installation, usage guides

### Messaging Pillars
1. "Extend Claude Code beyond coding"
2. "Install production-ready agent skills in seconds"
3. "Built by developers, for developers"

---

*Created via /gtm-setup on 2026-01-03*
*Updated on 2026-01-03 with website content focus*

---

## GTM Priority: Website Content

**Primary need identified**: Website copy that speaks authentically to developers

**Content requirements**:
- No marketing fluff - developers see through it instantly
- Clear value prop: "Full lifecycle orchestration, not just code completion"
- Show don't tell: CLI examples, workflow demos
- Bootstrap-friendly: Content marketing > paid ads

**Recommended next step**: `/translate` to generate audience-specific copy
