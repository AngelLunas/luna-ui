import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { IconButton } from '../primitives/IconButton'
import { ParamChipPalette } from './ParamChipPalette'

export interface FixedHeaderRow {
  name: string
  value: string
}

export interface FixedHeadersEditorProps {
  value: FixedHeaderRow[]
  onChange: (next: FixedHeaderRow[]) => void
  /** Parameter names available for `{param}` substitution. */
  paramNames: string[]
  className?: string
}

/**
 * Key/value editor for headers that are always added to the outgoing request.
 * Values may contain `{param}` placeholders that resolve from input — the
 * chip palette inserts them into the focused value input.
 */
export function FixedHeadersEditor({
  value,
  onChange,
  paramNames,
  className,
}: FixedHeadersEditorProps) {
  // Track which value input is focused so the chip palette inserts at the
  // right cursor position. Falls back to "last row" when nothing focused yet.
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null)

  function update(index: number, patch: Partial<FixedHeaderRow>) {
    const next = value.slice()
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  function remove(index: number) {
    const next = value.slice()
    next.splice(index, 1)
    onChange(next)
  }

  function add() {
    onChange([...value, { name: '', value: '' }])
  }

  function insertParam(name: string) {
    const idx = focusedIndex ?? value.length - 1
    if (idx < 0) {
      // No rows yet — create one with the placeholder.
      onChange([{ name: '', value: `{${name}}` }])
      return
    }
    const input = inputRefs.current[idx]
    const placeholder = `{${name}}`
    const current = value[idx]?.value ?? ''
    let nextValue = current + placeholder
    if (input && input === document.activeElement) {
      const start = input.selectionStart ?? current.length
      const end = input.selectionEnd ?? current.length
      nextValue = current.slice(0, start) + placeholder + current.slice(end)
      // Re-focus on the next tick once the value prop has flowed back in.
      requestAnimationFrame(() => {
        const el = inputRefs.current[idx]
        if (el) {
          el.focus()
          const pos = start + placeholder.length
          el.setSelectionRange(pos, pos)
        }
      })
    }
    update(idx, { value: nextValue })
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {value.length === 0 && (
        <div className="text-xs text-text-muted italic px-2 py-3 border border-dashed border-border rounded">
          No fixed headers.
        </div>
      )}
      {value.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={row.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Header-Name"
            className="w-48 text-xs font-mono"
          />
          <Input
            ref={(el) => {
              inputRefs.current[i] = el
            }}
            value={row.value}
            onChange={(e) => update(i, { value: e.target.value })}
            onFocus={() => setFocusedIndex(i)}
            placeholder="value or {param}"
            className="flex-1 text-xs font-mono"
          />
          <IconButton
            icon={<Trash2 size={14} />}
            label="Remove header"
            variant="danger"
            size="sm"
            onClick={() => remove(i)}
          />
        </div>
      ))}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          <Plus size={14} />
          Add header
        </Button>
        <ParamChipPalette
          paramNames={paramNames}
          onInsert={insertParam}
          label="Insert"
        />
      </div>
    </div>
  )
}
