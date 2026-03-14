const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://constructs.network';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/callback',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
