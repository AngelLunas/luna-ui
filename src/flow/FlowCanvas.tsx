import type { CSSProperties } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type ReactFlowProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { flowEdgeTypes } from './edges'
import { flowNodeTypes } from './nodes'
import type { RFEdge, RFNode } from './core/adapter'

export interface FlowCanvasColors {
  /** Background color of the pannable canvas. */
  background?: string
  /** Background color of the zoom/fit-view control buttons. */
  controlsBackground?: string
  /** Icon/text color of the zoom/fit-view control buttons. */
  controlsColor?: string
  /** Hover background color for the control buttons. */
  controlsBackgroundHover?: string
  /** Hover icon/text color for the control buttons. */
  controlsColorHover?: string
  /** Border color between the control buttons. */
  controlsBorder?: string
  /** Background color of the minimap panel (the camera-drag area). */
  minimapBackground?: string
  /** Background color of the minimap viewport mask. */
  minimapMaskBackground?: string
  /** Stroke color of the minimap viewport mask. */
  minimapMaskStroke?: string
  /** Background color of node rectangles drawn inside the minimap. */
  minimapNodeBackground?: string
}

export interface FlowCanvasProps
  extends Omit<
    ReactFlowProps<RFNode, RFEdge>,
    'nodes' | 'edges' | 'nodeTypes' | 'edgeTypes' | 'children'
  > {
  nodes: RFNode[]
  edges: RFEdge[]
  readOnly?: boolean
  showMiniMap?: boolean
  showControls?: boolean
  showBackground?: boolean
  className?: string
  /** Color overrides for the canvas background and zoom controls. */
  colors?: FlowCanvasColors
}

function colorsToCssVars(colors?: FlowCanvasColors): CSSProperties | undefined {
  if (!colors) return undefined
  const vars: Record<string, string> = {}
  if (colors.background) vars['--xy-background-color'] = colors.background
  if (colors.controlsBackground)
    vars['--xy-controls-button-background-color'] = colors.controlsBackground
  if (colors.controlsBackgroundHover)
    vars['--xy-controls-button-background-color-hover'] = colors.controlsBackgroundHover
  if (colors.controlsColor) vars['--xy-controls-button-color'] = colors.controlsColor
  if (colors.controlsColorHover)
    vars['--xy-controls-button-color-hover'] = colors.controlsColorHover
  if (colors.controlsBorder)
    vars['--xy-controls-button-border-color'] = colors.controlsBorder
  if (colors.minimapBackground)
    vars['--xy-minimap-background-color'] = colors.minimapBackground
  if (colors.minimapMaskBackground)
    vars['--xy-minimap-mask-background-color'] = colors.minimapMaskBackground
  if (colors.minimapMaskStroke)
    vars['--xy-minimap-mask-stroke-color'] = colors.minimapMaskStroke
  if (colors.minimapNodeBackground)
    vars['--xy-minimap-node-background-color'] = colors.minimapNodeBackground
  return Object.keys(vars).length > 0 ? (vars as CSSProperties) : undefined
}

export function FlowCanvas({
  nodes,
  edges,
  readOnly = true,
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  className,
  colors,
  style,
  fitView = true,
  ...rest
}: FlowCanvasProps) {
  const colorVars = colorsToCssVars(colors)
  const mergedStyle =
    colorVars || style ? { ...colorVars, ...style } : undefined
  return (
    <div className={className ?? 'h-full w-full'} style={colorVars}>
      <ReactFlowProvider>
        <ReactFlow<RFNode, RFEdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={flowNodeTypes}
          edgeTypes={flowEdgeTypes}
          fitView={fitView}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable
          panOnDrag
          zoomOnScroll
          style={mergedStyle}
          {...rest}
        >
          {showBackground && <Background gap={16} size={1} />}
          {showControls && <Controls showInteractive={!readOnly} />}
          {showMiniMap && <MiniMap pannable zoomable />}
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
