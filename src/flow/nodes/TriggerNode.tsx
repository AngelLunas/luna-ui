import { Zap } from 'lucide-react'
import type { NodeProps } from '@xyflow/react'

import type { RFNode } from '../core/adapter'
import { BaseNode } from './BaseNode'

export function TriggerNode(props: NodeProps<RFNode>) {
  const config = props.data.node.config ?? {}
  const triggerType = typeof config.type === 'string' ? config.type : undefined

  return (
    <BaseNode
      node={props}
      icon={Zap}
      label="Trigger"
      accentClassName="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
      showTargetHandle={false}
    >
      {triggerType ? `via ${triggerType}` : null}
    </BaseNode>
  )
}
