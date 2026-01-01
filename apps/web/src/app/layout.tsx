import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

/**
 * Root Layout
 * @see sdd.md §4.1 Design System - Typography
 * @see sprint.md T5.5: Auth Provider integration
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
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
