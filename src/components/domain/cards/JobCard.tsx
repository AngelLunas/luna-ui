import * as React from 'react'
import { cn } from '../../../lib/utils'
import { Badge } from '../../ui/badge'
import { IconButton } from '../primitives/IconButton'
import type { CardAction } from './_shared'

export type { CardAction }

export type JobStatusVariant = 'success' | 'idle' | 'running' | 'failed'

export interface JobCardData {
  id: string
  title: string
  description?: string
  sourceName: string
  budget?: string
  clientName?: string
  clientCountry?: string
  skills: string[]
  postedAt: string
  statusLabel: string
  statusVariant: JobStatusVariant
  score?: number
  scoreReason?: string
  url?: string
}

export interface JobCardProps {
  job: JobCardData
  actions?: CardAction[]
  onClick?: () => void
  showScore?: boolean
  showDescription?: boolean
  className?: string
}

const statusBadgeVariant: Record<JobStatusVariant, React.ComponentProps<typeof Badge>['variant']> = {
  success: 'success',
  idle: 'muted',
  running: 'accent',
  failed: 'danger',
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success'
  if (score >= 50) return 'text-accent'
  if (score >= 25) return 'text-warning'
  return 'text-text-muted'
}

export function JobCard({
  job,
  actions,
  onClick,
  showScore = false,
  showDescription = true,
  className,
}: JobCardProps) {
  const isInteractive = Boolean(onClick)
  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        'flex flex-col gap-3 rounded border border-border bg-surface p-4 transition-colors',
        isInteractive && 'cursor-pointer hover:border-accent-border hover:bg-accent-subtle/30',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h3 className="text-sm font-medium text-text-primary line-clamp-2">{job.title}</h3>
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            <span>{job.sourceName}</span>
            <span className="text-border">·</span>
            <span>{job.postedAt}</span>
            {job.clientName && (
              <>
                <span className="text-border">·</span>
                <span className="truncate">
                  {job.clientName}
                  {job.clientCountry && ` (${job.clientCountry})`}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant={statusBadgeVariant[job.statusVariant]}>{job.statusLabel}</Badge>
          {showScore && job.score !== undefined && (
            <span className={cn('text-xs font-mono font-semibold', scoreColor(job.score))}>
              {job.score}
            </span>
          )}
        </div>
      </div>

      {showDescription && job.description && (
        <p className="text-xs text-text-muted line-clamp-3">{job.description}</p>
      )}

      {(job.budget || job.skills.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {job.budget && (
            <span className="text-xs text-text-primary font-medium">{job.budget}</span>
          )}
          {job.budget && job.skills.length > 0 && (
            <span className="text-border text-xs">·</span>
          )}
          {job.skills.slice(0, 5).map((skill, i) => (
            <Badge key={i} variant="muted">
              {skill}
            </Badge>
          ))}
          {job.skills.length > 5 && (
            <span className="text-[11px] text-text-muted">+{job.skills.length - 5}</span>
          )}
        </div>
      )}

      {showScore && job.scoreReason && (
        <p className="text-[11px] text-text-muted italic line-clamp-2 border-l-2 border-accent-border pl-2">
          {job.scoreReason}
        </p>
      )}

      {actions && actions.length > 0 && (
        <div
          className="flex items-center gap-1 pt-2 border-t border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action, i) => (
            <IconButton
              key={i}
              icon={action.icon}
              label={action.label}
              onClick={action.onClick}
              variant={action.variant}
              size="sm"
            />
          ))}
        </div>
      )}
    </div>
  )
}
