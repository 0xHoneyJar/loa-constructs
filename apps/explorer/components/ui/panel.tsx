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
        variant === 'danger' ? 'border-red-500/30' : 'border-white/10',
        scrollable && 'overflow-y-auto',
        className,
      )}
    >
      {title && (
        <span
          className={cn(
            'absolute -top-2.5 left-3 bg-background px-1.5 text-xs font-mono',
            variant === 'danger' ? 'text-red-400' : 'text-white/40',
          )}
        >
          {title}
        </span>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
