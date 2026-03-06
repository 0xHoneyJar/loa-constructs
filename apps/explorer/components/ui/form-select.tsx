import * as React from 'react';
import { cn } from '@/lib/utils/cn';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, hint, className, id, children, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-mono text-bone-base">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded border bg-void-base px-3 py-2 text-sm font-mono text-bone-bright',
            'appearance-none cursor-pointer',
            'focus:outline-none focus:border-cyan-base focus:ring-1 focus:ring-cyan-base/30',
            'transition-colors',
            error ? 'border-crimson-base' : 'border-void-border',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs font-mono text-crimson-base">{error}</p>}
        {hint && !error && <p className="text-xs font-mono text-bone-muted">{hint}</p>}
      </div>
    );
  },
);
FormSelect.displayName = 'FormSelect';
