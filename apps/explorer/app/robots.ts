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
          '/profile/',
          '/api-keys/',
          '/billing/',
          '/creator/',
          '/analytics/',
          '/teams/',
          '/callback',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
