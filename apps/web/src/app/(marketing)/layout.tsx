/**
 * Marketing Layout
 * Layout for all public marketing pages
 * @see sprint.md T26.1: Create Marketing Layout Component
 * @see sprint.md T26.13: Add SEO Metadata and Open Graph
 * @see sprint.md T26.15: Add Analytics Integration
 */

import { Suspense } from 'react';
import { MarketingHeader, MarketingFooter, OrganizationJsonLd, SoftwareApplicationJsonLd } from '@/components/marketing';
import { Analytics, AnalyticsProvider } from '@/components/analytics';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
        overflowY: 'auto',
      }}
    >
      {/* Structured Data */}
      <OrganizationJsonLd />
      <SoftwareApplicationJsonLd />

      {/* Analytics */}
      <Suspense fallback={null}>
        <AnalyticsProvider>
          <MarketingHeader />
          <main style={{ flex: 1 }}>{children}</main>
          <MarketingFooter />
        </AnalyticsProvider>
      </Suspense>

      {/* Vercel Analytics (enable when ready) */}
      <Analytics />
    </div>
  );
}
