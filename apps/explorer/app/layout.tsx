import type { Metadata } from 'next';
import Script from 'next/script';
import { GeistMono } from 'geist/font/mono';
import localFont from 'next/font/local';
import { DynamicProvider } from '@/components/providers/dynamic-provider';
import { ConvexProvider } from '@/components/providers/convex-provider';
import { FeedbackWidget } from '@/components/feedback-widget';
import { ErrorCaptureProvider } from '@/components/error-capture-provider';
import { Agentation } from 'agentation';
import './globals.css';

const basementGrotesque = localFont({
  src: './fonts/BasementGrotesque-Black.woff2',
  variable: '--font-display',
  weight: '800',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://constructs.network';

export const metadata: Metadata = {
  title: {
    default: 'Constructs Network',
    template: '%s | Constructs Network',
  },
  description: 'Skills for AI coding agents. Install a construct — your agent sees problems differently.',
  keywords: ['AI', 'agent', 'constructs', 'skills', 'Claude', 'expertise', 'coding agent'],
  authors: [{ name: 'Constructs Network', url: 'https://constructs.network' }],
  creator: 'Constructs Network',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'Constructs Network',
    description: 'Skills for AI coding agents. Install a construct — your agent sees problems differently.',
    url: siteUrl,
    siteName: 'Constructs Network',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og/default.png',
        width: 1200,
        height: 630,
        alt: 'Constructs Network — Skills for AI coding agents',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Constructs Network',
    description: 'Skills for AI coding agents. Install a construct — your agent sees problems differently.',
    images: ['/og/default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
  },
};

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Constructs Network',
  url: 'https://constructs.network',
  description: 'Skills for AI coding agents. Install a construct — your agent sees problems differently.',
  publisher: {
    '@type': 'Organization',
    name: 'Constructs Network',
    url: 'https://constructs.network',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistMono.variable} ${basementGrotesque.variable} min-h-screen bg-void-base font-mono text-bone-base antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, '\\u003c'),
          }}
        />
        <DynamicProvider>
          <ConvexProvider>
            <ErrorCaptureProvider />
            {children}
            <FeedbackWidget />
            {/* @ts-ignore React 19 type mismatch with Agentation portal */}
            {process.env.NODE_ENV === 'development' && <Agentation />}
          </ConvexProvider>
        </DynamicProvider>
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src="https://cloud.umami.is/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
