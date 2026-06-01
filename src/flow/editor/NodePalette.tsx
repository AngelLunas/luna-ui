import {
  CircleDot,
  GitBranch,
  LayoutGrid,
  Pause,
  Play,
  Send,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { FlowNodeType } from '../core/types'
import { useFlowEditorActions } from './store'

interface PaletteItem {
  type: FlowNodeType
  label: string
  icon: LucideIcon
  description: string
}

const PALETTE: PaletteItem[] = [
  {
    type: FlowNodeType.Trigger,
    label: 'Trigger',
    icon: CircleDot,
    description: 'Entry point — manual, scheduled or webhook.',
  },
  {
    type: FlowNodeType.AiAgent,
    label: 'AI Agent',
    icon: Sparkles,
    description: 'Runs an agent against an LLM with optional tools.',
  },
  {
    type: FlowNodeType.Action,
    label: 'Action',
    icon: Play,
    description: 'Calls a connector operation.',
  },
  {
    type: FlowNodeType.Condition,
    label: 'Condition',
    icon: GitBranch,
    description: 'Branches based on edge predicates.',
  },
  {
    type: FlowNodeType.HumanCheckpoint,
    label: 'Human checkpoint',
    icon: Pause,
    description: 'Pauses the run until a human resumes it.',
  },
  {
    type: FlowNodeType.Output,
    label: 'Output',
    icon: Send,
    description: 'Bubbles selected keys into state.outputs.',
  },
]

export interface NodePaletteProps {
  onAutoLayout?: () => void
}

export function NodePalette({ onAutoLayout }: NodePaletteProps) {
  const actions = useFlowEditorActions()

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Add node
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {PALETTE.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => actions.addNode(item.type)}
              title={item.description}
              className="group flex items-center gap-2 rounded border border-border bg-bg px-2 py-1.5 text-left hover:border-accent hover:bg-accent-subtle transition"
            >
              <Icon className="h-3.5 w-3.5 text-text-muted group-hover:text-accent" />
              <span className="text-xs text-text-primary">{item.label}</span>
            </button>
          )
        })}
      </div>
      {onAutoLayout && (
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onAutoLayout}
          >
            <LayoutGrid size={12} className="mr-1" />
            Auto-layout
          </Button>
        </div>
      )}
    </div>
  )
}
