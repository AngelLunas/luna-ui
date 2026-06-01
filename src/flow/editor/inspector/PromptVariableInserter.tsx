import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/ui/popover'
import { cn } from '../../../lib/utils'
import {
  FlowNodeType,
  IterationSource,
  type IterationCarryField,
} from '../../core/types'
import { useFlowEditor } from '../store'
import type {
  FlowEditorAgent,
  FlowEditorContextSource,
} from '../FlowEditor'

export interface PromptVariableInserterProps {
  /** Node whose prompt is being edited — used to scope outputs to predecessors. */
  ownerNodeId: string
  /** Selected agent for this node; drives which context sources show up. */
  agent: FlowEditorAgent | null
  contextSources: FlowEditorContextSource[]
  /** Carry fields declared on this node's iteration config. When iteration
   * is disabled, pass `[]` — the "Iteration" group will render empty with
   * a helpful hint instead of being hidden, so the affordance is always
   * discoverable. */
  iterationCarry?: IterationCarryField[]
  /** Which iteration source the node is configured for. Decides which
   * chips show up in the "Iteration" group — `agent_yield` exposes
   * carry fields, `scratchpad` exposes ${iteration.item} / item_id /
   * collection. Pass undefined when iteration is off. */
  iterationSource?: IterationSource
  /** Fields declared as the expected shape of each scratchpad record.
   * Only consumed when iterationSource === 'scratchpad' — each field
   * becomes a ${iteration.item.<name>} chip so the user can drop typed
   * references into the prompt without typing the dotted path. Empty
   * or undefined means "no per-field chips, just the bare
   * ${iteration.item}". */
  iterationItemFields?: IterationCarryField[]
  /** Called with a fully-formed template token like ``${outputs.fetch_jobs}``. */
  onInsert: (token: string) => void
}

interface VariableOption {
  /** Last segment shown to the user (e.g. ``fetch_jobs``). */
  label: string
  /** Full token to insert, including the ``${...}`` braces. */
  token: string
  /** Optional secondary hint shown next to the label. */
  hint?: string
}

export function PromptVariableInserter({
  ownerNodeId,
  agent,
  contextSources,
  iterationCarry,
  iterationSource,
  iterationItemFields,
  onInsert,
}: PromptVariableInserterProps) {
  const nodes = useFlowEditor((s) => s.nodes)
  const edges = useFlowEditor((s) => s.edges)
  const entryPoint = useFlowEditor((s) => s.entryPoint)
  const inputs = useFlowEditor((s) => s.inputs)

  const inputOptions = useMemo<VariableOption[]>(
    () =>
      inputs.map((i) => ({
        label: i.name,
        token: `\${inputs.${i.name}}`,
        hint: i.type,
      })),
    [inputs],
  )

  const outputOptions = useMemo<VariableOption[]>(() => {
    const predecessors = collectPredecessors(
      ownerNodeId,
      edges,
      nodes.map((n) => n.id),
      entryPoint,
    )
    return nodes
      .filter((n) => predecessors.has(n.id))
      .filter((n) => n.type !== FlowNodeType.Trigger)
      .map((n) => ({
        label: n.id,
        token: `\${outputs.${n.id}}`,
        hint: n.name || n.type,
      }))
  }, [ownerNodeId, edges, nodes, entryPoint])

  const iterationOptions = useMemo<VariableOption[]>(() => {
    // iteration.index is always available, regardless of source.
    const options: VariableOption[] = []

    if (iterationSource === IterationSource.Scratchpad) {
      // Scratchpad mode: each turn gets a record from the collection.
      // The carry concept doesn't apply here.
      options.push(
        {
          label: 'item',
          token: '${iteration.item}',
          hint: 'current record (object)',
        },
        {
          label: 'item_id',
          token: '${iteration.item_id}',
          hint: 'current record id (string)',
        },
        {
          label: 'collection',
          token: '${iteration.collection}',
          hint: 'collection name (string)',
        },
        {
          label: 'index',
          token: '${iteration.index}',
          hint: '0-based iteration counter',
        },
      )
      // Per-field chips derived from the user's expected record shape.
      // These are pure prompt-builder ergonomics — the runtime doesn't
      // know about them; whatever fields actually live in the record at
      // run time is what gets resolved.
      for (const field of iterationItemFields ?? []) {
        if (!field.name) continue
        options.push({
          label: `item.${field.name}`,
          token: `\${iteration.item.${field.name}}`,
          hint: field.nullable ? `${field.type} | null` : field.type,
        })
      }
      return options
    }

    // agent_yield mode: chips for the declared carry fields + index.
    const carry = iterationCarry ?? []
    if (carry.length === 0) return []
    options.push({
      label: 'index',
      token: '${iteration.index}',
      hint: '0-based iteration counter',
    })
    for (const field of carry) {
      if (!field.name) continue
      options.push({
        label: `carry.${field.name}`,
        token: `\${iteration.carry.${field.name}}`,
        hint: field.nullable ? `${field.type} | null` : field.type,
      })
    }
    return options
  }, [iterationCarry, iterationSource])

  const contextOptions = useMemo<VariableOption[]>(() => {
    if (!agent?.required_sources?.length) return []
    const byName = new Map(
      contextSources.map((s) => [s.name, s] as const),
    )
    const opts: VariableOption[] = []
    for (const name of agent.required_sources) {
      const source = byName.get(name)
      const paths = source ? walkSchema(source.schema, name) : [name]
      for (const path of paths) {
        opts.push({
          label: path,
          token: `\${context.${path}}`,
          hint: source?.description,
        })
      }
    }
    return opts
  }, [agent, contextSources])

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[10px] uppercase tracking-wide text-text-muted">
        Insert:
      </span>
      <Group
        label="Inputs"
        options={inputOptions}
        emptyHint="Declare flow inputs first."
        onPick={onInsert}
      />
      <Group
        label="Outputs"
        options={outputOptions}
        emptyHint="No upstream nodes yet — connect a predecessor."
        onPick={onInsert}
      />
      <Group
        label="Context"
        options={contextOptions}
        emptyHint={
          agent
            ? 'This agent declares no required_sources.'
            : 'Pick an agent above first.'
        }
        onPick={onInsert}
      />
      <Group
        label="Iteration"
        options={iterationOptions}
        emptyHint="Enable iteration mode and declare carry fields to insert them here."
        onPick={onInsert}
      />
    </div>
  )
}

