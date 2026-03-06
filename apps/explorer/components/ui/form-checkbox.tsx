import * as React from 'react';
import { cn } from '@/lib/utils/cn';

interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export const FormCheckbox = React.forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const checkboxId = id || props.name;
    return (
      <div className="space-y-1">
        <label htmlFor={checkboxId} className="flex items-center gap-2 cursor-pointer">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn(
              'h-4 w-4 border bg-white/[0.03] accent-white',
              error ? 'border-red-500/40' : 'border-white/20',
              className,
            )}
            {...props}
          />
          <span className="text-xs font-mono text-white/60">{label}</span>
        </label>
        {error && <p className="text-xs font-mono text-red-400">{error}</p>}
      </div>
    );
  },
);
FormCheckbox.displayName = 'FormCheckbox';
