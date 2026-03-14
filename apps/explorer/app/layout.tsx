import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import localFont from 'next/font/local';
import { DynamicProvider } from '@/components/providers/dynamic-provider';
import { ConvexProvider } from '@/components/providers/convex-provider';
import { FeedbackWidget } from '@/components/feedback-widget';
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
        <DynamicProvider>
          <ConvexProvider>
            {children}
            <FeedbackWidget />
            {/* @ts-ignore React 19 type mismatch with Agentation portal */}
            {process.env.NODE_ENV === 'development' && <Agentation />}
          </ConvexProvider>
        </DynamicProvider>
      </body>
    </html>
  );
}
