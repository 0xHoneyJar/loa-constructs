import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { getCategoryColor } from '@/lib/utils/colors';

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-terminal',
  {
    variants: {
      variant: {
        default: 'bg-void-raised text-bone-dim border border-void-border',
        pack: 'bg-void-surface text-bone-base border border-bone-ghost',
        skill: 'bg-void-raised text-bone-dim border border-void-border',
        // Category variants use dynamic styling via style prop
        category: '',
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
  // If variant is a category slug, use dynamic styling
  const isCategory = variant && !['default', 'pack', 'skill'].includes(variant);

  if (isCategory) {
    const slug = variant as string;
    const color = getCategoryColor(slug);
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-terminal border',
          className
        )}
        style={{
          backgroundColor: `${color}20`,
          color: color,
          borderColor: `${color}30`,
          ...style,
        }}
        {...props}
      />
    );
  }

  return (
    <span className={cn(badgeVariants({ variant }), className)} style={style} {...props} />
  );
}
