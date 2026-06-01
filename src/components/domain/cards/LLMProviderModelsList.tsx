import * as React from 'react'
import { Check, Cpu, Search } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { LLMProviderModel } from '../../../types/llmProvider'
import { Input } from '../../ui/input'
import { EmptyState } from '../primitives/EmptyState'

export interface LLMProviderModelsListProps {
  models: LLMProviderModel[]
  loading?: boolean
  error?: string | null
  className?: string
  /** When provided, items become buttons and the matching item is highlighted. */
  selectedId?: string | null
  /** When provided, items become clickable and invoke this on click. */
  onSelect?: (model: LLMProviderModel) => void
  /** Hide the built-in search input. Defaults to false (search is shown). */
  hideSearch?: boolean
  /** Placeholder for the search input. */
  searchPlaceholder?: string
}

export function LLMProviderModelsList({
  models,
  loading,
  error,
  className,
  selectedId,
  onSelect,
  hideSearch = false,
  searchPlaceholder = 'Search models…',
}: LLMProviderModelsListProps) {
  const [query, setQuery] = React.useState('')

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return models
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        (m.ownedBy?.toLowerCase().includes(q) ?? false),
    )
  }, [models, query])

  if (loading) {
    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-8 rounded border border-border bg-surface animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          'rounded border border-danger/40 bg-danger/5 p-3 text-xs text-danger',
          className,
        )}
        role="alert"
      >
        {error}
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <EmptyState
        icon={<Cpu size={32} />}
        title="No models reported"
        description="This provider didn't return any models from its /models endpoint."
        className={className}
      />
    )
  }

  const selectable = typeof onSelect === 'function'

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {!hideSearch && (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-8 text-xs"
            aria-label="Search models"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-text-muted px-1 py-4 text-center">
          No models match “{query}”.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded border border-border">
          {filtered.map((m) => {
            const isSelected = selectable && selectedId === m.id
            const content = (
              <>
                <span className="flex items-center gap-2 flex-1 min-w-0">
                  {selectable && (
                    <Check
                      size={12}
                      className={cn(
                        'shrink-0',
                        isSelected ? 'text-accent' : 'text-transparent',
                      )}
                    />
                  )}
                  <span
                    className="font-mono text-text-primary truncate min-w-0"
                    title={m.id}
                  >
                    {m.id}
                  </span>
                </span>
                {m.ownedBy && (
                  <span
                    className="text-text-muted shrink-0 truncate max-w-[40%]"
                    title={m.ownedBy}
                  >
                    {m.ownedBy}
                  </span>
                )}
              </>
            )

            const baseClasses =
              'flex items-center justify-between gap-3 px-3 py-2 text-xs w-full min-w-0 text-left'

            return (
              <li key={m.id}>
                {selectable ? (
                  <button
                    type="button"
                    onClick={() => onSelect!(m)}
                    aria-pressed={isSelected}
                    className={cn(
                      baseClasses,
                      'hover:bg-surface focus:bg-surface focus:outline-none transition-colors',
                      isSelected && 'bg-accent/10',
                    )}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={baseClasses}>{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
