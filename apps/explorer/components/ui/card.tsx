import { cn } from '@/lib/utils/cn';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'border border-border bg-surface/50 backdrop-blur-sm',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('border-b border-border px-4 py-3', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('px-4 py-3', className)} {...props} />;
}
