import { Plus, X } from 'lucide-react'

import { FormField } from '../../../components/domain/primitives/FormField'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { useFlowEditor, useFlowEditorActions } from '../store'

export interface OutputInspectorProps {
  nodeId: string
}

export function OutputInspector({ nodeId }: OutputInspectorProps) {
  const node = useFlowEditor((s) => s.nodes.find((n) => n.id === nodeId) ?? null)
  const actions = useFlowEditorActions()
  if (!node) return null
  const nid = node.id

  const config = node.config ?? {}
  const select = Array.isArray(config.select) ? (config.select as string[]) : []

  function update(next: string[]) {
    actions.updateNode(nid, { config: { ...config, select: next } })
  }

  return (
    <FormField
      label="Select keys"
      hint="Output node copies these keys from state.outputs to the run result. Leave empty to emit nothing."
    >
      <div className="flex flex-col gap-1">
        {select.map((key, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input
              value={key}
              onChange={(e) => {
                const next = [...select]
                next[i] = e.target.value
                update(next)
              }}
              placeholder="output key"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update(select.filter((_, j) => j !== i))}
              aria-label="Remove key"
            >
              <X size={14} />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => update([...select, ''])}
        >
          <Plus size={14} className="mr-1" /> Add key
        </Button>
      </div>
    </FormField>
  )
}
