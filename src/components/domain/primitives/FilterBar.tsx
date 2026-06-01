import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface FilterBarProps {
  /** Left side: typically the search input. */
  search?: React.ReactNode
  /** Right side: filter chips, action buttons, etc. */
  children?: React.ReactNode
  /** Optional trailing slot (e.g. result count, sort selector). */
  trailing?: React.ReactNode
  className?: string
}

export function FilterBar({ search, children, trailing, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3',
        className,
      )}
    >
      {search && <div className="sm:max-w-sm sm:flex-1">{search}</div>}
      {children && (
        <div className="flex flex-wrap items-center gap-2 sm:flex-1 sm:min-w-0">
          {children}
        </div>
      )}
      {trailing && (
        <div className="flex items-center gap-2 shrink-0">{trailing}</div>
      )}
    </div>
  )
}
