import * as React from 'react'
import { cn } from '../../../lib/utils'

export type ScoreRingTone = 'success' | 'warning' | 'danger' | 'muted' | 'accent'

export interface ScoreRingProps {
  /** Value in 0..1 (or 0..100 if `max` is 100). */
  value: number
  /** Optional max — defaults to 1. Set to 100 for percentage inputs. */
  max?: number
  /** Visual size in pixels. */
  size?: number
  /** Stroke thickness in pixels. */
  strokeWidth?: number
  /** Force a specific tone. If omitted, auto-derived from value. */
  tone?: ScoreRingTone
  /** Custom label inside the ring. Defaults to the rounded percentage. */
  label?: React.ReactNode
  /** Caption rendered below the percent number. */
  caption?: React.ReactNode
  className?: string
}

const TONE_CLASSES: Record<ScoreRingTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  muted: 'text-text-muted',
  accent: 'text-accent',
}

function defaultTone(percent: number): ScoreRingTone {
  if (percent >= 80) return 'success'
  if (percent >= 50) return 'accent'
  if (percent >= 25) return 'warning'
  return 'danger'
}

export function ScoreRing({
  value,
  max = 1,
  size = 48,
  strokeWidth = 4,
  tone,
  label,
  caption,
  className,
}: ScoreRingProps) {
  const ratio = Math.max(0, Math.min(1, value / max))
  const percent = Math.round(ratio * 100)
  const resolvedTone = tone ?? defaultTone(percent)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - ratio)

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center',
        TONE_CLASSES[resolvedTone],
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score ${percent}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[11px] font-semibold tabular-nums">
          {label ?? percent}
        </span>
        {caption && (
          <span className="text-[9px] uppercase tracking-wide text-text-muted mt-0.5">
            {caption}
          </span>
        )}
      </div>
    </div>
  )
}
