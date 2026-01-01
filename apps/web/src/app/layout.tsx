import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';

/**
 * IBM Plex Mono - TUI-style monospace font
 * @see sprint.md T18.1: Replace Font System with IBM Plex Mono
 */
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
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
