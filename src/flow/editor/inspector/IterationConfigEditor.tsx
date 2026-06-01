import { useMemo, useState } from 'react'

import { Checkbox } from '../../../components/ui/checkbox'
import { Input } from '../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { FormField } from '../../../components/domain/primitives/FormField'
import { JsonEditor } from '../../../components/domain/forms/JsonEditor'
import {
  IterationExecution,
  IterationOnError,
  IterationOnNoYield,
  IterationSource,
  type IterationCarryField,
  type IterationConfig,
} from '../../core/types'
import { FieldSchemaEditor } from './FieldSchemaEditor'
import { useDerivedItemSchema } from './useDerivedItemSchema'
import { YieldToolPreview } from './YieldToolPreview'

export interface IterationConfigEditorProps {
  value: IterationConfig
  onChange: (next: IterationConfig) => void
}

const DEFAULT_MAX_ITERATIONS = 50
const HARD_CEILING = 200

// UI-side cap on the concurrency slider. The backend further clamps to
// ``settings.iteration_concurrency_max`` at dispatch (defaults to 8,
// Pi-friendly; operators can raise it via env var). Picking a generous
// UI ceiling means a power user on a beefy host doesn't have to edit
// the slider's max — the server will just enforce its own ceiling
// silently if they exceed it.
const CONCURRENCY_UI_CEILING = 20
const DEFAULT_CONCURRENCY = 4

/**
 * Composite editor for a node's iteration block. Owns the on/off toggle
 * plus the source selector and the source-specific sub-forms. Hidden
 * entirely when iteration is off so a user who never touches it sees
 * no extra UI; additive over the existing AiAgent editor.
 *
 * Two sources today:
 *   - `agent_yield`: carry schema + initial overrides + no-yield policy +
 *     yield-tool preview. The fetcher/paginator pattern.
 *   - `scratchpad`: collection name. The scorer/processor pattern that
 *     iterates over records a previous node stashed.
 */
export function IterationConfigEditor({
  value,
  onChange,
}: IterationConfigEditorProps) {
  function patch(partial: Partial<IterationConfig>) {
    onChange({ ...value, ...partial })
  }

  const source = value.source ?? IterationSource.AgentYield

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-text-primary">
            Iteration mode
          </span>
          <span className="text-[11px] text-text-muted leading-snug">
            Re-invoke this agent with fresh context per item. Source decides
            where each item comes from.
          </span>
        </div>
        <Checkbox
          checked={value.enabled}
          onCheckedChange={(v) => patch({ enabled: v === true })}
          aria-label="Enable iteration mode"
        />
      </div>

      {value.enabled && (
        <>
          <FormField
            label="Source"
            hint="agent_yield: the agent paginates and calls yield_iteration. scratchpad: the runtime walks records a previous node stashed; the agent processes one per turn."
          >
            <Select
              value={source}
              onValueChange={(v) => patch({ source: v as IterationSource })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={IterationSource.AgentYield}>
                  agent_yield — agent drives via yield_iteration
                </SelectItem>
                <SelectItem value={IterationSource.Scratchpad}>
                  scratchpad — iterate over stashed records
                </SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {source === IterationSource.AgentYield ? (
            <AgentYieldSection value={value} patch={patch} />
          ) : (
            <ScratchpadSection value={value} patch={patch} />
          )}

          <FormField
            label="Max iterations"
            hint={`Hard-capped at ${HARD_CEILING}. For scratchpad mode this also bounds how many items are processed per run; remaining items stay in the scratchpad.`}
          >
            <Input
              type="number"
              min={1}
              max={HARD_CEILING}
              value={value.max_iterations ?? DEFAULT_MAX_ITERATIONS}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10)
                patch({
                  max_iterations: Number.isFinite(parsed)
                    ? Math.max(1, Math.min(HARD_CEILING, parsed))
                    : DEFAULT_MAX_ITERATIONS,
                })
              }}
              className="text-xs"
            />
          </FormField>
        </>
      )}
    </div>
  )
}

interface SectionProps {
  value: IterationConfig
  patch: (partial: Partial<IterationConfig>) => void
}

