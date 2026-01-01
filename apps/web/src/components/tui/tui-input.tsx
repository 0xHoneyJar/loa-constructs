/**
 * TUI Input Components
 * Terminal-styled form inputs with TUI aesthetic
 * @see sprint.md T18.9: Create TUI Input Components
 */

'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode, forwardRef } from 'react';

interface TuiInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  hint?: string;
}

interface TuiTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  hint?: string;
}

interface TuiSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  hint?: string;
  children: ReactNode;
}

const baseInputStyles = {
  background: 'rgba(0, 0, 0, 0.5)',
  border: '1px solid var(--border)',
  color: 'var(--fg)',
  padding: '6px 10px',
  fontFamily: 'inherit',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
};

const focusStyles = {
  borderColor: 'var(--accent)',
  boxShadow: '0 0 0 1px var(--accent)',
};

const errorStyles = {
  borderColor: 'var(--red)',
};

/**
 * TUI Text Input
 */
export const TuiInput = forwardRef<HTMLInputElement, TuiInputProps>(
  ({ label, error, hint, className = '', style, ...props }, ref) => {
    return (
      <div className={`tui-input-wrapper ${className}`} style={{ marginBottom: '12px' }}>
        {label && (
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              color: 'var(--fg-dim)',
              fontSize: '12px',
            }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className="tui-input"
          style={{
            ...baseInputStyles,
            ...(error ? errorStyles : {}),
            ...style,
          }}
          onFocus={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = focusStyles.borderColor;
              e.currentTarget.style.boxShadow = focusStyles.boxShadow;
            }
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <span style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            {error}
          </span>
        )}
        {hint && !error && (
          <span style={{ color: 'var(--fg-dim)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            {hint}
          </span>
        )}
      </div>
    );
  }
);

TuiInput.displayName = 'TuiInput';

/**
 * TUI Textarea
 */
export const TuiTextarea = forwardRef<HTMLTextAreaElement, TuiTextareaProps>(
  ({ label, error, hint, className = '', style, ...props }, ref) => {
    return (
      <div className={`tui-textarea-wrapper ${className}`} style={{ marginBottom: '12px' }}>
        {label && (
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              color: 'var(--fg-dim)',
              fontSize: '12px',
            }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className="tui-textarea"
          style={{
            ...baseInputStyles,
            minHeight: '80px',
            resize: 'vertical',
            ...(error ? errorStyles : {}),
            ...style,
          }}
          onFocus={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = focusStyles.borderColor;
              e.currentTarget.style.boxShadow = focusStyles.boxShadow;
            }
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <span style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            {error}
          </span>
        )}
        {hint && !error && (
          <span style={{ color: 'var(--fg-dim)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            {hint}
          </span>
        )}
      </div>
    );
  }
);

TuiTextarea.displayName = 'TuiTextarea';

/**
 * TUI Select
 */
export const TuiSelect = forwardRef<HTMLSelectElement, TuiSelectProps>(
  ({ label, error, hint, className = '', style, children, ...props }, ref) => {
    return (
      <div className={`tui-select-wrapper ${className}`} style={{ marginBottom: '12px' }}>
        {label && (
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              color: 'var(--fg-dim)',
              fontSize: '12px',
            }}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          className="tui-select"
          style={{
            ...baseInputStyles,
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23606060' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
            paddingRight: '28px',
            ...(error ? errorStyles : {}),
            ...style,
          }}
          onFocus={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = focusStyles.borderColor;
              e.currentTarget.style.boxShadow = focusStyles.boxShadow;
            }
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
            props.onBlur?.(e);
          }}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            {error}
          </span>
        )}
        {hint && !error && (
          <span style={{ color: 'var(--fg-dim)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            {hint}
          </span>
        )}
      </div>
    );
  }
);

TuiSelect.displayName = 'TuiSelect';

/**
 * TUI Checkbox
 */
export function TuiCheckbox({
  label,
  className = '',
  style,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode }) {
  return (
    <label
      className={`tui-checkbox ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        color: props.disabled ? 'var(--fg-dim)' : 'var(--fg)',
        ...style,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          border: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.5)',
          color: 'var(--green)',
          fontSize: '12px',
        }}
      >
        <input
          type="checkbox"
          style={{ display: 'none' }}
          {...props}
        />
        {props.checked && '✓'}
      </span>
      {label}
    </label>
  );
}

/**
 * TUI Radio Button
 */
export function TuiRadio({
  label,
  className = '',
  style,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label
      className={`tui-radio ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        color: props.disabled ? 'var(--fg-dim)' : 'var(--fg)',
        ...style,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <input
          type="radio"
          style={{ display: 'none' }}
          {...props}
        />
        {props.checked && (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent)',
            }}
          />
        )}
      </span>
      {label}
    </label>
  );
}

/**
 * TUI Search Input with terminal prompt
 */
export const TuiSearchInput = forwardRef<HTMLInputElement, TuiInputProps>(
  ({ className = '', style, ...props }, ref) => {
    return (
      <div
        className={`tui-search ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border)',
          padding: '0 10px',
        }}
      >
        <span style={{ color: 'var(--fg-dim)', marginRight: '8px' }}>$</span>
        <input
          ref={ref}
          type="search"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--fg)',
            padding: '6px 0',
            fontFamily: 'inherit',
            fontSize: '14px',
            width: '100%',
            outline: 'none',
            ...style,
          }}
          {...props}
        />
      </div>
    );
  }
);

TuiSearchInput.displayName = 'TuiSearchInput';

export default TuiInput;
