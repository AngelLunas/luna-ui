import * as React from 'react'
import { cn } from '../../../lib/utils'
import { type FlowRun, FlowStatus } from '../../../types/flow'
import { Badge } from '../../ui/badge'
import { PulseIndicator } from '../primitives/PulseIndicator'

export interface FlowRunRowProps {
  run: FlowRun
  onClick?: (run: FlowRun) => void
  className?: string
}

const STATUS_VARIANT: Record<
  FlowStatus,
  React.ComponentProps<typeof Badge>['variant']
> = {
  [FlowStatus.Pending]: 'muted',
  [FlowStatus.Running]: 'accent',
  [FlowStatus.Paused]: 'warning',
  [FlowStatus.Completed]: 'success',
  [FlowStatus.Failed]: 'danger',
}

function formatDuration(startedAt: string | null, endedAt: string | null): string | null {
  if (!startedAt) return null
  const end = endedAt ? new Date(endedAt).getTime() : Date.now()
  const start = new Date(startedAt).getTime()
  const ms = Math.max(0, end - start)
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remSeconds = seconds % 60
  if (minutes < 60) return remSeconds ? `${minutes}m ${remSeconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return remMinutes ? `${hours}h ${remMinutes}m` : `${hours}h`
}

function getTriggerSource(trigger: Record<string, unknown>): string | null {
  const source = trigger?.source
  return typeof source === 'string' && source.length > 0 ? source : null
}

/**
 * Generic, presentational row for a single FlowRun. Rendered by FlowRunHistory
 * (and any other list of runs). Holds no data-fetching logic — the parent
 * passes the run object and an optional click handler for navigation.
 */
export function FlowRunRow({ run, onClick, className }: FlowRunRowProps) {
  const isInteractive = Boolean(onClick)
  const duration = formatDuration(run.started_at, run.completed_at)
  const source = getTriggerSource(run.trigger)
  const isRunning = run.status === FlowStatus.Running

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? () => onClick?.(run) : undefined}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick?.(run)
        }
      }}
      className={cn(
        'flex items-center justify-between gap-3 rounded border border-border bg-surface px-4 py-3 transition-colors',
        isInteractive &&
          'cursor-pointer hover:border-accent-border hover:bg-accent-subtle/30',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {isRunning && <PulseIndicator size="sm" />}
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-text-primary truncate">
              {run.id.slice(0, 8)}
            </span>
            {source && (
              <>
                <span className="text-border text-[11px]">·</span>
                <span className="text-[11px] uppercase tracking-wide text-text-muted">
                  {source}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <span>{new Date(run.created_at).toLocaleString()}</span>
            {duration && (
              <>
                <span className="text-border">·</span>
                <span>{duration}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <Badge variant={STATUS_VARIANT[run.status] ?? 'muted'} className="capitalize">
        {run.status}
      </Badge>
    </div>
  )
}
