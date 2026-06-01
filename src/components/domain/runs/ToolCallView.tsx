import { CheckCircle2, Loader2, Wrench, XCircle } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { OperationSummary } from '../cards/OperationSummary'
import { JsonDisclosure } from './JsonDisclosure'
import type { ToolCallItem } from './groupEvents'

export interface ToolCallViewProps {
  item: ToolCallItem
  className?: string
}

/**
 * Renders one tool/operation call with its input + result (or error).
 * When the backend attached operation/connector metadata (typical for
 * action nodes that resolve their operation upfront), shows the rich
 * ``OperationSummary`` header. Otherwise falls back to the tool name.
 *
 * Extracted from RunConversation so every conversational surface
 * renders tool interactions identically — including chat panels that
 * surface what tool an agent fired during a revision turn.
 */
export function ToolCallView({ item, className }: ToolCallViewProps) {
  const hasOperation =
    !!item.operation &&
    Boolean(
      item.operation.name ||
        item.operation.method ||
        item.operation.path ||
        item.operation.description,
    )

  return (
    <div
      className={cn(
        'rounded border border-border bg-bg px-3 py-2',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Wrench className="h-3.5 w-3.5 text-accent" />
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          {hasOperation ? 'operation' : 'tool'}
        </span>
        {!hasOperation && (
          <span className="text-xs font-mono text-text-primary">
            {item.name}
          </span>
        )}
        {!item.resolved && (
          <span className="text-[10px] text-text-muted inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            calling
          </span>
        )}
        {item.resolved && item.isError && (
          <span className="text-[10px] text-danger inline-flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            error
          </span>
        )}
        {item.resolved && !item.isError && (
          <span className="text-[10px] text-success inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            ok
          </span>
        )}
      </div>
      {hasOperation && item.operation && (
        <div className="mt-2">
          <OperationSummary
            name={item.operation.name ?? item.name}
            description={item.operation.description}
            method={item.operation.method}
            path={item.operation.path}
            connector={
              item.connector
                ? {
                    name: item.connector.name ?? '',
                    authType: item.connector.auth_type,
                    baseUrl: item.connector.base_url,
                    description: item.connector.description,
                  }
                : null
            }
          />
        </div>
      )}
      <div className="mt-2 flex flex-col gap-2">
        <JsonDisclosure label="input" data={item.input} />
        {item.resolved && (
          <JsonDisclosure
            label={item.isError ? 'error' : 'result'}
            data={item.isError ? item.error : item.result}
            tone={item.isError ? 'danger' : undefined}
          />
        )}
      </div>
    </div>
  )
}
