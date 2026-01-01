/**
 * TUI Status Bar Component
 * Bottom status bar showing keyboard shortcuts and meta information
 * @see sprint.md T18.6: Create TUI Status Bar Component
 */

'use client';

import { ReactNode } from 'react';

interface KeyHint {
  key: string;
  action: string;
}

interface TuiStatusBarProps {
  /** Keyboard hints to display on the left */
  keyHints?: KeyHint[];
  /** Right-side content (links, version, etc.) */
  rightContent?: ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Keyboard key styled as a TUI keycap
 */
function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        padding: '0 4px',
        fontFamily: 'inherit',
        fontSize: '11px',
      }}
    >
      {children}
    </kbd>
  );
}

/**
 * Default keyboard hints for navigation
 */
const defaultKeyHints: KeyHint[] = [
  { key: '↑↓', action: 'navigate' },
  { key: 'Enter', action: 'select' },
  { key: '1-9', action: 'jump' },
  { key: 'q', action: 'quit' },
];

/**
 * TUI-styled status bar fixed at bottom of viewport
 */
export function TuiStatusBar({
  keyHints = defaultKeyHints,
  rightContent,
  className = '',
}: TuiStatusBarProps) {
  return (
    <div
      className={`tui-status-bar flex-shrink-0 ${className}`}
      style={{
        background: 'rgba(0, 0, 0, 0.75)',
        border: '1px solid var(--border)',
        padding: '4px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'var(--fg-dim)',
      }}
    >
      {/* Keyboard hints - hidden on mobile */}
      <div className="hidden md:block">
        {keyHints.map((hint, index) => (
          <span key={index} style={{ marginRight: '16px' }}>
            <Kbd>{hint.key}</Kbd> {hint.action}
          </span>
        ))}
      </div>

      {/* Right content */}
      <div className="flex items-center gap-4">
        {rightContent}
      </div>
    </div>
  );
}

/**
 * Status bar link styled for TUI
 */
export function TuiStatusBarLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      style={{
        color: 'var(--fg-dim)',
        textDecoration: 'none',
      }}
      className="hover:text-[var(--fg)]"
    >
      {children}
    </a>
  );
}

export default TuiStatusBar;
