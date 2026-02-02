/**
 * Seed Categories
 * Run with: pnpm tsx src/db/seed-categories.ts
 * @see prd-category-taxonomy.md §3.1 The 8 Categories
 */

import { db, categories } from './index.js';

const CATEGORIES_DATA = [
  {
    slug: 'marketing',
    label: 'Marketing',
    color: '#FF44FF',
    description: 'GTM, campaigns, content, social media',
    sortOrder: 1,
  },
  {
    slug: 'development',
    label: 'Development',
    color: '#44FF88',
    description: 'Coding, testing, debugging, refactoring',
    sortOrder: 2,
  },
  {
    slug: 'security',
    label: 'Security',
    color: '#FF8844',
    description: 'Auditing, scanning, compliance, secrets',
    sortOrder: 3,
  },
  {
    slug: 'analytics',
    label: 'Analytics',
    color: '#FFDD44',
    description: 'Data, metrics, reporting, insights',
    sortOrder: 4,
  },
  {
    slug: 'documentation',
    label: 'Documentation',
    color: '#44DDFF',
    description: 'Docs, guides, READMEs, knowledge bases',
    sortOrder: 5,
  },
  {
    slug: 'operations',
    label: 'Operations',
    color: '#4488FF',
    description: 'DevOps, deployment, monitoring, CI/CD',
    sortOrder: 6,
  },
  {
    slug: 'design',
    label: 'Design',
    color: '#FF7B9C',
    description: 'UI/UX, prototyping, design systems',
    sortOrder: 7,
  },
  {
    slug: 'infrastructure',
    label: 'Infrastructure',
    color: '#9B7EDE',
    description: 'Cloud, networking, IaC, containers',
    sortOrder: 8,
  },
];

async function seed() {
  console.log('Seeding categories...');

  for (const cat of CATEGORIES_DATA) {
    await db
      .insert(categories)
      .values(cat)
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          label: cat.label,
          color: cat.color,
          description: cat.description,
          sortOrder: cat.sortOrder,
        },
      });
    console.log(`  ✓ ${cat.slug}`);
  }

  console.log('Done! Seeded 8 categories.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
