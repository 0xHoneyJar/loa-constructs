/**
 * Dashboard Home Page
 * @see sprint.md T6.2: Dashboard Home - Stats and recent activity
 */

'use client';

import { Package, TrendingUp, Key, CreditCard, ChevronRight, Clock, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, description, icon, trend }: StatCardProps) {
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
            className={`text-xs mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface ActivityItem {
  id: string;
  type: 'install' | 'upgrade' | 'api_key' | 'subscription';
  title: string;
  description: string;
  timestamp: string;
}

function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'install':
        return <Download className="h-4 w-4" />;
      case 'upgrade':
        return <TrendingUp className="h-4 w-4" />;
      case 'api_key':
        return <Key className="h-4 w-4" />;
      case 'subscription':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            {getIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{activity.title}</p>
            <p className="text-xs text-muted-foreground">{activity.description}</p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.timestamp}</span>
        </div>
      ))}
    </div>
  );
}

interface QuickAction {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action) => (
        <Link key={action.href} href={action.href}>
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                {action.icon}
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  // Mock data - in production these would come from API
  const stats = {
    skillsInstalled: 12,
    currentTier: user?.role || 'Free',
    usageThisMonth: 847,
    apiKeysActive: 3,
  };

  const recentActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'install',
      title: 'Installed code-review skill',
      description: 'Version 2.1.0',
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      type: 'api_key',
      title: 'Created new API key',
      description: 'For CI/CD integration',
      timestamp: '1 day ago',
    },
    {
      id: '3',
      type: 'upgrade',
      title: 'Updated test-runner skill',
      description: 'v1.5.0 → v1.6.2',
      timestamp: '3 days ago',
    },
    {
      id: '4',
      type: 'install',
      title: 'Installed doc-generator skill',
      description: 'Version 1.0.0',
      timestamp: '1 week ago',
    },
  ];

  const quickActions: QuickAction[] = [
    { label: 'Browse Skills', href: '/skills', icon: <Package className="h-5 w-5" /> },
    { label: 'API Keys', href: '/api-keys', icon: <Key className="h-5 w-5" /> },
    { label: 'Billing', href: '/billing', icon: <CreditCard className="h-5 w-5" /> },
    { label: 'View Usage', href: '/billing', icon: <TrendingUp className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.name || 'User'}</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your skills</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Skills Installed"
          value={stats.skillsInstalled}
          description="Across all projects"
          icon={<Package className="h-4 w-4" />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Current Tier"
          value={stats.currentTier}
          description="Upgrade for more features"
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          title="Usage This Month"
          value={stats.usageThisMonth.toLocaleString()}
          description="API calls"
          icon={<TrendingUp className="h-4 w-4" />}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Active API Keys"
          value={stats.apiKeysActive}
          description="For integrations"
          icon={<Key className="h-4 w-4" />}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <QuickActions actions={quickActions} />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions and updates</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="gap-1">
            View all <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <ActivityFeed activities={recentActivities} />
        </CardContent>
      </Card>
    </div>
  );
}
