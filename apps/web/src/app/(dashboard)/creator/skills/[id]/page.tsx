/**
 * Skill Analytics Detail Page
 * @see sprint.md T10.4: Creator Dashboard - Per-skill analytics
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Package,
  Download,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

interface SkillAnalytics {
  skillId: string;
  totalDownloads: number;
  activeInstalls: number;
  downloadsThisMonth: number;
  downloadsLastMonth: number;
  downloadsByVersion: VersionDownloads[];
  downloadsTrend: TrendPoint[];
  topLocations: LocationStat[];
}

interface VersionDownloads {
  version: string;
  downloads: number;
  percentage: number;
}

interface TrendPoint {
  date: string;
  installs: number;
  loads: number;
}

interface LocationStat {
  country: string;
  downloads: number;
  percentage: number;
}

function StatCard({
  title,
  value,
  description,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
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
        {trend && (
          <p
            className={`text-xs mt-1 flex items-center gap-1 ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}% vs last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const maxInstalls = Math.max(...data.map((d) => d.installs), 1);

  return (
    <div className="h-48 flex items-end gap-1 pt-4">
      {data.map((point, index) => {
        const height = (point.installs / maxInstalls) * 100;

        return (
          <div key={point.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex-1 w-full flex items-end justify-center">
              <div
                className="w-full max-w-[12px] bg-primary rounded-t transition-all"
                style={{ height: `${height}%`, minHeight: point.installs > 0 ? '4px' : '0' }}
                title={`${point.date}: ${point.installs} installs`}
              />
            </div>
            {index % 5 === 0 && (
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

function VersionBreakdown({ versions }: { versions: VersionDownloads[] }) {
  if (versions.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No version data available</p>;
  }

  return (
    <div className="space-y-3">
      {versions.map((v) => (
        <div key={v.version} className="flex items-center gap-3">
          <div className="w-16 text-sm font-mono">{v.version}</div>
          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${v.percentage}%` }}
            />
          </div>
          <div className="w-20 text-right text-sm">
            <span className="font-mono">{v.downloads.toLocaleString()}</span>
            <span className="text-muted-foreground ml-1">({v.percentage.toFixed(1)}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SkillAnalyticsPage() {
  const params = useParams();
  const skillId = params.id as string;
  const { getAccessToken, isAuthenticated } = useAuth();
  const [analytics, setAnalytics] = useState<SkillAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      const token = getAccessToken();
      if (!token || !isAuthenticated || !skillId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/creator/skills/${skillId}/analytics`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || 'Failed to fetch analytics');
        }

        const data = await response.json();
        setAnalytics(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [getAccessToken, isAuthenticated, skillId]);

  // Calculate trend percentage
  const calculateTrend = (): { value: number; isPositive: boolean } | undefined => {
    if (!analytics || analytics.downloadsLastMonth === 0) return undefined;
    const change =
      ((analytics.downloadsThisMonth - analytics.downloadsLastMonth) / analytics.downloadsLastMonth) *
      100;
    return {
      value: Math.abs(Math.round(change)),
      isPositive: change >= 0,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/creator">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Skill Analytics</h1>
          <p className="text-muted-foreground">Detailed statistics for your skill</p>
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

      {!loading && !error && analytics && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Downloads"
              value={analytics.totalDownloads.toLocaleString()}
              description="All time"
              icon={<Download className="h-4 w-4" />}
            />
            <StatCard
              title="Active Installs"
              value={analytics.activeInstalls.toLocaleString()}
              description="Current users"
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              title="Downloads This Month"
              value={analytics.downloadsThisMonth.toLocaleString()}
              icon={<TrendingUp className="h-4 w-4" />}
              trend={calculateTrend()}
            />
            <StatCard
              title="Downloads Last Month"
              value={analytics.downloadsLastMonth.toLocaleString()}
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </div>

          {/* Downloads Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Download Trend
              </CardTitle>
              <CardDescription>Daily downloads over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart data={analytics.downloadsTrend} />
            </CardContent>
          </Card>

          {/* Version Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Downloads by Version
              </CardTitle>
              <CardDescription>Distribution of downloads across versions</CardDescription>
            </CardHeader>
            <CardContent>
              <VersionBreakdown versions={analytics.downloadsByVersion} />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex gap-4">
            <Link href={`/creator/skills/${skillId}/versions/new`}>
              <Button variant="outline">
                <Package className="h-4 w-4 mr-2" />
                Publish New Version
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
