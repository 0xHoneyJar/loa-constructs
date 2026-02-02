import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { getCategoryColor } from '@/lib/utils/colors';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider',
  {
    variants: {
      variant: {
        default: 'bg-surface text-white/80 border border-border',
        pack: 'bg-white/10 text-white border border-white/20',
        skill: 'bg-white/5 text-white/60 border border-white/10',
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
          'inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border',
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
