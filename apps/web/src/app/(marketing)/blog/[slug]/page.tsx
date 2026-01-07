/**
 * Blog Post Detail Page
 * Individual blog post display
 * @see sprint.md T26.11: Create Launch Announcement Blog Post
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiDim, TuiTag, TuiCode } from '@/components/tui/tui-text';

// Blog post content - in production, this would come from MDX/CMS
const postsData: Record<string, {
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
  content: string;
}> = {
  launch: {
    title: 'Introducing Loa Constructs: Skill Packs for Claude Code',
    excerpt: 'We built Loa because AI is great at writing code, but shipping products requires so much more.',
    date: '2026-01-08',
    author: 'The Honey Jar',
    category: 'Announcement',
    content: `We're excited to announce the launch of Loa Constructs—the skill pack registry for Claude Code.

## The Problem

AI coding assistants are incredibly powerful. They can write functions, debug code, refactor files. But shipping a product requires so much more than code.

You need market research. Positioning strategy. Pricing models. Security audits. Documentation. Deployment configurations.

Every time we started a new project, we'd spend days—sometimes weeks—recreating the same workflows:

- Prompting ChatGPT for market analysis, then losing the conversation
- Copy-pasting security checklists that never got updated
- Writing deployment scripts differently every single project

We realized we weren't just missing code templates. We were missing **agent workflows**—complete methodologies with feedback loops, quality gates, and managed state.

## The Solution

Loa Constructs provides pre-built skill packs that encode expert knowledge into reusable agent workflows for Claude Code.

**One command to install:**

\`\`\`bash
$ claude skills add gtm-collective
\`\`\`

**Slash commands to run:**

\`\`\`
/gtm-setup        → Initialize GTM workflow
/analyze-market   → Research market, competitors, ICPs
/position         → Define positioning and messaging
/price            → Develop pricing strategy
/plan-launch      → Create launch timeline
/review-gtm       → Comprehensive strategy review
\`\`\`

Each workflow maintains state, enforces quality gates, and produces artifacts you can actually use.

## What's Available at Launch

**GTM Collective** (Premium) - Complete go-to-market workflow with 14 commands covering market analysis, positioning, pricing, launch planning, and more.

**Security Audit** (Premium) - OWASP compliance checking, dependency scanning, authentication review, and security reports.

**Docs Generator** (Free) - Automated README generation, API docs, architecture decision records.

Plus community packs for deployment, code review, and testing.

## Creator Economics

We believe great workflows come from practitioners who've done the work. That's why we offer **70% revenue share** to pack creators.

If you've developed methodologies that work, you can turn them into sustainable revenue. Monthly payouts via Stripe Connect with transparent attribution.

## Get Started

**Free tier** gives you access to public packs, 3 API keys, and community support—forever free.

**Pro ($29/mo)** unlocks all premium packs plus creator features.

Install your first pack in 30 seconds:

\`\`\`bash
$ claude skills add gtm-collective
\`\`\`

## What's Next

We're just getting started. On the roadmap:

- More packs from expert practitioners
- Team collaboration features
- Custom pack development for enterprises
- Enhanced analytics and usage insights

We built Loa because we needed it ourselves. If you ship products with Claude Code, we think you'll find it valuable too.

Questions? Join our [Discord](https://discord.gg/thehoneyjar) or [open an issue](https://github.com/0xHoneyJar/loa/issues) on GitHub.

Let's ship some products.

— The Honey Jar team`,
  },
  'gtm-workflow': {
    title: 'How We Use GTM Collective to Ship Products',
    excerpt: 'A deep dive into the GTM Collective workflow—the same process we used to plan and launch Loa Constructs.',
    date: '2026-01-08',
    author: 'The Honey Jar',
    category: 'Tutorial',
    content: `GTM Collective is our flagship skill pack, and we used it to plan and launch this very product. Here's a look inside the workflow.

## The GTM Problem

Most developers know how to code. Few know how to take a product to market.

Traditional GTM consulting costs $10,000-50,000+. AI tools give generic advice without understanding your specific product. And DIY approaches mean reinventing the wheel every time.

GTM Collective encodes battle-tested GTM methodology into an agent workflow you can run in minutes.

## The Workflow

### Step 1: Initialize (/gtm-setup)

The workflow starts by creating your "grimoire"—a structured directory that holds all GTM artifacts:

\`\`\`
gtm-grimoire/
├── discovery/         # Market research outputs
├── strategy/          # Positioning, pricing, competitive
├── execution/         # Launch plans, content calendars
└── grimoire.yaml      # Workflow state
\`\`\`

### Step 2: Analyze Market (/analyze-market)

The agent researches your market using web search, competitive analysis, and ICP development:

- TAM/SAM/SOM sizing
- Competitor landscape mapping
- Buyer persona development
- Market trend identification

Output: \`discovery/market-analysis.md\`

### Step 3: Define Positioning (/position)

Based on market research, the agent develops your positioning:

- Category definition
- Competitive frame
- Key differentiators
- Messaging framework

Output: \`strategy/positioning-strategy.md\`

### Step 4: Develop Pricing (/price)

The agent creates pricing strategy grounded in market research:

- Tier structure
- Feature-value mapping
- Psychological pricing
- Competitive positioning

Output: \`strategy/pricing-strategy.md\`

### Step 5: Plan Launch (/plan-launch)

Execution planning with timelines and content calendars:

- Phase breakdown
- Content requirements
- Channel priorities
- Success metrics

Output: \`execution/launch-plan.md\`

### Step 6: Review (/review-gtm)

Comprehensive review with consistency checks:

- Pricing/positioning alignment
- Market/ICP coherence
- Competitive gaps
- Execution feasibility

Output: Final verdict (APPROVED or CHANGES_REQUIRED)

## Real Results

We used this exact workflow for Loa Constructs. The entire GTM strategy—from market analysis to launch plan—took about 2 hours of actual work time.

The artifacts are living documents. As we learn from the market, we update the grimoire and let the agent help refine our strategy.

## Try It Yourself

\`\`\`bash
$ claude skills add gtm-collective
$ /gtm-setup
\`\`\`

Your first GTM strategy is 30 minutes away.

— The Honey Jar team`,
  },
  'creator-economics': {
    title: 'Why We Chose 70% Revenue Share',
    excerpt: 'The reasoning behind our creator-first economics and how sustainable incentives create better workflows.',
    date: '2026-01-08',
    author: 'The Honey Jar',
    category: 'Philosophy',
    content: `When we designed the creator program for Loa Constructs, we had to answer a fundamental question: What's the right revenue split?

## The Industry Standard

Most marketplaces take 30-50%:
- Apple App Store: 30%
- Gumroad: 10% (now 10% flat)
- Substack: 10%
- Udemy: 50-75% (varies)

We landed on **70% to creators, 30% to platform**.

## Why 70%?

### 1. Creators do the hard work

Building a good skill pack requires real expertise. You can't fake your way through a GTM workflow or security audit. The value comes from practitioners who've done the work.

We're providing distribution and infrastructure. Creators are providing knowledge and methodology.

### 2. Sustainable incentives matter

We want creators to build their best work on our platform. If the economics don't work for them, they'll build elsewhere—or not build at all.

70% means a creator with 1,000 Pro subscribers using their pack earns meaningful revenue. That's motivation to keep improving.

### 3. We're not a commodity marketplace

Loa packs aren't commodities. They're methodologies. Each one is unique. We curate rather than aggregate.

High creator share filters for quality. Serious practitioners build here. Hobbyists go elsewhere.

## How Attribution Works

When a Pro subscriber installs and uses your pack, you earn a proportional share of their subscription fee.

**Example:**
- User pays $29/mo for Pro
- User installs 3 packs (yours + 2 others)
- Your pack earns ~$9.67/mo from that user (70% of their fair share)

Attribution is transparent. You can see exactly which users contribute to your earnings.

## Monthly Payouts

Payouts happen monthly via Stripe Connect:
- $50 minimum threshold
- Direct deposit to your bank
- Full transaction history

No invoicing, no chasing payments, no platform risk.

## For Creators, By Creators

We're building the creator economy we want to participate in ourselves. GTM Collective is our own pack—we eat our own cooking.

If you've developed methodologies that work, we'd love to have you.

**Apply to become a creator:** [Register](/register)

— The Honey Jar team`,
  },
};

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const post = postsData[resolvedParams.slug];

  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const post = postsData[resolvedParams.slug];

  if (!post) {
    notFound();
  }

  // Simple markdown-like rendering (in production, use MDX)
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let inCodeBlock = false;
    let codeContent = '';
    let codeLanguage = '';

    lines.forEach((line, index) => {
      // Code block handling
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.slice(3);
          codeContent = '';
        } else {
          elements.push(
            <TuiCode key={index} copyable style={{ display: 'block', marginBottom: '16px' }}>
              {codeContent.trim()}
            </TuiCode>
          );
          inCodeBlock = false;
          codeContent = '';
        }
        return;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        return;
      }

      // Headers
      if (line.startsWith('## ')) {
        elements.push(
          <h2
            key={index}
            style={{
              color: 'var(--fg-bright)',
              fontSize: '18px',
              fontWeight: 600,
              marginTop: '32px',
              marginBottom: '16px',
            }}
          >
            {line.slice(3)}
          </h2>
        );
        return;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3
            key={index}
            style={{
              color: 'var(--fg-bright)',
              fontSize: '15px',
              fontWeight: 600,
              marginTop: '24px',
              marginBottom: '12px',
            }}
          >
            {line.slice(4)}
          </h3>
        );
        return;
      }

      // List items
      if (line.startsWith('- ')) {
        elements.push(
          <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', paddingLeft: '16px' }}>
            <span style={{ color: 'var(--green)' }}>-</span>
            <span style={{ color: 'var(--fg)' }}>{line.slice(2)}</span>
          </div>
        );
        return;
      }

      // Empty lines
      if (line.trim() === '') {
        elements.push(<div key={index} style={{ height: '16px' }} />);
        return;
      }

      // Regular paragraphs (handle inline code and links)
      let processedLine = line;
      // Inline code
      processedLine = processedLine.replace(
        /`([^`]+)`/g,
        '<code style="background: rgba(255,255,255,0.1); padding: 2px 6px; color: var(--green);">$1</code>'
      );
      // Bold
      processedLine = processedLine.replace(
        /\*\*([^*]+)\*\*/g,
        '<strong style="color: var(--fg-bright);">$1</strong>'
      );
      // Links
      processedLine = processedLine.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" style="color: var(--accent); text-decoration: underline;">$1</a>'
      );

      elements.push(
        <p
          key={index}
          style={{ color: 'var(--fg)', marginBottom: '16px', lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    });

    return elements;
  };

  return (
    <>
      {/* Header */}
      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div style={{ marginBottom: '24px', fontSize: '13px' }}>
            <Link href="/blog" style={{ color: 'var(--fg-dim)', textDecoration: 'none' }}>
              Blog
            </Link>
            <span style={{ color: 'var(--fg-dim)', margin: '0 8px' }}>/</span>
            <span style={{ color: 'var(--fg)' }}>{post.title.slice(0, 30)}...</span>
          </div>

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <TuiTag color="accent">{post.category}</TuiTag>
            <TuiDim style={{ fontSize: '13px' }}>{formatDate(post.date)}</TuiDim>
            <TuiDim style={{ fontSize: '13px' }}>by {post.author}</TuiDim>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 700,
              color: 'var(--fg-bright)',
              lineHeight: 1.3,
              marginBottom: '16px',
            }}
          >
            {post.title}
          </h1>

          {/* Excerpt */}
          <TuiDim style={{ fontSize: '16px', lineHeight: 1.6, display: 'block' }}>
            {post.excerpt}
          </TuiDim>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: '0 24px 64px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <TuiBox>
            <div style={{ fontSize: '14px' }}>{renderContent(post.content)}</div>
          </TuiBox>
        </div>
      </section>

      {/* Navigation */}
      <section
        style={{
          padding: '48px 24px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <Link href="/blog">
            <TuiButton variant="secondary">← Back to Blog</TuiButton>
          </Link>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/register">
              <TuiButton>Get Started</TuiButton>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
