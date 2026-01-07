/**
 * TUI Typography Components
 * Styled text components for headings, paragraphs, links, and code blocks
 * @see sprint.md T18.7: Create TUI Typography Components
 */

import { ReactNode, HTMLAttributes, AnchorHTMLAttributes } from 'react';

interface TextProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  className?: string;
}

/**
 * TUI H1 - Primary heading with green color and blinking cursor option
 */
export function TuiH1({ children, className = '', ...props }: TextProps & { cursor?: boolean }) {
  const { cursor, ...rest } = props as TextProps & { cursor?: boolean };
  return (
    <h1
      className={className}
      style={{
        color: 'var(--green)',
        fontSize: '14px',
        fontWeight: 600,
        marginBottom: '8px',
      }}
      {...rest}
    >
      {children}
      {cursor && <span className="cursor" />}
    </h1>
  );
}

/**
 * TUI H2 - Section heading with accent color and bottom border
 */
export function TuiH2({ children, className = '', ...props }: TextProps) {
  return (
    <h2
      className={className}
      style={{
        color: 'var(--accent)',
        fontSize: '14px',
        fontWeight: 500,
        marginBottom: '8px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '4px',
      }}
      {...props}
    >
      {children}
    </h2>
  );
}

/**
 * TUI H3 - Subsection heading
 */
export function TuiH3({ children, className = '', ...props }: TextProps) {
  return (
    <h3
      className={className}
      style={{
        color: 'var(--fg-bright)',
        fontSize: '14px',
        fontWeight: 500,
        marginBottom: '4px',
      }}
      {...props}
    >
      {children}
    </h3>
  );
}

/**
 * TUI Paragraph - Standard text
 */
export function TuiP({ children, className = '', ...props }: TextProps) {
  return (
    <p
      className={className}
      style={{
        marginBottom: '12px',
        color: 'var(--fg)',
      }}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * TUI Link - Cyan colored link
 */
export function TuiLink({ children, className = '', href, ...props }: LinkProps) {
  return (
    <a
      href={href}
      className={`hover:underline ${className}`}
      style={{
        color: 'var(--cyan)',
        textDecoration: 'none',
      }}
      {...props}
    >
      {children}
    </a>
  );
}

/**
 * TUI Code Block - Styled code container (Server Component compatible)
 * Note: For copyable functionality, use TuiCodeCopyable from tui-code-copyable.tsx
 */
export function TuiCode({
  children,
  className = '',
  copyable: _copyable = false,
  ...props
}: TextProps & { copyable?: boolean }) {
  // Note: copyable prop is accepted but ignored in this Server Component version
  // Use TuiCodeCopyable for interactive copy functionality
  void _copyable; // Explicitly mark as unused to satisfy ESLint
  return (
    <div
      className={`relative ${className}`}
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        border: '1px solid var(--border)',
        padding: '8px 12px',
        margin: '8px 0',
        color: 'var(--green)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * TUI Inline Code - Styled inline code
 */
export function TuiInlineCode({ children, className = '' }: TextProps) {
  return (
    <code
      className={className}
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '1px 4px',
        color: 'var(--green)',
        fontSize: '13px',
      }}
    >
      {children}
    </code>
  );
}

/**
 * TUI Prompt - Command prompt prefix
 */
export function TuiPrompt({ children }: { children?: ReactNode }) {
  return (
    <span style={{ color: 'var(--fg-dim)' }}>
      {children || '$'}
    </span>
  );
}

/**
 * TUI Divider - ASCII-style horizontal divider
 */
export function TuiDivider({ length = 45, className = '' }: { length?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        color: 'var(--fg-dim)',
        margin: '12px 0',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {'─'.repeat(length)}
    </div>
  );
}

/**
 * TUI Dim Text - Dimmed text for secondary information
 */
export function TuiDim({ children, className = '' }: TextProps) {
  return (
    <span className={className} style={{ color: 'var(--fg-dim)' }}>
      {children}
    </span>
  );
}

/**
 * TUI Bright Text - Bright white text for emphasis
 */
export function TuiBright({ children, className = '' }: TextProps) {
  return (
    <span className={className} style={{ color: 'var(--fg-bright)' }}>
      {children}
    </span>
  );
}

/**
 * TUI Success Text - Green text for success states
 */
export function TuiSuccess({ children, className = '' }: TextProps) {
  return (
    <span className={className} style={{ color: 'var(--green)' }}>
      {children}
    </span>
  );
}

/**
 * TUI Warning Text - Yellow text for warnings
 */
export function TuiWarning({ children, className = '' }: TextProps) {
  return (
    <span className={className} style={{ color: 'var(--yellow)' }}>
      {children}
    </span>
  );
}

/**
 * TUI Error Text - Red text for errors
 */
export function TuiError({ children, className = '' }: TextProps) {
  return (
    <span className={className} style={{ color: 'var(--red)' }}>
      {children}
    </span>
  );
}

/**
 * TUI Tag - Colored tag/badge
 */
export function TuiTag({
  children,
  color = 'cyan',
  className = '',
}: TextProps & { color?: 'cyan' | 'green' | 'yellow' | 'red' | 'accent' }) {
  const colorMap = {
    cyan: 'var(--cyan)',
    green: 'var(--green)',
    yellow: 'var(--yellow)',
    red: 'var(--red)',
    accent: 'var(--accent)',
  };

  return (
    <span className={className} style={{ color: colorMap[color] }}>
      {children}
    </span>
  );
}
