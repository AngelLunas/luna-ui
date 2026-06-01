import * as React from 'react'
import { Brain, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'

export interface ThinkingDisclosureProps {
  text: string
  /** While the assistant is still streaming, default-open the panel so the
   *  user can watch the reasoning evolve. Once the turn completes, the
   *  open state is sticky (the user is in control). */
  live: boolean
  className?: string
}

/**
 * "Thinking" disclosure used inside assistant message bubbles when the
 * model emits a thinking trace alongside the visible text. Extracted
 * from RunConversation for reuse across run timelines and chat panels.
 */
export function ThinkingDisclosure({
  text,
  live,
  className,
}: ThinkingDisclosureProps) {
  const [open, setOpen] = React.useState(live)
  React.useEffect(() => {
    if (live) setOpen(true)
  }, [live])
  return (
    <div className={cn('mb-2', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition-colors"
      >
        <ChevronRight
          className={cn('h-3 w-3 transition-transform', open && 'rotate-90')}
        />
        <Brain className="h-3 w-3" />
        Thinking
      </button>
      {open && (
        <p className="mt-1 text-xs text-text-muted italic whitespace-pre-wrap border-l-2 border-border pl-2">
          {text}
        </p>
      )}
    </div>
  )
}
