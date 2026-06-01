import { cn } from '../../../lib/utils'

export interface FilterTabOption<T extends string> {
  label: string
  value: T
  count?: number
}

export interface FilterTabsProps<T extends string> {
  options: FilterTabOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: FilterTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-border pb-px',
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors rounded-t',
            opt.value === value
              ? 'text-text-primary border-b-2 border-accent -mb-px'
              : 'text-text-muted hover:text-text-primary',
          )}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                opt.value === value
                  ? 'bg-accent-subtle text-accent'
                  : 'bg-surface text-text-muted',
              )}
            >
              {opt.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
