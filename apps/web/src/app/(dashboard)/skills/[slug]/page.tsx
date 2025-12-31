/**
 * Skill Detail Page
 * @see sprint.md T6.4: Skill Detail
 */

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Star,
  Download,
  ArrowLeft,
  Copy,
  Check,
  Clock,
  User,
  Tag,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// Mock skill data - in production would fetch by slug
const mockSkillDetails = {
  id: '1',
  name: 'Code Review',
  slug: 'code-review',
  description:
    'Automated code review with AI-powered suggestions for best practices, security issues, and performance improvements. This skill analyzes your code changes and provides actionable feedback to improve code quality.',
  longDescription: `
## Overview

The Code Review skill uses advanced AI models to analyze your code and provide comprehensive feedback on:

- **Best Practices**: Identify code patterns that could be improved
- **Security Issues**: Detect potential vulnerabilities before they reach production
- **Performance**: Spot inefficient code patterns and suggest optimizations
- **Code Style**: Ensure consistency with your team's coding standards

## Features

- Automatic pull request reviews
- Inline suggestions with explanations
- Custom rule configuration
- Integration with CI/CD pipelines
- Support for 20+ programming languages

## Requirements

- Loa CLI v1.0 or higher
- Valid API key
- Git repository
`,
  category: 'development',
  version: '2.1.0',
  rating: 4.8,
  reviewCount: 156,
  downloads: 12500,
  author: 'Loa Team',
  tier: 'free',
  tags: ['ai', 'code-quality', 'review', 'automation'],
  icon: '🔍',
  createdAt: '2024-06-15',
  updatedAt: '2024-12-28',
  versions: [
    { version: '2.1.0', date: '2024-12-28', changes: 'Added support for TypeScript 5.3' },
    { version: '2.0.0', date: '2024-11-15', changes: 'Major rewrite with improved AI model' },
    { version: '1.5.2', date: '2024-09-20', changes: 'Bug fixes and performance improvements' },
    { version: '1.5.0', date: '2024-08-10', changes: 'Added custom rule support' },
  ],
};

const tierBadgeColors: Record<string, string> = {
  free: 'bg-gray-100 text-gray-800 border-gray-200',
  pro: 'bg-blue-100 text-blue-800 border-blue-200',
  team: 'bg-purple-100 text-purple-800 border-purple-200',
  enterprise: 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function SkillDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [copied, setCopied] = useState(false);

  // In production, fetch skill by slug
  const skill = mockSkillDetails;

  const installCommand = `loa skill install ${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/skills"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Skills
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center text-4xl">
          {skill.icon}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{skill.name}</h1>
            <span
              className={cn(
                'px-3 py-1 text-sm font-medium rounded-full border capitalize',
                tierBadgeColors[skill.tier]
              )}
            >
              {skill.tier}
            </span>
          </div>
          <p className="text-lg text-muted-foreground mb-4">{skill.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {skill.author}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {skill.rating} ({skill.reviewCount} reviews)
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              {skill.downloads.toLocaleString()} downloads
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Updated {skill.updatedAt}
            </span>
          </div>
        </div>
      </div>

      {/* Install Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Install via Loa CLI</p>
              <code className="text-sm bg-background px-3 py-2 rounded-md border block font-mono">
                {installCommand}
              </code>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
              <Button size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open in CLI
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About this skill</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {/* In production, render markdown with a proper renderer */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Overview</h2>
                  <p>
                    The Code Review skill uses advanced AI models to analyze your code and provide
                    comprehensive feedback on:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <strong>Best Practices</strong>: Identify code patterns that could be improved
                    </li>
                    <li>
                      <strong>Security Issues</strong>: Detect potential vulnerabilities before they
                      reach production
                    </li>
                    <li>
                      <strong>Performance</strong>: Spot inefficient code patterns and suggest
                      optimizations
                    </li>
                    <li>
                      <strong>Code Style</strong>: Ensure consistency with your team&apos;s coding
                      standards
                    </li>
                  </ul>

                  <h2 className="text-lg font-semibold">Features</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Automatic pull request reviews</li>
                    <li>Inline suggestions with explanations</li>
                    <li>Custom rule configuration</li>
                    <li>Integration with CI/CD pipelines</li>
                    <li>Support for 20+ programming languages</li>
                  </ul>

                  <h2 className="text-lg font-semibold">Requirements</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Loa CLI v1.0 or higher</li>
                    <li>Valid API key</li>
                    <li>Git repository</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Version History */}
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>Recent updates and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skill.versions.map((version, idx) => (
                  <div
                    key={version.version}
                    className={cn('pb-4', idx < skill.versions.length - 1 && 'border-b')}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-medium">v{version.version}</span>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{version.date}</p>
                    <p className="text-sm mt-1">{version.changes}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="font-medium">{skill.version}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium capitalize">{skill.category}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tier Requirement</p>
                <p className="font-medium capitalize">{skill.tier}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{skill.createdAt}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">{skill.updatedAt}</p>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skill.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/skills?tag=${tag}`}
                    className="px-2 py-1 text-sm bg-muted rounded-full hover:bg-accent transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tier Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                This skill is available on the <strong className="capitalize">{skill.tier}</strong>{' '}
                tier and above.
              </p>
              {skill.tier !== 'free' && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/billing">Upgrade to access</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
