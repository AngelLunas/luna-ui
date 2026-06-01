import { useMemo, useState } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Checkbox } from '../../../components/ui/checkbox'
import { Input } from '../../../components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { cn } from '../../../lib/utils'
import {
  IterationCarryType,
  type IterationCarryField,
} from '../../core/types'
import {
  ITERATION_CARRY_PRESETS,
  VALID_CARRY_NAME,
  type IterationPreset,
} from './iterationPresets'

export interface FieldSchemaEditorProps {
  value: IterationCarryField[]
  onChange: (next: IterationCarryField[]) => void
  /** Copy shown when the field list is empty. Defaults to a generic
   * "Add a field to get started". Callers should override with copy
   * specific to their context (carry, stash, expected shape) so the
   * editor doesn't bleed iteration-specific wording into stash UI. */
  emptyHint?: React.ReactNode
  /** Common-pattern presets surfaced in the dropdown. Defaults to the
   * carry-pagination presets that are useful in iteration mode; pass
   * `[]` (or another list) for contexts where they make no sense
   * (e.g. stash record shapes, which are domain-specific). */
  presets?: IterationPreset[]
  /** Label for the presets dropdown trigger. Defaults to "Common
   * patterns"; can be tightened to the context (e.g. "Pagination
   * presets") when the default list is overridden. */
  presetsLabel?: string
}

/**
 * Row-based editor for a list of typed fields. Used by:
 *   - iteration carry schema (variables that survive between turns)
 *   - stash record_schema (shape of records the agent stashes)
 *   - scratchpad-mode "expected record shape" (drives chips, no runtime
 *     validation since records aren't produced by the same agent)
 *
 * The default-value widget swaps based on the chosen type so the user
 * can't type a string into an integer field. Presets cover common
 * pagination patterns; for the stash/expected use cases the presets
 * are less useful but harmless to leave visible.
 */
