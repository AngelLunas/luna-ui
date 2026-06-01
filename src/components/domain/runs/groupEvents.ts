import { type RunEvent, RunEventType } from '../../../types/run'

/**
 * Conversational projection of a run's event stream.
 *
 * Top level: a chronological list of `lifecycle` items (flow start/end,
 * run-cleared markers) and `node` containers. Each node container holds the
 * items that happened *while that node was active*: assistant messages
 * (with their deltas already folded), tool calls (called + result paired by
 * id), human checkpoints / responses, and any one-shot events.
 *
 * Pure function — call it as often as you want from a React component;
 * passing the same `events` array (same reference) yields a deep-equal
 * result, so memoize by `events.length + lastEvent.sequence` if you care.
 */

export interface AgentMessageItem {
  kind: 'message'
  message_id: string
  role: string
  text: string
  thinking: string
  completed: boolean
  /** Lowest sequence among the deltas — used for ordering within the node. */
  sequence: number
  timestamp: string
}

export interface ToolCallOperation {
  id?: string
  name?: string | null
  description?: string | null
  method?: string | null
  path?: string | null
}

export interface ToolCallConnector {
  name?: string | null
  description?: string | null
  auth_type?: string | null
  base_url?: string | null
}

export interface ToolCallItem {
  kind: 'tool_call'
  tool_call_id: string
  name: string
  input: unknown
  result?: unknown
  error?: unknown
  isError: boolean
  resolved: boolean
  /** Present when the backend emitted operation metadata alongside the
   *  `tool_called` event (action nodes resolve their operation upfront). */
  operation?: ToolCallOperation
  /** Connector metadata that paired with the operation. */
  connector?: ToolCallConnector
  sequence: number
  timestamp: string
}

export interface OneShotItem {
  kind: 'one_shot'
  event: RunEvent
  sequence: number
  timestamp: string
}

/**
 * One iteration of a scratchpad-mode ai_agent node. Holds the lifecycle
 * envelope (``iteration_started`` + ``iteration_completed`` or
 * ``iteration_failed``) plus every sub-event that arrived tagged with
 * the same ``iteration_id``. The reducer adds these as children of the
 * parent ``NodeBlock`` rather than as siblings so the timeline view can
 * render the iterations as a collapsible accordion under the node header.
 *
 * Sub-events that arrive *before* the matching ``iteration_started`` —
 * possible during a backfill race or when the WS reconnects mid-iteration —
 * are buffered into the block as soon as we see the id; the lifecycle
 * envelope fills in afterwards.
 */
export interface IterationBlock {
  kind: 'iteration'
  iteration_id: string
  /** Present after the matching ``iteration_started`` lands. */
  iteration_index?: number
  item_id?: string
  collection?: string
  status: 'running' | 'completed' | 'failed'
  duration_ms?: number
  error?: string
  /** Inline sub-events that fired between started + completed. Same
   * union of kinds a NodeBlock's children would carry. */
  children: NodeChild[]
  sequence: number
  /** Set from the first event we see for this iteration_id (lifecycle
   * envelope or sub-event) so the NodeBlock header can include it in
   * the "first child timestamp" fallback exactly like the other kinds. */
  timestamp: string
}

export type NodeChild =
  | AgentMessageItem
  | ToolCallItem
  | OneShotItem
  | IterationBlock

export interface NodeBlock {
  kind: 'node'
  node_id: string
  /** First seen status event for this node (started/completed/failed). */
  started?: RunEvent
  completed?: RunEvent
  failed?: RunEvent
  children: NodeChild[]
  sequence: number
}

export interface LifecycleItem {
  kind: 'lifecycle'
  event: RunEvent
  sequence: number
}

export type ConversationItem = NodeBlock | LifecycleItem

const NODE_LIFECYCLE_TYPES: ReadonlySet<RunEventType> = new Set([
  RunEventType.NodeStarted,
  RunEventType.NodeCompleted,
  RunEventType.NodeFailed,
])

const FLOW_LIFECYCLE_TYPES: ReadonlySet<RunEventType> = new Set([
  RunEventType.FlowStarted,
  RunEventType.FlowCompleted,
  RunEventType.FlowFailed,
  RunEventType.RunCleared,
])

const ITERATION_LIFECYCLE_TYPES: ReadonlySet<RunEventType> = new Set([
  RunEventType.IterationStarted,
  RunEventType.IterationCompleted,
  RunEventType.IterationFailed,
])

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined
}

function asOperation(v: unknown): ToolCallOperation | undefined {
  const obj = asRecord(v)
  if (!obj) return undefined
  const op: ToolCallOperation = {
    id: asString(obj.id),
    name: asString(obj.name),
    description: asString(obj.description),
    method: asString(obj.method),
    path: asString(obj.path),
  }
  // If every field is undefined, treat as absent so the UI can fall back.
  if (
    op.id === undefined &&
    op.name === undefined &&
    op.description === undefined &&
    op.method === undefined &&
    op.path === undefined
  ) {
    return undefined
  }
  return op
}

