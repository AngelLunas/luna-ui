import { cn } from '../../../lib/utils'
import { EmptyState } from './EmptyState'

export interface CardGridProps {
  loading?: boolean
  skeletonCount?: number
  columns?: 1 | 2 | 3 | 4
  emptyState?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

const COLUMN_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
}

export function CardGrid({
  loading = false,
  skeletonCount = 6,
  columns = 3,
  emptyState,
  children,
  className,
}: CardGridProps) {
  if (loading) {
    return (
      <div className={cn('grid gap-4', COLUMN_CLASS[columns], className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="h-48 rounded bg-surface animate-pulse" />
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
    <div className={cn('grid gap-4', COLUMN_CLASS[columns], className)}>
      {children}
    </div>
  )
}

CardGrid.Empty = EmptyState
