import { useEffect, useMemo, useState } from 'react'

import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Input } from '../../ui/input'
import { FormField } from '../primitives/FormField'
import { FlowInputType, type FlowInputDef } from '../../../flow/core/types'

export interface RunInputsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Declared inputs from FlowDefinition.inputs. */
  inputs: FlowInputDef[]
  /** Called with the validated payload when the user confirms. Empty fields
   * are omitted from the payload so the backend applies declared defaults
   * (or surfaces "required input is missing" for required ones). */
  onConfirm: (values: Record<string, unknown>) => void | Promise<void>
  title?: string
  confirmLabel?: string
  busy?: boolean
}

export function RunInputsDialog({
  open,
  onOpenChange,
  inputs,
  onConfirm,
  title = 'Run with inputs',
  confirmLabel = 'Run',
  busy,
}: RunInputsDialogProps) {
  const initial = useMemo(() => initialBuffer(inputs), [inputs])
  const [buffer, setBuffer] = useState<Record<string, string>>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset the buffer whenever the dialog opens so an aborted previous run
  // does not leak stale edits into the next one.
  useEffect(() => {
    if (open) {
      setBuffer(initial)
      setErrors({})
    }
  }, [open, initial])

  async function handleConfirm() {
    const { values, errors: parseErrors } = parseBuffer(inputs, buffer)
    if (Object.keys(parseErrors).length > 0) {
      setErrors(parseErrors)
      return
    }
    await onConfirm(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Override any declared input for this run. Leave a field empty to
            use the saved default.
          </DialogDescription>
        </DialogHeader>

        {inputs.length === 0 ? (
          <p className="text-xs text-text-muted italic">
            This flow declares no inputs. Hit {confirmLabel} to start the run.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {inputs.map((def) => (
              <FormField
                key={def.name}
                label={`${def.name} (${def.type})${def.required ? ' — required' : ''}`}
                hint={def.description}
                error={errors[def.name]}
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={buffer[def.name] ?? ''}
                    onChange={(e) =>
                      setBuffer((prev) => ({
                        ...prev,
                        [def.name]: e.target.value,
                      }))
                    }
                    placeholder={placeholderFor(def)}
                  />
                  {def.required && (
                    <Badge variant="muted" className="text-[9px] shrink-0">
                      required
                    </Badge>
                  )}
                </div>
              </FormField>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={() => void handleConfirm()}
            disabled={busy}
          >
            {busy ? 'Starting…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function initialBuffer(inputs: FlowInputDef[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const def of inputs) {
    if (def.default === undefined || def.default === null) {
      out[def.name] = ''
    } else if (def.type === FlowInputType.String && typeof def.default === 'string') {
      out[def.name] = def.default
    } else {
      try {
        out[def.name] = JSON.stringify(def.default)
      } catch {
        out[def.name] = String(def.default)
      }
    }
  }
  return out
}

function placeholderFor(def: FlowInputDef): string {
  if (def.default !== undefined && def.default !== null) {
    return def.type === FlowInputType.String && typeof def.default === 'string'
      ? def.default
      : safeJson(def.default)
  }
  switch (def.type) {
    case FlowInputType.Integer:
      return '42'
    case FlowInputType.Number:
      return '3.14'
    case FlowInputType.Boolean:
      return 'true'
    case FlowInputType.Object:
      return '{ "k": "v" }'
    default:
      return 'value'
  }
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function parseBuffer(
  inputs: FlowInputDef[],
  buffer: Record<string, string>,
): { values: Record<string, unknown>; errors: Record<string, string> } {
  const values: Record<string, unknown> = {}
  const errors: Record<string, string> = {}
  for (const def of inputs) {
    const raw = (buffer[def.name] ?? '').trim()
    if (raw === '') {
      if (def.required && (def.default === undefined || def.default === null)) {
        errors[def.name] = 'Required input — provide a value.'
      }
      continue
    }
    if (def.type === FlowInputType.String) {
      values[def.name] = buffer[def.name]
      continue
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      errors[def.name] = `Not valid JSON for ${def.type}.`
      continue
    }
    switch (def.type) {
      case FlowInputType.Integer:
        if (typeof parsed === 'boolean' || !Number.isInteger(parsed)) {
          errors[def.name] = 'Expected an integer.'
          continue
        }
        break
      case FlowInputType.Number:
        if (typeof parsed === 'boolean' || typeof parsed !== 'number') {
          errors[def.name] = 'Expected a number.'
          continue
        }
        break
      case FlowInputType.Boolean:
        if (typeof parsed !== 'boolean') {
          errors[def.name] = 'Expected true or false.'
          continue
        }
        break
      case FlowInputType.Object:
        if (
          parsed === null ||
          typeof parsed !== 'object' ||
          Array.isArray(parsed)
        ) {
          errors[def.name] = 'Expected a JSON object.'
          continue
        }
        break
    }
    values[def.name] = parsed
  }
  return { values, errors }
}
