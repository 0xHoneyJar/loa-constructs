/**
 * Skill Card Component
 * @see sprint.md T6.3: Skill Browser - SkillCard component
 */

'use client';

import { Star, Download, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
}

const tierBadgeColors: Record<string, string> = {
  free: 'bg-gray-100 text-gray-800 border-gray-200',
  pro: 'bg-blue-100 text-blue-800 border-blue-200',
  team: 'bg-purple-100 text-purple-800 border-purple-200',
  enterprise: 'bg-amber-100 text-amber-800 border-amber-200',
};

export function SkillCard({ skill, className }: SkillCardProps) {
  return (
    <Card className={cn('flex flex-col hover:shadow-md transition-shadow', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
              {skill.icon || '📦'}
            </div>
            <div>
              <CardTitle className="text-base">
                <Link href={`/skills/${skill.slug}`} className="hover:underline">
                  {skill.name}
                </Link>
              </CardTitle>
              <p className="text-xs text-muted-foreground">by {skill.author}</p>
            </div>
          </div>
          <span
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded border capitalize',
              tierBadgeColors[skill.tier]
            )}
          >
            {skill.tier}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <CardDescription className="line-clamp-2">{skill.description}</CardDescription>
        <div className="flex flex-wrap gap-1 mt-3">
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-muted rounded-full text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {skill.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-muted-foreground">
              +{skill.tags.length - 3} more
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {skill.rating.toFixed(1)}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            {skill.downloads.toLocaleString()}
          </span>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/skills/${skill.slug}`}>
            View <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
