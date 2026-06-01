import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import type { IterationCarryField } from '../../core/types'

export interface YieldToolPreviewProps {
  carrySchema: IterationCarryField[]
}

/**
 * Collapsible panel that shows the exact tool the agent will see at run
 * time, derived from the current carry schema. Keeping this visible in
 * the inspector closes the feedback loop: every edit in the schema
 * editor is immediately reflected here, so the user never has to guess
 * what their changes mean for the LLM's contract.
 *
 * The shape mirrors what `build_yield_iteration_tool` produces in
 * `luna_core/engine/iteration.py` — keep them in sync.
 */
export function YieldToolPreview({ carrySchema }: YieldToolPreviewProps) {
  const [open, setOpen] = useState(false)
  const inputSchemaText = useMemo(
    () => JSON.stringify(buildPreview(carrySchema), null, 2),
    [carrySchema],
  )

  return (
    <div className="rounded border border-border bg-bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-xs text-text-muted hover:bg-bg-muted/60 transition-colors"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="font-medium">Preview: tool the agent will see</span>
        <span className="ml-auto font-mono text-[10px]">yield_iteration</span>
      </button>
      {open && (
        <pre className="px-3 pb-2.5 pt-0 text-[11px] leading-relaxed font-mono text-text-primary whitespace-pre-wrap break-all">
          {inputSchemaText}
        </pre>
      )}
    </div>
  )
}

function buildPreview(carrySchema: IterationCarryField[]) {
  const carryProps: Record<string, unknown> = {}
  const carryRequired: string[] = []
  for (const field of carrySchema) {
    if (!field.name) continue
    const primitive = field.type
    const typeValue = field.nullable ? [primitive, 'null'] : primitive
    const prop: Record<string, unknown> = { type: typeValue }
    if (field.description) prop.description = field.description
    carryProps[field.name] = prop
    carryRequired.push(field.name)
  }

  return {
    type: 'object',
    properties: {
      next_carry: {
        type: 'object',
        properties: carryProps,
        required: carryRequired,
        additionalProperties: false,
      },
      append: { type: 'array', items: {} },
      done: { type: 'boolean' },
    },
    required: ['next_carry', 'done'],
    additionalProperties: false,
  }
}
