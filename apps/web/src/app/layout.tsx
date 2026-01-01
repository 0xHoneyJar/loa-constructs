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
 */
export const metadata: Metadata = {
  title: {
    default: 'Loa Constructs',
    template: '%s | Loa Constructs',
  },
  description: 'Discover, install, and manage AI agent constructs for the Loa framework',
  keywords: ['AI constructs', 'Claude', 'Loa framework', 'agent constructs', 'marketplace'],
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
