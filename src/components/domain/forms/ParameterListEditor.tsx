import * as React from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import {
  ParameterIn,
  ParameterType,
  type ParameterDef,
} from '../../../types/connector'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { IconButton } from '../primitives/IconButton'

export interface ParameterListEditorProps {
  value: ParameterDef[]
  onChange: (next: ParameterDef[]) => void
  /** When true, hides the `in` selector — used for nested object properties. */
  hideInSelector?: boolean
  className?: string
}

export function emptyParameter(): ParameterDef {
  return {
    name: '',
    type: ParameterType.String,
    description: '',
    required: false,
    in: ParameterIn.Body,
    enumValues: null,
    itemType: null,
    properties: null,
    default: null,
  }
}

const TYPE_OPTIONS: { value: ParameterType; label: string }[] = [
  { value: ParameterType.String, label: 'string' },
  { value: ParameterType.Integer, label: 'integer' },
  { value: ParameterType.Number, label: 'number' },
  { value: ParameterType.Boolean, label: 'boolean' },
  { value: ParameterType.Array, label: 'array' },
  { value: ParameterType.Object, label: 'object' },
]

const IN_OPTIONS: { value: ParameterIn; label: string }[] = [
  { value: ParameterIn.Path, label: 'path' },
  { value: ParameterIn.Query, label: 'query' },
  { value: ParameterIn.Body, label: 'body' },
  { value: ParameterIn.Header, label: 'header' },
]

export function ParameterListEditor({
  value,
  onChange,
  hideInSelector,
  className,
}: ParameterListEditorProps) {
  function update(index: number, patch: Partial<ParameterDef>) {
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
    onChange([...value, emptyParameter()])
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {value.length === 0 && (
        <div className="text-xs text-text-muted italic px-2 py-3 border border-dashed border-border rounded">
          No parameters defined.
        </div>
      )}
      {value.map((param, i) => (
        <ParameterRow
          key={i}
          param={param}
          hideInSelector={hideInSelector}
          onChange={(patch) => update(i, patch)}
          onRemove={() => remove(i)}
        />
      ))}
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          <Plus size={14} />
          Add parameter
        </Button>
      </div>
    </div>
  )
}

interface ParameterRowProps {
  param: ParameterDef
  hideInSelector?: boolean
  onChange: (patch: Partial<ParameterDef>) => void
  onRemove: () => void
}

