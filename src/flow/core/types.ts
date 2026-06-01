export const FlowNodeType = {
  Trigger: 'trigger',
  Action: 'action',
  AiAgent: 'ai_agent',
  Condition: 'condition',
  HumanCheckpoint: 'human_checkpoint',
  Output: 'output',
} as const
export type FlowNodeType = (typeof FlowNodeType)[keyof typeof FlowNodeType]

export const FlowConditionOperator = {
  Eq: 'eq',
  Ne: 'ne',
  Gt: 'gt',
  Gte: 'gte',
  Lt: 'lt',
  Lte: 'lte',
  In: 'in',
  Contains: 'contains',
} as const
export type FlowConditionOperator =
  (typeof FlowConditionOperator)[keyof typeof FlowConditionOperator]

export const FlowTriggerKind = {
  Manual: 'manual',
  Schedule: 'schedule',
  Webhook: 'webhook',
} as const
export type FlowTriggerKind = (typeof FlowTriggerKind)[keyof typeof FlowTriggerKind]

export interface FlowEdgeCondition {
  field: string
  operator: FlowConditionOperator
  value: unknown
}

export interface FlowNode {
  id: string
  type: FlowNodeType
  name?: string
  config?: Record<string, unknown>
}

export interface FlowEdge {
  from: string
  to: string
  condition?: FlowEdgeCondition
}

export const FlowInputType = {
  String: 'string',
  Integer: 'integer',
  Number: 'number',
  Boolean: 'boolean',
  Object: 'object',
} as const
export type FlowInputType = (typeof FlowInputType)[keyof typeof FlowInputType]

/**
 * Primitive types the iteration carry schema accepts. Mirrors the backend's
 * `CARRY_PRIMITIVE_TYPES` set in `luna_core/engine/iteration.py` — keep both
 * in sync. Narrower than JSON Schema on purpose so the synthesized
 * yield_iteration tool stays trivial for every LLM provider.
 */
export const IterationCarryType = {
  String: 'string',
  Integer: 'integer',
  Number: 'number',
  Boolean: 'boolean',
  Object: 'object',
  Array: 'array',
} as const
export type IterationCarryType =
  (typeof IterationCarryType)[keyof typeof IterationCarryType]

export const IterationOnNoYield = {
  TreatAsDone: 'treat_as_done',
  Error: 'error',
} as const
export type IterationOnNoYield =
  (typeof IterationOnNoYield)[keyof typeof IterationOnNoYield]

/**
 * Execution mode for a scratchpad-source iteration node.
 *
 * - `sequential`: legacy default. The runtime walks the snapshot ids one
 *   by one, awaiting each agent run before starting the next. Order is
 *   deterministic (ids sorted ascending) and downstream tools see one
 *   call at a time. The only mode supported for `agent_yield` source —
 *   parallel makes no sense there because each turn's carry depends on
 *   the previous turn's return.
 * - `parallel`: only valid when `source = 'scratchpad'`. The runtime
 *   spawns up to `concurrency` agent runs concurrently via asyncio.
 *   Order of processing is NOT preserved; if a downstream stash_records
 *   call cares about order, stay in sequential mode. Each iteration
 *   still gets its own fresh agent context (no state bleed), and every
 *   event emitted from inside carries an `iteration_id` so the UI can
 *   group nested events back to the iteration they came from.
 */
export const IterationExecution = {
  Sequential: 'sequential',
  Parallel: 'parallel',
} as const
export type IterationExecution =
  (typeof IterationExecution)[keyof typeof IterationExecution]

/**
 * What to do when one iteration in a parallel batch raises. Ignored in
 * sequential mode (a failure there propagates immediately as it always did).
 *
 * - `continue`: the in-flight siblings keep running; the node ends with
 *   the failure recorded in its result but the batch isn't aborted. Good
 *   for independent per-item processing where one bad record shouldn't
 *   waste the work the others already did.
 * - `cancel_siblings`: cancel every pending/running sibling task and
 *   re-raise the first error. Use when the items are part of a single
 *   logical batch that should be all-or-nothing.
 */
export const IterationOnError = {
  Continue: 'continue',
  CancelSiblings: 'cancel_siblings',
} as const
export type IterationOnError =
  (typeof IterationOnError)[keyof typeof IterationOnError]

/**
 * Where each iteration's "item" comes from. Mirrors the backend's
 * ITERATION_SOURCE_* constants in `luna_core/engine/iteration.py` — keep
 * in sync.
 *
 * - `agent_yield`: the agent drives the loop by calling `yield_iteration`
 *   every turn. Uses `carry_schema` + `initial_carry`. This is the
 *   fetcher/paginator pattern.
 * - `scratchpad`: the runtime drives the loop by walking a snapshot of
 *   record ids from a `ScratchpadStore` collection (the one a previous
 *   node populated via `stash_records`). Uses `source_config.collection`.
 *   The agent processes one item per turn — typically a scorer that
 *   may or may not persist via a normal MCP tool. Items are dropped
 *   from the scratchpad implicitly at the end of each iteration.
 */
export const IterationSource = {
  AgentYield: 'agent_yield',
  Scratchpad: 'scratchpad',
} as const
export type IterationSource = (typeof IterationSource)[keyof typeof IterationSource]

