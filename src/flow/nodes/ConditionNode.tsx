import { GitBranch } from 'lucide-react'
import type { NodeProps } from '@xyflow/react'

import type { RFNode } from '../core/adapter'
import { BaseNode } from './BaseNode'

export function ConditionNode(props: NodeProps<RFNode>) {
  const config = props.data.node.config ?? {}
  const expression = typeof config.expression === 'string' ? config.expression : undefined

  return (
    <BaseNode
      node={props}
      icon={GitBranch}
      label="Condition"
      accentClassName="bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200"
    >
      {expression ? <code className="font-mono text-[11px]">{expression}</code> : null}
    </BaseNode>
  )
}
