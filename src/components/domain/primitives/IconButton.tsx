import * as React from 'react'
import { cn } from '../../../lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip'

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: React.ReactNode
  label: string
  variant?: 'default' | 'accent' | 'danger'
  size?: 'sm' | 'md'
}

const variantClasses = {
  default:
    'text-text-muted hover:text-text-primary hover:bg-surface border border-transparent',
  accent:
    'text-accent hover:bg-accent-subtle border border-accent-border',
  danger:
    'text-danger hover:bg-danger/10 border border-transparent',
} as const

const sizeClasses = {
  sm: 'h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'h-8 w-8 [&_svg]:h-4 [&_svg]:w-4',
} as const

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = 'default', size = 'md', className, disabled, ...props }, ref) => {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              ref={ref}
              type="button"
              aria-label={label}
              disabled={disabled}
              className={cn(
                'inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50',
                variantClasses[variant],
                sizeClasses[size],
                className,
              )}
              {...props}
            >
              {icon}
            </button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
)
IconButton.displayName = 'IconButton'
