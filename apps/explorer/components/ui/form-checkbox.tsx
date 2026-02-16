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
              'h-4 w-4 rounded border bg-tui-bg accent-tui-accent',
              error ? 'border-tui-red' : 'border-tui-border',
              className,
            )}
            {...props}
          />
          <span className="text-sm font-mono text-tui-fg">{label}</span>
        </label>
        {error && <p className="text-xs font-mono text-tui-red">{error}</p>}
      </div>
    );
  },
);
FormCheckbox.displayName = 'FormCheckbox';
