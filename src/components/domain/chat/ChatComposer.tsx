import * as React from 'react'
import { Send } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Button } from '../../ui/button'

export interface ChatComposerProps {
  /** Called with the trimmed message text when the user submits. The
   *  promise is awaited; while pending the composer disables itself. */
  onSend: (text: string) => void | Promise<void>
  placeholder?: string
  sendLabel?: string
  /** Disables the composer regardless of internal state (e.g. while the
   *  prior turn is still streaming server-side). */
  disabled?: boolean
  /** Max characters accepted; mirrors the API's ``ChatMessageCreate``
   *  upper bound to avoid round-trip rejection. */
  maxLength?: number
  className?: string
}

const DEFAULT_PLACEHOLDER = 'Reply to the assistant…'
const DEFAULT_MAX_LENGTH = 4000


/**
 * Two-line autosize textarea + send button. Enter submits, Shift+Enter
 * inserts a newline (the textarea convention users expect for chat).
 * Keeps its own local draft state — the parent only learns about it on
 * submit.
 */
export function ChatComposer({
  onSend,
  placeholder = DEFAULT_PLACEHOLDER,
  sendLabel = 'Send',
  disabled,
  maxLength = DEFAULT_MAX_LENGTH,
  className,
}: ChatComposerProps) {
  const [draft, setDraft] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const effectiveDisabled = disabled || submitting

  const submit = React.useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed || effectiveDisabled) return
    setSubmitting(true)
    try {
      await onSend(trimmed)
      setDraft('')
      // Re-focus so the user can keep typing the next reply without
      // reaching for the mouse.
      textareaRef.current?.focus()
    } finally {
      setSubmitting(false)
    }
  }, [draft, effectiveDisabled, onSend])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <form
      className={cn(
        'flex items-end gap-2 border-t border-border bg-surface px-3 py-2',
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={effectiveDisabled}
        maxLength={maxLength}
        rows={2}
        className={cn(
          'min-h-[44px] max-h-40 flex-1 resize-y rounded border border-border bg-bg px-2 py-1.5',
          'text-sm text-text-primary placeholder:text-text-muted',
          'focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60',
        )}
      />
      <Button
        type="submit"
        size="sm"
        disabled={effectiveDisabled || draft.trim().length === 0}
        className="shrink-0 gap-1"
      >
        <Send className="h-3.5 w-3.5" />
        {sendLabel}
      </Button>
    </form>
  )
}
