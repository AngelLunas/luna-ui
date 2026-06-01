import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'

export interface JsonDisclosureProps {
  label: string
  data: unknown
  /** Tints the trigger and the open panel red — use for errors. */
  tone?: 'danger'
  className?: string
}

/**
 * Collapsible viewer for structured payloads (tool input/result blobs,
 * raw JSON snapshots). Shows `empty` inline when there's nothing
 * worth expanding so the surrounding card doesn't shift on toggle.
 *
 * Extracted from RunConversation so every surface that needs to render
 * a tool interaction (run timeline, chat panels) uses the same look.
 */
export function JsonDisclosure({
  label,
  data,
  tone,
  className,
}: JsonDisclosureProps) {
  const [open, setOpen] = React.useState(false)
  const str = React.useMemo(() => {
    if (typeof data === 'string') return data
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }, [data])
  if (
    data === null ||
    data === undefined ||
    (typeof data === 'object' && data && Object.keys(data).length === 0)
  ) {
    return (
      <div className={cn('text-[11px] text-text-muted', className)}>
        <span className="uppercase tracking-wider mr-1">{label}:</span>
        <span className="italic">empty</span>
      </div>
    )
  }
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1 text-[11px] hover:text-text-primary transition-colors',
          tone === 'danger' ? 'text-danger' : 'text-text-muted',
        )}
      >
        <ChevronRight
          className={cn('h-3 w-3 transition-transform', open && 'rotate-90')}
        />
        <span className="uppercase tracking-wider">{label}</span>
      </button>
      {open && (
        <pre
          className={cn(
            'mt-1 max-h-96 overflow-auto rounded border bg-bg p-2 text-[11px] font-mono whitespace-pre-wrap break-words',
            tone === 'danger'
              ? 'border-danger/40 text-danger'
              : 'border-border text-text-primary',
          )}
          onWheel={(e) => e.stopPropagation()}
        >
          {str}
        </pre>
      )}
    </div>
  )
}
