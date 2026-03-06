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
          <label htmlFor={inputId} className="block text-xs font-mono text-white/60">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full border bg-white/[0.03] px-3 py-2 text-sm font-mono text-white',
            'placeholder:text-white/30',
            'focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/10',
            'transition-colors',
            error ? 'border-red-500/40' : 'border-white/10',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs font-mono text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs font-mono text-white/40">{hint}</p>}
      </div>
    );
  },
);
FormInput.displayName = 'FormInput';
