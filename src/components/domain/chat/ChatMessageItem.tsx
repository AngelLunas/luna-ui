import * as React from 'react'
import { User as UserIcon } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { MarkdownText } from '../primitives/MarkdownText'
import { AgentMessageView } from '../runs/AgentMessageView'
import { JsonDisclosure } from '../runs/JsonDisclosure'
import type { AgentMessageItem, ToolCallItem } from '../runs/groupEvents'
import { ToolCallView } from '../runs/ToolCallView'
import {
  ChatContentBlockType,
  ChatRole,
  type ChatContentBlock,
  type ChatMessage,
  type ChatToolResultBlock,
  type ChatToolUseBlock,
} from './types'

export interface ChatMessageItemProps {
  message: ChatMessage
  /** When true, tool_use / tool_result blocks render via the same
   *  ``ToolCallView`` used in the run timeline. Default: false — most
   *  user-facing chats don't expose tool plumbing. */
  showToolBlocks?: boolean
  className?: string
}

/**
 * Renders one chat turn. Assistant + system turns reuse the run
 * timeline's ``AgentMessageView`` so visual parity with the run
 * inspector is automatic — same icon set, same Markdown rendering,
 * same "streaming" indicator on partial messages.
 *
 * User turns render as right-aligned bubbles with the standard avatar
 * + MarkdownText body. Tool blocks (when opted in) reuse
 * ``ToolCallView`` so a chat panel surfacing agent tool calls looks
 * identical to the run timeline.
 */
export function ChatMessageItem({
  message,
  showToolBlocks = false,
  className,
}: ChatMessageItemProps) {
  const text = extractText(message.content)
  const toolBlocks = message.content.filter(isToolBlock)
  const toolItems = pairToolBlocks(toolBlocks, message.id)

  if (message.role === ChatRole.User) {
    return (
      <div className={cn('flex w-full justify-end gap-2 px-4 py-2', className)}>
        <div className="max-w-[80%] rounded-2xl border border-accent/20 bg-accent/10 px-3 py-2 text-sm text-text-primary">
          {text ? (
            <MarkdownText text={text} />
          ) : (
            <span className="text-text-muted italic">(empty message)</span>
          )}
        </div>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent"
          aria-hidden
        >
          <UserIcon className="h-4 w-4" />
        </div>
      </div>
    )
  }

  // Assistant + system turns: defer to the run timeline's message view
  // for visual parity. Adapt the chat shape into the AgentMessageItem
  // shape the view expects. Suppress the message-view wrapper when
  // there's no text and only tool blocks — otherwise it renders an
  // empty "(empty message)" / "thinking…" placeholder right above the
  // tool cards, which is just noise for tool-only assistant turns.
  const adapted: AgentMessageItem = {
    kind: 'message',
    message_id: message.id,
    role: message.role,
    text,
    thinking: '',
    completed: !message.isPartial,
    sequence: 0,
    timestamp: message.createdAt,
  }
  const hasRenderableText = text.length > 0
  const renderToolBlocks = showToolBlocks && toolItems.length > 0
  const showMessageView = hasRenderableText || !renderToolBlocks
  return (
    <div className={cn('px-4 py-2', className)}>
      {showMessageView && <AgentMessageView item={adapted} />}
      {renderToolBlocks && (
        <div
          className={cn(
            'flex flex-col gap-2 pl-2',
            showMessageView ? 'mt-2' : '',
          )}
        >
          {toolItems.map((item) => renderToolItem(item, message.id))}
        </div>
      )}
    </div>
  )
}


/**
 * One renderable tool slot — either a paired tool_use + tool_result
 * (rendered as a single ToolCallView with the resolved state inside the
 * same card), or an orphan tool_result that arrived without a matching
 * call (rendered as a standalone JsonDisclosure fallback).
 */
type ToolRenderItem =
  | { kind: 'call'; key: string; use: ChatToolUseBlock; result?: ChatToolResultBlock }
  | { kind: 'orphan-result'; key: string; result: ChatToolResultBlock }


function pairToolBlocks(
  blocks: (ChatToolUseBlock | ChatToolResultBlock)[],
  messageId: string,
): ToolRenderItem[] {
  // Index tool_results by tool_use_id so each tool_use can be matched
  // to its result in the same pass. A single tool_use binds to at most
  // one tool_result — the engine never emits multiple results for the
  // same call id, so the first match is final.
  const resultsById = new Map<string, ChatToolResultBlock>()
  const orphanResults: ChatToolResultBlock[] = []
  for (const block of blocks) {
    if (block.type !== ChatContentBlockType.ToolResult) continue
    const id = block.tool_use_id
    if (id) {
      resultsById.set(id, block)
    } else {
      orphanResults.push(block)
    }
  }

  const items: ToolRenderItem[] = []
  let index = 0
  for (const block of blocks) {
    if (block.type !== ChatContentBlockType.ToolUse) continue
    const id = block.id
    const result = id ? resultsById.get(id) : undefined
    if (id && result) resultsById.delete(id)
    items.push({
      kind: 'call',
      key: `${messageId}-tool-${index}`,
      use: block,
      result,
    })
    index += 1
  }

  // Any tool_results we couldn't pair (results referenced by an id that
  // didn't appear as a tool_use on this message — or that had no id at
  // all) render as standalone disclosures so the user still sees the
  // payload.
  for (const orphan of [...resultsById.values(), ...orphanResults]) {
    items.push({
      kind: 'orphan-result',
      key: `${messageId}-result-${index}`,
      result: orphan,
    })
    index += 1
  }

  return items
}


function renderToolItem(
  item: ToolRenderItem,
  messageId: string,
): React.ReactNode {
  if (item.kind === 'orphan-result') {
    return (
      <JsonDisclosure
        key={item.key}
        label={item.result.is_error ? 'tool error' : 'tool result'}
        data={item.result.content}
        tone={item.result.is_error ? 'danger' : undefined}
      />
    )
  }
  // Paired call: the ToolCallView already renders input + result inside
  // a single bordered card and flips the spinner/check based on
  // `resolved`. We just synthesize the shape it expects.
  const { use, result } = item
  const adapted: ToolCallItem = {
    kind: 'tool_call',
    tool_call_id: use.id ?? item.key,
    name: use.name ?? 'tool',
    input: use.input,
    result: result?.is_error ? undefined : result?.content,
    error: result?.is_error ? result?.content : undefined,
    isError: result?.is_error === true,
    resolved: result !== undefined,
    sequence: 0,
    timestamp: '',
  }
  void messageId
  return <ToolCallView key={item.key} item={adapted} />
}


function isToolBlock(
  block: ChatContentBlock,
): block is ChatToolUseBlock | ChatToolResultBlock {
  return (
    block.type === ChatContentBlockType.ToolUse ||
    block.type === ChatContentBlockType.ToolResult
  )
}


function extractText(blocks: ChatContentBlock[]): string {
  return blocks
    .filter(
      (b): b is { type: typeof ChatContentBlockType.Text; text: string } =>
        b.type === ChatContentBlockType.Text &&
        typeof (b as { text?: unknown }).text === 'string',
    )
    .map((b) => b.text)
    .join('\n\n')
    .trim()
}
