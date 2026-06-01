import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

import {
  FlowInputType,
  FlowNodeType,
  FlowTriggerKind,
  type FlowDefinition,
  type FlowEdge,
  type FlowEdgeCondition,
  type FlowInputDef,
  type FlowNode,
  type FlowNodePosition,
  type FlowTrigger,
} from '../core/types'

export { FlowInputType }
export type { FlowInputDef }

export interface FlowEditorMeta {
  name: string
  description: string
  isActive: boolean
}

export interface FlowEditorState {
  meta: FlowEditorMeta
  entryPoint: string
  trigger: FlowTrigger | null
  inputs: FlowInputDef[]
  nodes: FlowNode[]
  edges: FlowEdge[]
  layout: Record<string, FlowNodePosition>
  selectedNodeId: string | null
  selectedEdgeKey: string | null
  dirty: boolean
}

export interface FlowEditorActions {
  setName: (name: string) => void
  setDescription: (description: string) => void
  setIsActive: (active: boolean) => void
  setEntryPoint: (id: string) => void
  setTrigger: (trigger: FlowTrigger | null) => void
  setInputs: (inputs: FlowInputDef[]) => void
  addInput: (input: FlowInputDef) => boolean
  updateInput: (name: string, patch: Partial<FlowInputDef>) => boolean
  removeInput: (name: string) => void
  addNode: (type: FlowNodeType, position?: FlowNodePosition) => string
  updateNode: (id: string, patch: Partial<Omit<FlowNode, 'id'>>) => void
  renameNode: (oldId: string, newId: string) => boolean
  removeNode: (id: string) => void
  setNodePosition: (id: string, position: FlowNodePosition) => void
  setLayout: (layout: Record<string, FlowNodePosition>) => void
  addEdge: (from: string, to: string) => void
  updateEdgeCondition: (key: string, condition: FlowEdgeCondition | null) => void
  removeEdge: (key: string) => void
  selectNode: (id: string | null) => void
  selectEdge: (key: string | null) => void
  hydrate: (definition: FlowDefinition, meta: FlowEditorMeta) => void
  markClean: () => void
  toDefinition: () => FlowDefinition
}

export type FlowEditorStore = FlowEditorState & FlowEditorActions

const DEFAULT_TRIGGER: FlowTrigger = {
  type: FlowTriggerKind.Manual,
  config: {},
}

function defaultNodeConfig(type: FlowNodeType): Record<string, unknown> {
  switch (type) {
    case FlowNodeType.Action:
      return { input: {} }
    case FlowNodeType.AiAgent:
      return {
        context_bindings: {},
        inherit_history_from: [],
        // Iteration block is present but disabled by default so existing
        // flows behave identically and the editor has a stable shape to
        // bind to (no conditional creation when the toggle flips on).
        iteration: { enabled: false, carry_schema: [] },
      }
    case FlowNodeType.Condition:
      return {}
    case FlowNodeType.HumanCheckpoint:
      return { message: '' }
    case FlowNodeType.Trigger:
      return {}
    case FlowNodeType.Output:
      return { select: [] }
    default:
      return {}
  }
}

const NODE_LABEL: Record<FlowNodeType, string> = {
  [FlowNodeType.Action]: 'Action',
  [FlowNodeType.AiAgent]: 'AI Agent',
  [FlowNodeType.Condition]: 'Condition',
  [FlowNodeType.HumanCheckpoint]: 'Human checkpoint',
  [FlowNodeType.Trigger]: 'Trigger',
  [FlowNodeType.Output]: 'Output',
}

export function edgeKey(edge: Pick<FlowEdge, 'from' | 'to'>, index: number): string {
  return `${edge.from}->${edge.to}#${index}`
}

function nextNodeId(nodes: FlowNode[], type: FlowNodeType): string {
  let counter = 1
  const taken = new Set(nodes.map((n) => n.id))
  while (taken.has(`${type}_${counter}`)) counter += 1
  return `${type}_${counter}`
}

export interface CreateFlowEditorStoreOptions {
  definition?: FlowDefinition
  meta?: Partial<FlowEditorMeta>
}

function emptyState(): FlowEditorState {
  return {
    meta: { name: '', description: '', isActive: true },
    entryPoint: '',
    trigger: { ...DEFAULT_TRIGGER },
    inputs: [],
    nodes: [],
    edges: [],
    layout: {},
    selectedNodeId: null,
    selectedEdgeKey: null,
    dirty: false,
  }
}

