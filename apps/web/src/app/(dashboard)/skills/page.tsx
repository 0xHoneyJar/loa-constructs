/**
 * Skill Browser Page (TUI Style)
 * @see sprint.md T20.1: Redesign Skills Browse Page
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TuiBox } from '@/components/tui/tui-box';
import { TuiH1, TuiDim, TuiTag } from '@/components/tui/tui-text';
import { TuiSearchInput, TuiSelect } from '@/components/tui/tui-input';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiList, TuiListItem } from '@/components/tui/tui-list';
import { useKeyboardNav } from '@/hooks/use-keyboard-nav';
import { Skill } from '@/components/dashboard/skill-card';

// Mock skills data - in production this would come from API via TanStack Query
const mockSkills: Skill[] = [
  {
    id: '1',
    name: 'Code Review',
    slug: 'code-review',
    description: 'Automated code review with AI-powered suggestions for best practices, security issues, and performance improvements.',
    category: 'development',
    version: '2.1.0',
    rating: 4.8,
    downloads: 12500,
    author: 'Loa Team',
    tier: 'free',
    tags: ['ai', 'code-quality', 'review'],
    icon: '🔍',
  },
  {
    id: '2',
    name: 'Test Runner',
    slug: 'test-runner',
    description: 'Intelligent test generation and execution with coverage reports and failure analysis.',
    category: 'testing',
    version: '1.6.2',
    rating: 4.6,
    downloads: 8900,
    author: 'Loa Team',
    tier: 'free',
    tags: ['testing', 'automation', 'coverage'],
    icon: '🧪',
  },
  {
    id: '3',
    name: 'Doc Generator',
    slug: 'doc-generator',
    description: 'Generate comprehensive documentation from your codebase with automatic API documentation.',
    category: 'documentation',
    version: '1.0.0',
    rating: 4.4,
    downloads: 5600,
    author: 'Loa Team',
    tier: 'free',
    tags: ['documentation', 'api', 'markdown'],
    icon: '📚',
  },
  {
    id: '4',
    name: 'Security Scanner',
    slug: 'security-scanner',
    description: 'Deep security analysis with vulnerability detection and remediation suggestions.',
    category: 'security',
    version: '3.0.1',
    rating: 4.9,
    downloads: 15200,
    author: 'Loa Team',
    tier: 'pro',
    tags: ['security', 'vulnerability', 'audit'],
    icon: '🔒',
  },
  {
    id: '5',
    name: 'Performance Analyzer',
    slug: 'performance-analyzer',
    description: 'Profile and optimize your application performance with detailed metrics and recommendations.',
    category: 'development',
    version: '2.3.0',
    rating: 4.5,
    downloads: 7800,
    author: 'Loa Team',
    tier: 'pro',
    tags: ['performance', 'profiling', 'optimization'],
    icon: '⚡',
  },
  {
    id: '6',
    name: 'Database Optimizer',
    slug: 'database-optimizer',
    description: 'Analyze and optimize database queries with index suggestions and query rewrites.',
    category: 'database',
    version: '1.5.0',
    rating: 4.7,
    downloads: 6200,
    author: 'Loa Team',
    tier: 'team',
    tags: ['database', 'sql', 'optimization'],
    icon: '🗄️',
  },
  {
    id: '7',
    name: 'Compliance Checker',
    slug: 'compliance-checker',
    description: 'Ensure your codebase meets industry compliance standards like SOC2, GDPR, and HIPAA.',
    category: 'security',
    version: '2.0.0',
    rating: 4.8,
    downloads: 3400,
    author: 'Loa Team',
    tier: 'enterprise',
    tags: ['compliance', 'soc2', 'gdpr'],
    icon: '✅',
  },
  {
    id: '8',
    name: 'API Designer',
    slug: 'api-designer',
    description: 'Design and document REST and GraphQL APIs with OpenAPI/Swagger generation.',
    category: 'development',
    version: '1.2.0',
    rating: 4.3,
    downloads: 4100,
    author: 'Community',
    tier: 'free',
    tags: ['api', 'rest', 'graphql', 'openapi'],
    icon: '🔌',
  },
  {
    id: '9',
    name: 'CI/CD Configurator',
    slug: 'cicd-configurator',
    description: 'Generate and optimize CI/CD pipelines for GitHub Actions, GitLab CI, and more.',
    category: 'devops',
    version: '1.0.5',
    rating: 4.2,
    downloads: 3800,
    author: 'Community',
    tier: 'pro',
    tags: ['ci', 'cd', 'automation', 'github'],
    icon: '🚀',
  },
];

const ITEMS_PER_PAGE = 10;

const categories = ['all', 'development', 'testing', 'documentation', 'security', 'database', 'devops'];
const tiers = ['all', 'free', 'pro', 'team', 'enterprise'];

const tierColors: Record<string, string> = {
  free: 'var(--fg-dim)',
  pro: 'var(--accent)',
  team: 'var(--cyan)',
  enterprise: 'var(--yellow)',
};

export default function SkillsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [tier, setTier] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter skills
  const filteredSkills = useMemo(() => {
    return mockSkills.filter((skill) => {
      // Search
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          skill.name.toLowerCase().includes(searchLower) ||
          skill.description.toLowerCase().includes(searchLower) ||
          skill.tags.some((tag) => tag.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (category !== 'all' && skill.category !== category) {
        return false;
      }

      // Tier filter
      if (tier !== 'all' && skill.tier !== tier) {
        return false;
      }

      return true;
    });
  }, [search, category, tier]);

  // Paginate results
  const totalPages = Math.ceil(filteredSkills.length / ITEMS_PER_PAGE);
  const paginatedSkills = filteredSkills.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Convert skills to TuiList items
  const listItems: TuiListItem[] = paginatedSkills.map((skill) => ({
    id: skill.id,
    title: skill.name,
    meta: `v${skill.version}`,
    description: skill.description,
    category: skill.category,
    badge: skill.tier !== 'free' ? skill.tier.toUpperCase() : undefined,
    badgeColor: tierColors[skill.tier],
    href: `/skills/${skill.slug}`,
  }));

  // Handle navigation
  const handleSelectItem = useCallback((item: TuiListItem) => {
    if (item.href) {
      router.push(item.href);
    }
  }, [router]);

  // Handle keyboard navigation (index-based)
  const handleSelectIndex = useCallback((index: number) => {
    const skill = paginatedSkills[index];
    if (skill) {
      router.push(`/skills/${skill.slug}`);
    }
  }, [paginatedSkills, router]);

  // Keyboard navigation for list
  useKeyboardNav({
    itemCount: listItems.length,
    onSelect: handleSelectIndex,
    enabled: true,
  });

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setCurrentPage(1);
  };

  const handleTierChange = (value: string) => {
    setTier(value);
    setCurrentPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Header */}
      <div style={{ padding: '0 4px' }}>
        <TuiH1 cursor>Browse Skills</TuiH1>
        <TuiDim>Discover and install skills for your projects</TuiDim>
      </div>

      {/* Search and Filters */}
      <TuiBox title="Filters">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Search */}
          <TuiSearchInput
            placeholder="search skills..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />

          {/* Filter Row */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '150px' }}>
              <TuiSelect
                label="Category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </TuiSelect>
            </div>
            <div style={{ minWidth: '120px' }}>
              <TuiSelect
                label="Tier"
                value={tier}
                onChange={(e) => handleTierChange(e.target.value)}
              >
                {tiers.map((t) => (
                  <option key={t} value={t}>
                    {t === 'all' ? 'All Tiers' : t}
                  </option>
                ))}
              </TuiSelect>
            </div>
          </div>

          {/* Results count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <TuiDim>
              Showing {paginatedSkills.length} of {filteredSkills.length} skills
            </TuiDim>
            <TuiDim>
              Use <TuiTag color="cyan">j/k</TuiTag> to navigate, <TuiTag color="cyan">Enter</TuiTag> to select
            </TuiDim>
          </div>
        </div>
      </TuiBox>

      {/* Skills List */}
      <TuiBox title="Skills" style={{ flex: 1, minHeight: 0 }}>
        {listItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--fg-dim)' }}>
            No skills found matching your criteria
          </div>
        ) : (
          <TuiList
            items={listItems}
            onSelect={handleSelectItem}
            emptyMessage="No skills found"
          />
        )}
      </TuiBox>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 0'
        }}>
          <TuiButton
            variant="secondary"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            $ prev
          </TuiButton>
          <TuiDim>
            Page {currentPage} of {totalPages}
          </TuiDim>
          <TuiButton
            variant="secondary"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            $ next
          </TuiButton>
        </div>
      )}
    </div>
  );
}