function asConnector(v: unknown): ToolCallConnector | undefined {
  const obj = asRecord(v)
  if (!obj) return undefined
  const conn: ToolCallConnector = {
    name: asString(obj.name),
    description: asString(obj.description),
    auth_type: asString(obj.auth_type),
    base_url: asString(obj.base_url),
  }
  if (
    conn.name === undefined &&
    conn.description === undefined &&
    conn.auth_type === undefined &&
    conn.base_url === undefined
  ) {
    return undefined
  }
  return conn
}

export function groupEvents(events: readonly RunEvent[]): ConversationItem[] {
  const sorted = [...events].sort((a, b) => a.sequence - b.sequence)

  const result: ConversationItem[] = []
  // node_id -> block currently appended in `result` for that node. If a node
  // appears again later (e.g. retry, loop) we open a new block.
  const openBlocks = new Map<string, NodeBlock>()
  // message_id -> the AgentMessageItem we're folding deltas into.
  const messageItems = new Map<string, AgentMessageItem>()
  // tool_call_id -> the ToolCallItem we're waiting on a result for.
  const toolItems = new Map<string, ToolCallItem>()
  // iteration_id -> the IterationBlock we're folding sub-events into.
  // Stays populated for the lifetime of the run — once an iteration
  // completes its block stays in the node's children, and we still want
  // to be able to attach late-arriving deltas to it (snapshot reads,
  // out-of-order pub/sub).
  const iterationBlocks = new Map<string, IterationBlock>()
  // message_id -> "text" | "thinking" set when a consolidated synth
  // delta with `complete: true` lands for that stream. After that, any
  // additional per-chunk delta for the same (message_id, kind) is
  // skipped to avoid duplicating text. The consolidated synth is the
  // canonical post-completion form built from `AgentMessage.content`;
  // per-chunk live deltas that already accumulated the same text
  // before the synth arrived would otherwise be appended ON TOP of
  // the synth's full text — and because both share `started.sequence
  // + 1`, JS's stable sort can interleave the synth anywhere between
  // them, producing the visible "chaos" of mixed chunks under
  // parallel iteration. The flag lets the reducer reconcile both
  // sources by trusting the synth as the source of truth.
  const finalizedStreams = new Set<string>()
  const streamKey = (messageId: string, kind: 'text' | 'thinking') =>
    `${messageId}:${kind}`

  const blockFor = (event: RunEvent): NodeBlock => {
    const nodeId = event.node_id ?? ''
    let block = openBlocks.get(nodeId)
    if (!block) {
      block = {
        kind: 'node',
        node_id: nodeId,
        children: [],
        sequence: event.sequence,
      }
      openBlocks.set(nodeId, block)
      result.push(block)
    }
    return block
  }

  /**
   * Return the IterationBlock for `iteration_id`, creating it lazily
   * inside the right NodeBlock if it hasn't been seen yet. Used both
   * for the lifecycle events themselves and for sub-events that
   * arrive before / after their `iteration_started`.
   */
  const iterationBlockFor = (
    event: RunEvent,
    iterationId: string,
  ): IterationBlock => {
    const existing = iterationBlocks.get(iterationId)
    if (existing) return existing
    const block: IterationBlock = {
      kind: 'iteration',
      iteration_id: iterationId,
      status: 'running',
      children: [],
      sequence: event.sequence,
      timestamp: event.timestamp,
    }
    iterationBlocks.set(iterationId, block)
    blockFor(event).children.push(block)
    return block
  }

  /**
   * Pull the iteration_id out of a sub-event's payload. Returns the id
   * (and the iteration block to deposit the child into) only when this
   * event belongs to an iteration AND that iteration's container is
   * already known or can be safely created. We never CREATE an
   * iteration block for an unknown iteration_id from a sub-event:
   * doing so would orphan it if the matching `iteration_started`
   * arrives later under a different node_id (defensive — should be
   * impossible because the runtime tags consistently, but the cost of
   * being strict here is one less surprise in the timeline). Practically
   * the lifecycle event arrives first or close enough that the block
   * exists; on a backfill race we attach to the block once it appears.
   */
  const iterationTargetFor = (event: RunEvent): IterationBlock | null => {
    const iterationId = asString(event.payload.iteration_id)
    if (!iterationId) return null
    const existing = iterationBlocks.get(iterationId)
    if (existing) return existing
    // No lifecycle envelope seen yet — create the block under this
    // event's node so the sub-event has somewhere to land. When the
    // matching iteration_started arrives later it will find the block
    // and populate the header fields.
    return iterationBlockFor(event, iterationId)
  }

  for (const event of sorted) {
    const type = event.event_type

    if (FLOW_LIFECYCLE_TYPES.has(type)) {
      result.push({ kind: 'lifecycle', event, sequence: event.sequence })
      continue
    }

    if (NODE_LIFECYCLE_TYPES.has(type)) {
      const block = blockFor(event)
      if (type === RunEventType.NodeStarted) block.started = event
      else if (type === RunEventType.NodeCompleted) {
        block.completed = event
        // Close: subsequent events for this node id open a fresh block.
        openBlocks.delete(event.node_id ?? '')
      } else {
        block.failed = event
        openBlocks.delete(event.node_id ?? '')
      }
      continue
    }

    if (ITERATION_LIFECYCLE_TYPES.has(type)) {
      const iterationId = asString(event.payload.iteration_id)
      if (!iterationId) continue
      const block = iterationBlockFor(event, iterationId)
      if (type === RunEventType.IterationStarted) {
        const index = event.payload.iteration_index
        block.iteration_index = typeof index === 'number' ? index : undefined
        block.item_id = asString(event.payload.item_id)
        block.collection = asString(event.payload.collection)
        block.status = 'running'
      } else if (type === RunEventType.IterationCompleted) {
        block.status = 'completed'
        const duration = event.payload.duration_ms
        if (typeof duration === 'number') block.duration_ms = duration
      } else {
        block.status = 'failed'
        const duration = event.payload.duration_ms
        if (typeof duration === 'number') block.duration_ms = duration
        block.error = asString(event.payload.error)
      }
      continue
    }

    // Decide once per event whether its children should be attached to
    // an iteration block (when the payload carries iteration_id) or to
    // the node block directly. Sub-events from iterative runs get
    // routed into the matching IterationBlock so the panel can show
    // each iteration as a self-contained collapsible.
    const containerFor = (e: RunEvent): { children: NodeChild[] } => {
      const iter = iterationTargetFor(e)
      return iter ?? blockFor(e)
    }

    if (
      type === RunEventType.AgentMessageStarted ||
      type === RunEventType.AgentTextDelta ||
      type === RunEventType.AgentThinkingDelta ||
      type === RunEventType.AgentMessageCompleted
    ) {
      const messageId = asString(event.payload.message_id)
      if (!messageId) continue

      let item = messageItems.get(messageId)
      if (!item) {
        item = {
          kind: 'message',
          message_id: messageId,
          role: asString(event.payload.role) ?? 'assistant',
          text: '',
          thinking: '',
          completed: false,
          sequence: event.sequence,
          timestamp: event.timestamp,
        }
        messageItems.set(messageId, item)
        containerFor(event).children.push(item)
      }

      // ``complete: true`` on a delta marks it as the canonical
      // post-completion text built from the persisted AgentMessage —
      // it REPLACES any text accumulated from prior chunks and
      // finalizes the stream so later per-chunk deltas of the same
      // (message_id, kind) are ignored. See the comment on
      // `finalizedStreams` above for why this matters in parallel
      // iteration mode.
      const isComplete = event.payload.complete === true

      if (type === RunEventType.AgentTextDelta) {
        const key = streamKey(messageId, 'text')
        if (isComplete) {
          item.text = asString(event.payload.text) ?? ''
          finalizedStreams.add(key)
        } else if (!finalizedStreams.has(key)) {
          item.text += asString(event.payload.text) ?? ''
        }
      } else if (type === RunEventType.AgentThinkingDelta) {
        const key = streamKey(messageId, 'thinking')
        if (isComplete) {
          item.thinking = asString(event.payload.text) ?? ''
          finalizedStreams.add(key)
        } else if (!finalizedStreams.has(key)) {
          item.thinking += asString(event.payload.text) ?? ''
        }
      } else if (type === RunEventType.AgentMessageCompleted) {
        item.completed = true
        messageItems.delete(messageId)
      }
      continue
    }

    if (type === RunEventType.ToolCalled) {
      const id =
        asString(event.payload.tool_use_id) ??
        asString(event.payload.operation_id) ??
        event.id
      const operation = asOperation(event.payload.operation)
      const connector = asConnector(event.payload.connector)
      const item: ToolCallItem = {
        kind: 'tool_call',
        tool_call_id: id,
        name:
          asString(event.payload.name) ??
          asString(event.payload.tool) ??
          operation?.name ??
          'tool',
        input: event.payload.input ?? event.payload.arguments ?? null,
        isError: false,
        resolved: false,
        sequence: event.sequence,
        timestamp: event.timestamp,
      }
      if (operation) item.operation = operation
      if (connector) item.connector = connector
      toolItems.set(id, item)
      containerFor(event).children.push(item)
      continue
    }

    if (type === RunEventType.ToolResult) {
      const id =
        asString(event.payload.tool_use_id) ??
        asString(event.payload.operation_id) ??
        ''
      const item = toolItems.get(id)
      if (item) {
        item.resolved = true
        item.isError = event.payload.is_error === true
        item.error = event.payload.error
        item.result =
          event.payload.output ??
          event.payload.result ??
          event.payload.output_preview
        toolItems.delete(id)
      } else {
        // No matching call (e.g. truncated history) — surface as standalone.
        containerFor(event).children.push({
          kind: 'one_shot',
          event,
          sequence: event.sequence,
          timestamp: event.timestamp,
        })
      }
      continue
    }

    // Anything else (agent_thinking legacy, human_checkpoint, human_response)
    // goes in as a one-shot child of the current container.
    containerFor(event).children.push({
      kind: 'one_shot',
      event,
      sequence: event.sequence,
      timestamp: event.timestamp,
    })
  }

  return result
}
