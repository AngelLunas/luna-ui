import { useMemo } from 'react'

import { FlowCanvas, type FlowCanvasProps } from './FlowCanvas'
import { flowDefinitionToReactFlow } from './core/adapter'
import { applyDagreLayout, type LayoutOptions } from './core/layout'
import type { FlowDefinition, FlowEdge, FlowNode } from './core/types'

export interface FlowVisualizerProps
  extends Omit<FlowCanvasProps, 'nodes' | 'edges' | 'onNodeClick' | 'onEdgeClick'> {
  definition: FlowDefinition
  layoutOptions?: LayoutOptions
  /**
   * Force auto-layout even if `definition.layout` provides positions.
   */
  autoLayout?: boolean
  onNodeClick?: (node: FlowNode) => void
  onEdgeClick?: (edge: FlowEdge) => void
}

export function FlowVisualizer({
  definition,
  layoutOptions,
  autoLayout,
  onNodeClick,
  onEdgeClick,
  ...rest
}: FlowVisualizerProps) {
  const { nodes, edges } = useMemo(() => {
    const graph = flowDefinitionToReactFlow(definition)
    const hasLayout =
      !autoLayout && definition.layout && Object.keys(definition.layout).length > 0
    return hasLayout ? graph : applyDagreLayout(graph, layoutOptions)
  }, [definition, layoutOptions, autoLayout])

  return (
    <FlowCanvas
      nodes={nodes}
      edges={edges}
      onNodeClick={onNodeClick ? (_, node) => onNodeClick(node.data.node) : undefined}
      onEdgeClick={
        onEdgeClick
          ? (_, edge) => {
              if (edge.data?.edge) onEdgeClick(edge.data.edge)
            }
          : undefined
      }
      {...rest}
    />
  )
}
