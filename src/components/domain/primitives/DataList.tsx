import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface DataListProps {
  loading?: boolean
  skeletonCount?: number
  /** Approximate height of a single skeleton row in px. */
  skeletonHeight?: number
  emptyState?: React.ReactNode
  /** Gap between list items in tailwind spacing units. Default 2. */
  gap?: 1 | 2 | 3
  children?: React.ReactNode
  className?: string
}

const GAP_CLASS: Record<NonNullable<DataListProps['gap']>, string> = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
}

export function DataList({
  loading = false,
  skeletonCount = 5,
  skeletonHeight = 96,
  emptyState,
  gap = 2,
  children,
  className,
}: DataListProps) {
  if (loading) {
    return (
      <div className={cn('flex flex-col', GAP_CLASS[gap], className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border/50 bg-surface/40 animate-pulse"
            style={{ height: skeletonHeight }}
          />
        ))}
      </div>
    )
  }

  const isEmpty =
    !children ||
    (Array.isArray(children) && children.filter(Boolean).length === 0)

  if (isEmpty && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className={cn('flex flex-col', GAP_CLASS[gap], className)}>
      {children}
    </div>
  )
}
