'use client';

/**
 * Edge Type Legend (cycle-051)
 * Shows all edge relationship types with matching colors.
 */

const EDGE_TYPES = [
  { label: 'Depends on', color: '#4ecdc4', dashed: false },
  { label: 'Composes with', color: '#a8e6cf', dashed: false },
  { label: 'Connected via', color: '#ffd93d', dashed: true },
  { label: 'Governs', color: '#ff6b6b', dashed: true },
] as const;

export function EdgeLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {EDGE_TYPES.map(({ label, color, dashed }) => (
        <div key={label} className="flex items-center gap-1.5">
          <svg width="20" height="8" className="shrink-0">
            <line
              x1="0"
              y1="4"
              x2="20"
              y2="4"
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray={dashed ? '4 2' : undefined}
              opacity={0.7}
            />
          </svg>
          <span className="font-mono text-[10px] text-bone-ghost uppercase tracking-wider">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
