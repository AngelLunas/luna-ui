import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Badge } from '../../ui/badge'

export interface AgentSummaryOperation {
  id: string
  name?: string | null
  description?: string | null
  method?: string | null
}

/**
 * One in-process system tool granted to the agent. Names are the
 * registry catalog keys (e.g. ``stash_records``, ``save_recommended_job``);
 * descriptions come from the same catalog and are optional — when
 * absent the row renders the name alone.
 */
export interface AgentSummarySystemTool {
  name: string
  description?: string | null
}

export interface AgentSummaryProps {
  name: string
  provider?: string | null
  model?: string | null
  temperature?: number | null
  role?: string | null
  instructions?: string | null
  operations?: AgentSummaryOperation[] | null
  operationsLoading?: boolean
  /** Catalog system tools granted to the agent. `null` = not loaded
   * yet (caller is still fetching); `[]` = loaded and the agent has
   * none. Same loading convention as ``operations``. */
  systemTools?: AgentSummarySystemTool[] | null
  systemToolsLoading?: boolean
  loading?: boolean
  error?: boolean | string
  className?: string
}

function CollapsibleText({
  label,
  text,
  previewLines = 2,
}: {
  label: string
  text: string
  previewLines?: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-0.5 text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          {open ? 'Show less' : 'Show more'}
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
      <p
        className={cn(
          'text-xs leading-relaxed text-text-primary whitespace-pre-wrap',
          !open && 'overflow-hidden',
        )}
        style={
          open
            ? undefined
            : {
                display: '-webkit-box',
                WebkitLineClamp: previewLines,
                WebkitBoxOrient: 'vertical',
              }
        }
      >
        {text}
      </p>
    </div>
  )
}

export function AgentSummary({
  name,
  provider,
  model,
  temperature,
  role,
  instructions,
  operations,
  operationsLoading,
  systemTools,
  systemToolsLoading,
  loading,
  error,
  className,
}: AgentSummaryProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'h-32 rounded border border-border bg-bg animate-pulse',
          className,
        )}
      />
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          'rounded border border-border bg-bg p-2 text-xs text-text-muted',
          className,
        )}
      >
        {typeof error === 'string' ? error : 'Could not load agent.'}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded border border-border bg-bg p-3',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-text-primary truncate">{name}</span>
        {provider && (
          <Badge variant="muted" className="capitalize shrink-0">
            {provider}
          </Badge>
        )}
      </div>

      {(model || temperature !== null && temperature !== undefined) && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
          {model && <span className="font-mono">{model}</span>}
          {model && temperature !== null && temperature !== undefined && (
            <span className="text-border">·</span>
          )}
          {temperature !== null && temperature !== undefined && (
            <span>temp {temperature.toFixed(2)}</span>
          )}
        </div>
      )}

      {role && <CollapsibleText label="Role" text={role} previewLines={2} />}

      {instructions && (
        <CollapsibleText label="Instructions" text={instructions} previewLines={3} />
      )}

      {(operationsLoading || (operations && operations.length > 0)) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-text-muted">
            Operations{operations ? ` (${operations.length})` : ''}
          </span>
          {operationsLoading && !operations ? (
            <div className="h-12 rounded border border-border bg-surface animate-pulse" />
          ) : (
            <ul className="flex flex-col gap-1">
              {operations!.map((op) => (
                <li
                  key={op.id}
                  className="flex flex-col gap-0.5 rounded border border-border bg-surface px-2 py-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    {op.method && (
                      <span className="font-mono text-[10px] uppercase text-text-muted shrink-0">
                        {op.method}
                      </span>
                    )}
                    <span className="text-xs font-medium text-text-primary truncate">
                      {op.name || op.id}
                    </span>
                  </div>
                  {op.description && (
                    <p className="text-[11px] text-text-muted line-clamp-2">{op.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(systemToolsLoading || (systemTools && systemTools.length > 0)) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wide text-text-muted">
            System tools{systemTools ? ` (${systemTools.length})` : ''}
          </span>
          {systemToolsLoading && !systemTools ? (
            <div className="h-12 rounded border border-border bg-surface animate-pulse" />
          ) : (
            <ul className="flex flex-col gap-1">
              {systemTools!.map((t) => (
                <li
                  key={t.name}
                  className="flex flex-col gap-0.5 rounded border border-border bg-surface px-2 py-1.5"
                >
                  <span className="text-xs font-mono font-medium text-text-primary truncate">
                    {t.name}
                  </span>
                  {t.description && (
                    <p className="text-[11px] text-text-muted line-clamp-2">
                      {t.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