function hydrateState(
  definition: FlowDefinition,
  meta: FlowEditorMeta,
): FlowEditorState {
  return {
    meta,
    entryPoint: definition.entry_point,
    trigger: definition.trigger ?? null,
    inputs: (definition.inputs ?? []).map((i) => ({ ...i })),
    nodes: definition.nodes.map((n) => ({
      ...n,
      config: { ...(n.config ?? {}) },
    })),
    edges: definition.edges.map((e) => ({
      ...e,
      condition: e.condition ? { ...e.condition } : undefined,
    })),
    layout: { ...(definition.layout ?? {}) },
    selectedNodeId: null,
    selectedEdgeKey: null,
    dirty: false,
  }
}

export function createFlowEditorStore(
  opts: CreateFlowEditorStoreOptions = {},
) {
  const initialMeta: FlowEditorMeta = {
    name: opts.meta?.name ?? '',
    description: opts.meta?.description ?? '',
    isActive: opts.meta?.isActive ?? true,
  }

  const initial: FlowEditorState = opts.definition
    ? hydrateState(opts.definition, initialMeta)
    : { ...emptyState(), meta: initialMeta }

  return createStore<FlowEditorStore>((set, get) => ({
    ...initial,

    setName: (name) =>
      set((s) => ({ meta: { ...s.meta, name }, dirty: true })),
    setDescription: (description) =>
      set((s) => ({ meta: { ...s.meta, description }, dirty: true })),
    setIsActive: (isActive) =>
      set((s) => ({ meta: { ...s.meta, isActive }, dirty: true })),

    setEntryPoint: (id) => set({ entryPoint: id, dirty: true }),

    setTrigger: (trigger) => set({ trigger, dirty: true }),

    setInputs: (inputs) => set({ inputs, dirty: true }),

    addInput: (input) => {
      const state = get()
      if (!input.name || state.inputs.some((i) => i.name === input.name)) {
        return false
      }
      set({ inputs: [...state.inputs, input], dirty: true })
      return true
    },

    updateInput: (name, patch) => {
      const state = get()
      const idx = state.inputs.findIndex((i) => i.name === name)
      if (idx === -1) return false
      // Renames must remain unique. Reject the patch rather than silently
      // dropping the conflicting one — the caller's UI will keep showing
      // the old name so the user notices.
      if (
        patch.name !== undefined &&
        patch.name !== name &&
        state.inputs.some((i) => i.name === patch.name)
      ) {
        return false
      }
      const next = state.inputs.slice()
      next[idx] = { ...next[idx], ...patch }
      set({ inputs: next, dirty: true })
      return true
    },

    removeInput: (name) =>
      set((s) => ({
        inputs: s.inputs.filter((i) => i.name !== name),
        dirty: true,
      })),

    addNode: (type, position) => {
      const id = nextNodeId(get().nodes, type)
      const node: FlowNode = {
        id,
        type,
        name: NODE_LABEL[type],
        config: defaultNodeConfig(type),
      }
      set((s) => ({
        nodes: [...s.nodes, node],
        layout: position ? { ...s.layout, [id]: position } : s.layout,
        entryPoint: s.entryPoint || id,
        selectedNodeId: id,
        selectedEdgeKey: null,
        dirty: true,
      }))
      return id
    },

    updateNode: (id, patch) =>
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                ...patch,
                config:
                  patch.config !== undefined ? patch.config : n.config,
              }
            : n,
        ),
        dirty: true,
      })),

    renameNode: (oldId, newId) => {
      const state = get()
      if (oldId === newId) return true
      if (!newId || state.nodes.some((n) => n.id === newId)) return false
      set({
        nodes: state.nodes.map((n) =>
          n.id === oldId ? { ...n, id: newId } : n,
        ),
        edges: state.edges.map((e) => ({
          ...e,
          from: e.from === oldId ? newId : e.from,
          to: e.to === oldId ? newId : e.to,
        })),
        layout: Object.fromEntries(
          Object.entries(state.layout).map(([k, v]) => [
            k === oldId ? newId : k,
            v,
          ]),
        ),
        entryPoint: state.entryPoint === oldId ? newId : state.entryPoint,
        selectedNodeId:
          state.selectedNodeId === oldId ? newId : state.selectedNodeId,
        dirty: true,
      })
      return true
    },

    removeNode: (id) =>
      set((s) => {
        const layout = { ...s.layout }
        delete layout[id]
        const remaining = s.nodes.filter((n) => n.id !== id)
        return {
          nodes: remaining,
          edges: s.edges.filter((e) => e.from !== id && e.to !== id),
          layout,
          entryPoint:
            s.entryPoint === id ? remaining[0]?.id ?? '' : s.entryPoint,
          selectedNodeId:
            s.selectedNodeId === id ? null : s.selectedNodeId,
          dirty: true,
        }
      }),

    setNodePosition: (id, position) =>
      set((s) => ({
        layout: { ...s.layout, [id]: position },
        dirty: true,
      })),

    setLayout: (layout) => set({ layout, dirty: true }),

    addEdge: (from, to) =>
      set((s) => {
        if (from === to) return {}
        const exists = s.edges.some((e) => e.from === from && e.to === to)
        if (exists) return {}
        return {
          edges: [...s.edges, { from, to }],
          dirty: true,
        }
      }),

    updateEdgeCondition: (key, condition) =>
      set((s) => {
        const edges = s.edges.map((e, i) => {
          if (edgeKey(e, i) !== key) return e
          if (condition === null) {
            const { condition: _drop, ...rest } = e
            return rest
          }
          return { ...e, condition }
        })
        return { edges, dirty: true }
      }),

    removeEdge: (key) =>
      set((s) => ({
        edges: s.edges.filter((e, i) => edgeKey(e, i) !== key),
        selectedEdgeKey:
          s.selectedEdgeKey === key ? null : s.selectedEdgeKey,
        dirty: true,
      })),

    selectNode: (id) =>
      set({ selectedNodeId: id, selectedEdgeKey: id ? null : null }),
    selectEdge: (key) =>
      set({ selectedEdgeKey: key, selectedNodeId: key ? null : null }),

    hydrate: (definition, meta) => set(hydrateState(definition, meta)),

    markClean: () => set({ dirty: false }),

    toDefinition: (): FlowDefinition => {
      const s = get()
      return {
        entry_point: s.entryPoint,
        trigger: s.trigger,
        nodes: s.nodes.map((n) => ({
          ...n,
          config: { ...(n.config ?? {}) },
        })),
        edges: s.edges.map((e) =>
          e.condition
            ? { ...e, condition: { ...e.condition } }
            : { from: e.from, to: e.to },
        ),
        inputs: s.inputs.map((i) => ({ ...i })),
        layout: { ...s.layout },
      }
    },
  }))
}

