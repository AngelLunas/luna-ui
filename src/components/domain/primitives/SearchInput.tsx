import * as React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '../../../lib/utils'

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> {
  value: string
  onChange: (value: string) => void
  /** Fires after `debounceMs` of no typing. If omitted, debounce is disabled. */
  onDebouncedChange?: (value: string) => void
  /** Debounce delay in ms. Default 250. */
  debounceMs?: number
  placeholder?: string
  /** Visual size variant. */
  size?: 'sm' | 'md'
  className?: string
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onDebouncedChange,
      debounceMs = 250,
      placeholder = 'Search…',
      size = 'md',
      className,
      ...rest
    },
    ref,
  ) => {
    React.useEffect(() => {
      if (!onDebouncedChange) return
      const t = setTimeout(() => onDebouncedChange(value), debounceMs)
      return () => clearTimeout(t)
    }, [value, debounceMs, onDebouncedChange])

    const heightClass = size === 'sm' ? 'h-8 text-sm' : 'h-10 text-sm'
    const iconSize = size === 'sm' ? 14 : 16

    return (
      <div
        className={cn(
          'group relative flex items-center w-full rounded-md border border-border bg-surface/60 transition-colors focus-within:border-accent-border focus-within:bg-surface',
          heightClass,
          className,
        )}
      >
        <Search
          size={iconSize}
          className="absolute left-3 text-text-muted group-focus-within:text-accent transition-colors pointer-events-none"
        />
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-full bg-transparent pl-9 pr-9 text-text-primary placeholder:text-text-muted focus:outline-none"
          {...rest}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-2 inline-flex h-5 w-5 items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-border/50 transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>
    )
  },
)
SearchInput.displayName = 'SearchInput'
