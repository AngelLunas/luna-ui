import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface NumberStepperProps {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
  'aria-label'?: string
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export const NumberStepper = React.forwardRef<HTMLInputElement, NumberStepperProps>(
  (
    {
      value,
      onChange,
      min = 1,
      max = 999,
      step = 1,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const handle = (delta: number) => {
      if (disabled) return
      onChange(clamp(value + delta, min, max))
    }

    return (
      <div
        className={cn(
          'inline-flex h-9 items-stretch overflow-hidden rounded border border-border bg-transparent',
          disabled && 'opacity-50',
          className,
        )}
      >
        <button
          type="button"
          aria-label="Decrement"
          onClick={() => handle(-step)}
          disabled={disabled || value <= min}
          className="flex w-9 items-center justify-center text-text-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          ref={ref}
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            const next = Number(e.target.value)
            if (Number.isNaN(next)) return
            onChange(clamp(next, min, max))
          }}
          className="w-14 bg-transparent text-center text-sm text-text-primary tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={props['aria-label']}
        />
        <button
          type="button"
          aria-label="Increment"
          onClick={() => handle(step)}
          disabled={disabled || value >= max}
          className="flex w-9 items-center justify-center text-text-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    )
  },
)
NumberStepper.displayName = 'NumberStepper'
