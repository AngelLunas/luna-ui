import * as React from 'react'
import { Clock } from 'lucide-react'
import { cn } from '../../lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover'

export interface TimePickerProps {
  /** "HH:MM" 24-hour string. */
  value: string
  onChange: (next: string) => void
  /** Increment for the minute column inside the popover (default 1). */
  minuteStep?: number
  className?: string
  disabled?: boolean
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function parse(value: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (!m) return { hour: 9, minute: 0 }
  return {
    hour: clamp(Number(m[1]), 0, 23),
    minute: clamp(Number(m[2]), 0, 59),
  }
}

/** Parse what the user typed leniently — accepts "9", "930", "9:3", "09:30", etc. */
function parseLoose(text: string): { hour: number; minute: number } | null {
  const t = text.trim()
  if (!t) return null
  const m = /^(\d{1,2}):?(\d{0,2})$/.exec(t)
  if (!m) return null
  const h = Number(m[1])
  const min = m[2] === '' ? 0 : Number(m[2])
  if (Number.isNaN(h) || Number.isNaN(min)) return null
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return { hour: h, minute: min }
}

function ScrollableColumn({
  values,
  selected,
  onSelect,
  ariaLabel,
}: {
  values: number[]
  selected: number
  onSelect: (n: number) => void
  ariaLabel: string
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const selectedRef = React.useRef<HTMLButtonElement>(null)

  // Center the selected item whenever it changes (open + click).
  React.useEffect(() => {
    if (!containerRef.current || !selectedRef.current) return
    const btn = selectedRef.current
    const container = containerRef.current
    container.scrollTop =
      btn.offsetTop - container.clientHeight / 2 + btn.clientHeight / 2
  }, [selected])

  // Radix Dialog wraps its content with react-remove-scroll, which intercepts
  // wheel events anywhere outside the dialog tree — including the portaled
  // Popover content this picker lives in. That makes the column un-scrollable
  // when the picker is mounted inside a Dialog. The workaround is to attach a
  // non-passive wheel listener to the column itself: we preventDefault before
  // the document-level lock can see the event, then drive scroll manually.
  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      el.scrollTop += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label={ariaLabel}
      className="h-44 w-14 overflow-y-auto rounded border border-border bg-surface"
    >
      <div className="flex flex-col py-1">
        {values.map((n) => {
          const isSelected = n === selected
          return (
            <button
              type="button"
              key={n}
              ref={isSelected ? selectedRef : undefined}
              role="option"
              aria-selected={isSelected}
              onClick={() => onSelect(n)}
              className={cn(
                'w-full py-1.5 text-center text-sm tabular-nums transition-colors',
                isSelected
                  ? 'bg-accent text-bg font-semibold'
                  : 'text-text-primary hover:bg-accent-subtle',
              )}
            >
              {pad2(n)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(
  ({ value, onChange, minuteStep = 1, className, disabled }, ref) => {
    const { hour, minute } = parse(value)

    // Local text buffer so the user can type freely without us reformatting
    // mid-keystroke. We only commit on blur or Enter.
    const [text, setText] = React.useState(`${pad2(hour)}:${pad2(minute)}`)
    React.useEffect(() => {
      setText(`${pad2(hour)}:${pad2(minute)}`)
    }, [value, hour, minute])

    const commit = () => {
      const parsed = parseLoose(text)
      if (parsed) {
        const next = `${pad2(parsed.hour)}:${pad2(parsed.minute)}`
        onChange(next)
        setText(next)
      } else {
        // Revert to the last known good value so the input never displays
        // something that won't round-trip.
        setText(`${pad2(hour)}:${pad2(minute)}`)
      }
    }

    const hours = React.useMemo(
      () => Array.from({ length: 24 }, (_, i) => i),
      [],
    )
    const minutes = React.useMemo(() => {
      const step = Math.max(1, Math.min(30, minuteStep))
      return Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step)
    }, [minuteStep])

    // If the current minute isn't on the step grid (e.g. step=5 but user typed
    // ":07"), snap to the closest grid value for highlighting only — the
    // typed value remains the source of truth.
    const minuteForGrid = minutes.includes(minute)
      ? minute
      : minutes.reduce((acc, m) =>
          Math.abs(m - minute) < Math.abs(acc - minute) ? m : acc,
        )

    return (
      <div className={cn('flex items-stretch gap-1', className)}>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          placeholder="HH:MM"
          disabled={disabled}
          aria-label="Time"
          className="h-9 w-20 rounded border border-border bg-transparent px-3 text-sm text-text-primary tabular-nums placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label="Pick time"
              className="flex h-9 w-9 items-center justify-center rounded border border-border text-text-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Clock className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-3">
            <div className="flex items-center gap-2">
              <ScrollableColumn
                values={hours}
                selected={hour}
                ariaLabel="Hours"
                onSelect={(h) => onChange(`${pad2(h)}:${pad2(minute)}`)}
              />
              <span className="text-text-muted text-lg">:</span>
              <ScrollableColumn
                values={minutes}
                selected={minuteForGrid}
                ariaLabel="Minutes"
                onSelect={(m) => onChange(`${pad2(hour)}:${pad2(m)}`)}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  },
)
TimePicker.displayName = 'TimePicker'
