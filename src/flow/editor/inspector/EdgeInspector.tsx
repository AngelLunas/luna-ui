import { Trash2, X } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { FormField } from '../../../components/domain/primitives/FormField'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { FlowConditionOperator } from '../../core/types'
import { edgeKey, useFlowEditor, useFlowEditorActions } from '../store'

export interface EdgeInspectorProps {
  edgeKey: string
}

export function EdgeInspector({ edgeKey: key }: EdgeInspectorProps) {
  const edge = useFlowEditor((s) => {
    const entry = s.edges
      .map((e, i) => ({ e, k: edgeKey(e, i) }))
      .find((x) => x.k === key)
    return entry?.e ?? null
  })
  const actions = useFlowEditorActions()

  if (!edge) return null

  const cond = edge.condition

  function setField(field: string) {
    actions.updateEdgeCondition(key, {
      field,
      operator: cond?.operator ?? FlowConditionOperator.Eq,
      value: cond?.value ?? '',
    })
  }
  function setOperator(operator: FlowConditionOperator) {
    actions.updateEdgeCondition(key, {
      field: cond?.field ?? '',
      operator,
      value: cond?.value ?? '',
    })
  }
  function setValue(rawValue: string) {
    // Try JSON-parse first so true/false/numbers don't become strings; fall
    // back to the literal string when the parse fails (`abc` is a string).
    let parsed: unknown = rawValue
    try {
      parsed = JSON.parse(rawValue)
    } catch {
      // keep as string
    }
    actions.updateEdgeCondition(key, {
      field: cond?.field ?? '',
      operator: cond?.operator ?? FlowConditionOperator.Eq,
      value: parsed,
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs uppercase tracking-wide text-text-muted">
            Edge
          </span>
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {edge.from} → {edge.to}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => actions.selectEdge(null)}
          className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close inspector"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <FormField
          label="Condition field"
          hint="Dot-path against state, e.g. outputs.classify.label or inputs.kind. Leave empty for an unconditional edge."
        >
          <Input
            value={cond?.field ?? ''}
            onChange={(e) => {
              const v = e.target.value
              if (!v && !cond) return
              if (!v) actions.updateEdgeCondition(key, null)
              else setField(v)
            }}
            placeholder="outputs.classify.label"
          />
        </FormField>

        {cond && (
          <>
            <FormField label="Operator">
              <Select
                value={cond.operator}
                onValueChange={(v) => setOperator(v as FlowConditionOperator)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FlowConditionOperator.Eq}>equals</SelectItem>
                  <SelectItem value={FlowConditionOperator.Ne}>
                    not equals
                  </SelectItem>
                  <SelectItem value={FlowConditionOperator.Gt}>{'>'}</SelectItem>
                  <SelectItem value={FlowConditionOperator.Gte}>{'>='}</SelectItem>
                  <SelectItem value={FlowConditionOperator.Lt}>{'<'}</SelectItem>
                  <SelectItem value={FlowConditionOperator.Lte}>{'<='}</SelectItem>
                  <SelectItem value={FlowConditionOperator.In}>in</SelectItem>
                  <SelectItem value={FlowConditionOperator.Contains}>
                    contains
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Value"
              hint="Parsed as JSON if possible (true / 42 / [1,2]); otherwise stored as a string."
            >
              <Input
                value={
                  typeof cond.value === 'string'
                    ? cond.value
                    : JSON.stringify(cond.value)
                }
                onChange={(e) => setValue(e.target.value)}
              />
            </FormField>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => actions.updateEdgeCondition(key, null)}
            >
              Clear condition
            </Button>
          </>
        )}

        <div className="border-t border-border pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.removeEdge(key)}
          >
            <Trash2 size={14} className="mr-1 text-danger" />
            Delete edge
          </Button>
        </div>
      </div>
    </div>
  )
}
