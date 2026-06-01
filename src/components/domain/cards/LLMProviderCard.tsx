import { KeyRound, KeySquare } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { LLMProvider } from '../../../types/llmProvider'
import { Badge } from '../../ui/badge'
import { IconButton } from '../primitives/IconButton'
import type { CardAction } from './_shared'

export type { CardAction }

export interface LLMProviderCardProps {
  provider: LLMProvider
  actions?: CardAction[]
  onClick?: () => void
  className?: string
}

export function LLMProviderCard({
  provider,
  actions,
  onClick,
  className,
}: LLMProviderCardProps) {
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
        !provider.isActive && 'opacity-70',
        isInteractive &&
          'cursor-pointer hover:border-accent-border hover:bg-accent-subtle/30',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h3 className="text-sm font-medium text-text-primary truncate">
            {provider.name}
          </h3>
          <p className="text-xs text-text-muted font-mono truncate">
            {provider.baseUrl}
          </p>
        </div>
        <Badge variant={provider.isActive ? 'success' : 'muted'}>
          {provider.isActive ? 'Active' : 'Paused'}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-1">
          {provider.hasApiKey ? (
            <>
              <KeyRound size={12} />
              <span>API key configured</span>
            </>
          ) : (
            <>
              <KeySquare size={12} />
              <span>No API key</span>
            </>
          )}
        </span>
        {(provider.chatUrl || provider.modelsUrl) && (
          <>
            <span className="text-border">·</span>
            <span>custom URLs</span>
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
