import type { ConstructDetail } from '@/lib/types/graph';
import { Badge } from '@/components/ui/badge';
import { GraduationBadge } from '@/components/ui/graduation-badge';
import { getCategoryColor, getCategoryLabel } from '@/lib/utils/colors';

interface ConstructCardProps {
  construct: ConstructDetail;
}

export function ConstructCard({ construct }: ConstructCardProps) {
  const categoryColor = getCategoryColor(construct.category);

  return (
    <div className="space-y-4">
      {/* Color accent bar */}
      <div
        className="h-1 w-16"
        style={{ backgroundColor: categoryColor }}
      />

      {/* Name and badges */}
      <div className="space-y-2">
        <h1 className="font-mono text-2xl font-semibold uppercase tracking-wider text-white">
          {construct.name}
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={construct.type === 'pack' ? 'pack' : 'skill'}>
            {construct.type}
          </Badge>
          <Badge
            style={{
              backgroundColor: `${categoryColor}20`,
              borderColor: `${categoryColor}40`,
              color: categoryColor,
            }}
          >
            {getCategoryLabel(construct.category)}
          </Badge>
          <GraduationBadge level={construct.graduationLevel} />
          {construct.skills && construct.skills.length > 0 && (
            <span className="font-mono text-xs text-white/40">
              {construct.skills.length} SKILLS
            </span>
          )}
          <span className="font-mono text-xs text-white/40">
            {construct.commandCount} {construct.commandCount === 1 ? 'COMMAND' : 'COMMANDS'}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="max-w-2xl text-sm leading-relaxed text-white/70">
        {construct.description}
      </p>
    </div>
  );
}
