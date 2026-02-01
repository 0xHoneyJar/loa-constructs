import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider',
  {
    variants: {
      variant: {
        default: 'bg-surface text-white/80 border border-border',
        gtm: 'bg-domain-gtm/20 text-domain-gtm border border-domain-gtm/30',
        dev: 'bg-domain-dev/20 text-domain-dev border border-domain-dev/30',
        security: 'bg-domain-security/20 text-domain-security border border-domain-security/30',
        analytics: 'bg-domain-analytics/20 text-domain-analytics border border-domain-analytics/30',
        docs: 'bg-domain-docs/20 text-domain-docs border border-domain-docs/30',
        ops: 'bg-domain-ops/20 text-domain-ops border border-domain-ops/30',
        pack: 'bg-white/10 text-white border border-white/20',
        skill: 'bg-white/5 text-white/60 border border-white/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
