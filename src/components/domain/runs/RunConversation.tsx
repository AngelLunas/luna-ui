import * as React from 'react'
import {
  Activity,
  ChevronRight,
  CheckCircle2,
  Loader2,
  PlayCircle,
  UserCheck,
  XCircle,
  Eraser,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { type RunEvent, RunEventType } from '../../../types/run'
import {
  type ConversationItem,
  type IterationBlock,
  type NodeBlock,
  type NodeChild,
  type OneShotItem,
  groupEvents,
} from './groupEvents'
import { ListChecks } from 'lucide-react'
import { EmptyState } from '../primitives/EmptyState'
import { AgentMessageView } from './AgentMessageView'
import { ToolCallView } from './ToolCallView'
import {
  AutoScrollContainer,
  type AutoScrollContainerProps,
} from '../primitives/AutoScrollContainer'
import { type UseAutoScrollOptions } from '../../../lib/useAutoScroll'

/**
 * Subscription callbacks the conversation will invoke when the user
 * expands / collapses an iteration accordion. The host (typically the
 * page that owns the WebSocket) wires these to the run-stream WS so
 * only the expanded iteration's sub-events flow over the wire — every
 * other iteration's deltas / tool calls get dropped at the server.
 *
 * Pure default (no-op): omit the prop and the panel still works, just
 * without server-side filtering. Useful for tests and for embeds that
 * already have every event in hand.
 */
export interface IterationSubscriber {
  /** Open one iteration: server will start forwarding its sub-events. */
  subscribe: (iterationId: string) => void
  /** Close it: server will stop forwarding sub-events for this id. */
  unsubscribe: (iterationId: string) => void
}

const NOOP_SUBSCRIBER: IterationSubscriber = {
  subscribe: () => {},
  unsubscribe: () => {},
}

interface IterationPanelContextValue {
  openId: string | null
  setOpenId: (id: string | null) => void
}

const IterationPanelContext = React.createContext<IterationPanelContextValue>({
  openId: null,
  setOpenId: () => {},
})

export interface RunConversationProps {
  events: RunEvent[]
  loading?: boolean
  /** Append a pulsing "live" indicator at the bottom; pass `true` while the
   *  run is still streaming. */
  streaming?: boolean
  className?: string
  /** Wire iteration expand/collapse to a WebSocket subscription so
   *  parallel iteration streams aren't all flowing into the page at
   *  once. Optional — without it the panel works but every iteration
   *  the server emits will arrive (legacy behaviour). */
  iterationSubscriber?: IterationSubscriber
  /** Make the component a scrollable container that follows the stream.
   *  - `true` enables with defaults.
   *  - An options object configures threshold / behavior / callbacks.
   *  - `false` / omitted preserves the original non-scrolling layout.
   *
   *  When enabled the component fills its parent's height (`h-full`); give
   *  it a sized parent. The user can detach by scrolling up and reattach
   *  by scrolling back to the bottom. */
  autoScroll?:
    | boolean
    | (UseAutoScrollOptions &
        Pick<
          AutoScrollContainerProps,
          'showJumpToBottom' | 'jumpToBottomLabel' | 'viewportClassName'
        >)
}

/**
 * Conversational projection of a run's event stream — text deltas folded
 * into bubbles, tool calls paired with their results, grouped per node.
 *
 * For the raw chronological dump of every event (useful for debugging the
 * stream itself) use `RunTimeline` instead.
 */
export function RunConversation({
  events,
  loading,
  streaming,
  className,
  autoScroll,
  iterationSubscriber,
}: RunConversationProps) {
  const items = React.useMemo(() => groupEvents(events), [events])
  // Single open id shared across every NodeBlock — opening iteration B
  // while A is open closes A (and unsubscribes its stream server-side).
  // Matches the user's "abrir otra cancela el streaming de la anterior"
  // requirement and keeps the WS firehose readable when many parallel
  // iterations are emitting.
  const subscriber = iterationSubscriber ?? NOOP_SUBSCRIBER
  const [openIterationId, setOpenIterationId] = React.useState<string | null>(
    null,
  )
  // Keep the *currently* open id in a ref so cleanup (in the effect
  // below + on unmount) can unsubscribe without re-creating the effect
  // on every change.
  const lastOpenRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (lastOpenRef.current === openIterationId) return
    if (lastOpenRef.current) subscriber.unsubscribe(lastOpenRef.current)
    if (openIterationId) subscriber.subscribe(openIterationId)
    lastOpenRef.current = openIterationId
  }, [openIterationId, subscriber])
  React.useEffect(() => {
    return () => {
      if (lastOpenRef.current) subscriber.unsubscribe(lastOpenRef.current)
    }
  }, [subscriber])
  const panelContextValue = React.useMemo<IterationPanelContextValue>(
    () => ({ openId: openIterationId, setOpenId: setOpenIterationId }),
    [openIterationId],
  )

  if (loading && items.length === 0) {
    return (
      <div className={cn('flex flex-col gap-3 p-4', className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded bg-surface animate-pulse" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Activity />}
        title="No events yet"
        description="Events will stream in once this run starts producing output."
        className={className}
      />
    )
  }

  const body = (
    <IterationPanelContext.Provider value={panelContextValue}>
      {items.map((item) => (
        <ConversationItemView key={keyFor(item)} item={item} />
      ))}
      {streaming && (
        <div className="flex items-center gap-2 text-[11px] text-text-muted px-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Streaming…
        </div>
      )}
    </IterationPanelContext.Provider>
  )

  if (autoScroll) {
    const options = autoScroll === true ? {} : autoScroll
    const {
      showJumpToBottom,
      jumpToBottomLabel,
      viewportClassName,
      ...scrollOptions
    } = options
    return (
      <AutoScrollContainer
        className={className}
        contentClassName="flex flex-col gap-3 p-4"
        viewportClassName={viewportClassName}
        showJumpToBottom={showJumpToBottom}
        jumpToBottomLabel={jumpToBottomLabel}
        {...scrollOptions}
      >
        {body}
      </AutoScrollContainer>
    )
  }

  return <div className={cn('flex flex-col gap-3 p-4', className)}>{body}</div>
}

function keyFor(item: ConversationItem): string {
  if (item.kind === 'lifecycle') return `life:${item.event.id}`
  return `node:${item.node_id}:${item.sequence}`
}

function ConversationItemView({ item }: { item: ConversationItem }) {
  if (item.kind === 'lifecycle') return <LifecycleRow event={item.event} />
  return <NodeBlockView block={item} />
}

function LifecycleRow({ event }: { event: RunEvent }) {
  const { event_type, payload } = event
  let icon: React.ReactNode = <Activity />
  let label = 'Event'
  let tone = 'text-text-muted'
  switch (event_type) {
    case RunEventType.FlowStarted:
      icon = <PlayCircle />
      label = 'Flow started'
      tone = 'text-accent'
      break
    case RunEventType.FlowCompleted:
      icon = <CheckCircle2 />
      label = 'Flow completed'
      tone = 'text-success'
      break
    case RunEventType.FlowFailed:
      icon = <XCircle />
      label = 'Flow failed'
      tone = 'text-danger'
      break
    case RunEventType.RunCleared:
      icon = <Eraser />
      label = 'Run data cleared'
      tone = 'text-text-muted'
      break
  }
  const detail =
    (typeof payload.error === 'string' ? payload.error : undefined) ??
    (typeof payload.reason === 'string' ? payload.reason : undefined)
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn('inline-flex items-center [&_svg]:h-3.5 [&_svg]:w-3.5', tone)}>
        {icon}
      </span>
      <span className={cn('font-medium', tone)}>{label}</span>
      {detail && <span className="text-text-muted">— {detail}</span>}
      <span className="ml-auto text-[10px] font-mono text-text-muted">
        {formatTime(event.timestamp)}
      </span>
    </div>
  )
}

