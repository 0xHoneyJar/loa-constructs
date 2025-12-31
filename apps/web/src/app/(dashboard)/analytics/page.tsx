/**
 * User Analytics Dashboard Page
 * @see sprint.md T10.2: User Analytics Dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Download, Clock, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

interface UsageStats {
  totalInstalls: number;
  totalLoads: number;
  skillsUsed: number;
  periodStart: string;
  periodEnd: string;
  usageBySkill: SkillUsageBreakdown[];
  usageTrend: UsageTrendPoint[];
}

interface SkillUsageBreakdown {
  skillId: string;
  skillName: string;
  skillSlug: string;
  installs: number;
  loads: number;
  lastUsedAt: string | null;
}

interface UsageTrendPoint {
  date: string;
  installs: number;
  loads: number;
}

type Period = '7d' | '30d' | '90d';

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

function UsageChart({ data }: { data: UsageTrendPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No usage data available
      </div>
    );
  }

  // Find max values for scaling
  const maxInstalls = Math.max(...data.map((d) => d.installs), 1);
  const maxLoads = Math.max(...data.map((d) => d.loads), 1);
  const maxValue = Math.max(maxInstalls, maxLoads);

  return (
    <div className="h-64 flex items-end gap-1 pt-4">
      {data.map((point, index) => {
        const installHeight = (point.installs / maxValue) * 100;
        const loadHeight = (point.loads / maxValue) * 100;

        return (
          <div key={point.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex-1 w-full flex items-end justify-center gap-0.5">
              <div
                className="w-2 bg-blue-500 rounded-t transition-all"
                style={{ height: `${installHeight}%`, minHeight: point.installs > 0 ? '4px' : '0' }}
                title={`Installs: ${point.installs}`}
              />
              <div
                className="w-2 bg-green-500 rounded-t transition-all"
                style={{ height: `${loadHeight}%`, minHeight: point.loads > 0 ? '4px' : '0' }}
                title={`Loads: ${point.loads}`}
              />
            </div>
            {index % 7 === 0 && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SkillUsageTable({ skills }: { skills: SkillUsageBreakdown[] }) {
  if (skills.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No skill usage in this period
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Skill</th>
            <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Installs</th>
            <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Loads</th>
            <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Last Used</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((skill) => (
            <tr key={skill.skillId} className="border-b last:border-0">
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{skill.skillName}</span>
                </div>
                <span className="text-xs text-muted-foreground">{skill.skillSlug}</span>
              </td>
              <td className="text-right py-3 px-2 font-mono">{skill.installs}</td>
              <td className="text-right py-3 px-2 font-mono">{skill.loads}</td>
              <td className="text-right py-3 px-2 text-sm text-muted-foreground">
                {skill.lastUsedAt
                  ? new Date(skill.lastUsedAt).toLocaleDateString()
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [period, setPeriod] = useState<Period>('30d');
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsageStats() {
      const token = getAccessToken();
      if (!token || !isAuthenticated) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/users/me/usage?period=${period}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch usage stats');
        }

        const data = await response.json();
        setStats(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchUsageStats();
  }, [getAccessToken, isAuthenticated, period]);

  const periodLabels: Record<Period, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usage Analytics</h1>
          <p className="text-muted-foreground">Track your skill usage and activity</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Total Installs"
              value={stats.totalInstalls}
              description={periodLabels[period]}
              icon={<Download className="h-4 w-4" />}
            />
            <StatCard
              title="Total Loads"
              value={stats.totalLoads}
              description={periodLabels[period]}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatCard
              title="Skills Used"
              value={stats.skillsUsed}
              description="Unique skills"
              icon={<Package className="h-4 w-4" />}
            />
          </div>

          {/* Usage Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage Trend
              </CardTitle>
              <CardDescription>
                Daily installs (blue) and loads (green) over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsageChart data={stats.usageTrend} />
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span>Installs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>Loads</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage by Skill */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Usage by Skill
              </CardTitle>
              <CardDescription>
                Top skills by usage in {periodLabels[period].toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SkillUsageTable skills={stats.usageBySkill} />
            </CardContent>
          </Card>
        </>
      )}

      {!loading && !error && !stats && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No usage data yet</h3>
            <p className="text-muted-foreground">
              Install and use skills to see your usage analytics here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
