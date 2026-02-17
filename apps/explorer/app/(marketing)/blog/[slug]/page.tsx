import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

// Placeholder — in production this would come from a CMS
const posts: Record<string, { title: string; content: string; date: string; author: string }> = {
  'introducing-constructs-network': {
    title: 'Introducing the Constructs Network',
    date: '2026-02-01',
    author: 'Loa Team',
    content: `The Constructs Network is the marketplace for AI agent expertise.

We believe AI agents shouldn't start from scratch every time. Constructs are preserved expertise — skills, packs, and bundles that you jack into your agent to give it capabilities without retraining.

## What are Constructs?

Constructs come in three types:

- **Skills**: Individual capabilities (e.g., code review, security auditing)
- **Packs**: Curated collections of related skills
- **Bundles**: Composable sets of packs for complete workflows

## Getting Started

Install the Loa CLI and browse the registry:

\`\`\`
loa install observer
\`\`\`

Visit the 3D graph at constructs.network to explore relationships between constructs visually.

## What's Next

We're building out creator tools, team features, and a payment system so creators can monetize their expertise. Stay tuned.`,
  },
  'building-your-first-construct': {
    title: 'Building Your First Construct',
    date: '2026-02-08',
    author: 'Loa Team',
    content: `Ready to share your AI agent expertise? Here's how to create and publish your first construct.

## Prerequisites

- Loa CLI installed
- A GitHub account
- An idea for a skill or pack

## Step 1: Create a Skill

Create a new directory with an \`index.yaml\` manifest:

\`\`\`yaml
name: my-skill
version: 1.0.0
description: A brief description of what this skill does
\`\`\`

## Step 2: Add Your Expertise

Write your SKILL.md with the prompts, instructions, and context that define your skill's expertise.

## Step 3: Publish

Use the creator dashboard at constructs.network to publish your construct to the registry.

Happy building!`,
  },
};

export function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) return { title: 'Not Found' };
  return { title: post.title, description: post.content.slice(0, 160) };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) notFound();

  return (
    <article className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-3 mb-3 text-[10px] font-mono text-white/40">
          <time>{new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>
          <span>·</span>
          <span>{post.author}</span>
        </div>
        <h1 className="text-2xl font-mono font-bold text-white">{post.title}</h1>
      </div>

      <div className="prose prose-invert prose-sm max-w-none font-mono text-white/70 [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_code]:text-green-400 [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-black/30 [&_p]:mb-4 [&_ul]:space-y-1 [&_li]:text-white/60 whitespace-pre-wrap">
        {post.content}
      </div>

      <Link href="/blog" className="text-xs font-mono text-white/40 hover:text-white/60 transition-colors block">
        ← Back to blog
      </Link>
    </article>
  );
}
