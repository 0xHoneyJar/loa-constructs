import Link from 'next/link';
import type { SkillRef } from '@/lib/types/graph';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SkillGridProps {
  skills: SkillRef[];
  packSlug: string;
}

export function SkillGrid({ skills, packSlug }: SkillGridProps) {
  if (skills.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
          Skills Included
        </h2>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Link
              key={skill.slug}
              href={`/${packSlug}/${skill.slug}`}
              className="group"
            >
              <Badge
                variant="skill"
                className="transition-colors group-hover:border-white/30 group-hover:text-white"
              >
                {skill.name}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
