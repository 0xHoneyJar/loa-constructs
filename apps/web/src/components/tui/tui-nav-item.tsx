/**
 * TUI Navigation Item Component
 * Navigation link styled for terminal UI with keyboard shortcut display
 * @see sprint.md T18.5: Create TUI Navigation Item Component
 */

'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface TuiNavItemProps {
  href: string;
  label: string;
  /** Keyboard shortcut to display (e.g., "1", "2") */
  shortcut?: string;
  /** Whether this item is currently active */
  active?: boolean;
  /** Icon or custom indicator */
  icon?: ReactNode;
  /** Click handler */
  onClick?: () => void;
}

/**
 * TUI-styled navigation item with active state and keyboard shortcut
 */
export function TuiNavItem({
  href,
  label,
  shortcut,
  active = false,
  icon,
  onClick,
}: TuiNavItemProps) {
  const baseStyles = {
    display: 'block',
    padding: '4px 8px',
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  };

  const activeStyles = active
    ? {
        background: 'var(--accent)',
        color: '#000',
      }
    : {
        color: 'var(--fg)',
      };

  const indicatorStyles = {
    display: 'inline-block',
    width: '20px',
    color: active ? '#000' : 'var(--fg-dim)',
  };

  const shortcutStyles = {
    float: 'right' as const,
    color: active ? '#000' : 'var(--fg-dim)',
  };

  return (
    <Link
      href={href}
      onClick={onClick}
      className="tui-nav-item hover:bg-[rgba(95,175,255,0.1)]"
      style={{ ...baseStyles, ...activeStyles }}
    >
      <span style={indicatorStyles}>
        {icon || (active ? '▸' : ' ')}
      </span>
      {label}
      {shortcut && (
        <span style={shortcutStyles}>[{shortcut}]</span>
      )}
    </Link>
  );
}

export default TuiNavItem;
