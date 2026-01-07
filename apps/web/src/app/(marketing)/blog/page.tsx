/**
 * Blog Landing Page
 * List of blog posts
 * @see sprint.md T26.10: Create Blog Landing Page
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { TuiH2, TuiDim, TuiTag } from '@/components/tui/tui-text';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'News, updates, and insights from the Loa Constructs team.',
};

// Placeholder blog posts - in production, this would come from CMS/MDX
const posts = [
  {
    slug: 'launch',
    title: 'Introducing Loa Constructs: Skill Packs for Claude Code',
    excerpt: 'We built Loa because AI is great at writing code, but shipping products requires so much more. Today, we\'re launching the skill pack registry for Claude Code.',
    date: '2026-01-08',
    author: 'The Honey Jar',
    category: 'Announcement',
    featured: true,
  },
  {
    slug: 'gtm-workflow',
    title: 'How We Use GTM Collective to Ship Products',
    excerpt: 'A deep dive into the GTM Collective workflow—the same process we used to plan and launch Loa Constructs.',
    date: '2026-01-08',
    author: 'The Honey Jar',
    category: 'Tutorial',
    featured: false,
  },
  {
    slug: 'creator-economics',
    title: 'Why We Chose 70% Revenue Share',
    excerpt: 'The reasoning behind our creator-first economics and how sustainable incentives create better workflows.',
    date: '2026-01-08',
    author: 'The Honey Jar',
    category: 'Philosophy',
    featured: false,
  },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlogPage() {
  const featuredPost = posts.find((p) => p.featured);
  const otherPosts = posts.filter((p) => !p.featured);

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '48px 24px', textAlign: 'center' }}>
        <h1
          style={{
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: 700,
            color: 'var(--fg-bright)',
            marginBottom: '12px',
          }}
        >
          Blog
        </h1>
        <TuiDim style={{ fontSize: '15px', display: 'block', maxWidth: '500px', margin: '0 auto' }}>
          News, updates, and insights from the Loa Constructs team.
        </TuiDim>
      </section>

      {/* Featured Post */}
      {featuredPost && (
        <section style={{ padding: '0 24px 48px' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <TuiDim style={{ fontSize: '12px', marginBottom: '12px', display: 'block' }}>LATEST</TuiDim>
            <Link href={`/blog/${featuredPost.slug}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  padding: '32px',
                  border: '2px solid var(--accent)',
                  background: 'rgba(95, 175, 255, 0.05)',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <TuiTag color="accent">{featuredPost.category}</TuiTag>
                  <TuiDim style={{ fontSize: '12px' }}>{formatDate(featuredPost.date)}</TuiDim>
                </div>
                <h2
                  style={{
                    color: 'var(--fg-bright)',
                    fontWeight: 600,
                    fontSize: 'clamp(18px, 3vw, 24px)',
                    marginBottom: '12px',
                    lineHeight: 1.3,
                  }}
                >
                  {featuredPost.title}
                </h2>
                <TuiDim style={{ fontSize: '14px', marginBottom: '16px', display: 'block', lineHeight: 1.6 }}>
                  {featuredPost.excerpt}
                </TuiDim>
                <TuiDim style={{ fontSize: '12px' }}>by {featuredPost.author}</TuiDim>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Other Posts */}
      <section style={{ padding: '0 24px 64px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <TuiH2 style={{ marginBottom: '24px' }}>All Posts</TuiH2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {otherPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
                <div
                  className="tui-card-hover"
                  style={{
                    padding: '24px',
                    border: '1px solid var(--border)',
                    background: 'rgba(0, 0, 0, 0.75)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <TuiTag color="green">{post.category}</TuiTag>
                  </div>
                  <h3
                    style={{
                      color: 'var(--fg-bright)',
                      fontWeight: 600,
                      fontSize: '15px',
                      marginBottom: '8px',
                      lineHeight: 1.4,
                    }}
                  >
                    {post.title}
                  </h3>
                  <TuiDim style={{ fontSize: '13px', marginBottom: '16px', flex: 1, lineHeight: 1.5 }}>
                    {post.excerpt}
                  </TuiDim>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <TuiDim>{post.author}</TuiDim>
                    <TuiDim>{formatDate(post.date)}</TuiDim>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '64px 24px',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <TuiH2 style={{ marginBottom: '16px' }}>Stay Updated</TuiH2>
        <TuiDim style={{ marginBottom: '24px', display: 'block' }}>
          Follow us on Twitter for the latest updates and tips.
        </TuiDim>
        <a
          href="https://x.com/0xhoneyjar"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            border: '1px solid var(--accent)',
            background: 'var(--accent)',
            color: '#000',
            textDecoration: 'none',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          Follow @0xhoneyjar
        </a>
      </section>
    </>
  );
}
