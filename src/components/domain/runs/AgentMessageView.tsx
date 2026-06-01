import { Loader2, Sparkles } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { MarkdownText } from '../primitives/MarkdownText'
import { ThinkingDisclosure } from './ThinkingDisclosure'
import type { AgentMessageItem } from './groupEvents'

export interface AgentMessageViewProps {
  item: AgentMessageItem
  className?: string
}

/**
 * Renders one assistant (or other-role) message bubble: role tag,
 * streaming indicator while incomplete, optional Thinking disclosure,
 * and Markdown-rendered text body.
 *
 * Extracted from RunConversation so chat surfaces (the cover-letter
 * chat, future agent chats) display assistant turns identically.
 */
export function AgentMessageView({ item, className }: AgentMessageViewProps) {
  return (
    <div
      className={cn(
        'rounded border border-border bg-bg px-3 py-2',
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          {item.role}
        </span>
        {!item.completed && (
          <span className="text-[10px] text-text-muted inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            streaming
          </span>
        )}
      </div>
      {item.thinking && (
        <ThinkingDisclosure text={item.thinking} live={!item.completed} />
      )}
      {item.text ? (
        <MarkdownText text={item.text} />
      ) : (
        !item.thinking && (
          <p className="text-xs text-text-muted italic">
            {item.completed ? '(empty message)' : 'thinking…'}
          </p>
        )
      )}
    </div>
  )
}
