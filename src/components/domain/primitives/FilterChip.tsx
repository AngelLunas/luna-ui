import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '../../../lib/utils'

export interface FilterChipOption<T extends string> {
  label: string
  value: T
  /** Optional small count shown next to the label (e.g. "Applied · 12"). */
  count?: number
  icon?: React.ReactNode
}

type SingleProps<T extends string> = {
  multi?: false
  value: T | null
  onChange: (value: T | null) => void
}

type MultiProps<T extends string> = {
  multi: true
  value: T[]
  onChange: (value: T[]) => void
}

export type FilterChipProps<T extends string> = {
  /** Label shown when no filter is active (e.g. "Status"). */
  label: string
  options: FilterChipOption<T>[]
  /** Optional leading icon, shown left of the label. */
  icon?: React.ReactNode
  /** When true, hides the value summary and just shows the label. */
  hideSummary?: boolean
  /** Render a custom summary for the active value(s). */
  renderSummary?: (active: FilterChipOption<T>[]) => React.ReactNode
  className?: string
} & (SingleProps<T> | MultiProps<T>)

function isMulti<T extends string>(p: FilterChipProps<T>): p is FilterChipProps<T> & MultiProps<T> {
  return p.multi === true
}

export function FilterChip<T extends string>(props: FilterChipProps<T>) {
  const { label, options, icon, hideSummary, renderSummary, className } = props
  const multi = isMulti(props)
  const activeValues: T[] = multi
    ? props.value
    : props.value !== null
      ? [props.value]
      : []
  const activeOptions = options.filter((o) => activeValues.includes(o.value))
  const hasActive = activeValues.length > 0

  function toggle(value: T) {
    if (multi) {
      const next = activeValues.includes(value)
        ? activeValues.filter((v) => v !== value)
        : [...activeValues, value]
      props.onChange(next)
    } else {
      props.onChange(props.value === value ? null : value)
    }
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (multi) props.onChange([])
    else props.onChange(null)
  }

  const summary = hideSummary
    ? null
    : renderSummary
      ? renderSummary(activeOptions)
      : hasActive
        ? activeOptions.length === 1
          ? activeOptions[0].label
          : `${activeOptions.length} selected`
        : null

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'group inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-all',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            hasActive
              ? 'border-accent-border bg-accent-subtle text-accent hover:bg-accent-subtle/80'
              : 'border-border bg-surface/60 text-text-muted hover:text-text-primary hover:border-text-muted/40',
            className,
          )}
        >
          {icon && (
            <span className="[&_svg]:h-3.5 [&_svg]:w-3.5 -ml-0.5">{icon}</span>
          )}
          <span>{label}</span>
          {summary && (
            <>
              <span className={cn('text-border', hasActive && 'text-accent/40')}>·</span>
              <span className="text-text-primary group-hover:text-text-primary">
                {summary}
              </span>
            </>
          )}
          {hasActive ? (
            <span
              role="button"
              aria-label={`Clear ${label}`}
              onClick={clear}
              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent/20"
            >
              <X size={10} />
            </span>
          ) : (
            <ChevronDown
              size={12}
              className="text-text-muted transition-transform group-data-[state=open]:rotate-180"
            />
          )}
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          sideOffset={6}
          align="start"
          className={cn(
            'z-50 min-w-[200px] overflow-hidden rounded-md border border-border bg-bg p-1 text-text-primary shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        >
          <div className="px-2 pt-1.5 pb-1 text-[10px] uppercase tracking-wider text-text-muted">
            {label}
          </div>
          {options.map((opt) => {
            const checked = activeValues.includes(opt.value)
            return (
              <DropdownMenuPrimitive.Item
                key={opt.value}
                onSelect={(e) => {
                  if (multi) e.preventDefault()
                  toggle(opt.value)
                }}
                className={cn(
                  'relative flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-sm outline-none transition-colors',
                  'focus:bg-accent-subtle hover:bg-accent-subtle',
                  checked && 'text-accent',
                )}
              >
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  {checked && <Check size={14} />}
                </span>
                {opt.icon && <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{opt.icon}</span>}
                <span className="flex-1">{opt.label}</span>
                {opt.count !== undefined && (
                  <span className="text-[10px] tabular-nums text-text-muted">
                    {opt.count}
                  </span>
                )}
              </DropdownMenuPrimitive.Item>
            )
          })}
          {hasActive && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={clear}
                className="w-full rounded px-2 py-1.5 text-left text-xs text-text-muted hover:bg-accent-subtle hover:text-text-primary transition-colors"
              >
                Clear filter
              </button>
            </>
          )}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
