/**
 * Marketing Landing Page Metadata
 * Since page.tsx is a client component, we export metadata separately
 * @see sprint.md T26.13: Add SEO Metadata and Open Graph
 */

import type { Metadata } from 'next';

export const homeMetadata: Metadata = {
  title: 'Loa Constructs - Skill Packs for Claude Code',
  description: 'Pre-built agent workflows for Claude Code. GTM strategy, security audits, documentation, deployment, and more. Install in one command.',
  openGraph: {
    title: 'Loa Constructs - Skill Packs for Claude Code',
    description: 'Pre-built agent workflows for Claude Code. GTM strategy, security audits, documentation, and more.',
    type: 'website',
    url: 'https://constructs.network',
  },
  twitter: {
    title: 'Loa Constructs - Skill Packs for Claude Code',
    description: 'Pre-built agent workflows for Claude Code. Beyond coding.',
  },
};
