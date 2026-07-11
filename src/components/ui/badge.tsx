import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-[2px] font-mono text-[11px] font-medium tracking-[0.02em] transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-neutral-soft text-ink-2',
        accent: 'bg-accent-soft text-accent',
        alert: 'bg-alert-soft text-alert',
        warn: 'bg-warn-soft text-warn',
        positive: 'bg-positive-soft text-positive',
      },
      size: {
        default: 'px-2 py-0.5',
        sm: 'px-1.5 py-px text-[10px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />
}

export { Badge, badgeVariants }