function Group({
  label,
  options,
  emptyHint,
  onPick,
}: {
  label: string
  options: VariableOption[]
  emptyHint: string
  onPick: (token: string) => void
}) {
  const [open, setOpen] = useState(false)
  const empty = options.length === 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded border border-accent-border bg-accent-subtle/40 px-1.5 py-0.5 text-[11px] text-accent hover:bg-accent-subtle transition-colors',
            empty && 'opacity-60',
          )}
        >
          {label}
          <ChevronDown size={10} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="min-w-[220px] max-w-[320px] p-1 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto"
      >
        {empty ? (
          <div className="px-2 py-1.5 text-xs text-text-muted italic">
            {emptyHint}
          </div>
        ) : (
          <ul className="flex flex-col">
            {options.map((opt) => (
              <li key={opt.token}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(opt.token)
                    setOpen(false)
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-accent-subtle text-xs"
                >
                  <span className="font-mono text-text-primary">
                    {opt.label}
                  </span>
                  {opt.hint && (
                    <span className="ml-2 text-[10px] text-text-muted">
                      {opt.hint}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Reverse-BFS from ``ownerNodeId`` over the edges to find every node that
 * (transitively) feeds into it. The trigger is always considered an
 * ancestor of every reachable node, but it never produces an output, so
 * the caller filters it out.
 */
function collectPredecessors(
  ownerNodeId: string,
  edges: Array<{ from: string; to: string }>,
  allNodeIds: string[],
  _entryPoint: string,
): Set<string> {
  const incoming = new Map<string, string[]>()
  for (const id of allNodeIds) incoming.set(id, [])
  for (const e of edges) {
    incoming.get(e.to)?.push(e.from)
  }
  const seen = new Set<string>()
  const queue: string[] = [ownerNodeId]
  while (queue.length > 0) {
    const cur = queue.shift()!
    for (const pred of incoming.get(cur) ?? []) {
      if (pred === ownerNodeId) continue
      if (seen.has(pred)) continue
      seen.add(pred)
      queue.push(pred)
    }
  }
  return seen
}

/**
 * Walk a JSON Schema object emitting dotted paths usable inside a template.
 * Always returns the bare ``prefix`` first (the whole object) followed by
 * one entry per top-level property — so the user can insert either the
 * entire blob (``${context.profile}``) or a specific field
 * (``${context.profile.email}``). Stops at one level of nesting to keep
 * the menu small; deeper paths can still be typed by hand.
 */
function walkSchema(
  schema: Record<string, unknown> | undefined,
  prefix: string,
): string[] {
  if (!schema || typeof schema !== 'object') return [prefix]
  const props = (schema as { properties?: Record<string, unknown> })
    .properties
  if (!props || typeof props !== 'object') return [prefix]
  const keys = Object.keys(props)
  if (keys.length === 0) return [prefix]
  return [prefix, ...keys.map((k) => `${prefix}.${k}`)]
}
