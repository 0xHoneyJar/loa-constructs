import * as React from 'react';
import { cn } from '@/lib/utils/cn';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-mono text-tui-fg">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded border bg-tui-bg px-3 py-2 text-sm font-mono text-tui-bright',
            'placeholder:text-tui-dim',
            'focus:outline-none focus:border-tui-accent focus:ring-1 focus:ring-tui-accent/30',
            'transition-colors',
            error ? 'border-tui-red' : 'border-tui-border',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs font-mono text-tui-red">{error}</p>}
        {hint && !error && <p className="text-xs font-mono text-tui-dim">{hint}</p>}
      </div>
    );
  },
);
FormInput.displayName = 'FormInput';
