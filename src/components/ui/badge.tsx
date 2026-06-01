import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-border bg-surface text-text-primary',
        accent:
          'border-accent-border bg-accent-subtle text-accent',
        success:
          'border-accent-border bg-accent-subtle text-success',
        danger:
          'border-danger bg-transparent text-danger',
        warning:
          'border-warning bg-transparent text-warning',
        muted:
          'border-transparent bg-surface text-text-muted',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
