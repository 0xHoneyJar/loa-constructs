import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://constructs.loa.dev';

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
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