function AgentYieldSection({ value, patch }: SectionProps) {
  const initialCarry = useMemo(
    () =>
      typeof value.initial_carry === 'object' && value.initial_carry !== null
        ? value.initial_carry
        : {},
    [value.initial_carry],
  )
  const [initialCarryText, setInitialCarryText] = useState(() =>
    JSON.stringify(initialCarry, null, 2),
  )
  const [initialCarryError, setInitialCarryError] = useState<string>()

  function updateCarrySchema(next: IterationCarryField[]) {
    patch({ carry_schema: next })
  }

  return (
    <>
      <FormField
        label="Carry schema"
        hint="Variables that travel between iterations. The agent reads them as ${iteration.carry.<name>} and writes the next values via yield_iteration."
      >
        <FieldSchemaEditor
          value={value.carry_schema ?? []}
          onChange={updateCarrySchema}
          emptyHint={
            <>
              No carry fields yet. Add one — the agent will receive its value
              each iteration and must hand the next value back via{' '}
              <span className="font-mono">yield_iteration</span>.
            </>
          }
        />
      </FormField>

      <FormField
        label="Initial carry overrides"
        hint="Optional. Map of field name → literal or ${inputs.x} template. Overrides the schema's default for the first iteration only."
        error={initialCarryError}
      >
        <JsonEditor
          value={initialCarryText}
          onChange={(text, meta) => {
            setInitialCarryText(text)
            setInitialCarryError(meta.error)
            if (
              meta.parsed &&
              typeof meta.parsed === 'object' &&
              !Array.isArray(meta.parsed)
            ) {
              patch({
                initial_carry: meta.parsed as Record<string, unknown>,
              })
            }
          }}
          height={100}
        />
      </FormField>

      <FormField
        label="If agent doesn't yield"
        hint="When the agent ends a turn without calling yield_iteration."
      >
        <Select
          value={value.on_no_yield ?? IterationOnNoYield.TreatAsDone}
          onValueChange={(v) =>
            patch({ on_no_yield: v as IterationOnNoYield })
          }
        >
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={IterationOnNoYield.TreatAsDone}>
              Treat as done
            </SelectItem>
            <SelectItem value={IterationOnNoYield.Error}>
              Raise error
            </SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <YieldToolPreview carrySchema={value.carry_schema ?? []} />
    </>
  )
}

function ScratchpadSection({ value, patch }: SectionProps) {
  const collection = value.source_config?.collection ?? ''
  const derived = useDerivedItemSchema(collection)

  return (
    <>
      <FormField
        label="Collection name"
        hint="Must match the collection a previous node populated with stash_records. The runtime snapshots its record ids at start, runs the agent once per record (injected as ${iteration.item} + ${iteration.item_id}), and drops the record after each turn."
      >
        <Input
          value={collection}
          onChange={(e) =>
            patch({
              source_config: {
                ...(value.source_config ?? {}),
                collection: e.target.value,
              },
            })
          }
          placeholder="pending_review"
          className="text-xs font-mono"
        />
      </FormField>

      <FormField
        label="Expected record shape"
        hint="Auto-derived from the upstream node whose stash collection matches the name above. Drives ${iteration.item.<field>} chips — no runtime validation (the producer enforces shape at stash time)."
      >
        <DerivedItemSchemaDisplay
          collection={collection}
          derived={derived}
        />
      </FormField>

      <div className="rounded border border-border bg-bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-text-muted">
        <p className="font-medium text-text-primary mb-1">In scratchpad mode</p>
        <ul className="list-disc pl-4 flex flex-col gap-0.5">
          <li>The agent receives one record per turn — no carry needed.</li>
          <li>
            Persistence is the agent's job via a normal MCP tool
            (e.g. <span className="font-mono">save_recommended_job</span>).
            Drop from the scratchpad happens automatically after each turn.
          </li>
          <li>
            The loop ends when every snapshotted id has been processed or
            when <span className="font-mono">max_iterations</span> is hit
            (whichever first). Items added during the loop are not picked up.
          </li>
        </ul>
      </div>

      <ScratchpadConcurrencySection value={value} patch={patch} />
    </>
  )
}

/**
 * Sequential vs Parallel execution + concurrency cap + failure policy.
 * Only surfaced for the scratchpad source — agent_yield is inherently
 * sequential (each turn's carry depends on the previous turn's return),
 * and the backend logs a one-line warning + falls back to sequential if
 * a flow forces parallel there.
 */