export type FlowEditorStoreInstance = ReturnType<typeof createFlowEditorStore>

const FlowEditorStoreContext = createContext<FlowEditorStoreInstance | null>(
  null,
)

export interface FlowEditorStoreProviderProps {
  store: FlowEditorStoreInstance
  children: ReactNode
}

export function FlowEditorStoreProvider({
  store,
  children,
}: FlowEditorStoreProviderProps) {
  return (
    <FlowEditorStoreContext.Provider value={store}>
      {children}
    </FlowEditorStoreContext.Provider>
  )
}

function useFlowEditorStoreInstance(): FlowEditorStoreInstance {
  const store = useContext(FlowEditorStoreContext)
  if (!store) {
    throw new Error(
      'useFlowEditor* must be used inside <FlowEditorStoreProvider>',
    )
  }
  return store
}

export function useFlowEditor<T>(selector: (s: FlowEditorStore) => T): T {
  const store = useFlowEditorStoreInstance()
  return useStore(store, selector)
}

export function useFlowEditorActions(): FlowEditorActions {
  const store = useFlowEditorStoreInstance()
  return useMemo<FlowEditorActions>(() => {
    const s = store.getState()
    return {
      setName: s.setName,
      setDescription: s.setDescription,
      setIsActive: s.setIsActive,
      setEntryPoint: s.setEntryPoint,
      setTrigger: s.setTrigger,
      setInputs: s.setInputs,
      addInput: s.addInput,
      updateInput: s.updateInput,
      removeInput: s.removeInput,
      addNode: s.addNode,
      updateNode: s.updateNode,
      renameNode: s.renameNode,
      removeNode: s.removeNode,
      setNodePosition: s.setNodePosition,
      setLayout: s.setLayout,
      addEdge: s.addEdge,
      updateEdgeCondition: s.updateEdgeCondition,
      removeEdge: s.removeEdge,
      selectNode: s.selectNode,
      selectEdge: s.selectEdge,
      hydrate: s.hydrate,
      markClean: s.markClean,
      toDefinition: s.toDefinition,
    }
  }, [store])
}

export function useFlowEditorStoreApi(): FlowEditorStoreInstance {
  return useFlowEditorStoreInstance()
}
