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
          <label htmlFor={textareaId} className="block text-sm font-mono text-tui-fg">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full rounded border bg-tui-bg px-3 py-2 text-sm font-mono text-tui-bright',
            'placeholder:text-tui-dim resize-y min-h-[80px]',
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
FormTextarea.displayName = 'FormTextarea';
