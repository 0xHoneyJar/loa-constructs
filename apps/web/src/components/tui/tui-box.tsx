/**
 * TUI Box Component
 * A bordered container with optional title, matching terminal UI aesthetic
 * @see sprint.md T18.4: Create TUI Box Component
 */

import { ReactNode } from 'react';

interface TuiBoxProps {
  title?: string;
  className?: string;
  children: ReactNode;
  /** Whether the content should be scrollable */
  scrollable?: boolean;
}

/**
 * TUI-styled box with 1px border and optional floating title
 */
export function TuiBox({ title, className = '', children, scrollable = true }: TuiBoxProps) {
  return (
    <div
      className={`tui-box relative flex flex-col overflow-hidden ${className}`}
      style={{ background: 'rgba(0, 0, 0, 0.75)' }}
    >
      {/* Border overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ border: '1px solid var(--border)' }}
      />

      {/* Title */}
      {title && (
        <span
          className="absolute z-10"
          style={{
            top: '-1px',
            left: '16px',
            background: 'rgba(0, 0, 0, 0.75)',
            padding: '0 8px',
            color: 'var(--accent)',
            fontWeight: 500,
          }}
        >
          {title}
        </span>
      )}

      {/* Content */}
      <div
        className={`flex-1 ${scrollable ? 'overflow-y-auto hide-scrollbar' : 'overflow-hidden'}`}
        style={{ padding: '16px 12px 12px' }}
      >
        {children}
      </div>
    </div>
  );
}

export default TuiBox;
