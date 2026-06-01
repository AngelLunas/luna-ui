/**
 * Run event types — these mirror `core.run_event_type` in luna-core's
 * Postgres enum and the `event_type` string emitted on the `/runs/{id}/stream`
 * WebSocket. Keep this list in sync with `luna_core/models/event.py` so the
 * frontend never needs an adapter between REST snapshots and WS frames.
 */
export const RunEventType = {
  FlowStarted: 'flow_started',
  FlowCompleted: 'flow_completed',
  FlowFailed: 'flow_failed',
  NodeStarted: 'node_started',
  NodeCompleted: 'node_completed',
  NodeFailed: 'node_failed',
  // Legacy single-shot signal that an agent node is about to think; new runs
  // use the streaming triplet below.
  AgentThinking: 'agent_thinking',
  // Streaming lifecycle of one assistant turn. Every *_delta carries the same
  // message_id so the UI can group chunks into one bubble.
  AgentMessageStarted: 'agent_message_started',
  AgentTextDelta: 'agent_text_delta',
  AgentThinkingDelta: 'agent_thinking_delta',
  AgentMessageCompleted: 'agent_message_completed',
  ToolCalled: 'tool_called',
  ToolResult: 'tool_result',
  HumanCheckpoint: 'human_checkpoint',
  HumanResponse: 'human_response',
  // Per-iteration lifecycle for scratchpad-mode ai_agent nodes. One
  // started + one of (completed | failed) per item the runtime processes
  // (sequential or parallel). Every sub-event emitted from inside the
  // iteration body — agent_*, tool_called, tool_result — carries the
  // same `iteration_id` in its payload so the timeline can route it to
  // the right iteration block.
  IterationStarted: 'iteration_started',
  IterationCompleted: 'iteration_completed',
  IterationFailed: 'iteration_failed',
  RunCleared: 'run_cleared',
} as const
export type RunEventType = (typeof RunEventType)[keyof typeof RunEventType]

/**
 * Wire-format run event. Field names are snake_case on purpose: the REST
 * endpoint `GET /runs/{id}/events` and the WebSocket `/runs/{id}/stream`
 * both emit this exact JSON shape, so the frontend can consume them
 * interchangeably without an adapter layer.
 */
export interface RunEvent {
  id: string
  flow_run_id: string
  sequence: number
  timestamp: string
  event_type: RunEventType
  node_id: string | null
  payload: Record<string, unknown>
}

/** Convenience accessors for the well-known delta payload shape. */
export interface AgentMessageStartedPayload {
  message_id: string
  role: 'system' | 'user' | 'assistant'
}

export interface AgentTextDeltaPayload {
  message_id: string
  chunk_index: number
  text: string
}

export interface AgentThinkingDeltaPayload {
  message_id: string
  chunk_index: number
  text: string
}

export interface AgentMessageCompletedPayload {
  message_id: string
  text_chunks?: number
  thinking_chunks?: number
}

export interface ToolCalledOperationMeta {
  id?: string
  name?: string
  description?: string
  method?: string
  path?: string
}

export interface ToolCalledConnectorMeta {
  name?: string
  description?: string
  auth_type?: string
  base_url?: string
}

export interface ToolCalledPayload {
  tool_use_id?: string
  operation_id?: string
  name?: string
  input?: unknown
  /** Action-node tool calls carry operation + connector metadata so the UI
   *  can render an OperationSummary without a follow-up REST round-trip. */
  operation?: ToolCalledOperationMeta
  connector?: ToolCalledConnectorMeta
}

export interface ToolResultPayload {
  tool_use_id?: string
  operation_id?: string
  name?: string
  is_error?: boolean
  output_preview?: string
  error?: unknown
}

/**
 * Payload for ``iteration_started``. The same ``iteration_id`` is
 * present on every sub-event emitted from inside the iteration body
 * and on the matching completed / failed envelope, so the UI can
 * group them in one accordion.
 */
export interface IterationStartedPayload {
  iteration_id: string
  iteration_index: number
  item_id: string
  collection: string
}

export interface IterationCompletedPayload {
  iteration_id: string
  iteration_index: number
  item_id: string
  collection: string
  duration_ms: number
}

export interface IterationFailedPayload extends IterationCompletedPayload {
  error: string
}
