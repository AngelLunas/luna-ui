import { useCallback, useMemo, useState } from 'react'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnSelectionChangeParams,
} from '@xyflow/react'

import { FlowCanvas, type FlowCanvasColors } from '../FlowCanvas'
import {
  flowDefinitionToReactFlow,
  type RFEdge,
  type RFNode,
} from '../core/adapter'
import { applyDagreLayout, type LayoutOptions } from '../core/layout'
import type { FlowDefinition } from '../core/types'
import { NodePalette } from './NodePalette'
import { NodeInspector } from './inspector/NodeInspector'
import { EdgeInspector } from './inspector/EdgeInspector'
import {
  createFlowEditorStore,
  edgeKey,
  FlowEditorStoreProvider,
  useFlowEditor,
  useFlowEditorActions,
  useFlowEditorStoreApi,
  type FlowEditorMeta,
  type FlowEditorStoreInstance,
} from './store'

export interface FlowEditorAgent {
  id: string
  name: string
  model?: string
  /** Sources the agent's instructions reference (from AgentRead.required_sources).
   * Used by AiAgentInspector to drive the variable picker and binding form. */
  required_sources?: string[]
  /** System tools granted to the agent (from AgentSystemToolGrant). Drives
   * per-node UX decisions in the inspector — e.g. the stash editor only
   * surfaces when `stash_records` is in this list, because granting the
   * tool is the prerequisite to using it. Empty array means "no grants
   * yet"; `undefined` means "not loaded" (caller forgot to ask for it). */
  system_tool_names?: string[]
}

export interface FlowEditorContextSource {
  name: string
  description?: string
  /** Implicit sources resolve from trigger.user_id automatically — the editor
   * surfaces them but does not ask the user for a binding. */
  id_implicit?: boolean
  /** JSON Schema of the loaded source; the variable picker walks this to
   * suggest dotted paths under `${context.<name>...}`. */
  schema?: Record<string, unknown>
}

/** One canonical field a dedup checker reads from each record. */
export interface FlowEditorDedupField {
  name: string
  type: string
  description?: string
  /** When true, the editor can leave the field unmapped — the runtime
   * just skips it for that record. Drives the "(optional)" badge and
   * lets the mapping dropdown legitimately be blank. */
  optional?: boolean
}

/** One catalog entry from GET /dedup-checkers. */
export interface FlowEditorDedupChecker {
  /** Machine name (stored in node config). */
  name: string
  /** Human label shown in the dropdown; falls back to `name`. */
  label: string
  description?: string
  required_fields: FlowEditorDedupField[]
}

export interface FlowEditorCatalogs {
  agents?: FlowEditorAgent[]
  connectors?: Array<{
    id: string
    name: string
    description?: string
    operations: Array<{
      id: string
      name: string
      description?: string
      method?: string
      path?: string
    }>
  }>
  contextSources?: FlowEditorContextSource[]
  /** Dedup checkers the host app has registered. The stash inspector
   * uses this to populate the "Check against" dropdown and the
   * field-mapping UI. Undefined / empty = the dedup section in the
   * inspector hides entirely. */
  dedupCheckers?: FlowEditorDedupChecker[]
  /** Catalog-scope system tools the action-node picker can dispatch
   * to. Distinct from connector operations: in-process Python
   * handlers registered via ``install_*_system_tools``. Undefined /
   * empty hides the "System tools" group in the picker. */
  systemTools?: Array<{
    name: string
    description?: string
  }>
}

export interface FlowEditorProps {
  /** Optional pre-built store. If omitted, the editor creates one from
   * ``definition`` + ``meta`` on first mount and owns it.
   */
  store?: FlowEditorStoreInstance
  definition?: FlowDefinition
  meta?: Partial<FlowEditorMeta>
  catalogs?: FlowEditorCatalogs
  colors?: FlowCanvasColors
  layoutOptions?: LayoutOptions
  /** Hide the left palette (useful when the host renders its own). */
  hidePalette?: boolean
  /** Hide the right inspector. */
  hideInspector?: boolean
  className?: string
}

export function FlowEditor(props: FlowEditorProps) {
  const ownStore = useMemo<FlowEditorStoreInstance>(
    () =>
      props.store ??
      createFlowEditorStore({
        definition: props.definition,
        meta: props.meta,
      }),
    // The store is created once per editor mount; identity-changing inputs
    // are funneled through the explicit `store` prop instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.store],
  )

  return (
    <FlowEditorStoreProvider store={ownStore}>
      <FlowEditorBody
        catalogs={props.catalogs}
        colors={props.colors}
        layoutOptions={props.layoutOptions}
        hidePalette={props.hidePalette}
        hideInspector={props.hideInspector}
        className={props.className}
      />
    </FlowEditorStoreProvider>
  )
}