function NodeBlockView({ block }: { block: NodeBlock }) {
  const status = block.failed
    ? 'failed'
    : block.completed
      ? 'completed'
      : block.started
        ? 'running'
        : 'pending'
  const nodeName =
    (block.started && typeof block.started.payload.name === 'string'
      ? block.started.payload.name
      : undefined) ?? block.node_id

  const startedAt = block.started?.timestamp ?? block.children[0]?.timestamp
  const finishedAt = (block.completed ?? block.failed)?.timestamp

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg/50">
        <StatusDot status={status} />
        <span className="font-mono text-xs text-text-primary truncate">{nodeName}</span>
        <span className="text-[11px] text-text-muted">
          {status === 'running' ? 'running' : status === 'pending' ? 'pending' : status}
        </span>
        <span className="ml-auto text-[10px] font-mono text-text-muted">
          {startedAt && formatTime(startedAt)}
          {finishedAt && startedAt && ' → '}
          {finishedAt && formatTime(finishedAt)}
        </span>
      </div>
      {block.children.length === 0 ? (
        <div className="px-3 py-3 text-[11px] text-text-muted italic">
          {status === 'running' ? 'Waiting for output…' : 'No output recorded.'}
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-3">
          {block.children.map((child) => (
            <NodeChildView key={keyForChild(child)} child={child} />
          ))}
        </div>
      )}
      {block.failed && typeof block.failed.payload.error === 'string' && (
        <div className="border-t border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
          {block.failed.payload.error as string}
        </div>
      )}
    </div>
  )
}

function keyForChild(child: NodeChild): string {
  if (child.kind === 'message') return `m:${child.message_id}`
  if (child.kind === 'tool_call') return `t:${child.tool_call_id}:${child.sequence}`
  if (child.kind === 'iteration') return `i:${child.iteration_id}`
  return `o:${child.event.id}`
}

