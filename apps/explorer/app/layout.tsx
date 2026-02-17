import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://constructs.network';

export const metadata: Metadata = {
  title: {
    default: 'Constructs Network',
    template: '%s | Constructs Network',
  },
  description: 'Discover AI agent constructs. Preserved expertise you jack into your agent.',
  keywords: ['AI', 'agent', 'constructs', 'skills', 'Claude', 'Loa', 'automation'],
  authors: [{ name: 'Loa', url: 'https://github.com/0xHoneyJar/loa' }],
  creator: 'Loa',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'Constructs Network',
    description: 'Discover AI agent constructs. Preserved expertise you jack into your agent.',
    url: siteUrl,
    siteName: 'Constructs Network',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og/default.png',
        width: 1200,
        height: 630,
        alt: 'Constructs Network - AI Agent Expertise',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Constructs Network',
    description: 'Discover AI agent constructs. Preserved expertise you jack into your agent.',
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

// Minimal root layout — no providers, no Header/Footer.
// Route group layouts handle their own chrome:
//   (marketing)/layout.tsx → Header + Footer
//   (dashboard)/layout.tsx → QueryClientProvider + AuthInitializer + DashboardShell
//   (auth)/layout.tsx → Centered minimal layout
// Root pages (/, /[slug], /about, /install) inherit only this minimal shell.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} min-h-screen bg-background text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
