/**
 * Creator Dashboard Page
 * @see sprint.md T24.6: Creator Dashboard Page
 * @see prd-pack-submission.md §4.2.5
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Download,
  DollarSign,
  TrendingUp,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  GitBranch,
  RefreshCw,
  Link2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';

interface CreatorData {
  packs: CreatorPack[];
  totals: CreatorTotals;
}

interface CreatorPack {
  slug: string;
  name: string;
  status: string;
  downloads: number;
  revenue: {
    total: number;
    pending: number;
    currency: string;
  };
  latest_version: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface CreatorTotals {
  packs_count: number;
  total_downloads: number;
  total_revenue: number;
  pending_payout: number;
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

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    draft: {
      label: 'Draft',
      icon: <Clock className="h-3 w-3" />,
      className: 'bg-gray-100 text-gray-800 border-gray-300',
    },
    pending_review: {
      label: 'Pending Review',
      icon: <AlertCircle className="h-3 w-3" />,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
    published: {
      label: 'Published',
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    rejected: {
      label: 'Rejected',
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-red-100 text-red-800 border-red-300',
    },
    deprecated: {
      label: 'Deprecated',
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-gray-100 text-gray-600 border-gray-300',
    },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function PacksTable({ packs, onSubmit }: { packs: CreatorPack[]; onSubmit?: (slug: string) => void }) {
  if (packs.length === 0) {
    return (
      <div className="py-12 text-center">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No packs created yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first pack and share it with the community.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Note: Pack creation UI is coming soon. For now, use the API to create packs.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Pack</th>
            <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
            <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Version</th>
            <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Downloads</th>
            <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {packs.map((pack) => (
            <tr key={pack.slug} className="border-b last:border-0 hover:bg-muted/50">
              <td className="py-4 px-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{pack.name}</p>
                    <p className="text-sm text-muted-foreground">{pack.slug}</p>
                  </div>
                </div>
              </td>
              <td className="text-center py-4 px-2">
                <StatusBadge status={pack.status} />
              </td>
              <td className="text-center py-4 px-2">
                <span className="text-sm font-mono">{pack.latest_version || '-'}</span>
              </td>
              <td className="text-right py-4 px-2 font-mono">{pack.downloads.toLocaleString()}</td>
              <td className="text-right py-4 px-2">
                <div className="flex items-center justify-end gap-2">
                  {pack.status === 'draft' && pack.latest_version && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSubmit?.(pack.slug)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Submit for Review
                    </Button>
                  )}
                  {pack.status === 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSubmit?.(pack.slug)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Resubmit
                    </Button>
                  )}
                  <Link href={`/packs/${pack.slug}`}>
                    <Button variant="ghost" size="sm">
                      View
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
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
  const [data, setData] = useState<CreatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_submittingSlug, setSubmittingSlug] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoRef, setRepoRef] = useState('main');
  const [registeringSlug, setRegisteringSlug] = useState<string | null>(null);
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null);
  const [repoMessage, setRepoMessage] = useState<{ slug: string; type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function fetchCreatorPacks() {
      const token = getAccessToken();
      if (!token || !isAuthenticated) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/v1/creator/packs`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch creator packs');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchCreatorPacks();
  }, [getAccessToken, isAuthenticated]);

  const handleSubmitPack = async (slug: string) => {
    const token = getAccessToken();
    if (!token) return;

    setSubmittingSlug(slug);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/packs/${slug}/submit`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to submit pack');
      }

      // Refresh the data
      const packsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/creator/packs`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (packsResponse.ok) {
        const result = await packsResponse.json();
        setData(result.data);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit pack');
    } finally {
      setSubmittingSlug(null);
    }
  };

  const handleRegisterRepo = async (slug: string) => {
    const token = getAccessToken();
    if (!token || !repoUrl) return;

    setRegisteringSlug(slug);
    setRepoMessage(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/packs/${slug}/register-repo`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ git_url: repoUrl, git_ref: repoRef }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Failed to register repository');
      }

      setRepoMessage({ slug, type: 'success', text: 'Repository registered successfully!' });
      setRepoUrl('');
      setRepoRef('main');
    } catch (err) {
      setRepoMessage({ slug, type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setRegisteringSlug(null);
    }
  };

  const handleSyncPack = async (slug: string) => {
    const token = getAccessToken();
    if (!token) return;

    setSyncingSlug(slug);
    setRepoMessage(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/packs/${slug}/sync`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Failed to sync');
      }

      const result = await response.json();
      setRepoMessage({ slug, type: 'success', text: `Synced to v${result.data.version} (${result.data.files_synced} files)` });
    } catch (err) {
      setRepoMessage({ slug, type: 'error', text: err instanceof Error ? err.message : 'Sync failed' });
    } finally {
      setSyncingSlug(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">Manage and publish your packs</p>
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

      {!loading && !error && data && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Published Packs"
              value={data.totals.packs_count}
              icon={<Package className="h-4 w-4" />}
            />
            <StatCard
              title="Total Downloads"
              value={data.totals.total_downloads.toLocaleString()}
              icon={<Download className="h-4 w-4" />}
            />
            <StatCard
              title="Total Revenue"
              value={`$${data.totals.total_revenue.toFixed(2)}`}
              description="v1.1 coming soon"
              icon={<DollarSign className="h-4 w-4" />}
            />
            <StatCard
              title="Pending Payout"
              value={`$${data.totals.pending_payout.toFixed(2)}`}
              description="v1.1 coming soon"
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>

          {/* Packs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Your Packs</CardTitle>
              <CardDescription>
                {data.packs.length === 0
                  ? 'Create packs to share with the Loa community'
                  : `${data.packs.length} pack${data.packs.length !== 1 ? 's' : ''} created`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PacksTable packs={data.packs} onSubmit={handleSubmitPack} />
            </CardContent>
          </Card>

          {/* Repository Registration */}
          {data.packs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Connect Repository
                </CardTitle>
                <CardDescription>
                  Link a GitHub repository to your pack for git-based distribution and auto-sync.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.packs.map((pack) => (
                    <div key={pack.slug} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{pack.name}</span>
                          <span className="text-sm text-muted-foreground">({pack.slug})</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncPack(pack.slug)}
                          disabled={syncingSlug === pack.slug}
                        >
                          <RefreshCw className={`h-4 w-4 mr-1 ${syncingSlug === pack.slug ? 'animate-spin' : ''}`} />
                          Sync Now
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://github.com/org/construct-name.git"
                          value={registeringSlug === pack.slug ? repoUrl : ''}
                          onChange={(e) => {
                            setRegisteringSlug(pack.slug);
                            setRepoUrl(e.target.value);
                          }}
                          className="flex-1"
                        />
                        <Input
                          placeholder="main"
                          value={registeringSlug === pack.slug ? repoRef : 'main'}
                          onChange={(e) => {
                            setRegisteringSlug(pack.slug);
                            setRepoRef(e.target.value);
                          }}
                          className="w-24"
                        />
                        <Button
                          onClick={() => handleRegisterRepo(pack.slug)}
                          disabled={registeringSlug !== pack.slug || !repoUrl}
                        >
                          <Link2 className="h-4 w-4 mr-1" />
                          Register
                        </Button>
                      </div>
                      {repoMessage?.slug === pack.slug && (
                        <p className={`text-sm mt-2 ${repoMessage.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                          {repoMessage.text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
