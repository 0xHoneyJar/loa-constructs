import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 text-sm font-mono uppercase tracking-terminal border',
  {
    variants: {
      variant: {
        default: 'bg-void-raised text-bone-dim border-void-border',
        pack: 'bg-void-surface text-bone-base border-bone-ghost',
        skill: 'bg-void-raised text-bone-dim border-void-border',
        cyan: 'bg-tint-cyan-dim-bg text-cyan-dim border-tint-cyan-dim-border',
        internal: 'bg-tint-cyan-bg text-cyan-base border-tint-cyan-border',
        proven: 'bg-tint-stable-bg text-graduation-stable border-tint-stable-border',
        backtested: 'bg-tint-beta-bg text-graduation-beta border-tint-beta-border',
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

export function Badge({ className, variant, style, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} style={style} {...props} />
  );
}
