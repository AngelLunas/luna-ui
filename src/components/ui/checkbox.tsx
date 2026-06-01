import * as React from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface CheckboxProps {
  checked: boolean | 'indeterminate'
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  id?: string
  label?: React.ReactNode
  description?: React.ReactNode
  className?: string
  /** Render label/description inline (default) or stacked. */
  align?: 'start' | 'center'
}

/**
 * Plain controlled checkbox with optional label + description.
 *
 * Built on a native <input type="checkbox"> for accessibility and
 * form-control compatibility (it composes inside forms, supports
 * indeterminate via ref, and inherits keyboard semantics for free).
 * The custom box is visual chrome only.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked,
      onCheckedChange,
      disabled,
      id,
      label,
      description,
      className,
      align = 'start',
    },
    ref,
  ) => {
    const localRef = React.useRef<HTMLInputElement | null>(null)
    React.useImperativeHandle(ref, () => localRef.current as HTMLInputElement)

    const indeterminate = checked === 'indeterminate'
    const isChecked = checked === true

    React.useEffect(() => {
      if (localRef.current) localRef.current.indeterminate = indeterminate
    }, [indeterminate])

    const autoId = React.useId()
    const inputId = id ?? autoId

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex gap-2 text-sm text-text-primary select-none',
          align === 'center' ? 'items-center' : 'items-start',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className,
        )}
      >
        <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center mt-0.5">
          <input
            ref={localRef}
            id={inputId}
            type="checkbox"
            checked={isChecked}
            disabled={disabled}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            className="peer absolute inset-0 h-full w-full cursor-inherit opacity-0"
          />
          <span
            aria-hidden
            className={cn(
              'h-4 w-4 rounded-sm border flex items-center justify-center transition-colors',
              isChecked || indeterminate
                ? 'bg-accent border-accent text-white'
                : 'bg-transparent border-border',
              'peer-focus-visible:ring-1 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-bg',
            )}
          >
            {indeterminate ? (
              <Minus className="h-3 w-3" strokeWidth={3} />
            ) : isChecked ? (
              <Check className="h-3 w-3" strokeWidth={3} />
            ) : null}
          </span>
        </span>
        {(label || description) && (
          <span className="flex flex-col gap-0.5 leading-tight">
            {label && <span>{label}</span>}
            {description && (
              <span className="text-xs text-text-muted">{description}</span>
            )}
          </span>
        )}
      </label>
    )
  },
)
Checkbox.displayName = 'Checkbox'
