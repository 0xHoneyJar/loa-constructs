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
          <label htmlFor={inputId} className="block text-xs font-mono text-bone-dim">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full border bg-void-surface px-3 py-2 text-sm font-mono text-bone-base',
            'placeholder:text-bone-ghost',
            'focus:outline-none focus:border-bone-ghost focus:ring-1 focus:ring-void-border',
            'transition-colors',
            error ? 'border-crimson-base/40' : 'border-void-border',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs font-mono text-crimson-base">{error}</p>}
        {hint && !error && <p className="text-xs font-mono text-bone-ghost">{hint}</p>}
      </div>
    );
  },
);
FormInput.displayName = 'FormInput';
