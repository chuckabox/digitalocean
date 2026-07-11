import { useState, useRef, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const show = useCallback(() => {
    clearTimeout(timeout.current)
    timeout.current = setTimeout(() => setOpen(true), 200)
  }, [])

  const hide = useCallback(() => {
    clearTimeout(timeout.current)
    setOpen(false)
  }, [])

  return (
    <span className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'absolute left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-[2px] bg-ink text-paper px-2 py-1 font-mono text-[11px] shadow-sm pointer-events-none',
            side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
