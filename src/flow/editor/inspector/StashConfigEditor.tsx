import { Input } from '../../../components/ui/input'
import { FormField } from '../../../components/domain/primitives/FormField'
import type {
  IterationCarryField,
  StashConfig,
  StashDedupConfig,
} from '../../core/types'
import type { FlowEditorDedupChecker } from '../FlowEditor'
import { DedupConfigEditor } from './DedupConfigEditor'
import { FieldSchemaEditor } from './FieldSchemaEditor'

export interface StashConfigEditorProps {
  value: StashConfig
  onChange: (next: StashConfig) => void
  /** Catalog of dedup checkers the host has registered. When empty
   * (or undefined) the dedup section hides entirely — flows can still
   * stash without dedup, same as before. */
  availableDedupCheckers?: FlowEditorDedupChecker[]
}

/**
 * Inspector section for ``node.config.stash``. Surfaced only when the
 * selected agent has ``stash_records`` granted (rule R2 in the
 * AiAgentInspector), so the section's presence already means "this
 * agent can call stash_records — declare what it should send".
 *
 * Two fields:
 *   - **collection_hint**: just an editor reminder. The actual
 *     collection name is hardcoded in the agent's prompt (it's the
 *     agent who passes it to stash_records). The hint helps the user
 *     remember to keep both sides in sync; no validation.
 *   - **record_schema**: a typed field list reused via
 *     FieldSchemaEditor. The runtime injects this into the
 *     stash_records handler's call_context; records that don't match
 *     come back as a tool_result error the agent can self-correct on.
 */
export function StashConfigEditor({
  value,
  onChange,
  availableDedupCheckers,
}: StashConfigEditorProps) {
  function patch(partial: Partial<StashConfig>) {
    onChange({ ...value, ...partial })
  }

  function updateSchema(next: IterationCarryField[]) {
    patch({ record_schema: next })
  }

  function updateDedup(next: StashDedupConfig | undefined) {
    // Drop the key entirely when the editor clears it so the saved
    // flow definition stays clean (no `dedup: undefined` noise) and
    // the backend resolver returns None cleanly.
    if (next === undefined) {
      const { dedup: _omit, ...rest } = value
      onChange(rest)
      return
    }
    patch({ dedup: next })
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-bg-muted/20 p-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-text-primary">
          Stash records
        </span>
        <span className="text-[11px] text-text-muted leading-snug">
          The agent can call <span className="font-mono">stash_records</span> to
          stage normalized data for a downstream node. Declare the shape each
          record must match — the runtime validates every batch before writing.
        </span>
      </div>

      <FormField
        label="Collection hint"
        hint="The actual collection name is hardcoded in the prompt where you tell the agent to call stash_records (e.g. collection='pending_review'). This field is a reminder so the same string ends up on the consumer side."
      >
        <Input
          value={value.collection_hint ?? ''}
          onChange={(e) => patch({ collection_hint: e.target.value })}
          placeholder="pending_review"
          className="text-xs font-mono"
        />
      </FormField>

      <FormField
        label="Record schema"
        hint="Each record the agent passes to stash_records must match this shape. Missing fields, null where non-nullable, or wrong types come back as tool errors so the agent can fix and retry."
      >
        <FieldSchemaEditor
          value={value.record_schema ?? []}
          onChange={updateSchema}
          emptyHint={
            <>
              No record fields declared yet. Add the fields each record
              the agent passes to{' '}
              <span className="font-mono">stash_records</span> must have.
              The runtime validates every batch before writing.
            </>
          }
          presets={[]}
        />
      </FormField>

      <DedupConfigEditor
        value={value.dedup}
        onChange={updateDedup}
        availableCheckers={availableDedupCheckers ?? []}
        recordSchema={value.record_schema ?? []}
      />
    </div>
  )
}
