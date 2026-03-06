import { cn } from '@/lib/utils/cn';

interface PanelProps {
  title?: string;
  variant?: 'default' | 'danger';
  scrollable?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Panel({
  title,
  variant = 'default',
  scrollable = false,
  className,
  children,
}: PanelProps) {
  return (
    <div
      className={cn(
        'relative border bg-background',
        variant === 'danger' ? 'border-crimson-base/30' : 'border-void-border',
        scrollable && 'overflow-y-auto',
        className,
      )}
    >
      {title && (
        <span
          className={cn(
            'absolute -top-2.5 left-3 bg-background px-1.5 text-xs font-mono',
            variant === 'danger' ? 'text-crimson-base' : 'text-bone-ghost',
          )}
        >
          {title}
        </span>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
