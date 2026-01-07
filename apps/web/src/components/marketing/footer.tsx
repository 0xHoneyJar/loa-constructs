/**
 * Marketing Footer Component
 * Footer for public marketing pages
 * @see sprint.md T26.1: Create Marketing Layout Component
 */

import Link from 'next/link';
import { TuiDim } from '@/components/tui/tui-text';

type FooterLink = { href: string; label: string; external?: boolean };

const footerLinks: Record<string, FooterLink[]> = {
  Product: [
    { href: '/packs', label: 'Packs' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/docs', label: 'Documentation' },
  ],
  Company: [
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
    { href: 'mailto:hello@thehoneyjar.xyz', label: 'Contact' },
  ],
  Resources: [
    { href: 'https://github.com/0xHoneyJar/loa', label: 'GitHub', external: true },
    { href: 'https://discord.gg/thehoneyjar', label: 'Discord', external: true },
    { href: 'https://x.com/0xhoneyjar', label: 'Twitter', external: true },
  ],
  Legal: [
    { href: '/terms', label: 'Terms of Service' },
    { href: '/privacy', label: 'Privacy Policy' },
  ],
};

export function MarketingFooter() {
  return (
    <footer
      style={{
        padding: '48px 24px 24px',
        borderTop: '1px solid var(--border)',
        background: 'rgba(0, 0, 0, 0.85)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Link Columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '32px',
            marginBottom: '48px',
          }}
        >
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 style={{ color: 'var(--fg-bright)', fontWeight: 600, marginBottom: '16px', fontSize: '14px' }}>
                {category}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontSize: '13px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-dim)')}
                    >
                      {link.label}
                      {link.external && ' ↗'}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Logo & Copyright */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>LOA</span>
              <span style={{ color: 'var(--fg-dim)' }}>CONSTRUCTS</span>
            </div>
            <TuiDim style={{ fontSize: '12px' }}>
              &copy; {new Date().getFullYear()} The Honey Jar. All rights reserved.
            </TuiDim>
          </div>

          {/* Social Links */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <a
              href="https://github.com/0xHoneyJar/loa"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontSize: '14px' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-dim)')}
              aria-label="GitHub"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/thehoneyjar"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontSize: '14px' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-dim)')}
              aria-label="Discord"
            >
              Discord
            </a>
            <a
              href="https://x.com/0xhoneyjar"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontSize: '14px' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-dim)')}
              aria-label="Twitter"
            >
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default MarketingFooter;
