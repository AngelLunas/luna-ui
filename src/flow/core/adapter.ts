import type { Edge, Node } from '@xyflow/react'

import type {
  FlowDefinition,
  FlowEdge,
  FlowNode,
  FlowNodePosition,
} from './types'

export interface FlowNodeData extends Record<string, unknown> {
  node: FlowNode
  isEntryPoint: boolean
}

export interface FlowEdgeData extends Record<string, unknown> {
  edge: FlowEdge
}

export type RFNode = Node<FlowNodeData>
export type RFEdge = Edge<FlowEdgeData>

export interface AdapterResult {
  nodes: RFNode[]
  edges: RFEdge[]
}

const DEFAULT_POSITION: FlowNodePosition = { x: 0, y: 0 }

export function flowDefinitionToReactFlow(definition: FlowDefinition): AdapterResult {
  const positions = definition.layout ?? {}

  const nodes: RFNode[] = definition.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: positions[node.id] ?? DEFAULT_POSITION,
    data: {
      node,
      isEntryPoint: node.id === definition.entry_point,
    },
  }))

  const edges: RFEdge[] = definition.edges.map((edge, index) => ({
    id: `${edge.from}->${edge.to}#${index}`,
    source: edge.from,
    target: edge.to,
    type: 'condition',
    data: { edge },
  }))

  return { nodes, edges }
}

/**
 * Reverse adapter. Not used by the visualizer; reserved so a future editor
 * can serialize React Flow state back into the API's FlowDefinition shape.
 */
export function reactFlowToFlowDefinition(
  result: AdapterResult,
  base: Pick<FlowDefinition, 'entry_point' | 'trigger'>,
): FlowDefinition {
  return {
    entry_point: base.entry_point,
    trigger: base.trigger ?? null,
    nodes: result.nodes.map((n) => n.data.node),
    edges: result.edges.map((e) => e.data?.edge ?? { from: e.source, to: e.target }),
    layout: Object.fromEntries(result.nodes.map((n) => [n.id, n.position])),
  }
}
