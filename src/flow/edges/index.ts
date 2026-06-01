import type { EdgeTypes } from '@xyflow/react'

import { ConditionEdge } from './ConditionEdge'

export { ConditionEdge } from './ConditionEdge'

export const flowEdgeTypes: EdgeTypes = {
  condition: ConditionEdge,
}
