/**
 * Creator Dashboard Page
 * @see sprint.md T10.4: Creator Dashboard Page
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Download,
  Star,
  TrendingUp,
  Plus,
  ChevronRight,
  Users,
  BarChart3,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

interface CreatorStats {
  summary: {
    totalSkills: number;
    totalDownloads: number;
    totalActiveInstalls: number;
    averageRating: number;
    totalRatings: number;
  };
  skills: CreatorSkillStats[];
}

interface CreatorSkillStats {
  id: string;
  name: string;
  slug: string;
  downloads: number;
  activeInstalls: number;
  rating: number;
  ratingCount: number;
  tierRequired: string;
  createdAt: string;
  updatedAt: string;
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-800',
    pro: 'bg-blue-100 text-blue-800',
    team: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-amber-100 text-amber-800',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierColors[tier] || tierColors.free}`}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

function RatingDisplay({ rating, count }: { rating: number; count: number }) {
  if (count === 0) {
    return <span className="text-muted-foreground text-sm">No ratings</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      <span className="font-medium">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground text-sm">({count})</span>
    </div>
  );
}

function SkillsTable({ skills }: { skills: CreatorSkillStats[] }) {
  if (skills.length === 0) {
    return (
      <div className="py-12 text-center">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No skills published yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first skill and share it with the community.
        </p>
        <Link href="/creator/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Skill
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Skill</th>
            <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Tier</th>
            <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Downloads</th>
            <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Active</th>
            <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Rating</th>
            <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground"></th>
          </tr>
        </thead>
        <tbody>
          {skills.map((skill) => (
            <tr key={skill.id} className="border-b last:border-0 hover:bg-muted/50">
              <td className="py-4 px-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{skill.name}</p>
                    <p className="text-sm text-muted-foreground">{skill.slug}</p>
                  </div>
                </div>
              </td>
              <td className="text-center py-4 px-2">
                <TierBadge tier={skill.tierRequired} />
              </td>
              <td className="text-right py-4 px-2 font-mono">{skill.downloads.toLocaleString()}</td>
              <td className="text-right py-4 px-2 font-mono">{skill.activeInstalls.toLocaleString()}</td>
              <td className="text-center py-4 px-2">
                <RatingDisplay rating={skill.rating} count={skill.ratingCount} />
              </td>
              <td className="text-right py-4 px-2">
                <Link href={`/creator/skills/${skill.id}`}>
                  <Button variant="ghost" size="sm">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Analytics
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CreatorPage() {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCreatorStats() {
      const token = getAccessToken();
      if (!token || !isAuthenticated) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/creator/skills`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch creator stats');
        }

        const data = await response.json();
        setStats(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchCreatorStats();
  }, [getAccessToken, isAuthenticated]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">Manage and analyze your published skills</p>
        </div>
        <Link href="/creator/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Skill
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && stats && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Published Skills"
              value={stats.summary.totalSkills}
              icon={<Package className="h-4 w-4" />}
            />
            <StatCard
              title="Total Downloads"
              value={stats.summary.totalDownloads.toLocaleString()}
              icon={<Download className="h-4 w-4" />}
            />
            <StatCard
              title="Active Installs"
              value={stats.summary.totalActiveInstalls.toLocaleString()}
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              title="Average Rating"
              value={stats.summary.averageRating.toFixed(1)}
              description={`${stats.summary.totalRatings} total ratings`}
              icon={<Star className="h-4 w-4" />}
            />
            <StatCard
              title="Growth"
              value="+0%"
              description="Coming soon"
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>

          {/* Skills Table */}
          <Card>
            <CardHeader>
              <CardTitle>Your Skills</CardTitle>
              <CardDescription>
                {stats.skills.length === 0
                  ? 'Publish skills to share with the Loa community'
                  : `${stats.skills.length} skill${stats.skills.length !== 1 ? 's' : ''} published`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SkillsTable skills={stats.skills} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
