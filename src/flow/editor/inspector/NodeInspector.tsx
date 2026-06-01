import { Trash2, X } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { FormField } from '../../../components/domain/primitives/FormField'
import { FlowNodeType } from '../../core/types'
import {
  useFlowEditor,
  useFlowEditorActions,
  type FlowEditorStoreInstance,
} from '../store'
import type { FlowEditorCatalogs } from '../FlowEditor'
import { ActionInspector } from './ActionInspector'
import { AiAgentInspector } from './AiAgentInspector'
import { ConditionInspector } from './ConditionInspector'
import { HumanCheckpointInspector } from './HumanCheckpointInspector'
import { TriggerInspector } from './TriggerInspector'
import { OutputInspector } from './OutputInspector'

export interface NodeInspectorProps {
  nodeId: string
  catalogs?: FlowEditorCatalogs
  storeApi: FlowEditorStoreInstance
}

export function NodeInspector({ nodeId, catalogs }: NodeInspectorProps) {
  const node = useFlowEditor((s) => s.nodes.find((n) => n.id === nodeId) ?? null)
  const entryPoint = useFlowEditor((s) => s.entryPoint)
  const actions = useFlowEditorActions()

  if (!node) return null

  const isEntry = node.id === entryPoint

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs uppercase tracking-wide text-text-muted">
            {node.type.replace(/_/g, ' ')}
          </span>
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {node.name || node.id}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => actions.selectNode(null)}
          className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close inspector"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <FormField label="ID">
          <Input
            value={node.id}
            onChange={(e) => {
              const next = e.target.value.trim()
              if (next) actions.renameNode(node.id, next)
            }}
          />
        </FormField>

        <FormField label="Name">
          <Input
            value={node.name ?? ''}
            onChange={(e) =>
              actions.updateNode(node.id, { name: e.target.value })
            }
          />
        </FormField>

        <NodeTypeInspector nodeId={node.id} catalogs={catalogs} />

        <div className="border-t border-border pt-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.setEntryPoint(node.id)}
            disabled={isEntry}
          >
            {isEntry ? 'Entry point' : 'Set as entry point'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.removeNode(node.id)}
          >
            <Trash2 size={14} className="mr-1 text-danger" />
            Delete node
          </Button>
        </div>
      </div>
    </div>
  )
}

function NodeTypeInspector({
  nodeId,
  catalogs,
}: {
  nodeId: string
  catalogs?: FlowEditorCatalogs
}) {
  const node = useFlowEditor((s) => s.nodes.find((n) => n.id === nodeId) ?? null)
  if (!node) return null

  switch (node.type) {
    case FlowNodeType.Action:
      return <ActionInspector nodeId={node.id} catalogs={catalogs} />
    case FlowNodeType.AiAgent:
      return <AiAgentInspector nodeId={node.id} catalogs={catalogs} />
    case FlowNodeType.Condition:
      return <ConditionInspector nodeId={node.id} />
    case FlowNodeType.HumanCheckpoint:
      return <HumanCheckpointInspector nodeId={node.id} />
    case FlowNodeType.Trigger:
      return <TriggerInspector nodeId={node.id} />
    case FlowNodeType.Output:
      return <OutputInspector nodeId={node.id} />
    default:
      return null
  }
}
