import { LogOut } from 'lucide-react'
import type { NodeProps } from '@xyflow/react'

import type { RFNode } from '../core/adapter'
import { BaseNode } from './BaseNode'

export function OutputNode(props: NodeProps<RFNode>) {
  return (
    <BaseNode
      node={props}
      icon={LogOut}
      label="Output"
      accentClassName="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
      showSourceHandle={false}
    />
  )
}
