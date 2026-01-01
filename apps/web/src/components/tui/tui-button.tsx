/**
 * TUI Button Component
 * Border-style buttons with TUI aesthetic
 * @see sprint.md T18.8: Create TUI Button Component
 */

'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface TuiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  /** Full width button */
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, { border: string; color: string; hoverBg: string; hoverColor: string }> = {
  primary: {
    border: 'var(--accent)',
    color: 'var(--accent)',
    hoverBg: 'var(--accent)',
    hoverColor: '#000',
  },
  secondary: {
    border: 'var(--border)',
    color: 'var(--fg)',
    hoverBg: 'var(--fg)',
    hoverColor: '#000',
  },
  danger: {
    border: 'var(--red)',
    color: 'var(--red)',
    hoverBg: 'var(--red)',
    hoverColor: '#000',
  },
};

/**
 * TUI-styled button with border aesthetic
 */
export function TuiButton({
  children,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  className = '',
  style,
  ...props
}: TuiButtonProps) {
  const styles = variantStyles[variant];

  return (
    <button
      className={`tui-button group ${className}`}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: `1px solid ${disabled ? 'var(--fg-dim)' : styles.border}`,
        color: disabled ? 'var(--fg-dim)' : styles.color,
        padding: '6px 16px',
        fontFamily: 'inherit',
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.1s ease',
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = styles.hoverBg;
          e.currentTarget.style.color = styles.hoverColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = styles.color;
        }
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = `1px solid ${styles.border}`;
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * TUI Icon Button - Square button for icons
 */
export function TuiIconButton({
  children,
  variant = 'secondary',
  disabled = false,
  className = '',
  style,
  ...props
}: TuiButtonProps) {
  const styles = variantStyles[variant];

  return (
    <button
      className={`tui-icon-button ${className}`}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: `1px solid ${disabled ? 'var(--fg-dim)' : styles.border}`,
        color: disabled ? 'var(--fg-dim)' : styles.color,
        padding: '4px 8px',
        fontFamily: 'inherit',
        fontSize: '14px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.1s ease',
        opacity: disabled ? 0.5 : 1,
        lineHeight: 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = styles.hoverBg;
          e.currentTarget.style.color = styles.hoverColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = styles.color;
        }
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = `1px solid ${styles.border}`;
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * TUI Link Button - Button styled as a link
 */
export function TuiLinkButton({
  children,
  disabled = false,
  className = '',
  style,
  ...props
}: Omit<TuiButtonProps, 'variant' | 'fullWidth'>) {
  return (
    <button
      className={`tui-link-button ${className}`}
      disabled={disabled}
      style={{
        background: 'none',
        border: 'none',
        color: disabled ? 'var(--fg-dim)' : 'var(--cyan)',
        padding: 0,
        fontFamily: 'inherit',
        fontSize: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textDecoration: 'none',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.textDecoration = 'underline';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecoration = 'none';
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export default TuiButton;
