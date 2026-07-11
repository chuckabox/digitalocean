import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans text-[13px] font-medium tracking-[0.02em] rounded-[2px] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-transparent text-ink border border-ink-3 hover:bg-paper-2 hover:border-ink-2',
        primary: 'bg-ink text-paper border border-ink hover:bg-[#3A362E] hover:border-[#3A362E]',
        ghost: 'bg-transparent border-none text-ink-2 hover:text-ink hover:bg-paper-2',
        link: 'bg-transparent border-none text-accent p-0 hover:underline',
      },
      size: {
        default: 'py-[9px] px-5',
        sm: 'py-1.5 px-3 text-xs',
        lg: 'py-3 px-6 text-sm',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
