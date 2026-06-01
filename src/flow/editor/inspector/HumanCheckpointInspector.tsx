import { FormField } from '../../../components/domain/primitives/FormField'
import { useFlowEditor, useFlowEditorActions } from '../store'

export interface HumanCheckpointInspectorProps {
  nodeId: string
}

export function HumanCheckpointInspector({
  nodeId,
}: HumanCheckpointInspectorProps) {
  const node = useFlowEditor((s) => s.nodes.find((n) => n.id === nodeId) ?? null)
  const actions = useFlowEditorActions()
  if (!node) return null

  const config = node.config ?? {}
  const message = typeof config.message === 'string' ? config.message : ''

  return (
    <FormField
      label="Message"
      hint="Shown to the human when the run pauses at this checkpoint."
    >
      <textarea
        className="w-full min-h-[120px] rounded border border-border bg-bg p-2 text-sm text-text-primary"
        value={message}
        onChange={(e) =>
          actions.updateNode(node.id, {
            config: { ...config, message: e.target.value },
          })
        }
      />
    </FormField>
  )
}
