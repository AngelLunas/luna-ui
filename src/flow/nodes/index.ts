import type { NodeTypes } from '@xyflow/react'

import { ActionNode } from './ActionNode'
import { AiAgentNode } from './AiAgentNode'
import { ConditionNode } from './ConditionNode'
import { HumanCheckpointNode } from './HumanCheckpointNode'
import { OutputNode } from './OutputNode'
import { TriggerNode } from './TriggerNode'

export { BaseNode, type BaseNodeProps } from './BaseNode'
export { ActionNode } from './ActionNode'
export { AiAgentNode } from './AiAgentNode'
export { ConditionNode } from './ConditionNode'
export { HumanCheckpointNode } from './HumanCheckpointNode'
export { OutputNode } from './OutputNode'
export { TriggerNode } from './TriggerNode'

export const flowNodeTypes: NodeTypes = {
  action: ActionNode,
  ai_agent: AiAgentNode,
  condition: ConditionNode,
  human_checkpoint: HumanCheckpointNode,
  output: OutputNode,
  trigger: TriggerNode,
}
