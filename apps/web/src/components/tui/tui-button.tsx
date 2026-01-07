/**
 * TUI Button Component
 * Border-style buttons with TUI aesthetic
 * Uses CSS for hover states to avoid event handler serialization issues with RSC
 * @see sprint.md T18.8: Create TUI Button Component
 */

import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface TuiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  /** Full width button */
  fullWidth?: boolean;
}

/**
 * TUI-styled button with border aesthetic
 * Uses CSS classes for hover states to work with Server Components
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
  return (
    <button
      className={`tui-button tui-button--${variant} ${fullWidth ? 'tui-button--full' : ''} ${disabled ? 'tui-button--disabled' : ''} ${className}`}
      disabled={disabled}
      style={style}
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
  return (
    <button
      className={`tui-icon-button tui-button--${variant} ${disabled ? 'tui-button--disabled' : ''} ${className}`}
      disabled={disabled}
      style={style}
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
      className={`tui-link-button ${disabled ? 'tui-button--disabled' : ''} ${className}`}
      disabled={disabled}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}

export default TuiButton;
