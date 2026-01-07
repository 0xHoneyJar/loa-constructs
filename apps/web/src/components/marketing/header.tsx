/**
 * Marketing Header Component
 * Navigation header for public marketing pages
 * @see sprint.md T26.1: Create Marketing Layout Component
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TuiButton } from '@/components/tui/tui-button';
import { TuiTag } from '@/components/tui/tui-text';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/packs', label: 'Packs' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/about', label: 'About' },
];

export function MarketingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
        <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: '16px' }}>LOA</span>
        <span style={{ color: 'var(--fg-dim)' }}>CONSTRUCTS</span>
        <TuiTag color="cyan">BETA</TuiTag>
      </Link>

      {/* Desktop Navigation */}
      <nav
        style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'center',
        }}
        className="hidden md:flex"
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="tui-nav-link"
            style={{
              color: 'var(--fg)',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            {item.label}
          </Link>
        ))}
        <Link href="/login" style={{ color: 'var(--fg-dim)', textDecoration: 'none', fontSize: '14px' }}>
          Login
        </Link>
        <Link href="/register">
          <TuiButton>Get Started</TuiButton>
        </Link>
      </nav>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          background: 'none',
          border: '1px solid var(--border)',
          color: 'var(--fg)',
          padding: '8px 12px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '14px',
        }}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            borderBottom: '1px solid var(--border)',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                color: 'var(--fg)',
                textDecoration: 'none',
                fontSize: '14px',
                padding: '8px 0',
              }}
            >
              {item.label}
            </Link>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--fg-dim)', textDecoration: 'none' }}>
              Login
            </Link>
            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
              <TuiButton fullWidth>Get Started</TuiButton>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default MarketingHeader;