export interface IterationCarryField {
  /** Identifier — must match ^[a-z_][a-z0-9_]*$ */
  name: string
  type: IterationCarryType
  /** Allows null in addition to the primitive — typical for exhausted cursors. */
  nullable?: boolean
  /** Initial value if `initial_carry` doesn't override it for this field. */
  default?: unknown
  /** Hint shown to the agent in the synthesized tool's input schema. */
  description?: string
}

/**
 * Source-specific config. Only the keys relevant to the chosen source
 * are read at run time — others are ignored. Kept as a flat record
 * (not a tagged union) so the editor can stash partial configs without
 * losing them when the user flips source back and forth.
 */
export interface IterationSourceConfig {
  /** Required when `source = 'scratchpad'`. Name of the scratchpad
   * collection to iterate over (typically populated upstream by a node
   * that called `stash_records`). */
  collection?: string
  /** Optional "expected record shape" — same row shape as carry/stash
   * schemas. Drives ${iteration.item.<field>} chips in the prompt
   * inserter when source=scratchpad. Editor scaffolding only: the
   * runtime doesn't validate items against this (items come from the
   * scratchpad, which itself enforces shape at stash time). */
  expected_record_schema?: IterationCarryField[]
}

/**
 * One-record dedup config attached to a stash block. When set, the
 * runtime binds the named checker at dispatch and the stash_records
 * handler rejects matching records before they reach the scratchpad —
 * the agent reads a `duplicates` array in the tool response and tries
 * another candidate. Duplicates do NOT count against iteration quotas.
 *
 * `fields` maps each canonical field the chosen checker declared
 * (e.g. `external_id`) to a field on the records the agent produces.
 * Optional checker fields the user chose to skip are absent from this
 * map. Backend resolver (`resolve_stash_dedup_binding`) errors on a
 * required field that's unmapped — surfaced as a NodeExecutionError
 * at run time, which the editor's validate step will eventually
 * mirror at save time.
 */
export interface StashDedupConfig {
  checker?: string
  fields?: Record<string, string>
}

/**
 * Per-node stash config. When the agent has `stash_records` granted,
 * the inspector surfaces an editor for this block. The runtime reads
 * `record_schema` from here and injects it into the stash_records
 * handler's call_context so each record is validated against the
 * declared shape before landing in the scratchpad. `dedup` is the
 * sibling: opt-in per record kind, rejects already-seen records using
 * a checker registered by the host app (e.g. luna-sentinel's
 * `sentinel.jobs` looks up against the jobs table for the current user).
 */
export interface StashConfig {
  /** Hint shown in the editor only — used to remind the user which
   * collection name they should hardcode in the agent's prompt when
   * telling it to call stash_records. Cross-node link is by string
   * convention, not by validation. */
  collection_hint?: string
  /** Field schema enforced at stash_records handler time. */
  record_schema?: IterationCarryField[]
  /** Opt-in dedup — see `StashDedupConfig`. Absence = no dedup. */
  dedup?: StashDedupConfig
}

export interface IterationConfig {
  enabled: boolean
  /** Defaults to `agent_yield` on the backend when missing — old flows
   * predating this field keep working unchanged. */
  source?: IterationSource
  source_config?: IterationSourceConfig
  carry_schema: IterationCarryField[]
  /** Optional overrides keyed by carry field name. Values may be literals or
   * template strings like `${inputs.start_cursor}` resolved at run time. */
  initial_carry?: Record<string, unknown>
  /** Hard-clamped server-side to ITERATION_HARD_CEILING (200). */
  max_iterations?: number
  on_no_yield?: IterationOnNoYield
  /** Defaults to `sequential` on the backend. Only `scratchpad` source
   * supports `parallel`; the runtime falls back to sequential if set on
   * an `agent_yield` node and logs a one-line note. */
  execution?: IterationExecution
  /** Max in-flight iterations when `execution = 'parallel'`. Clamped
   * server-side to the operator-controlled
   * `settings.iteration_concurrency_max` (default 8 — Pi-friendly).
   * Ignored in sequential mode. */
  concurrency?: number
  /** Failure policy for parallel batches. Defaults to `continue`. Ignored
   * in sequential mode. */
  on_iteration_error?: IterationOnError
}

export interface FlowInputDef {
  name: string
  type: FlowInputType
  required?: boolean
  default?: unknown
  description?: string
}

export interface FlowScheduleRule {
  cron: string
  tz: string
  value?: Record<string, unknown>
  user_id?: string | null
  /** Per-rule inputs piped into state.inputs at dispatch. Backend applies
   * declared defaults for any key missing here, so an empty object is
   * equivalent to "use the flow-level defaults for this rule". */
  inputs?: Record<string, unknown>
}

export interface FlowTrigger {
  type: FlowTriggerKind
  cron?: string | null
  schedules?: FlowScheduleRule[]
  config?: Record<string, unknown>
}

export interface FlowNodePosition {
  x: number
  y: number
}

export interface FlowDefinition {
  entry_point: string
  trigger?: FlowTrigger | null
  nodes: FlowNode[]
  edges: FlowEdge[]
  /** Declared inputs the flow expects to receive at run time. Each entry's
   * ``default`` is applied by the backend when a trigger payload omits the
   * field, which is how "saved default for every run" is implemented. */
  inputs?: FlowInputDef[]
  /**
   * Optional per-node positions. Not produced by the backend today; the
   * visualizer falls back to auto-layout when missing. Reserved so a future
   * editor can persist user-arranged positions without a schema migration.
   */
  layout?: Record<string, FlowNodePosition>
}
