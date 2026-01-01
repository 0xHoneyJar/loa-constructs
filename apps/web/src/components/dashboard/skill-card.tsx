/**
 * Skill Card Component (TUI Style)
 * @see sprint.md T19.7: Redesign Skill Card Component
 */

'use client';

import Link from 'next/link';

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  version: string;
  rating: number;
  downloads: number;
  author: string;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  tags: string[];
  icon?: string;
}

interface SkillCardProps {
  skill: Skill;
  className?: string;
  focused?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

const tierColors: Record<string, string> = {
  free: 'var(--fg-dim)',
  pro: 'var(--accent)',
  team: 'var(--cyan)',
  enterprise: 'var(--yellow)',
};

/**
 * TUI-styled skill card - appears as a list item row
 */
export function SkillCard({ skill, className, focused = false, onClick, onMouseEnter }: SkillCardProps) {
  const tierColor = tierColors[skill.tier] || tierColors.free;

  return (
    <Link
      href={`/skills/${skill.slug}`}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={onMouseEnter}
      className={className}
      style={{
        display: 'block',
        padding: '8px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border)',
        background: focused ? 'rgba(95, 175, 255, 0.1)' : 'transparent',
        textDecoration: 'none',
        transition: 'background 0.1s',
      }}
    >
      {/* Header row: indicator, name, version, category, tier badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {/* Focus indicator */}
        <span
          style={{
            color: focused ? 'var(--accent)' : 'var(--fg-dim)',
            width: '16px',
          }}
        >
          {focused ? '→' : ' '}
        </span>

        {/* Skill name */}
        <span style={{ color: 'var(--fg-bright)', fontWeight: 500 }}>{skill.name}</span>

        {/* Version */}
        <span style={{ color: 'var(--green)', fontSize: '11px' }}>v{skill.version}</span>

        {/* Category tag */}
        <span
          style={{
            color: 'var(--cyan)',
            fontSize: '11px',
          }}
        >
          [{skill.category}]
        </span>

        {/* Tier badge (only if not free) */}
        {skill.tier !== 'free' && (
          <span
            style={{
              color: tierColor,
              fontSize: '10px',
              padding: '1px 4px',
              border: `1px solid ${tierColor}`,
              textTransform: 'uppercase',
            }}
          >
            {skill.tier}
          </span>
        )}

        {/* Spacer */}
        <span style={{ flex: 1 }} />

        {/* Download count */}
        <span style={{ color: 'var(--fg-dim)', fontSize: '12px' }}>
          {skill.downloads.toLocaleString()} DL
        </span>
      </div>

      {/* Description row */}
      <div
        style={{
          marginTop: '4px',
          marginLeft: '24px',
          color: 'var(--fg-dim)',
          fontSize: '12px',
          lineHeight: '1.4',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {skill.description}
      </div>

      {/* Author row */}
      <div
        style={{
          marginTop: '2px',
          marginLeft: '24px',
          color: 'var(--fg-dim)',
          fontSize: '11px',
        }}
      >
        by {skill.author}
      </div>
    </Link>
  );
}

/**
 * Helper to convert skills array to TuiList items format
 */
export function skillsToListItems(skills: Skill[]) {
  return skills.map((skill) => ({
    id: skill.id,
    title: skill.name,
    meta: `${skill.downloads.toLocaleString()} DL`,
    description: skill.description,
    category: skill.category,
    badge: skill.tier !== 'free' ? skill.tier.toUpperCase() : undefined,
    badgeColor: tierColors[skill.tier],
    href: `/skills/${skill.slug}`,
  }));
}

export default SkillCard;
