import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Checkbox } from '../../components/ui/checkbox'
import { Input } from '../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  FlowInputType,
  type FlowInputDef,
} from '../core/types'
import { useFlowEditor, useFlowEditorActions } from './store'

const INPUT_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

/**
 * Per-row editor for one ``FlowInputDef``. The ``default`` value is parsed
 * by type: integers/numbers/booleans/objects round-trip through JSON so the
 * stored shape matches what ``validate_flow_inputs`` expects on the server.
 * Strings stay as strings (JSON-parsing them would interpret "true" as a
 * boolean and bite anyone who actually wanted the literal text).
 */
export interface FlowInputsEditorProps {
  className?: string
}

export function FlowInputsEditor({ className }: FlowInputsEditorProps) {
  const inputs = useFlowEditor((s) => s.inputs)
  const actions = useFlowEditorActions()
  const [error, setError] = useState<string | null>(null)

  const taken = useMemo(() => new Set(inputs.map((i) => i.name)), [inputs])

  function handleAdd() {
    setError(null)
    let counter = inputs.length + 1
    let candidate = `input_${counter}`
    while (taken.has(candidate)) {
      counter += 1
      candidate = `input_${counter}`
    }
    actions.addInput({
      name: candidate,
      type: FlowInputType.String,
      required: false,
    })
  }

  return (
    <div className={className ?? 'flex flex-col gap-2'}>
      {inputs.length === 0 ? (
        <p className="text-xs text-text-muted italic">
          No inputs declared. Trigger payloads will be rejected unless empty.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {inputs.map((input) => (
            <InputRow
              key={input.name}
              input={input}
              onError={setError}
            />
          ))}
        </div>
      )}
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
      <div>
        <Button variant="ghost" size="sm" onClick={handleAdd}>
          <Plus size={12} className="mr-1" />
          Add input
        </Button>
      </div>
    </div>
  )
}

function InputRow({
  input,
  onError,
}: {
  input: FlowInputDef
  onError: (msg: string | null) => void
}) {
  const actions = useFlowEditorActions()
  const [draftName, setDraftName] = useState(input.name)

  // ``defaultText`` is decoupled from the stored value so the user can type
  // partial JSON (`[1,` then `[1,2]`) without our parser dropping every
  // keystroke. Persists to the store only when the buffer parses cleanly.
  const initialDefaultText = formatDefault(input)
  const [defaultText, setDefaultText] = useState(initialDefaultText)
  const [defaultError, setDefaultError] = useState<string | null>(null)

  function commitName() {
    onError(null)
    if (draftName === input.name) return
    if (!INPUT_NAME_PATTERN.test(draftName)) {
      onError(
        `'${draftName}' is not a valid identifier — must match [A-Za-z_][A-Za-z0-9_]*`,
      )
      setDraftName(input.name)
      return
    }
    const ok = actions.updateInput(input.name, { name: draftName })
    if (!ok) {
      onError(`Another input is already named '${draftName}'`)
      setDraftName(input.name)
    }
  }

  function setType(next: FlowInputType) {
    actions.updateInput(input.name, { type: next, default: undefined })
    setDefaultText('')
    setDefaultError(null)
  }

  function commitDefault() {
    const { value, error } = parseDefault(defaultText, input.type)
    setDefaultError(error)
    if (!error) {
      actions.updateInput(input.name, { default: value })
    }
  }

  return (
    <div className="rounded border border-border bg-surface px-3 py-2 flex flex-col gap-2">
      <div className="grid grid-cols-12 gap-2 items-start">
        <div className="col-span-4">
          <Input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            placeholder="name"
          />
        </div>
        <div className="col-span-3">
          <Select value={input.type} onValueChange={(v) => setType(v as FlowInputType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FlowInputType.String}>string</SelectItem>
              <SelectItem value={FlowInputType.Integer}>integer</SelectItem>
              <SelectItem value={FlowInputType.Number}>number</SelectItem>
              <SelectItem value={FlowInputType.Boolean}>boolean</SelectItem>
              <SelectItem value={FlowInputType.Object}>object</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-3 flex items-center pt-1.5">
          <Checkbox
            checked={!!input.required}
            onCheckedChange={(v) =>
              actions.updateInput(input.name, { required: v === true })
            }
            label={<span className="text-xs">required</span>}
          />
        </div>
        <div className="col-span-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.removeInput(input.name)}
            aria-label="Remove input"
          >
            <Trash2 size={12} className="text-danger" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 items-start">
        <div className="col-span-6">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-text-muted flex items-center gap-2">
              Default
              {input.required ? (
                <Badge variant="muted" className="text-[9px]">
                  ignored when required
                </Badge>
              ) : null}
            </span>
            <Input
              value={defaultText}
              onChange={(e) => setDefaultText(e.target.value)}
              onBlur={commitDefault}
              placeholder={placeholderFor(input.type)}
              disabled={!!input.required}
            />
            {defaultError && (
              <span className="text-[11px] text-danger">{defaultError}</span>
            )}
          </label>
        </div>
        <div className="col-span-6">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-text-muted">
              Description
            </span>
            <Input
              value={input.description ?? ''}
              onChange={(e) =>
                actions.updateInput(input.name, { description: e.target.value })
              }
              placeholder="What is this input for?"
            />
          </label>
        </div>
      </div>
    </div>
  )
}

function placeholderFor(type: FlowInputType): string {
  switch (type) {
    case FlowInputType.Integer:
      return '42'
    case FlowInputType.Number:
      return '3.14'
    case FlowInputType.Boolean:
      return 'true'
    case FlowInputType.Object:
      return '{ "k": "v" }'
    default:
      return 'hello'
  }
}

function formatDefault(input: FlowInputDef): string {
  if (input.default === undefined || input.default === null) return ''
  if (input.type === FlowInputType.String && typeof input.default === 'string') {
    return input.default
  }
  try {
    return JSON.stringify(input.default)
  } catch {
    return String(input.default)
  }
}

function parseDefault(
  text: string,
  type: FlowInputType,
): { value: unknown; error: string | null } {
  const trimmed = text.trim()
  if (trimmed === '') return { value: undefined, error: null }
  if (type === FlowInputType.String) {
    return { value: text, error: null }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { value: undefined, error: `Not valid JSON for ${type}` }
  }
  switch (type) {
    case FlowInputType.Integer:
      if (typeof parsed === 'boolean' || !Number.isInteger(parsed)) {
        return { value: undefined, error: 'Expected an integer' }
      }
      return { value: parsed, error: null }
    case FlowInputType.Number:
      if (typeof parsed === 'boolean' || typeof parsed !== 'number') {
        return { value: undefined, error: 'Expected a number' }
      }
      return { value: parsed, error: null }
    case FlowInputType.Boolean:
      if (typeof parsed !== 'boolean') {
        return { value: undefined, error: 'Expected true or false' }
      }
      return { value: parsed, error: null }
    case FlowInputType.Object:
      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        return { value: undefined, error: 'Expected a JSON object' }
      }
      return { value: parsed, error: null }
    default:
      return { value: parsed, error: null }
  }
}
