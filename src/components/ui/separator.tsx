import * as React from 'react'
import { cn } from '@/lib/utils'

interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical'
}

const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => (
    <hr
      ref={ref}
      className={cn(
        'border-0 border-rule shrink-0',
        orientation === 'horizontal' ? 'border-t w-full' : 'border-l h-full',
        className,
      )}
      {...props}
    />
  )
)
Separator.displayName = 'Separator'

export { Separator }
