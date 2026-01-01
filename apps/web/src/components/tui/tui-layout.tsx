/**
 * TUI Layout Shell Component
 * Main layout structure with sidebar, content area, and status bar
 * @see sprint.md T19.1: Create TUI Layout Shell
 */

'use client';

import { ReactNode, useState } from 'react';
import { TuiBox } from './tui-box';
import { TuiStatusBar, TuiStatusBarLink } from './tui-status-bar';
import { Menu, X } from 'lucide-react';

interface TuiLayoutProps {
  /** Sidebar content */
  sidebar: ReactNode;
  /** Main content area */
  children: ReactNode;
  /** Title for the content box */
  contentTitle?: string;
  /** Custom status bar key hints */
  keyHints?: Array<{ key: string; action: string }>;
  /** Custom status bar right content */
  statusBarRight?: ReactNode;
}

/**
 * TUI Layout Shell with three-panel design
 * - Sidebar (fixed width on desktop, collapsible on mobile)
 * - Content (flexible)
 * - Status bar (fixed bottom)
 */
export function TuiLayout({
  sidebar,
  children,
  contentTitle,
  keyHints,
  statusBarRight,
}: TuiLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className="tui-layout flex flex-col h-screen overflow-hidden"
      style={{ position: 'relative', zIndex: 1 }}
    >
      {/* Main content area with sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div
          className="hidden md:flex flex-col flex-shrink-0"
          style={{ width: '220px', padding: '12px 0 12px 12px' }}
        >
          <TuiBox title="≡ Menu" className="flex-1">
            {sidebar}
          </TuiBox>
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0, 0, 0, 0.7)' }}
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Mobile Sidebar */}
            <div
              className="fixed inset-y-0 left-0 z-50 flex flex-col md:hidden"
              style={{ width: '260px', padding: '12px' }}
            >
              <TuiBox title="≡ Menu" className="flex-1">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute top-2 right-2 p-1"
                  style={{ color: 'var(--fg-dim)' }}
                >
                  <X size={18} />
                </button>
                {sidebar}
              </TuiBox>
            </div>
          </>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ padding: '12px' }}>
          <TuiBox title={contentTitle} className="flex-1" scrollable>
            {/* Mobile menu button */}
            <div className="md:hidden mb-4 flex items-center">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex items-center gap-2"
                style={{
                  color: 'var(--fg-dim)',
                  background: 'none',
                  border: '1px solid var(--border)',
                  padding: '4px 8px',
                  cursor: 'pointer',
                }}
              >
                <Menu size={16} />
                <span style={{ fontSize: '12px' }}>Menu</span>
              </button>
            </div>
            {children}
          </TuiBox>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ padding: '0 12px 12px' }}>
        <TuiStatusBar
          keyHints={keyHints}
          rightContent={
            statusBarRight || (
              <>
                <TuiStatusBarLink href="https://github.com/0xHoneyJar/loa-constructs">
                  GitHub
                </TuiStatusBarLink>
                <span style={{ color: 'var(--fg-dim)' }}>v1.0.0</span>
              </>
            )
          }
        />
      </div>
    </div>
  );
}

export default TuiLayout;