export function FieldSchemaEditor({
  value,
  onChange,
  emptyHint,
  presets = ITERATION_CARRY_PRESETS,
  presetsLabel = 'Common patterns',
}: FieldSchemaEditorProps) {
  const issues = useMemo(() => validateRows(value), [value])

  function patch(index: number, partial: Partial<IterationCarryField>) {
    const next = value.slice()
    next[index] = { ...next[index], ...partial }
    onChange(next)
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function addBlank() {
    onChange([
      ...value,
      {
        name: '',
        type: IterationCarryType.String,
        nullable: false,
        default: '',
      },
    ])
  }

  function addPreset(presetId: string) {
    const preset = presets.find((p) => p.id === presetId)
    if (!preset) return
    if (value.some((f) => f.name === preset.field.name)) return
    onChange([...value, { ...preset.field }])
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-bg-muted/40 px-3 py-4 text-center text-xs text-text-muted">
          {emptyHint ?? 'No fields yet. Add one to get started.'}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <FieldSchemaHeader />
          {value.map((field, index) => (
            <FieldSchemaRow
              key={index}
              field={field}
              issue={issues[index]}
              onPatch={(partial) => patch(index, partial)}
              onRemove={() => remove(index)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addBlank}
          className="text-text-muted hover:text-text-primary"
        >
          <Plus size={14} className="mr-1" />
          Add field
        </Button>
        {presets.length > 0 && (
          <PresetMenu
            label={presetsLabel}
            presets={presets}
            existingNames={new Set(value.map((f) => f.name))}
            onPick={addPreset}
          />
        )}
      </div>
    </div>
  )
}

function FieldSchemaHeader() {
  return (
    <div className="grid grid-cols-[1.4fr_1fr_1.4fr_auto_auto] gap-2 px-1 text-[10px] uppercase tracking-wide text-text-muted">
      <span>Name</span>
      <span>Type</span>
      <span>Default</span>
      <span>Null?</span>
      <span className="w-6" aria-hidden />
    </div>
  )
}

interface RowProps {
  field: IterationCarryField
  issue: string | undefined
  onPatch: (partial: Partial<IterationCarryField>) => void
  onRemove: () => void
}

function FieldSchemaRow({ field, issue, onPatch, onRemove }: RowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[1.4fr_1fr_1.4fr_auto_auto] gap-2 items-center">
        <Input
          value={field.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          placeholder="field_name"
          className={cn('text-xs font-mono', issue && 'border-danger')}
        />
        <Select
          value={field.type}
          onValueChange={(v) => onPatch({ type: v as IterationCarryType })}
        >
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(IterationCarryType).map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DefaultValueInput field={field} onPatch={onPatch} />
        <Checkbox
          checked={field.nullable ?? false}
          onCheckedChange={(v) => onPatch({ nullable: v === true })}
          aria-label={`${field.name || 'field'} nullable`}
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-text-muted hover:text-danger transition-colors p-1"
          aria-label={`Remove ${field.name || 'field'}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {issue && <span className="px-1 text-[11px] text-danger">{issue}</span>}
    </div>
  )
}

interface DefaultProps {
  field: IterationCarryField
  onPatch: (partial: Partial<IterationCarryField>) => void
}

function DefaultValueInput({ field, onPatch }: DefaultProps) {
  // Type-aware widget: prevent the user from typing "abc" as an integer
  // default by construction, instead of validating after the fact.
  switch (field.type) {
    case IterationCarryType.Boolean:
      return (
        <Select
          value={field.default === true ? 'true' : 'false'}
          onValueChange={(v) => onPatch({ default: v === 'true' })}
        >
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">false</SelectItem>
            <SelectItem value="true">true</SelectItem>
          </SelectContent>
        </Select>
      )
    case IterationCarryType.Integer:
    case IterationCarryType.Number: {
      const raw =
        typeof field.default === 'number'
          ? String(field.default)
          : field.default == null
            ? ''
            : String(field.default)
      return (
        <Input
          type="number"
          value={raw}
          step={field.type === IterationCarryType.Integer ? 1 : 'any'}
          onChange={(e) => {
            const text = e.target.value
            if (text === '') {
              onPatch({ default: null })
              return
            }
            const parsed =
              field.type === IterationCarryType.Integer
                ? Number.parseInt(text, 10)
                : Number.parseFloat(text)
            onPatch({ default: Number.isNaN(parsed) ? null : parsed })
          }}
          className="text-xs font-mono"
          placeholder={field.nullable ? '(null)' : '0'}
        />
      )
    }
    case IterationCarryType.Object:
    case IterationCarryType.Array:
      // Object/array defaults are intentionally not editable inline — they
      // would need a JSON editor and that's overkill for the typical case
      // where the default is just empty. The runtime treats undefined as
      // the type-appropriate empty value.
      return (
        <span className="text-[11px] text-text-muted italic px-2">
          (empty {field.type})
        </span>
      )
    case IterationCarryType.String:
    default: {
      const raw = typeof field.default === 'string' ? field.default : ''
      return (
        <Input
          value={raw}
          onChange={(e) => {
            const text = e.target.value
            onPatch({ default: text === '' && field.nullable ? null : text })
          }}
          className="text-xs font-mono"
          placeholder={field.nullable ? '(null)' : ''}
        />
      )
    }
  }
}

function PresetMenu({
  label,
  presets,
  existingNames,
  onPick,
}: {
  label: string
  presets: IterationPreset[]
  existingNames: Set<string>
  onPick: (presetId: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-text-muted hover:text-text-primary"
        >
          {label}
          <ChevronDown size={12} className="ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[260px]">
        {presets.map((preset) => {
          const taken = existingNames.has(preset.field.name)
          return (
            <DropdownMenuItem
              key={preset.id}
              disabled={taken}
              onSelect={() => {
                onPick(preset.id)
                setOpen(false)
              }}
              className="flex flex-col items-start gap-0.5 py-1.5"
            >
              <span className="font-mono text-xs text-text-primary">
                {preset.label}
                {taken && (
                  <span className="ml-2 text-[10px] text-text-muted italic">
                    (already added)
                  </span>
                )}
              </span>
              <span className="text-[10px] text-text-muted">{preset.hint}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function validateRows(fields: IterationCarryField[]): (string | undefined)[] {
  const seen = new Map<string, number>()
  return fields.map((field, idx) => {
    if (!field.name) return 'Name is required'
    if (!VALID_CARRY_NAME.test(field.name)) {
      return 'Use lowercase letters, digits and underscores; must not start with a digit'
    }
    const previous = seen.get(field.name)
    if (previous !== undefined) {
      return `Duplicate of row ${previous + 1}`
    }
    seen.set(field.name, idx)
    return undefined
  })
}
