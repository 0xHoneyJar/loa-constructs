import { getGraduationConfig } from '@/lib/utils/colors';
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

export function GraduationBadge({ level, showStable = false }: GraduationBadgeProps) {
  // Don't show badge for stable unless explicitly requested
  if (level === 'stable' && !showStable) {
    return null;
  }

  const config = getGraduationConfig(level);

  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider"
      style={{
        color: config.text,
        borderWidth: 1,
        borderStyle: config.outline,
        borderColor: config.badge,
        opacity: config.opacity,
      }}
    >
      {LEVEL_LABELS[level]}
    </span>
  );
}
