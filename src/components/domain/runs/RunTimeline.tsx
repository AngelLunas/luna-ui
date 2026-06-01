import { Activity } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { type RunEvent } from '../../../types/run'
import { RunEventItem } from './RunEventItem'
import { EmptyState } from '../primitives/EmptyState'
import {
  AutoScrollContainer,
  type AutoScrollContainerProps,
} from '../primitives/AutoScrollContainer'
import { type UseAutoScrollOptions } from '../../../lib/useAutoScroll'

export interface RunTimelineProps {
  events: RunEvent[]
  loading?: boolean
  className?: string
  /** Make the component a scrollable container that follows the stream.
   *  - `true` enables with defaults.
   *  - An options object configures threshold / behavior / callbacks.
   *  - `false` / omitted preserves the original non-scrolling layout.
   *
   *  When enabled the component fills its parent's height (`h-full`). */
  autoScroll?:
    | boolean
    | (UseAutoScrollOptions &
        Pick<
          AutoScrollContainerProps,
          'showJumpToBottom' | 'jumpToBottomLabel' | 'viewportClassName'
        >)
}

/**
 * Flat chronological view of every RunEvent. One row per event, including
 * every text/thinking delta — useful for debugging the raw stream.
 * For the readable conversational view (deltas folded into messages, grouped
 * per node) use `RunConversation` instead.
 */
export function RunTimeline({
  events,
  loading,
  className,
  autoScroll,
}: RunTimelineProps) {
  if (loading) {
    return (
      <div className={cn('flex flex-col gap-3 p-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-6 w-6 shrink-0 rounded-full bg-surface animate-pulse" />
            <div className="flex-1 h-6 rounded bg-surface animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Activity />}
        title="No events yet"
        description="Events will stream in once this run starts producing output."
        className={className}
      />
    )
  }

  const sorted = [...events].sort((a, b) => a.sequence - b.sequence)

  const body = sorted.map((event, i) => (
    <RunEventItem key={event.id} event={event} isLast={i === sorted.length - 1} />
  ))

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
        contentClassName="flex flex-col p-4"
        viewportClassName={viewportClassName}
        showJumpToBottom={showJumpToBottom}
        jumpToBottomLabel={jumpToBottomLabel}
        {...scrollOptions}
      >
        {body}
      </AutoScrollContainer>
    )
  }

  return <div className={cn('flex flex-col p-4', className)}>{body}</div>
}
