import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-mono text-xs uppercase tracking-terminal transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-dim focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-bone-base text-void-base hover:bg-bone-dim active:scale-[0.98]',
        secondary:
          'border border-void-border bg-transparent text-bone-base hover:bg-void-raised active:scale-[0.98]',
        ghost:
          'text-bone-dim hover:text-bone-base hover:bg-void-raised',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-7 px-3 text-[10px]',
        lg: 'h-11 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
