import { FlowNodeType, type FlowDefinition } from '../core/types'

export interface FlowValidationError {
  message: string
  /** Optional pointer to the offending node/edge so the inspector can highlight it. */
  nodeId?: string
  edgeIndex?: number
}

/**
 * Pure client-side check mirroring ``services.flow.validate_definition``.
 * Cheap enough to run on every keystroke; the server endpoint is the
 * authoritative gate before save.
 */
export function validateFlowDefinition(
  definition: FlowDefinition,
): FlowValidationError[] {
  const errors: FlowValidationError[] = []
  const ids = new Set<string>()
  const duplicates: string[] = []

  for (const node of definition.nodes) {
    if (ids.has(node.id)) duplicates.push(node.id)
    ids.add(node.id)
  }
  if (duplicates.length > 0) {
    errors.push({
      message: `Duplicate node ids: ${[...new Set(duplicates)].join(', ')}`,
    })
  }

  if (!definition.entry_point) {
    errors.push({ message: 'entry_point is empty' })
  } else if (!ids.has(definition.entry_point)) {
    errors.push({
      message: `entry_point '${definition.entry_point}' does not match any node`,
    })
  }

  definition.edges.forEach((edge, index) => {
    if (!ids.has(edge.from)) {
      errors.push({
        message: `Edge[${index}].from '${edge.from}' references unknown node`,
        edgeIndex: index,
      })
    }
    if (!ids.has(edge.to)) {
      errors.push({
        message: `Edge[${index}].to '${edge.to}' references unknown node`,
        edgeIndex: index,
      })
    }
  })

  for (const node of definition.nodes) {
    switch (node.type) {
      case FlowNodeType.Action: {
        const op = node.config?.operation_id
        const systemTool = node.config?.system_tool_name
        const hasOperation = typeof op === 'string' && op.length > 0
        const hasSystemTool =
          typeof systemTool === 'string' && systemTool.length > 0
        if (hasOperation && hasSystemTool) {
          errors.push({
            message: `Action '${node.id}' declares both operation_id and system_tool_name; pick exactly one`,
            nodeId: node.id,
          })
        } else if (!hasOperation && !hasSystemTool) {
          errors.push({
            message: `Action '${node.id}' is missing config.operation_id or config.system_tool_name`,
            nodeId: node.id,
          })
        }
        break
      }
      case FlowNodeType.AiAgent: {
        const agent = node.config?.agent_id
        if (!agent || typeof agent !== 'string') {
          errors.push({
            message: `AI Agent '${node.id}' is missing config.agent_id`,
            nodeId: node.id,
          })
        }
        const inherit = node.config?.inherit_history_from
        if (inherit !== undefined) {
          if (
            !Array.isArray(inherit) ||
            !inherit.every((x) => typeof x === 'string')
          ) {
            errors.push({
              message: `AI Agent '${node.id}': inherit_history_from must be a list of node ids`,
              nodeId: node.id,
            })
          } else {
            for (const ref of inherit) {
              if (ref === node.id) {
                errors.push({
                  message: `AI Agent '${node.id}' cannot inherit from itself`,
                  nodeId: node.id,
                })
              } else if (!ids.has(ref)) {
                errors.push({
                  message: `AI Agent '${node.id}' inherits from unknown node '${ref}'`,
                  nodeId: node.id,
                })
              }
            }
          }
        }
        break
      }
      default:
        break
    }
  }

  return errors
}
