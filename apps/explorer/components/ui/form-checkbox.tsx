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
              'h-4 w-4 border bg-void-surface accent-bone-base',
              error ? 'border-crimson-base/40' : 'border-void-border',
              className,
            )}
            {...props}
          />
          <span className="text-xs font-mono text-bone-dim">{label}</span>
        </label>
        {error && <p className="text-xs font-mono text-crimson-base">{error}</p>}
      </div>
    );
  },
);
FormCheckbox.displayName = 'FormCheckbox';
