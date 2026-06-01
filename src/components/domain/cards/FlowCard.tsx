import * as React from 'react'
import { cn } from '../../../lib/utils'
import { type Flow, FlowStatus, TriggerType } from '../../../types/flow'
import { Badge } from '../../ui/badge'
import { IconButton } from '../primitives/IconButton'
import { PulseIndicator } from '../primitives/PulseIndicator'
import type { CardAction } from './_shared'

export type { CardAction }

export interface FlowCardProps {
  flow: Flow
  actions?: CardAction[]
  onClick?: () => void
  className?: string
}

const statusVariant: Record<
  FlowStatus,
  React.ComponentProps<typeof Badge>['variant']
> = {
  [FlowStatus.Pending]: 'muted',
  [FlowStatus.Running]: 'accent',
  [FlowStatus.Paused]: 'warning',
  [FlowStatus.Completed]: 'success',
  [FlowStatus.Failed]: 'danger',
}

const statusLabel: Record<FlowStatus, string> = {
  [FlowStatus.Pending]: 'Pending',
  [FlowStatus.Running]: 'Running',
  [FlowStatus.Paused]: 'Paused',
  [FlowStatus.Completed]: 'Completed',
  [FlowStatus.Failed]: 'Failed',
}

const triggerLabel: Record<TriggerType, string> = {
  [TriggerType.Manual]: 'Manual',
  [TriggerType.Schedule]: 'Scheduled',
  [TriggerType.Webhook]: 'Webhook',
}

export function FlowCard({ flow, actions, onClick, className }: FlowCardProps) {
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
        'group flex flex-col gap-3 rounded border border-border bg-surface p-4 transition-colors',
        isInteractive && 'cursor-pointer hover:border-accent-border hover:bg-accent-subtle/30',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {flow.status === FlowStatus.Running && <PulseIndicator size="sm" />}
            <h3 className="text-sm font-medium text-text-primary truncate">{flow.name}</h3>
          </div>
          {flow.description && (
            <p className="text-xs text-text-muted line-clamp-2">{flow.description}</p>
          )}
        </div>
        <Badge variant={statusVariant[flow.status]}>{statusLabel[flow.status]}</Badge>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-text-muted">
        <span>{triggerLabel[flow.triggerType]}</span>
        {flow.schedule && (
          <>
            <span className="text-border">·</span>
            <span className="truncate">{flow.schedule}</span>
          </>
        )}
        {flow.lastRunAt && (
          <>
            <span className="text-border">·</span>
            <span>Last {flow.lastRunAt}</span>
          </>
        )}
        {flow.lastRunDuration && (
          <>
            <span className="text-border">·</span>
            <span>{flow.lastRunDuration}</span>
          </>
        )}
      </div>

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
