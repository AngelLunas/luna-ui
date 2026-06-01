import { KeyRound, KeySquare } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { Connector } from '../../../types/connector'
import { Badge } from '../../ui/badge'
import { IconButton } from '../primitives/IconButton'
import type { CardAction } from './_shared'

export type { CardAction }

export interface ConnectorCardProps {
  connector: Connector
  /** Optional operations count to render under the URL. */
  operationsCount?: number
  actions?: CardAction[]
  onClick?: () => void
  className?: string
}

function formatAuth(authType: string): string {
  if (authType === 'api_key') return 'api_key'
  return authType
}

export function ConnectorCard({
  connector,
  operationsCount,
  actions,
  onClick,
  className,
}: ConnectorCardProps) {
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
        !connector.isActive && 'opacity-70',
        isInteractive &&
          'cursor-pointer hover:border-accent-border hover:bg-accent-subtle/30',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h3 className="text-sm font-medium text-text-primary truncate">
            {connector.name}
          </h3>
          <p className="text-xs text-text-muted font-mono truncate">
            {connector.baseUrl}
          </p>
        </div>
        <Badge variant={connector.isActive ? 'success' : 'muted'}>
          {connector.isActive ? 'Active' : 'Paused'}
        </Badge>
      </div>

      {connector.description && (
        <p className="text-xs text-text-muted line-clamp-2">
          {connector.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
        <Badge variant="muted" className="font-mono">
          {formatAuth(connector.authType)}
        </Badge>
        {connector.authType !== 'none' && (
          <span className="inline-flex items-center gap-1">
            {connector.hasCredentials ? (
              <>
                <KeyRound size={12} />
                <span>credentials set</span>
              </>
            ) : (
              <>
                <KeySquare size={12} />
                <span>no credentials</span>
              </>
            )}
          </span>
        )}
        {typeof operationsCount === 'number' && (
          <>
            <span className="text-border">·</span>
            <span>
              {operationsCount} {operationsCount === 1 ? 'operation' : 'operations'}
            </span>
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