interface FlowEditorBodyProps {
  catalogs?: FlowEditorCatalogs
  colors?: FlowCanvasColors
  layoutOptions?: LayoutOptions
  hidePalette?: boolean
  hideInspector?: boolean
  className?: string
}

function FlowEditorBody({
  catalogs,
  colors,
  layoutOptions,
  hidePalette,
  hideInspector,
  className,
}: FlowEditorBodyProps) {
  const store = useFlowEditorStoreApi()
  const actions = useFlowEditorActions()

  const nodes = useFlowEditor((s) => s.nodes)
  const edges = useFlowEditor((s) => s.edges)
  const layout = useFlowEditor((s) => s.layout)
  const entryPoint = useFlowEditor((s) => s.entryPoint)
  const selectedNodeId = useFlowEditor((s) => s.selectedNodeId)
  const selectedEdgeKey = useFlowEditor((s) => s.selectedEdgeKey)

  // Render React Flow from a definition view derived from the store. We
  // don't keep React Flow's nodes/edges in component state — the store is
  // the source of truth and the canvas is a projection.
  //
  // The `selected` flag is stamped here from the store so React Flow's
  // visual selection stays in lock-step with `selectedNodeId` even after
  // node data updates. Without this, edits like renaming a node emit a
  // spurious `select: false` change inside onNodesChange that would close
  // the inspector mid-keystroke.
  const rfGraph = useMemo(() => {
    const graph = flowDefinitionToReactFlow({
      entry_point: entryPoint,
      trigger: null,
      nodes,
      edges,
      layout,
    })
    return {
      nodes: graph.nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
      edges: graph.edges.map((e) => ({
        ...e,
        selected: e.id === selectedEdgeKey,
      })),
    }
  }, [nodes, edges, layout, entryPoint, selectedNodeId, selectedEdgeKey])

  // onNodesChange / onEdgesChange handle structural deltas only. Selection
  // is owned by onSelectionChange below — React Flow also emits `select`
  // entries here, but those fire spuriously when a node's data updates,
  // which used to deselect the active node on every keystroke.
  const handleNodesChange = useCallback(
    (changes: NodeChange<RFNode>[]) => {
      const next = applyNodeChanges(changes, rfGraph.nodes)
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          actions.setNodePosition(change.id, change.position)
        }
        if (change.type === 'remove') {
          actions.removeNode(change.id)
        }
      }
      void next
    },
    [actions, rfGraph.nodes],
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<RFEdge>[]) => {
      const next = applyEdgeChanges(changes, rfGraph.edges)
      for (const change of changes) {
        if (change.type === 'remove') {
          actions.removeEdge(change.id)
        }
      }
      void next
    },
    [actions, rfGraph.edges],
  )

  const handleConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return
      actions.addEdge(conn.source, conn.target)
    },
    [actions],
  )

  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const node = params.nodes[0]
      const edge = params.edges[0]
      if (node) {
        actions.selectNode(node.id)
      } else if (edge) {
        actions.selectEdge(edge.id)
      } else {
        actions.selectNode(null)
        actions.selectEdge(null)
      }
    },
    [actions],
  )

  const handleAutoLayout = useCallback(() => {
    const laid = applyDagreLayout(rfGraph, layoutOptions)
    const nextLayout: Record<string, { x: number; y: number }> = {}
    for (const n of laid.nodes) nextLayout[n.id] = n.position
    actions.setLayout(nextLayout)
  }, [actions, layoutOptions, rfGraph])

  const [paletteWidth] = useState(180)

  return (
    <div
      className={
        className ??
        'flex h-full w-full overflow-hidden rounded-lg border border-border'
      }
    >
      {!hidePalette && (
        <aside
          className="border-r border-border bg-surface"
          style={{ width: paletteWidth }}
        >
          <NodePalette onAutoLayout={handleAutoLayout} />
        </aside>
      )}
      <div className="flex-1 min-w-0">
        <FlowCanvas
          nodes={rfGraph.nodes}
          edges={rfGraph.edges}
          readOnly={false}
          showMiniMap
          showControls
          showBackground
          colors={colors}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onSelectionChange={handleSelectionChange}
        />
      </div>
      {!hideInspector && (selectedNodeId || selectedEdgeKey) && (
        <aside className="w-80 border-l border-border bg-surface overflow-y-auto">
          {selectedNodeId ? (
            <NodeInspector
              nodeId={selectedNodeId}
              catalogs={catalogs}
              storeApi={store}
            />
          ) : selectedEdgeKey ? (
            <EdgeInspector edgeKey={selectedEdgeKey} />
          ) : null}
        </aside>
      )}
    </div>
  )
}

export { edgeKey }
