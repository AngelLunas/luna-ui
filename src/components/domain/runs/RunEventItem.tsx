import * as React from 'react'
import {
  ChevronRight,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Brain,
  Wrench,
  ArrowRight,
  UserCheck,
  MessageSquare,
  Sparkles,
  Type,
  Eraser,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { type RunEvent, RunEventType } from '../../../types/run'

export interface RunEventItemProps {
  event: RunEvent
  isLast?: boolean
  className?: string
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

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

function CollapsibleJson({ data, defaultOpen = false }: { data: unknown; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen)
  const str = React.useMemo(() => safeStringify(data), [data])
  if (!data || (typeof data === 'object' && Object.keys(data as object).length === 0)) {
    return null
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition-colors"
      >
        <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
        {open ? 'Hide' : 'Show'} payload
      </button>
      {open && (
        <pre className="mt-1 max-h-64 overflow-auto rounded border border-border bg-bg p-2 text-[11px] font-mono text-text-primary whitespace-pre-wrap break-all">
          {str}
        </pre>
      )}
    </div>
  )
}

function CollapsibleText({ text, threshold = 240 }: { text: string; threshold?: number }) {
  const [open, setOpen] = React.useState(false)
  const isLong = text.length > threshold
  const visible = open || !isLong ? text : `${text.slice(0, threshold)}…`
  return (
    <div>
      <p className="text-xs text-text-muted italic whitespace-pre-wrap">{visible}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-1 text-[11px] text-accent hover:underline"
        >
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}

interface RowProps {
  icon: React.ReactNode
  iconClass?: string
  isLast?: boolean
  timestamp: string
  children: React.ReactNode
}

function Row({ icon, iconClass, isLast, timestamp, children }: RowProps) {
  return (
    <div className="relative flex gap-3 pb-4">
      {!isLast && (
        <span
          className="absolute left-3 top-6 bottom-0 w-px bg-border"
          aria-hidden
        />
      )}
      <div
        className={cn(
          'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-bg [&_svg]:h-3.5 [&_svg]:w-3.5',
          iconClass,
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex-1 min-w-0">{children}</div>
          <span className="shrink-0 text-[10px] text-text-muted font-mono">
            {formatTime(timestamp)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function RunEventItem({ event, isLast, className }: RunEventItemProps) {
  const { event_type, payload, node_id } = event

  switch (event_type) {
    case RunEventType.FlowStarted:
      return (
        <div className={className}>
          <Row
            icon={<PlayCircle />}
            iconClass="border-accent-border text-accent bg-accent-subtle"
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <p className="text-sm font-medium text-text-primary">Flow started</p>
          </Row>
        </div>
      )

    case RunEventType.FlowCompleted:
      return (
        <div className={className}>
          <Row
            icon={<CheckCircle2 />}
            iconClass="border-accent-border text-success bg-accent-subtle"
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <p className="text-sm font-medium text-text-primary">Flow completed</p>
          </Row>
        </div>
      )

    case RunEventType.FlowFailed:
      return (
        <div className={className}>
          <Row
            icon={<XCircle />}
            iconClass="border-danger text-danger"
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <p className="text-sm font-medium text-danger">Flow failed</p>
            {asString(payload.error) && (
              <p className="text-xs text-text-muted mt-1">{asString(payload.error)}</p>
            )}
          </Row>
        </div>
      )

    case RunEventType.NodeStarted:
    case RunEventType.NodeCompleted:
    case RunEventType.NodeFailed: {
      const failed = event_type === RunEventType.NodeFailed
      const completed = event_type === RunEventType.NodeCompleted
      const nodeName = asString(payload.name) ?? node_id ?? ''
      const duration = asString(payload.duration) ?? asNumber(payload.durationMs)
      const verb = failed ? 'failed' : completed ? 'completed' : 'started'
      return (
        <div className={className}>
          <Row
            icon={failed ? <XCircle /> : completed ? <CheckCircle2 /> : <PlayCircle />}
            iconClass={cn(
              failed && 'border-danger text-danger',
              completed && 'border-accent-border text-success',
              !failed && !completed && 'text-text-muted',
            )}
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-mono text-text-primary">
                {nodeName}
              </span>
              <span className="text-xs text-text-muted">{verb}</span>
              {duration !== undefined && (
                <span className="text-[11px] text-text-muted font-mono">
                  {typeof duration === 'number' ? `${duration}ms` : duration}
                </span>
              )}
            </div>
            {failed && asString(payload.error) && (
              <p className="text-xs text-danger mt-1">{asString(payload.error)}</p>
            )}
          </Row>
        </div>
      )
    }

    case RunEventType.AgentThinking: {
      const text =
        asString(payload.thinking) ?? asString(payload.text) ?? asString(payload.message) ?? ''
      return (
        <div className={className}>
          <Row
            icon={<Brain />}
            iconClass="text-text-muted"
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wider text-text-muted">
                Thinking
              </span>
              {text && <CollapsibleText text={text} />}
            </div>
          </Row>
        </div>
      )
    }

    case RunEventType.AgentMessageStarted:
      return (
        <div className={className}>
          <Row
            icon={<Sparkles />}
            iconClass="text-accent"
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <span className="text-[11px] uppercase tracking-wider text-text-muted">
              Agent message started
            </span>
          </Row>
        </div>
      )

    case RunEventType.AgentTextDelta:
    case RunEventType.AgentThinkingDelta: {
      const isThinking = event_type === RunEventType.AgentThinkingDelta
      const text = asString(payload.text) ?? ''
      return (
        <div className={className}>
          <Row
            icon={isThinking ? <Brain /> : <Type />}
            iconClass="text-text-muted"
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <span className="text-xs text-text-muted font-mono whitespace-pre-wrap">
              {text}
            </span>
          </Row>
        </div>
      )
    }

    case RunEventType.AgentMessageCompleted:
      return (
        <div className={className}>
          <Row
            icon={<CheckCircle2 />}
            iconClass="text-success"
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <span className="text-[11px] uppercase tracking-wider text-text-muted">
              Agent message completed
            </span>
          </Row>
        </div>
      )

    case RunEventType.ToolCalled: {
      const toolName =
        asString(payload.tool) ?? asString(payload.name) ?? asString(payload.toolName) ?? 'tool'
      const input = payload.input ?? payload.arguments ?? payload.args
      return (
        <div className={className}>
          <Row
            icon={<Wrench />}
            iconClass="border-accent-border text-accent bg-accent-subtle"
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-text-muted">
                  Tool call
                </span>
                <span className="text-sm font-mono text-text-primary">{toolName}</span>
              </div>
              <CollapsibleJson data={input} />
            </div>
          </Row>
        </div>
      )
    }

    case RunEventType.ToolResult: {
      const toolName = asString(payload.tool) ?? asString(payload.name) ?? 'tool'
      const error = payload.error
      const output = payload.output ?? payload.result ?? payload.data ?? payload.output_preview
      const failed = Boolean(error) || payload.is_error === true
      return (
        <div className={className}>
          <Row
            icon={failed ? <XCircle /> : <ArrowRight />}
            iconClass={
              failed ? 'border-danger text-danger' : 'border-accent-border text-success'
            }
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-text-muted">
                  {failed ? 'Tool error' : 'Tool result'}
                </span>
                <span className="text-sm font-mono text-text-primary">{toolName}</span>
              </div>
              {failed ? (
                <pre className="rounded border border-danger bg-bg p-2 text-[11px] font-mono text-danger whitespace-pre-wrap">
                  {safeStringify(error ?? output)}
                </pre>
              ) : (
                <CollapsibleJson data={output} />
              )}
            </div>
          </Row>
        </div>
      )
    }

    case RunEventType.HumanCheckpoint: {
      const message =
        asString(payload.message) ?? asString(payload.prompt) ?? 'Awaiting human response'
      return (
        <div className={className}>
          <Row
            icon={<UserCheck />}
            iconClass="border-warning text-warning"
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <div className="rounded border border-warning bg-warning/5 p-3">
              <p className="text-[11px] uppercase tracking-wider text-warning mb-1">
                Human checkpoint
              </p>
              <p className="text-sm text-text-primary whitespace-pre-wrap">{message}</p>
            </div>
          </Row>
        </div>
      )
    }

    case RunEventType.HumanResponse: {
      const response =
        asString(payload.response) ?? asString(payload.message) ?? ''
      return (
        <div className={className}>
          <Row
            icon={<MessageSquare />}
            iconClass="border-accent-border text-accent bg-accent-subtle"
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <div className="rounded border border-accent-border bg-accent-subtle p-3 ml-auto max-w-[85%]">
              <p className="text-[11px] uppercase tracking-wider text-accent mb-1">You</p>
              <p className="text-sm text-text-primary whitespace-pre-wrap">{response}</p>
            </div>
          </Row>
        </div>
      )
    }

    case RunEventType.RunCleared:
      return (
        <div className={className}>
          <Row
            icon={<Eraser />}
            iconClass="text-text-muted"
            isLast={isLast}
            timestamp={event.timestamp}
          >
            <p className="text-xs text-text-muted">
              Run data was cleared
              {asString(payload.cleared_at) ? ` at ${formatTime(asString(payload.cleared_at)!)}` : ''}
            </p>
          </Row>
        </div>
      )

    default:
      return null
  }
}
