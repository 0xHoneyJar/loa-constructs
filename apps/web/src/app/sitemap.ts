/**
 * Dynamic Sitemap Generator
 * @see sprint.md T26.13: Add SEO Metadata and Open Graph
 */

import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://constructs.network';

  // Static pages
  const staticPages = [
    '',
    '/about',
    '/pricing',
    '/docs',
    '/packs',
    '/blog',
    '/terms',
    '/privacy',
    '/login',
    '/register',
  ];

  // Pack pages (in production, fetch from API)
  const packSlugs = [
    'gtm-collective',
    'security-audit',
    'docs-generator',
    'deploy-toolkit',
    'code-review',
    'test-suite',
  ];

  // Blog posts (in production, fetch from CMS)
  const blogSlugs = [
    'launch',
    'gtm-workflow',
    'creator-economics',
  ];

  const routes: MetadataRoute.Sitemap = [
    // Static pages
    ...staticPages.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: route === '' ? 1 : 0.8,
    })),

    // Pack pages
    ...packSlugs.map((slug) => ({
      url: `${baseUrl}/packs/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),

    // Blog posts
    ...blogSlugs.map((slug) => ({
      url: `${baseUrl}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];

  return routes;
}
