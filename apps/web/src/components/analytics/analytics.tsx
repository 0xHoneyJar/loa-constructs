/**
 * Analytics Component
 * Lightweight analytics integration for marketing pages
 * @see sprint.md T26.15: Add Analytics Integration
 *
 * Usage:
 * 1. Add @vercel/analytics to package.json: `npm install @vercel/analytics`
 * 2. Import and use <Analytics /> in root layout
 *
 * For now, this is a placeholder that can be enabled when ready.
 * The component tracks page views and custom events.
 */

'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Feature flag for analytics - set to true when ready
const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';

// Track page views
export function usePageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!ANALYTICS_ENABLED) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Page view:', url);
    }

    // In production, this would send to analytics service
    // window.gtag?.('config', 'GA_MEASUREMENT_ID', { page_path: url });
    // or use Vercel Analytics: track('pageview', { path: url });
  }, [pathname, searchParams]);
}

// Track custom events
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>
) {
  if (!ANALYTICS_ENABLED) return;

  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Event:', name, properties);
  }

  // In production, send to analytics service
  // window.gtag?.('event', name, properties);
  // or use Vercel Analytics: track(name, properties);
}

// Predefined events for common actions
export const analytics = {
  // CTA clicks
  clickGetStarted: () => trackEvent('click_get_started'),
  clickBrowsePacks: () => trackEvent('click_browse_packs'),
  clickPricing: () => trackEvent('click_pricing'),
  clickRegister: (plan?: string) => trackEvent('click_register', { plan: plan || 'free' }),

  // Pack interactions
  viewPack: (packSlug: string) => trackEvent('view_pack', { pack: packSlug }),
  installPack: (packSlug: string) => trackEvent('install_pack', { pack: packSlug }),
  copyCommand: (command: string) => trackEvent('copy_command', { command }),

  // Blog interactions
  viewBlogPost: (slug: string) => trackEvent('view_blog_post', { post: slug }),

  // Search & navigation
  search: (query: string) => trackEvent('search', { query }),
  filterCategory: (category: string) => trackEvent('filter_category', { category }),
};

/**
 * Analytics Provider Component
 * Wrap your app with this to enable page view tracking
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  usePageView();
  return <>{children}</>;
}

/**
 * Placeholder for Vercel Analytics
 * When ready to enable:
 * 1. npm install @vercel/analytics
 * 2. Uncomment the Analytics import and component below
 */
export function Analytics() {
  // When ready, replace with:
  // import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
  // return <VercelAnalytics />;

  return null;
}
