import { History } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { type FlowRun } from '../../../types/flow'
import { Button } from '../../ui/button'
import { EmptyState } from '../primitives/EmptyState'
import { FlowRunRow } from './FlowRunRow'

export interface FlowRunHistoryProps {
  runs: FlowRun[]
  loading?: boolean
  /** Render a "Load more" button at the bottom. Caller is responsible for
   *  tracking whether more rows exist on the server. */
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  onRunClick?: (run: FlowRun) => void
  className?: string
}

/**
 * Presentational list of FlowRun rows with a "Load more" button. No data
 * fetching lives here — the consumer owns pagination state and feeds in the
 * accumulated `runs` array plus the `hasMore`/`onLoadMore` cursor.
 */
export function FlowRunHistory({
  runs,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
  onRunClick,
  className,
}: FlowRunHistoryProps) {
  if (loading && runs.length === 0) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded bg-surface animate-pulse" />
        ))}
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <EmptyState
        icon={<History />}
        title="No runs yet"
        description="Runs of this flow will show up here once it has been triggered."
        className={className}
      />
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {runs.map((run) => (
        <FlowRunRow key={run.id} run={run} onClick={onRunClick} />
      ))}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}
