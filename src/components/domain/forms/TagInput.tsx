import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

import { Input } from '../../ui/input'
import { cn } from '../../../lib/utils'

export interface TagInputProps {
  /** Current list of tags. Order is preserved on add/remove. */
  value: string[]
  onChange: (next: string[]) => void
  /** Placeholder for the inline input. */
  placeholder?: string
  /** Prevents duplicate entries (case-insensitive). Defaults to true. */
  unique?: boolean
  /** Lowercase every entry before storing. Defaults to false. */
  lowercase?: boolean
  /** Disable adding/removing — for read-only contexts. */
  disabled?: boolean
  /** Optional className passed to the outer container. */
  className?: string
}

/**
 * Chip-based editor for a list of free-text strings. Used wherever a
 * field is a `string[]` (skills, target_role_titles, deal_breakers,
 * location_preferences, …). Add by typing + Enter or comma; remove via
 * the chip's X or Backspace when the input is empty.
 */
export function TagInput({
  value,
  onChange,
  placeholder = 'Type and press Enter',
  unique = true,
  lowercase = false,
  disabled = false,
  className,
}: TagInputProps) {
  const [draft, setDraft] = useState('')

  function commit(raw: string) {
    const cleaned = lowercase ? raw.trim().toLowerCase() : raw.trim()
    if (!cleaned) return
    if (unique && value.some((v) => v.toLowerCase() === cleaned.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...value, cleaned])
    setDraft('')
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit(draft)
      return
    }
    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      event.preventDefault()
      remove(value.length - 1)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded border border-border bg-bg p-1.5 focus-within:border-accent-border',
        disabled && 'opacity-60 pointer-events-none',
        className,
      )}
    >
      {value.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="inline-flex items-center gap-1 rounded bg-bg-muted px-2 py-0.5 text-xs text-text-primary"
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(index)}
            className="text-text-muted hover:text-danger"
            aria-label={`Remove ${tag}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => draft && commit(draft)}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] border-0 bg-transparent px-1 py-0 text-xs h-6 focus-visible:ring-0 focus-visible:border-0"
      />
    </div>
  )
}
