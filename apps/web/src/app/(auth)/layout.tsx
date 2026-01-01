/**
 * Auth Layout (TUI Style)
 * @see sprint.md T20.3: Redesign Authentication Pages
 */

import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Logo and Branding */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h1
          style={{
            color: 'var(--green)',
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '4px',
          }}
        >
          LOA CONSTRUCTS
        </h1>
        <p style={{ color: 'var(--fg-dim)', fontSize: '12px' }}>
          Agent-driven development framework
        </p>
      </div>

      {/* Auth Card Container */}
      <div style={{ width: '100%', maxWidth: '400px' }}>{children}</div>

      {/* Footer */}
      <footer
        style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--fg-dim)',
        }}
      >
        <p>&copy; {new Date().getFullYear()} The Honey Jar. All rights reserved.</p>
      </footer>
    </div>
  );
}
