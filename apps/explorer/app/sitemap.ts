import { fetchAllConstructs } from '@/lib/data/fetch-constructs';

// Force dynamic generation — sitemap fetches from API and must not block build
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // re-generate hourly

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://constructs.network';

type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
};

export default async function sitemap(): Promise<SitemapEntry[]> {
  const constructs = await fetchAllConstructs();
  const packs = constructs.filter((c) => c.type === 'pack');

  const staticPages: SitemapEntry[] = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/constructs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/packs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/docs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/changelog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Canonical construct pages (/constructs/[slug] — NOT /[slug] graph routes)
  const constructPages: SitemapEntry[] = constructs.map((c) => ({
    url: `${BASE_URL}/constructs/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const packPages: SitemapEntry[] = packs.map((p) => ({
    url: `${BASE_URL}/packs/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...constructPages, ...packPages];
}
