import * as React from 'react'

export interface UseAutoScrollOptions {
  /** Master switch — when false the hook is a no-op. Default: true. */
  enabled?: boolean
  /** Distance in px from the bottom that still counts as "at bottom".
   *  Larger values are more forgiving when the user is scrolled near
   *  (but not exactly at) the end. Default: 32. */
  threshold?: number
  /** Scroll behavior used by `scrollToBottom()` and the initial mount scroll.
   *  Auto-follow during streaming always uses instant scroll to avoid jank.
   *  Default: `'auto'`. */
  behavior?: ScrollBehavior
  /** Start pinned and scroll to the bottom on mount. Default: true. */
  initialPinned?: boolean
  /** Fired when the pinned state toggles (user detaches by scrolling up,
   *  or reattaches by scrolling back to the bottom). */
  onPinnedChange?: (pinned: boolean) => void
}

export interface UseAutoScrollReturn<
  C extends HTMLElement = HTMLDivElement,
  T extends HTMLElement = HTMLDivElement,
> {
  /** Attach to the scrollable viewport (the element with `overflow: auto`). */
  scrollRef: React.RefObject<C>
  /** Attach to the inner content element so size changes can be observed. */
  contentRef: React.RefObject<T>
  /** True when the viewport is glued to the bottom and follows new content. */
  pinned: boolean
  /** Imperatively scroll to the bottom and re-pin. */
  scrollToBottom: (behavior?: ScrollBehavior) => void
}

/**
 * Drives a "follow the stream" scroll container:
 * - When content grows and the user is at the bottom, scroll to the new bottom.
 * - When the user scrolls up past `threshold`, detach (stop following).
 * - When the user scrolls back to the bottom, reattach.
 *
 * Returns two refs: one for the scroll viewport (`overflow: auto`) and one for
 * the inner content (observed via `ResizeObserver`). Both must be attached for
 * auto-follow to work.
 *
 * Pinning state is tracked in a ref so the observer effect doesn't have to
 * re-subscribe on every toggle — this keeps the scroll loop tight and avoids
 * the layout jitter that can happen when listeners are torn down mid-stream.
 */
export function useAutoScroll<
  C extends HTMLElement = HTMLDivElement,
  T extends HTMLElement = HTMLDivElement,
>(options: UseAutoScrollOptions = {}): UseAutoScrollReturn<C, T> {
  const {
    enabled = true,
    threshold = 32,
    behavior = 'auto',
    initialPinned = true,
    onPinnedChange,
  } = options

  const scrollRef = React.useRef<C>(null)
  const contentRef = React.useRef<T>(null)
  const [pinned, setPinned] = React.useState(initialPinned)
  const pinnedRef = React.useRef(initialPinned)
  // Suppresses the scroll handler while we are scrolling programmatically.
  // Smooth scrolls fire intermediate scroll events at non-bottom positions
  // which would otherwise be misread as the user detaching.
  const suppressUntilRef = React.useRef(0)
  const onPinnedChangeRef = React.useRef(onPinnedChange)

  React.useEffect(() => {
    onPinnedChangeRef.current = onPinnedChange
  }, [onPinnedChange])

  const setPinnedBoth = React.useCallback((next: boolean) => {
    if (pinnedRef.current === next) return
    pinnedRef.current = next
    setPinned(next)
    onPinnedChangeRef.current?.(next)
  }, [])

  const isAtBottom = React.useCallback(
    (el: HTMLElement): boolean =>
      el.scrollHeight - el.scrollTop - el.clientHeight <= threshold,
    [threshold],
  )

  const scrollToBottomImpl = React.useCallback(
    (el: HTMLElement, b: ScrollBehavior) => {
      if (b === 'smooth') {
        // Smooth scroll fires intermediate scroll events at non-bottom
        // positions; suppress the handler so we stay pinned through them.
        suppressUntilRef.current = performance.now() + 400
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      } else {
        // Instant scroll lands at the bottom in one shot — no suppression
        // needed. Suppressing here would swallow the user's wheel/touch
        // scroll events during fast streaming (each delta would renew the
        // window) and trap them at the bottom.
        el.scrollTop = el.scrollHeight
      }
    },
    [],
  )

  const scrollToBottom = React.useCallback(
    (b?: ScrollBehavior) => {
      const el = scrollRef.current
      if (!el) return
      setPinnedBoth(true)
      scrollToBottomImpl(el, b ?? behavior)
    },
    [behavior, scrollToBottomImpl, setPinnedBoth],
  )

  // User scroll: update pinned based on distance from bottom.
  React.useEffect(() => {
    if (!enabled) return
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      if (performance.now() < suppressUntilRef.current) return
      setPinnedBoth(isAtBottom(el))
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [enabled, isAtBottom, setPinnedBoth])

  // User intent: wheel-up / swipe-down detaches immediately, without
  // waiting for the scroll event. During fast streaming a ResizeObserver
  // tick can run between the user's wheel and the resulting scroll event
  // and re-scroll to the bottom; reading the intent synchronously lets us
  // unpin first so the next observer tick keeps the user where they are.
  React.useEffect(() => {
    if (!enabled) return
    const el = scrollRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) setPinnedBoth(false)
    }

    let touchStartY: number | null = null
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? null
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY == null) return
      const y = e.touches[0]?.clientY ?? touchStartY
      // Finger moving down = scrolling content up.
      if (y - touchStartY > 5) setPinnedBoth(false)
    }
    const handleTouchEnd = () => {
      touchStartY = null
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home') {
        setPinnedBoth(false)
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: true })
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    el.addEventListener('keydown', handleKeyDown)
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, setPinnedBoth])

  // Content size: when it grows and we are pinned, glue to the new bottom.
  // Also observe the viewport so a parent resize that exposes more content
  // still keeps us anchored.
  React.useEffect(() => {
    if (!enabled) return
    const scroll = scrollRef.current
    const content = contentRef.current
    if (!scroll || !content) return
    if (typeof ResizeObserver === 'undefined') return

    let prevScrollHeight = scroll.scrollHeight

    const handle = () => {
      const newScrollHeight = scroll.scrollHeight
      const grew = newScrollHeight > prevScrollHeight
      prevScrollHeight = newScrollHeight
      if (pinnedRef.current && (grew || !isAtBottom(scroll))) {
        // Always instant during streaming — smooth would race the next
        // delta and produce visible step-jumps.
        scrollToBottomImpl(scroll, 'auto')
      }
    }

    const observer = new ResizeObserver(handle)
    observer.observe(content)
    observer.observe(scroll)
    return () => observer.disconnect()
  }, [enabled, isAtBottom, scrollToBottomImpl])

  // Initial mount: jump to bottom without firing onPinnedChange.
  React.useEffect(() => {
    if (!enabled || !initialPinned) return
    const el = scrollRef.current
    if (!el) return
    scrollToBottomImpl(el, 'auto')
    // Intentionally mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { scrollRef, contentRef, pinned, scrollToBottom }
}
