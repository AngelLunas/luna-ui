import * as React from 'react'
import { Loader2, MessageSquare } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { AutoScrollContainer } from '../primitives/AutoScrollContainer'
import { EmptyState } from '../primitives/EmptyState'
import { ChatComposer } from './ChatComposer'
import { ChatMessageItem } from './ChatMessageItem'
import type { ChatMessage, ChatPanelLabels } from './types'

export interface ChatPanelProps extends ChatPanelLabels {
  messages: ChatMessage[]
  /** Called when the user submits a new message. Awaited; while pending
   *  the composer disables itself. */
  onSendMessage: (text: string) => void | Promise<void>
  /** While true, a "thinking…" indicator is shown at the bottom of the
   *  thread. Independent of per-message ``isPartial`` so the host can
   *  surface "waiting for backend to spawn the run" before any partial
   *  message exists. */
  isStreaming?: boolean
  /** Disables the composer regardless of streaming state (e.g. the host
   *  knows the agent run was rejected). */
  composerDisabled?: boolean
  /** Optional ReactNode rendered above the message list — useful for a
   *  context summary ("Discussing: <job title>"). */
  header?: React.ReactNode
  /** Rendered when ``messages`` is empty. Defaults to a neutral
   *  EmptyState; pass null to render nothing. */
  emptyState?: React.ReactNode
  /** When true, tool_use / tool_result blocks inside assistant messages
   *  are rendered using ToolCallView / JsonDisclosure. Default: false. */
  showToolBlocks?: boolean
  className?: string
}

const DEFAULT_EMPTY_STATE = (
  <EmptyState
    icon={<MessageSquare />}
    title="No messages yet"
    description="Send a reply to start the conversation."
  />
)

/**
 * Generic chat surface — agent-agnostic. The same component hosts the
 * cover-letter chat today and any future agent chat (interview prep,
 * debug threads, etc.). Visual blocks (assistant bubble, tool call
 * cards) reuse the run timeline's primitives so a chat thread renders
 * identically to its corresponding run inspector.
 *
 * Fills its parent's height; give it a sized container.
 */
export function ChatPanel({
  messages,
  onSendMessage,
  isStreaming,
  composerDisabled,
  header,
  emptyState = DEFAULT_EMPTY_STATE,
  composerPlaceholder,
  sendLabel,
  streamingLabel = 'Assistant is thinking…',
  jumpToBottomLabel,
  showToolBlocks,
  className,
}: ChatPanelProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col rounded border border-border bg-surface',
        className,
      )}
    >
      {header && (
        <div className="border-b border-border px-4 py-2">{header}</div>
      )}
      <div className="flex-1 min-h-0">
        <AutoScrollContainer
          contentClassName="flex flex-col gap-1 py-2"
          jumpToBottomLabel={jumpToBottomLabel}
        >
          {messages.length === 0 ? (
            <div className="px-4 py-6">{emptyState}</div>
          ) : (
            messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                showToolBlocks={showToolBlocks}
              />
            ))
          )}
          {isStreaming && (
            <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-text-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{streamingLabel}</span>
            </div>
          )}
        </AutoScrollContainer>
      </div>
      <ChatComposer
        onSend={onSendMessage}
        placeholder={composerPlaceholder}
        sendLabel={sendLabel}
        disabled={composerDisabled}
      />
    </div>
  )
}
