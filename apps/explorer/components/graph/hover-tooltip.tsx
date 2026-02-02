'use client';

import { useEffect, useState } from 'react';
import { useGraphStore } from '@/lib/stores/graph-store';
import { Badge } from '@/components/ui/badge';
import { GraduationBadge } from '@/components/ui/graduation-badge';
import { getCategoryColor } from '@/lib/utils/colors';
import type { ConstructNode } from '@/lib/types/graph';

interface HoverTooltipProps {
  nodes: ConstructNode[];
}

export function HoverTooltip({ nodes }: HoverTooltipProps) {
  const { hoveredNodeId } = useGraphStore();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const node = nodes.find((n) => n.id === hoveredNodeId);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX + 16, y: e.clientY + 16 });
    };

    if (hoveredNodeId) {
      window.addEventListener('mousemove', handleMouseMove);
      setVisible(true);
    } else {
      setVisible(false);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [hoveredNodeId]);

  if (!visible || !node) return null;

  return (
    <div
      className="pointer-events-none fixed max-w-xs rounded-lg border border-white/10 bg-surface/95 p-3 shadow-xl backdrop-blur-sm"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateY(-50%)',
        zIndex: 9999,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Badge
          style={{
            backgroundColor: `${getCategoryColor(node.category)}20`,
            borderColor: `${getCategoryColor(node.category)}40`,
            color: getCategoryColor(node.category),
          }}
        >
          {node.type}
        </Badge>
        <GraduationBadge level={node.graduationLevel} />
        <span className="font-mono text-xs text-white/40">v{node.version}</span>
      </div>

      <h3 className="mb-1 font-mono text-sm font-medium text-white">
        {node.name}
      </h3>

      <p className="mb-2 text-xs leading-relaxed text-white/60">
        {node.shortDescription}
      </p>

      <div className="flex items-center gap-3 font-mono text-xs text-white/40">
        <span>{node.commandCount} commands</span>
        <span>{node.downloads.toLocaleString()} downloads</span>
      </div>
    </div>
  );
}
