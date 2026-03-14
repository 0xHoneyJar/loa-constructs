'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ConstructNode } from '@/lib/types/graph';
import { getCategoryColor } from '@/lib/utils/colors';

/**
 * Display name overrides — use until the canonical name is updated in the API.
 * Key: slug, Value: display name.
 */
const DISPLAY_NAMES: Record<string, string> = {
  'sigil-of-the-beacon': 'Beacon',
  'social-oracle': 'Oracle',
  'vocabulary-bank': 'Vocab Bank',
  'vfx-playbook': 'VFX',
  'gtm-collective': 'GTM',
  'webgl-particles': 'Particles',
  'mibera-codex': 'Codex',
};

function displayName(node: ConstructNode): string {
  return DISPLAY_NAMES[node.slug] ?? node.name;
}

/**
 * ConstructTile — the Lego block on the canvas.
 *
 * Progressive disclosure (TDR-002, Arcade):
 * - Tile shows: name + category color. That's the glance.
 * - Hover shows: tooltip with description, version, skills, composes-with.
 * - Click shows: full detail page.
 */
function ConstructTileComponent(props: NodeProps) {
  const data = props.data as unknown as ConstructNode;
  const selected = props.selected;
  const color = getCategoryColor(data.category);
  const name = displayName(data);

  return (
    <>
      {/* @ts-ignore React 19 type mismatch with xyflow memo components */}
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      {/* @ts-ignore React 19 type mismatch with xyflow memo components */}
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />

      <div
        className="w-[120px] h-[80px] bg-void-raised flex flex-col justify-end transition-[border-color,box-shadow] duration-150"
        style={{
          border: `1.5px solid ${color}`,
          borderTopWidth: 3,
          boxShadow: selected ? `0 0 0 1px ${color}` : undefined,
        }}
      >
        {/* Mark */}
        <div
          className="w-1.5 h-1.5 ml-3 mb-1.5"
          style={{ backgroundColor: color }}
        />

        {/* Name */}
        <p className="font-mono text-[9px] text-bone-base uppercase tracking-wider leading-tight px-3 pb-2.5">
          {name}
        </p>
      </div>
    </>
  );
}

export const ConstructTile = memo(ConstructTileComponent);
