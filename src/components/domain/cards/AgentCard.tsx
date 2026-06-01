import { cn } from '../../../lib/utils'
import { type Agent, AgentProvider } from '../../../types/agent'
import { Badge } from '../../ui/badge'
import { IconButton } from '../primitives/IconButton'
import type { CardAction } from './_shared'

export type { CardAction }

export interface AgentCardProps {
  agent: Agent
  actions?: CardAction[]
  onClick?: () => void
  className?: string
}

const providerLabel: Record<AgentProvider, string> = {
  [AgentProvider.Kimi]: 'Kimi',
  [AgentProvider.Anthropic]: 'Anthropic',
  [AgentProvider.OpenAI]: 'OpenAI',
  [AgentProvider.Ollama]: 'Ollama',
}

export function AgentCard({ agent, actions, onClick, className }: AgentCardProps) {
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
          <h3 className="text-sm font-medium text-text-primary truncate">{agent.name}</h3>
          {agent.role && (
            <p className="text-xs text-text-muted line-clamp-2">{agent.role}</p>
          )}
        </div>
        <Badge variant="muted">{providerLabel[agent.provider]}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
        <span className="font-mono">{agent.model}</span>
        <span className="text-border">·</span>
        <span>temp {agent.temperature.toFixed(2)}</span>
        <span className="text-border">·</span>
        <span>
          {agent.toolsCount} {agent.toolsCount === 1 ? 'tool' : 'tools'}
        </span>
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
