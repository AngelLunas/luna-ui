import * as React from 'react'
import { cn } from '../../lib/utils'

export interface DayOfWeekToggleProps {
  /** Days selected as 0-6 (0 = Sunday, ISO 6 = Saturday). */
  value: number[]
  onChange: (next: number[]) => void
  /** Render starting Monday instead of Sunday. */
  weekStart?: 'sunday' | 'monday'
  className?: string
  disabled?: boolean
}

const SUN_FIRST = [
  { day: 0, label: 'S' },
  { day: 1, label: 'M' },
  { day: 2, label: 'T' },
  { day: 3, label: 'W' },
  { day: 4, label: 'T' },
  { day: 5, label: 'F' },
  { day: 6, label: 'S' },
]

const MON_FIRST = [
  { day: 1, label: 'M' },
  { day: 2, label: 'T' },
  { day: 3, label: 'W' },
  { day: 4, label: 'T' },
  { day: 5, label: 'F' },
  { day: 6, label: 'S' },
  { day: 0, label: 'S' },
]

export function DayOfWeekToggle({
  value,
  onChange,
  weekStart = 'monday',
  className,
  disabled,
}: DayOfWeekToggleProps) {
  const days = weekStart === 'monday' ? MON_FIRST : SUN_FIRST
  const set = React.useMemo(() => new Set(value), [value])

  function toggle(day: number) {
    if (disabled) return
    const next = set.has(day) ? value.filter((d) => d !== day) : [...value, day]
    next.sort((a, b) => a - b)
    onChange(next)
  }

  return (
    <div
      role="group"
      aria-label="Days of week"
      className={cn('inline-flex gap-1', className)}
    >
      {days.map(({ day, label }) => {
        const active = set.has(day)
        return (
          <button
            type="button"
            key={day}
            onClick={() => toggle(day)}
            disabled={disabled}
            aria-pressed={active}
            className={cn(
              'h-8 w-8 rounded text-xs font-medium transition-colors border',
              active
                ? 'bg-accent text-bg border-accent'
                : 'bg-transparent text-text-primary border-border hover:bg-surface',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
