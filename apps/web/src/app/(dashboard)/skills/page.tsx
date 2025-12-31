/**
 * Skill Browser Page
 * @see sprint.md T6.3: Skill Browser
 */

'use client';

import { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkillGrid } from '@/components/dashboard/skill-grid';
import { SkillFiltersPanel, SkillFiltersBar, SkillFilters } from '@/components/dashboard/skill-filters';
import { SearchInput } from '@/components/dashboard/search-input';
import { Pagination } from '@/components/dashboard/pagination';
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

const ITEMS_PER_PAGE = 6;

const categories = ['development', 'testing', 'documentation', 'security', 'database', 'devops'];
const availableTags = ['ai', 'code-quality', 'testing', 'documentation', 'security', 'performance', 'automation', 'api'];

export default function SkillsPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<SkillFilters>({
    category: null,
    tier: null,
    tags: [],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Filter and search skills
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
      if (filters.category && skill.category !== filters.category) {
        return false;
      }

      // Tier filter
      if (filters.tier && skill.tier !== filters.tier) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((tag) => skill.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [search, filters]);

  // Paginate results
  const totalPages = Math.ceil(filteredSkills.length / ITEMS_PER_PAGE);
  const paginatedSkills = filteredSkills.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleFiltersChange = (newFilters: SkillFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Browse Skills</h1>
        <p className="text-muted-foreground">Discover and install skills for your projects</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <SearchInput value={search} onChange={handleSearchChange} className="md:w-80" />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="md:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <div className="hidden md:block">
            <SkillFiltersBar
              filters={filters}
              onFiltersChange={handleFiltersChange}
              categories={categories}
            />
          </div>
        </div>
      </div>

      {/* Mobile Filters */}
      {showFilters && (
        <div className="md:hidden p-4 border rounded-lg bg-card">
          <SkillFiltersPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
            categories={categories}
            availableTags={availableTags}
          />
        </div>
      )}

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {paginatedSkills.length} of {filteredSkills.length} skills
        </span>
        <span>Page {currentPage} of {totalPages || 1}</span>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-6">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-6 p-4 border rounded-lg bg-card">
            <h2 className="font-semibold mb-4">Filters</h2>
            <SkillFiltersPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              categories={categories}
              availableTags={availableTags}
            />
          </div>
        </aside>

        {/* Skills Grid */}
        <div className="flex-1 space-y-6">
          <SkillGrid skills={paginatedSkills} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
