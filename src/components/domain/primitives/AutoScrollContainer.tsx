import * as React from 'react'
import { ArrowDown } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useAutoScroll, type UseAutoScrollOptions } from '../../../lib/useAutoScroll'

export interface AutoScrollContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    UseAutoScrollOptions {
  /** Class applied to the inner content wrapper (the observed element).
   *  Use this for padding/layout that lives *inside* the scroll viewport. */
  contentClassName?: string
  /** Class applied to the scroll viewport itself (the element with
   *  `overflow: auto`). Defaults to `h-full min-h-0 overflow-y-auto`. */
  viewportClassName?: string
  /** Show a small "jump to latest" pill when the user has scrolled up and
   *  detached from the live tail. Default: true. */
  showJumpToBottom?: boolean
  /** Override the label rendered inside the jump-to-latest pill. */
  jumpToBottomLabel?: React.ReactNode
}

/**
 * Scrollable container that follows a streaming feed: glues to the bottom
 * while content grows, releases when the user scrolls up, and re-glues
 * when they scroll back to the end. Designed for chat transcripts, log
 * viewers, and run timelines.
 *
 * Fills its parent (`h-full`) — give it a sized parent. The forwarded ref
 * points at the scroll viewport so callers can read/scroll it directly.
 */
export const AutoScrollContainer = React.forwardRef<
  HTMLDivElement,
  AutoScrollContainerProps
>(function AutoScrollContainer(
  {
    children,
    className,
    contentClassName,
    viewportClassName,
    enabled,
    threshold,
    behavior,
    initialPinned,
    onPinnedChange,
    showJumpToBottom = true,
    jumpToBottomLabel,
    ...rest
  },
  forwardedRef,
) {
  const { scrollRef, contentRef, pinned, scrollToBottom } = useAutoScroll({
    enabled,
    threshold,
    behavior,
    initialPinned,
    onPinnedChange,
  })

  React.useImperativeHandle(
    forwardedRef,
    () => scrollRef.current as HTMLDivElement,
    [scrollRef],
  )

  return (
    <div className={cn('relative h-full', className)}>
      <div
        ref={scrollRef}
        className={cn(
          'h-full min-h-0 overflow-y-auto overflow-x-hidden',
          viewportClassName,
        )}
        {...rest}
      >
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </div>
      {showJumpToBottom && !pinned && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className={cn(
            'absolute bottom-2 left-1/2 -translate-x-1/2 z-10',
            'inline-flex items-center gap-1 rounded-full border border-border bg-surface',
            'px-3 py-1 text-[11px] text-text-primary shadow-md',
            'hover:bg-bg transition-colors',
          )}
          aria-label="Jump to latest"
        >
          <ArrowDown className="h-3 w-3" />
          {jumpToBottomLabel ?? 'Jump to latest'}
        </button>
      )}
    </div>
  )
})
