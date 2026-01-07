/**
 * Robots.txt Generator
 * @see sprint.md T26.13: Add SEO Metadata and Open Graph
 */

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/profile/',
          '/_next/',
        ],
      },
    ],
    sitemap: 'https://constructs.network/sitemap.xml',
  };
}
