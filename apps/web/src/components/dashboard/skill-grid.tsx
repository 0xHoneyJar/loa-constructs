/**
 * Skill Grid Component
 * @see sprint.md T6.3: Skill Browser - SkillGrid component
 */

'use client';

import { SkillCard, Skill } from './skill-card';
import { cn } from '@/lib/utils';

interface SkillGridProps {
  skills: Skill[];
  isLoading?: boolean;
  className?: string;
}

function SkillCardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
        <div className="h-5 w-12 bg-muted rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-muted rounded-full" />
        <div className="h-5 w-16 bg-muted rounded-full" />
      </div>
      <div className="flex justify-between pt-3 border-t">
        <div className="flex gap-4">
          <div className="h-4 w-12 bg-muted rounded" />
          <div className="h-4 w-12 bg-muted rounded" />
        </div>
        <div className="h-8 w-16 bg-muted rounded" />
      </div>
    </div>
  );
}

export function SkillGrid({ skills, isLoading, className }: SkillGridProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkillCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No skills found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} />
      ))}
    </div>
  );
}
