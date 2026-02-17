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
        'relative rounded border bg-tui-bg',
        variant === 'danger' ? 'border-tui-red' : 'border-tui-border',
        scrollable && 'overflow-y-auto',
        className,
      )}
    >
      {title && (
        <span
          className={cn(
            'absolute -top-2.5 left-3 bg-tui-bg px-1.5 text-xs font-mono',
            variant === 'danger' ? 'text-tui-red' : 'text-tui-dim',
          )}
        >
          {title}
        </span>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
