import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface PulseIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'sm' | 'md'
  color?: string
}

const sizeMap = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
} as const

export const PulseIndicator = React.forwardRef<HTMLSpanElement, PulseIndicatorProps>(
  ({ size = 'md', color, className, style, ...props }, ref) => {
    const dotColor = color ?? 'var(--color-accent)'
    return (
      <span
        ref={ref}
        className={cn('relative inline-flex items-center justify-center', className)}
        style={style}
        {...props}
      >
        <span
          className={cn('absolute inline-flex rounded-full animate-pulse-ring', sizeMap[size])}
          style={{ backgroundColor: dotColor }}
        />
        <span
          className={cn('relative inline-flex rounded-full', sizeMap[size])}
          style={{ backgroundColor: dotColor }}
        />
      </span>
    )
  },
)
PulseIndicator.displayName = 'PulseIndicator'
