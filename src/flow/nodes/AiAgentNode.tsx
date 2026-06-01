import { Sparkles } from 'lucide-react'
import type { NodeProps } from '@xyflow/react'

import type { RFNode } from '../core/adapter'
import { BaseNode } from './BaseNode'

export function AiAgentNode(props: NodeProps<RFNode>) {
  const config = props.data.node.config ?? {}
  const agent =
    (typeof config.agent_id === 'string' && config.agent_id) ||
    (typeof config.agent === 'string' && config.agent) ||
    (typeof config.model === 'string' && config.model) ||
    undefined

  return (
    <BaseNode
      node={props}
      icon={Sparkles}
      label="AI Agent"
      accentClassName="bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200"
    >
      {agent}
    </BaseNode>
  )
}