function ScratchpadConcurrencySection({ value, patch }: SectionProps) {
  const execution = value.execution ?? IterationExecution.Sequential
  const isParallel = execution === IterationExecution.Parallel

  return (
    <div className="flex flex-col gap-3 rounded border border-border bg-bg-muted/20 p-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-text-primary">
          Concurrency
        </span>
        <span className="text-[11px] text-text-muted leading-snug">
          Run iterations one at a time, or several in parallel inside the
          worker's asyncio loop. Parallel speeds up independent per-item
          processing; switch back to sequential if order matters.
        </span>
      </div>

      <FormField
        label="Execution mode"
        hint="Parallel only applies to scratchpad source. Each iteration still gets its own fresh agent context; nothing is shared between siblings."
      >
        <Select
          value={execution}
          onValueChange={(v) =>
            patch({ execution: v as IterationExecution })
          }
        >
          <SelectTrigger className="text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={IterationExecution.Sequential}>
              Sequential — one item at a time (preserves order)
            </SelectItem>
            <SelectItem value={IterationExecution.Parallel}>
              Parallel — run several items concurrently
            </SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {isParallel && (
        <>
          <FormField
            label="Concurrency"
            hint={`Max in-flight iterations. Server may clamp lower (env var LUNA_ITERATION_CONCURRENCY_MAX, default 8 on Pi). 1–${CONCURRENCY_UI_CEILING}.`}
          >
            <Input
              type="number"
              min={1}
              max={CONCURRENCY_UI_CEILING}
              value={value.concurrency ?? DEFAULT_CONCURRENCY}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10)
                patch({
                  concurrency: Number.isFinite(parsed)
                    ? Math.max(1, Math.min(CONCURRENCY_UI_CEILING, parsed))
                    : DEFAULT_CONCURRENCY,
                })
              }}
              className="text-xs"
            />
          </FormField>

          <FormField
            label="If one iteration fails"
            hint="continue: siblings keep running; the failure is recorded in the node's result. cancel_siblings: cancel every in-flight iteration and fail the node — use when items are part of an all-or-nothing batch."
          >
            <Select
              value={value.on_iteration_error ?? IterationOnError.Continue}
              onValueChange={(v) =>
                patch({ on_iteration_error: v as IterationOnError })
              }
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={IterationOnError.Continue}>
                  Continue — keep the other iterations going
                </SelectItem>
                <SelectItem value={IterationOnError.CancelSiblings}>
                  Cancel siblings — fail the node on first error
                </SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <div className="rounded border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] leading-snug text-warning">
            <p className="font-medium mb-0.5">Order is not preserved</p>
            <p className="text-warning/90">
              Parallel iterations finish in whatever order the LLM provider
              returns them. If a downstream tool depends on processing order
              (e.g. you stash results that another node reads sorted), stay
              in Sequential.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

interface DerivedItemSchemaDisplayProps {
  collection: string
  derived: ReturnType<typeof useDerivedItemSchema>
}

function DerivedItemSchemaDisplay({
  collection,
  derived,
}: DerivedItemSchemaDisplayProps) {
  if (!collection) {
    return (
      <div className="rounded border border-dashed border-border bg-bg-muted/40 px-3 py-3 text-xs text-text-muted">
        Set a Collection name first.
      </div>
    )
  }
  if (!derived) {
    return (
      <div className="rounded border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] text-warning leading-snug">
        No upstream AI Agent node stashes to{' '}
        <span className="font-mono">{collection}</span>. Save the producer node
        first (configure its Stash records section), or fix the collection
        name to match.
      </div>
    )
  }
  if (derived.fields.length === 0) {
    return (
      <div className="rounded border border-dashed border-border bg-bg-muted/40 px-3 py-3 text-[11px] text-text-muted leading-snug">
        Producer node{' '}
        <span className="font-mono text-text-primary">
          {derived.producerName}
        </span>{' '}
        has no record fields declared yet. Add them in its Stash records
        config — they'll show up here automatically.
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] text-text-muted leading-snug">
        Derived from{' '}
        <span className="font-mono text-text-primary">
          {derived.producerName}
        </span>{' '}
        ({derived.fields.length}{' '}
        {derived.fields.length === 1 ? 'field' : 'fields'})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {derived.fields.map((field) => (
          <span
            key={field.name}
            className="inline-flex items-center gap-1 rounded bg-bg-muted px-2 py-0.5 text-[11px] font-mono text-text-primary"
            title={field.nullable ? `${field.type} (nullable)` : field.type}
          >
            <span>{field.name}</span>
            <span className="text-text-muted">:</span>
            <span className="text-text-muted">{field.type}</span>
            {field.nullable && (
              <span className="text-text-muted">?</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
