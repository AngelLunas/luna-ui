import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Badge } from '../../ui/badge'
import { Input } from '../../ui/input'
import {
  FlowInputType,
  type FlowInputDef,
} from '../../../flow/core/types'

export interface PerRuleInputsRow {
  /** Optional human label for the rule (e.g. "Every Monday at 9:00"). */
  label?: string
  /** Current override map for this rule. */
  inputs: Record<string, unknown>
}

export interface PerRuleInputsEditorProps {
  rules: PerRuleInputsRow[]
  declaredInputs: FlowInputDef[]
  onChange: (ruleIndex: number, next: Record<string, unknown>) => void
  className?: string
}

/**
 * Per-rule input override editor.
 *
 * Each rule gets a collapsible panel; inside, one row per declared
 * ``FlowInputDef``. Typing a value writes it onto the rule's inputs map;
 * emptying the field deletes the key so the backend falls back to the
 * declared default. The component owns no rule data — it dispatches every
 * change to ``onChange`` so the host can persist it however it stores
 * schedule rules.
 */
export function PerRuleInputsEditor({
  rules,
  declaredInputs,
  onChange,
  className,
}: PerRuleInputsEditorProps) {
  if (declaredInputs.length === 0) {
    return (
      <p className="text-xs text-text-muted italic">
        Declare flow inputs first to enable per-rule overrides.
      </p>
    )
  }
  if (rules.length === 0) {
    return (
      <p className="text-xs text-text-muted italic">
        Add a schedule rule first.
      </p>
    )
  }
  return (
    <div className={className ?? 'flex flex-col gap-2'}>
      {rules.map((rule, idx) => (
        <RuleRow
          key={idx}
          rule={rule}
          declaredInputs={declaredInputs}
          onChange={(next) => onChange(idx, next)}
        />
      ))}
    </div>
  )
}

function RuleRow({
  rule,
  declaredInputs,
  onChange,
}: {
  rule: PerRuleInputsRow
  declaredInputs: FlowInputDef[]
  onChange: (next: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(false)
  const overrideCount = Object.keys(rule.inputs ?? {}).length
  const summary = rule.label ?? `Rule`

  function setValue(name: string, raw: string, type: FlowInputType) {
    const next = { ...rule.inputs }
    if (raw.trim() === '') {
      delete next[name]
    } else {
      next[name] = coerce(raw, type)
    }
    onChange(next)
  }

  return (
    <div className="rounded border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs"
      >
        <span className="flex items-center gap-2 min-w-0">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="truncate text-text-primary">{summary}</span>
        </span>
        {overrideCount > 0 && (
          <Badge variant="muted" className="text-[10px]">
            {overrideCount} override{overrideCount === 1 ? '' : 's'}
          </Badge>
        )}
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2 flex flex-col gap-2">
          {declaredInputs.map((def) => {
            const raw =
              def.name in rule.inputs
                ? formatValue(rule.inputs[def.name])
                : ''
            const placeholder =
              def.default !== undefined && def.default !== null
                ? `default: ${formatValue(def.default)}`
                : def.required
                  ? 'required'
                  : 'leave empty for default'
            return (
              <label key={def.name} className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-text-muted">
                  {def.name}
                  <span className="ml-1 lowercase text-text-muted">
                    ({def.type})
                  </span>
                </span>
                <Input
                  value={raw}
                  onChange={(e) => setValue(def.name, e.target.value, def.type)}
                  placeholder={placeholder}
                />
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function coerce(raw: string, type: FlowInputType): unknown {
  if (type === FlowInputType.String) return raw
  try {
    return JSON.parse(raw)
  } catch {
    // Fall back to the literal text — the server-side validator will reject
    // it with a typed error message, which is more useful than failing
    // silently in the editor.
    return raw
  }
}
