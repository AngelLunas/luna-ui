import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Badge } from '../../ui/badge'
import { MethodBadge } from '../primitives/MethodBadge'

export interface OperationSummaryConnector {
  name: string
  authType?: string | null
  baseUrl?: string | null
  description?: string | null
}

export interface OperationSummaryProps {
  name: string
  description?: string | null
  method?: string | null
  path?: string | null
  connector?: OperationSummaryConnector | null
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

export function OperationSummary({
  name,
  description,
  method,
  path,
  connector,
  loading,
  error,
  className,
}: OperationSummaryProps) {
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
        {typeof error === 'string' ? error : 'Could not load operation.'}
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
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold text-text-primary truncate">
            {name}
          </span>
          {connector?.name && (
            <span className="text-[11px] text-text-muted truncate">
              via {connector.name}
            </span>
          )}
        </div>
        {connector?.authType && (
          <Badge variant="muted" className="capitalize shrink-0">
            {connector.authType.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      {(method || path) && (
        <div className="flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-1.5 min-w-0">
          {method && <MethodBadge method={method} />}
          {path && (
            <span className="font-mono text-[11px] text-text-primary truncate">
              {path}
            </span>
          )}
        </div>
      )}

      {connector?.baseUrl && (
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-xs uppercase tracking-wide text-text-muted">
            Base URL
          </span>
          <span className="font-mono text-[11px] text-text-muted truncate">
            {connector.baseUrl}
          </span>
        </div>
      )}

      {description && (
        <CollapsibleText label="Description" text={description} previewLines={2} />
      )}
    </div>
  )
}