function NodeChildView({ child }: { child: NodeChild }) {
  if (child.kind === 'message') return <AgentMessageView item={child} />
  if (child.kind === 'tool_call') return <ToolCallView item={child} />
  if (child.kind === 'iteration') return <IterationAccordion item={child} />
  return <OneShotView item={child} />
}

/**
 * One row in the iteration panel: header (status + index + item id +
 * timing) always visible; nested sub-events (agent messages, tool calls,
 * the lifecycle one-shots that fired inside the iteration body) only
 * rendered when this iteration is the one currently expanded.
 *
 * Expand/collapse is mutex'd across the whole conversation via the
 * IterationPanelContext: opening this one unsubscribes the previously
 * open iteration from the WS stream so the dashboard never has more
 * than one full sub-event firehose pumping at a time.
 */
function IterationAccordion({ item }: { item: IterationBlock }) {
  const { openId, setOpenId } = React.useContext(IterationPanelContext)
  const isOpen = openId === item.iteration_id
  const indexLabel =
    typeof item.iteration_index === 'number'
      ? `#${item.iteration_index}`
      : '#?'
  const itemLabel = item.item_id ?? '—'
  const childCount = item.children.length
  return (
    <div
      className={cn(
        'rounded border bg-bg',
        item.status === 'failed'
          ? 'border-danger/40'
          : isOpen
            ? 'border-accent/40'
            : 'border-border',
      )}
    >
      <button
        type="button"
        onClick={() =>
          setOpenId(isOpen ? null : item.iteration_id)
        }
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface/50 transition-colors"
      >
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 text-text-muted transition-transform',
            isOpen && 'rotate-90',
          )}
        />
        <ListChecks className="h-3.5 w-3.5 text-accent" />
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          iter
        </span>
        <span className="font-mono text-xs text-text-primary">
          {indexLabel}
        </span>
        <span className="font-mono text-[11px] text-text-muted truncate">
          {itemLabel}
        </span>
        <span className="ml-auto flex items-center gap-2 text-[10px] font-mono text-text-muted">
          {childCount > 0 && (
            <span className="text-text-muted">{childCount} events</span>
          )}
          {item.status === 'running' && (
            <span className="text-accent inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              running
            </span>
          )}
          {item.status === 'completed' && (
            <span className="text-success inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {typeof item.duration_ms === 'number'
                ? `${item.duration_ms} ms`
                : 'done'}
            </span>
          )}
          {item.status === 'failed' && (
            <span className="text-danger inline-flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              failed
            </span>
          )}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-border px-3 py-3 flex flex-col gap-2">
          {item.children.length === 0 ? (
            <p className="text-[11px] text-text-muted italic">
              {item.status === 'running'
                ? 'Waiting for sub-events…'
                : 'No sub-events recorded.'}
            </p>
          ) : (
            item.children.map((child) => (
              <NodeChildView key={keyForChild(child)} child={child} />
            ))
          )}
          {item.status === 'failed' && item.error && (
            <div className="rounded border border-danger/40 bg-danger/5 px-2 py-1 text-[11px] text-danger">
              {item.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OneShotView({ item }: { item: OneShotItem }) {
  const { event } = item
  if (event.event_type === RunEventType.HumanCheckpoint) {
    const message =
      (typeof event.payload.message === 'string' && event.payload.message) ||
      (typeof event.payload.prompt === 'string' && event.payload.prompt) ||
      'Awaiting human response'
    return (
      <div className="rounded border border-warning bg-warning/5 p-3">
        <div className="flex items-center gap-2 mb-1">
          <UserCheck className="h-3.5 w-3.5 text-warning" />
          <span className="text-[10px] uppercase tracking-wider text-warning">
            Human checkpoint
          </span>
        </div>
        <p className="text-sm text-text-primary whitespace-pre-wrap">{message}</p>
      </div>
    )
  }
  if (event.event_type === RunEventType.HumanResponse) {
    const text =
      (typeof event.payload.response === 'string' && event.payload.response) ||
      (typeof event.payload.message === 'string' && event.payload.message) ||
      ''
    return (
      <div className="ml-auto max-w-[85%] rounded border border-accent-border bg-accent-subtle p-3">
        <div className="text-[10px] uppercase tracking-wider text-accent mb-1">You</div>
        <p className="text-sm text-text-primary whitespace-pre-wrap">{text}</p>
      </div>
    )
  }
  if (event.event_type === RunEventType.AgentThinking) {
    return (
      <div className="text-[11px] text-text-muted italic">
        Agent thinking…
      </div>
    )
  }
  return (
    <div className="text-[11px] text-text-muted font-mono">
      {event.event_type}
    </div>
  )
}

function StatusDot({ status }: { status: 'pending' | 'running' | 'completed' | 'failed' }) {
  if (status === 'running') {
    return <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
  }
  if (status === 'completed') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-success" />
  }
  if (status === 'failed') {
    return <XCircle className="h-3.5 w-3.5 text-danger" />
  }
  return <span className="h-2 w-2 rounded-full bg-border" aria-hidden />
}

function formatTime(ts: string): string {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ts
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
