/**
 * Skill Detail Page (TUI Style)
 * @see sprint.md T20.2: Redesign Skill Detail Page
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiH1, TuiH2, TuiDim, TuiCode, TuiTag, TuiSuccess, TuiBright } from '@/components/tui/tui-text';
import { TuiButton, TuiIconButton } from '@/components/tui/tui-button';

// Mock skill data - in production would fetch by slug
const mockSkillDetails = {
  id: '1',
  name: 'Code Review',
  slug: 'code-review',
  description:
    'Automated code review with AI-powered suggestions for best practices, security issues, and performance improvements. This skill analyzes your code changes and provides actionable feedback to improve code quality.',
  category: 'development',
  version: '2.1.0',
  rating: 4.8,
  reviewCount: 156,
  downloads: 12500,
  author: 'Loa Team',
  tier: 'free',
  tags: ['ai', 'code-quality', 'review', 'automation'],
  icon: '🔍',
  createdAt: '2024-06-15',
  updatedAt: '2024-12-28',
  versions: [
    { version: '2.1.0', date: '2024-12-28', changes: 'Added support for TypeScript 5.3' },
    { version: '2.0.0', date: '2024-11-15', changes: 'Major rewrite with improved AI model' },
    { version: '1.5.2', date: '2024-09-20', changes: 'Bug fixes and performance improvements' },
    { version: '1.5.0', date: '2024-08-10', changes: 'Added custom rule support' },
  ],
  features: [
    'Automatic pull request reviews',
    'Inline suggestions with explanations',
    'Custom rule configuration',
    'Integration with CI/CD pipelines',
    'Support for 20+ programming languages',
  ],
  requirements: [
    'Loa CLI v1.0 or higher',
    'Valid API key',
    'Git repository',
  ],
};

const tierColors: Record<string, string> = {
  free: 'var(--fg-dim)',
  pro: 'var(--accent)',
  team: 'var(--cyan)',
  enterprise: 'var(--yellow)',
};

export default function SkillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [copied, setCopied] = useState(false);

  // In production, fetch skill by slug
  const skill = mockSkillDetails;
  const installCommand = `loa skill install ${slug}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [installCommand]);

  // Keyboard navigation - q or Escape to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'q' || e.key === 'Escape') {
        e.preventDefault();
        router.push('/skills');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const tierColor = tierColors[skill.tier] || tierColors.free;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Back link */}
      <div>
        <Link
          href="/skills"
          style={{
            color: 'var(--cyan)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          ← Back to Skills <TuiDim>(q)</TuiDim>
        </Link>
      </div>

      {/* Header Section */}
      <TuiBox title="Skill">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <TuiH1 cursor>{skill.name}</TuiH1>
            <TuiTag color="green">v{skill.version}</TuiTag>
            <span style={{ color: 'var(--cyan)' }}>[{skill.category}]</span>
            {skill.tier !== 'free' && (
              <span style={{
                color: tierColor,
                fontSize: '10px',
                padding: '1px 4px',
                border: `1px solid ${tierColor}`,
                textTransform: 'uppercase',
              }}>
                {skill.tier}
              </span>
            )}
          </div>

          {/* Status table */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '8px',
          }}>
            <div>
              <TuiDim>Author</TuiDim>
              <div style={{ color: 'var(--fg-bright)' }}>{skill.author}</div>
            </div>
            <div>
              <TuiDim>Rating</TuiDim>
              <div style={{ color: 'var(--yellow)' }}>★ {skill.rating} ({skill.reviewCount})</div>
            </div>
            <div>
              <TuiDim>Downloads</TuiDim>
              <div style={{ color: 'var(--fg-bright)' }}>{skill.downloads.toLocaleString()}</div>
            </div>
            <div>
              <TuiDim>Updated</TuiDim>
              <div style={{ color: 'var(--fg-bright)' }}>{skill.updatedAt}</div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginTop: '8px' }}>
            <TuiDim>{skill.description}</TuiDim>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {skill.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  color: 'var(--cyan)',
                  fontSize: '12px',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </TuiBox>

      {/* Install Command */}
      <TuiBox title="Install">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <TuiDim>Run this command to install:</TuiDim>
          <TuiCode copyable onCopy={handleCopy}>
            <span style={{ color: 'var(--fg-dim)' }}>$</span> {installCommand}
          </TuiCode>
          <div style={{ display: 'flex', gap: '8px' }}>
            <TuiButton onClick={handleCopy}>
              {copied ? '✓ Copied' : 'Copy Command'}
            </TuiButton>
            {skill.tier !== 'free' && (
              <TuiButton variant="secondary" onClick={() => router.push('/billing')}>
                Upgrade to {skill.tier}
              </TuiButton>
            )}
          </div>
        </div>
      </TuiBox>

      {/* Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '12px',
        flex: 1,
        minHeight: 0,
      }}>
        {/* Features */}
        <TuiBox title="Features">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {skill.features.map((feature, idx) => (
              <li
                key={idx}
                style={{
                  padding: '4px 0',
                  borderBottom: idx < skill.features.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <TuiSuccess>✓</TuiSuccess> {feature}
              </li>
            ))}
          </ul>
        </TuiBox>

        {/* Requirements */}
        <TuiBox title="Requirements">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {skill.requirements.map((req, idx) => (
              <li
                key={idx}
                style={{
                  padding: '4px 0',
                  borderBottom: idx < skill.requirements.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <TuiDim>•</TuiDim> {req}
              </li>
            ))}
          </ul>
        </TuiBox>
      </div>

      {/* Version History */}
      <TuiBox title="Version History">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {skill.versions.map((version, idx) => (
            <div
              key={version.version}
              style={{
                padding: '8px 0',
                borderBottom: idx < skill.versions.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TuiBright>v{version.version}</TuiBright>
                {idx === 0 && (
                  <span style={{
                    color: 'var(--green)',
                    fontSize: '10px',
                    padding: '1px 4px',
                    border: '1px solid var(--green)',
                  }}>
                    LATEST
                  </span>
                )}
                <TuiDim>— {version.date}</TuiDim>
              </div>
              <div style={{ marginTop: '4px', color: 'var(--fg)' }}>
                {version.changes}
              </div>
            </div>
          ))}
        </div>
      </TuiBox>
    </div>
  );
}
