import * as React from 'react';
import { cn } from '@/lib/utils/cn';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const textareaId = id || props.name;
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-mono text-bone-base">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full rounded border bg-void-base px-3 py-2 text-sm font-mono text-bone-bright',
            'placeholder:text-bone-muted resize-y min-h-[80px]',
            'focus:outline-none focus:border-cyan-base focus:ring-1 focus:ring-cyan-base/30',
            'transition-colors',
            error ? 'border-crimson-base' : 'border-void-border',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs font-mono text-crimson-base">{error}</p>}
        {hint && !error && <p className="text-xs font-mono text-bone-muted">{hint}</p>}
      </div>
    );
  },
);
FormTextarea.displayName = 'FormTextarea';
