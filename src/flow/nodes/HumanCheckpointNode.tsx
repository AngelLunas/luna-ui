import { UserCheck } from 'lucide-react'
import type { NodeProps } from '@xyflow/react'

import type { RFNode } from '../core/adapter'
import { BaseNode } from './BaseNode'

export function HumanCheckpointNode(props: NodeProps<RFNode>) {
  const config = props.data.node.config ?? {}
  const prompt = typeof config.prompt === 'string' ? config.prompt : undefined

  return (
    <BaseNode
      node={props}
      icon={UserCheck}
      label="Human"
      accentClassName="bg-pink-100 text-pink-900 dark:bg-pink-950 dark:text-pink-200"
    >
      {prompt}
    </BaseNode>
  )
}
