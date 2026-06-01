/**
 * Generic chat primitives — purposely domain-agnostic. Nothing here
 * mentions "cover letter", "job", or any other sentinel concept, so
 * the same components can host any agent-user conversation (future:
 * interview prep, debug threads, etc.).
 *
 * Content blocks mirror the shape persisted in `core.conversation_messages`
 * (and the same shape Anthropic uses for message content), so the
 * backend's wire payload renders without an adapter.
 */

/**
 * Roles a chat turn can take. Mirrors `core.conversation_message_role`
 * in the Postgres enum so the wire payload deserializes directly.
 * Pattern matches `RunEventType` (object-as-const + value-type alias)
 * so consumers can do `role === ChatRole.User` rather than typing the
 * raw string everywhere.
 */
export const ChatRole = {
  User: 'user',
  Assistant: 'assistant',
  System: 'system',
} as const
export type ChatRole = (typeof ChatRole)[keyof typeof ChatRole]

/**
 * Block discriminator. Mirrors Anthropic's content block taxonomy —
 * any unknown type renders as a fallback so the chat doesn't crash on
 * a new block kind the backend rolls out.
 */
export const ChatContentBlockType = {
  Text: 'text',
  ToolUse: 'tool_use',
  ToolResult: 'tool_result',
} as const
export type ChatContentBlockType =
  (typeof ChatContentBlockType)[keyof typeof ChatContentBlockType]

export interface ChatTextBlock {
  type: typeof ChatContentBlockType.Text
  text: string
}

export interface ChatToolUseBlock {
  type: typeof ChatContentBlockType.ToolUse
  id?: string
  name?: string
  input?: unknown
}

export interface ChatToolResultBlock {
  type: typeof ChatContentBlockType.ToolResult
  tool_use_id?: string
  content?: unknown
  is_error?: boolean
}

export type ChatContentBlock =
  | ChatTextBlock
  | ChatToolUseBlock
  | ChatToolResultBlock
  | { type: string; [key: string]: unknown }

export interface ChatMessage {
  id: string
  role: ChatRole
  content: ChatContentBlock[]
  createdAt: string
  /** True while the assistant is still streaming this turn — renders a
   *  subtle indicator and disables retry actions. */
  isPartial?: boolean
}

export interface ChatPanelLabels {
  /** Placeholder in the composer input. */
  composerPlaceholder?: string
  /** Button label for the send action. */
  sendLabel?: string
  /** Message shown when the streaming indicator is active. */
  streamingLabel?: string
  /** Text on the jump-to-bottom pill from AutoScrollContainer. */
  jumpToBottomLabel?: string
}
