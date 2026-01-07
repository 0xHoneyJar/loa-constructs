import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { AuthProvider } from '@/contexts/auth-context';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './globals.css';

/**
 * IBM Plex Mono - TUI-style monospace font (self-hosted via fontsource)
 * @see sprint.md T18.1: Replace Font System with IBM Plex Mono
 */
const ibmPlexMono = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-mono',
});

/**
 * Root Layout
 * @see sprint.md T18.1: TUI Foundation - IBM Plex Mono
 * @see sprint.md T26.13: Add SEO Metadata and Open Graph
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://constructs.network'),
  title: {
    default: 'Loa Constructs - Skill Packs for Claude Code',
    template: '%s | Loa Constructs',
  },
  description: 'Pre-built agent workflows for Claude Code. GTM strategy, security audits, documentation, and more. Install in one command.',
  keywords: [
    'Claude Code',
    'skill packs',
    'agent workflows',
    'GTM',
    'go-to-market',
    'AI agents',
    'developer tools',
    'Claude',
    'Anthropic',
    'code automation',
  ],
  authors: [{ name: 'The Honey Jar', url: 'https://thehoneyjar.xyz' }],
  creator: 'The Honey Jar',
  publisher: 'The Honey Jar',
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://constructs.network',
    siteName: 'Loa Constructs',
    title: 'Loa Constructs - Skill Packs for Claude Code',
    description: 'Pre-built agent workflows for Claude Code. GTM strategy, security audits, documentation, and more. Install in one command.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Loa Constructs - Skill Packs for Claude Code',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@0xhoneyjar',
    creator: '@0xhoneyjar',
    title: 'Loa Constructs - Skill Packs for Claude Code',
    description: 'Pre-built agent workflows for Claude Code. GTM strategy, security audits, documentation, and more.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://constructs.network',
  },
  category: 'technology',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ibmPlexMono.variable} font-mono`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