function ParameterRow({
  param,
  hideInSelector,
  onChange,
  onRemove,
}: ParameterRowProps) {
  const [expanded, setExpanded] = React.useState(false)

  const hasSubform =
    param.type === ParameterType.String ||
    param.type === ParameterType.Array ||
    param.type === ParameterType.Object ||
    param.description !== ''

  return (
    <div className="rounded border border-border bg-bg/40">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-text-muted hover:text-text-primary"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>
        <Input
          value={param.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="param_name"
          className="flex-1 min-w-0 font-mono text-xs"
        />
        <Select
          value={param.type}
          onValueChange={(v) =>
            onChange({
              type: v as ParameterType,
              // Reset type-specific bits when the type changes so stale
              // data doesn't surface in the wrong shape.
              enumValues: null,
              itemType: v === ParameterType.Array ? ParameterType.String : null,
              properties: v === ParameterType.Object ? [] : null,
              // Same reasoning for the default: a string "0" doesn't
              // make sense as a default for a boolean param. Clearing
              // on type change avoids the dispatcher ever shipping an
              // ill-typed default to the upstream.
              default: null,
            })
          }
        >
          <SelectTrigger className="w-28 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!hideInSelector && (
          <Select
            value={param.in}
            onValueChange={(v) => onChange({ in: v as ParameterIn })}
          >
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IN_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <label className="flex items-center gap-1 text-xs text-text-muted cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={param.required}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="accent-accent"
          />
          required
        </label>
        <IconButton
          icon={<Trash2 size={14} />}
          label="Remove parameter"
          variant="danger"
          size="sm"
          onClick={onRemove}
        />
      </div>

      {(expanded || hasSubform) && expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border">
          <label className="block text-[10px] uppercase tracking-wide text-text-muted">
            Description
          </label>
          <textarea
            value={param.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={2}
            placeholder="What this parameter means — shown to the AI."
            className="w-full rounded border border-border bg-transparent px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />

          {param.type === ParameterType.String && (
            <EnumValuesEditor
              values={param.enumValues}
              onChange={(v) => onChange({ enumValues: v })}
            />
          )}

          {param.type === ParameterType.Array && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-text-muted">
                Item type
              </span>
              <Select
                value={param.itemType ?? ParameterType.String}
                onValueChange={(v) =>
                  onChange({ itemType: v as ParameterType })
                }
              >
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.filter(
                    (o) =>
                      o.value !== ParameterType.Array &&
                      o.value !== ParameterType.Object,
                  ).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {param.type === ParameterType.Object && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">
                Properties
              </div>
              <ParameterListEditor
                value={param.properties ?? []}
                onChange={(props) => onChange({ properties: props })}
                hideInSelector
                className="pl-3 border-l-2 border-border"
              />
            </div>
          )}

          <DefaultValueEditor
            type={param.type}
            value={param.default}
            onChange={(v) => onChange({ default: v })}
          />
        </div>
      )}
    </div>
  )
}

interface DefaultValueEditorProps {
  type: ParameterType
  value: unknown | null
  onChange: (next: unknown | null) => void
}

/**
 * Optional fallback the dispatcher injects when the caller's input
 * omits this parameter entirely. The widget is type-aware (text for
 * string, number input for integer/number, select for boolean) so a
 * user can't accidentally save a string default on a boolean param.
 *
 * Array / object defaults are intentionally not editable inline —
 * same reasoning as the iteration carry editor: it would need a JSON
 * editor, and the typical "default" for those types is empty (which
 * the dispatcher already handles by leaving the key absent).
 *
 * A "Use a default" checkbox toggles the section so the difference
 * between "no default" (null) and "default is the empty string" stays
 * explicit — both are valid configurations and the dispatcher reads
 * them differently.
 */
function DefaultValueEditor({
  type,
  value,
  onChange,
}: DefaultValueEditorProps) {
  if (type === ParameterType.Array || type === ParameterType.Object) {
    return null
  }
  const enabled = value !== null && value !== undefined
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            if (!e.target.checked) {
              onChange(null)
              return
            }
            // Seed with a type-appropriate empty so the next render
            // shows the value widget without it being "null" forever.
            if (type === ParameterType.Boolean) onChange(false)
            else if (
              type === ParameterType.Integer ||
              type === ParameterType.Number
            )
              onChange(0)
            else onChange('')
          }}
          className="accent-accent"
        />
        Use a default value when the caller omits this parameter
      </label>
      {enabled && (
        <>
          <DefaultValueInput type={type} value={value} onChange={onChange} />
          <p className="text-[10px] text-text-muted">
            Applied only when the caller leaves this field out entirely.
            An explicit empty string or null from the caller passes through.
          </p>
        </>
      )}
    </div>
  )
}

function DefaultValueInput({
  type,
  value,
  onChange,
}: {
  type: ParameterType
  value: unknown
  onChange: (next: unknown) => void
}) {
  if (type === ParameterType.Boolean) {
    return (
      <Select
        value={value === true ? 'true' : 'false'}
        onValueChange={(v) => onChange(v === 'true')}
      >
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="false">false</SelectItem>
          <SelectItem value="true">true</SelectItem>
        </SelectContent>
      </Select>
    )
  }
  if (type === ParameterType.Integer || type === ParameterType.Number) {
    const raw = typeof value === 'number' ? String(value) : ''
    return (
      <Input
        type="number"
        value={raw}
        step={type === ParameterType.Integer ? 1 : 'any'}
        onChange={(e) => {
          const text = e.target.value
          if (text === '') {
            onChange(0)
            return
          }
          const parsed =
            type === ParameterType.Integer
              ? Number.parseInt(text, 10)
              : Number.parseFloat(text)
          onChange(Number.isNaN(parsed) ? 0 : parsed)
        }}
        className="text-xs font-mono"
      />
    )
  }
  // String (default for unknown types too)
  const raw = typeof value === 'string' ? value : ''
  return (
    <Input
      value={raw}
      onChange={(e) => onChange(e.target.value)}
      placeholder="default value"
      className="text-xs font-mono"
    />
  )
}

function EnumValuesEditor({
  values,
  onChange,
}: {
  values: string[] | null
  onChange: (v: string[] | null) => void
}) {
  const [enabled, setEnabled] = React.useState(values !== null)
  const [text, setText] = React.useState((values ?? []).join(', '))

  function commit(next: string) {
    setText(next)
    const parsed = next
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    onChange(parsed.length > 0 ? parsed : null)
  }

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked)
            if (!e.target.checked) onChange(null)
          }}
          className="accent-accent"
        />
        Restrict to a set of values (enum)
      </label>
      {enabled && (
        <>
          <Input
            value={text}
            onChange={(e) => commit(e.target.value)}
            placeholder="open, closed, pending"
            className="text-xs"
          />
          <p className="text-[10px] text-text-muted">
            Comma-separated. Becomes the JSON Schema `enum`.
          </p>
        </>
      )}
    </div>
  )
}
