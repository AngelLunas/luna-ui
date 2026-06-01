import dagre from 'dagre'

import type { AdapterResult, RFNode } from './adapter'

export interface LayoutOptions {
  direction?: 'LR' | 'TB' | 'RL' | 'BT'
  nodeWidth?: number
  nodeHeight?: number
  rankSep?: number
  nodeSep?: number
}

const DEFAULTS: Required<LayoutOptions> = {
  direction: 'LR',
  nodeWidth: 220,
  nodeHeight: 96,
  rankSep: 80,
  nodeSep: 40,
}

export function applyDagreLayout(
  result: AdapterResult,
  options: LayoutOptions = {},
): AdapterResult {
  const opts = { ...DEFAULTS, ...options }
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep,
    nodesep: opts.nodeSep,
  })

  for (const node of result.nodes) {
    graph.setNode(node.id, { width: opts.nodeWidth, height: opts.nodeHeight })
  }
  for (const edge of result.edges) {
    graph.setEdge(edge.source, edge.target)
  }

  dagre.layout(graph)

  const nodes: RFNode[] = result.nodes.map((node) => {
    const { x, y } = graph.node(node.id)
    return {
      ...node,
      position: { x: x - opts.nodeWidth / 2, y: y - opts.nodeHeight / 2 },
    }
  })

  return { nodes, edges: result.edges }
}
