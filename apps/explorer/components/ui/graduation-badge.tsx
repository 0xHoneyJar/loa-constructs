import type { GraduationLevel } from '@/lib/types/graph';

interface GraduationBadgeProps {
  level: GraduationLevel;
  showStable?: boolean;
}

const LEVEL_LABELS: Record<GraduationLevel, string> = {
  experimental: 'EXP',
  beta: 'BETA',
  stable: 'STABLE',
  deprecated: 'DEPR',
};

const LEVEL_STYLES: Record<GraduationLevel, { color: string; border: string; outline: string; opacity: number }> = {
  experimental: { color: 'var(--graduation-experimental)', border: 'var(--graduation-experimental)', outline: 'dashed', opacity: 1 },
  beta: { color: 'var(--graduation-beta)', border: 'var(--graduation-beta)', outline: 'dotted', opacity: 1 },
  stable: { color: 'var(--graduation-stable)', border: 'var(--graduation-stable)', outline: 'solid', opacity: 1 },
  deprecated: { color: 'var(--graduation-deprecated)', border: 'var(--graduation-deprecated)', outline: 'solid', opacity: 0.5 },
};

export function GraduationBadge({ level, showStable = false }: GraduationBadgeProps) {
  // Don't show badge for stable unless explicitly requested
  if (level === 'stable' && !showStable) {
    return null;
  }

  const styles = LEVEL_STYLES[level] ?? LEVEL_STYLES.stable;

  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 font-mono text-xs uppercase tracking-terminal"
      style={{
        color: styles.color,
        borderWidth: 1,
        borderStyle: styles.outline,
        borderColor: styles.border,
        opacity: styles.opacity,
      }}
    >
      {LEVEL_LABELS[level]}
    </span>
  );
}
