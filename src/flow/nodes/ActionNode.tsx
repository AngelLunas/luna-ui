import { Play } from 'lucide-react'
import type { NodeProps } from '@xyflow/react'

import type { RFNode } from '../core/adapter'
import { BaseNode } from './BaseNode'

export function ActionNode(props: NodeProps<RFNode>) {
  const config = props.data.node.config ?? {}
  const action = typeof config.action === 'string' ? config.action : undefined

  return (
    <BaseNode
      node={props}
      icon={Play}
      label="Action"
      accentClassName="bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200"
    >
      {action}
    </BaseNode>
  )
}
