'use client';

import { useEffect, useState } from 'react';
import { useGraphStore } from '@/lib/stores/graph-store';
import { getCategoryColor } from '@/lib/utils/colors';
import type { ConstructNode } from '@/lib/types/graph';

interface CanvasTooltipProps {
  nodes: ConstructNode[];
}

export function CanvasTooltip({ nodes }: CanvasTooltipProps) {
  const hoveredNodeId = useGraphStore((s) => s.hoveredNodeId);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const node = nodes.find((n) => n.id === hoveredNodeId);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX + 16, y: e.clientY - 8 });
    };

    if (hoveredNodeId) {
      window.addEventListener('mousemove', onMove);
      setVisible(true);
    } else {
      setVisible(false);
    }

    return () => window.removeEventListener('mousemove', onMove);
  }, [hoveredNodeId]);

  if (!visible || !node) return null;

  const color = getCategoryColor(node.category);
  const composesWith = node.composesWith ?? [];

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[9999] max-w-xs"
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="bg-void-raised border px-3.5 py-3"
        style={{ borderColor: color, borderTopWidth: 2 }}
      >
        {/* Name */}
        <p className="font-mono text-sm text-bone-bright uppercase tracking-wider">
          {node.name}
        </p>

        {/* Description */}
        <p className="font-mono text-xs text-bone-dim mt-1 leading-relaxed">
          {node.shortDescription || node.description}
        </p>

        {/* Category + version */}
        <div className="flex items-center gap-2 mt-2 font-mono text-[10px] uppercase tracking-wider">
          <span style={{ color }}>{node.category}</span>
          <span className="text-bone-ghost">·</span>
          <span className="text-bone-ghost">v{node.version}</span>
        </div>

        {/* Capabilities */}
        <div className="flex items-center gap-3 mt-1.5 font-mono text-[10px] text-bone-ghost">
          {node.skillsCount > 0 && <span>{node.skillsCount} skills</span>}
          {node.commandCount > 0 && <span>{node.commandCount} commands</span>}
        </div>

        {/* Composes with */}
        {composesWith.length > 0 && (
          <div className="mt-2 font-mono text-[10px] text-bone-ghost">
            <span className="uppercase tracking-wider">Composes with </span>
            <span className="text-bone-muted">
              {composesWith.slice(0, 4).join(', ')}
              {composesWith.length > 4 && ` +${composesWith.length - 4}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
