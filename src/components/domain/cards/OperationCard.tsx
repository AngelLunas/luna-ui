import { cn } from '../../../lib/utils'
import type { Operation } from '../../../types/connector'
import { Badge } from '../../ui/badge'
import { IconButton } from '../primitives/IconButton'
import { MethodBadge } from '../primitives/MethodBadge'
import type { CardAction } from './_shared'

export type { CardAction }

export interface OperationCardProps {
  operation: Operation
  actions?: CardAction[]
  onClick?: () => void
  className?: string
}

export function OperationCard({
  operation,
  actions,
  onClick,
  className,
}: OperationCardProps) {
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
        'flex flex-col gap-2 rounded border border-border bg-surface p-3 transition-colors',
        !operation.isActive && 'opacity-70',
        isInteractive &&
          'cursor-pointer hover:border-accent-border hover:bg-accent-subtle/30',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MethodBadge method={operation.method} />
          <span className="text-sm font-medium text-text-primary truncate">
            {operation.name}
          </span>
        </div>
        <Badge variant={operation.isActive ? 'success' : 'muted'}>
          {operation.isActive ? 'Active' : 'Paused'}
        </Badge>
      </div>

      <div className="font-mono text-[11px] text-text-muted truncate">
        {operation.path}
      </div>

      {operation.description && (
        <p className="text-xs text-text-muted line-clamp-2">
          {operation.description}
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
