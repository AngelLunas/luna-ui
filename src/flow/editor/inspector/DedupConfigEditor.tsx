import { ShieldCheck } from 'lucide-react'

import { FormField } from '../../../components/domain/primitives/FormField'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import type {
  FlowEditorDedupChecker,
  FlowEditorDedupField,
} from '../FlowEditor'
import {
  IterationCarryType,
  type IterationCarryField,
  type StashDedupConfig,
} from '../../core/types'

const NONE_VALUE = '__none__'

export interface DedupConfigEditorProps {
  value: StashDedupConfig | undefined
  onChange: (next: StashDedupConfig | undefined) => void
  /** Checkers the host has registered (from GET /dedup-checkers, via
   * FlowEditorCatalogs.dedupCheckers). Empty = no checkers available,
   * the parent should hide this section entirely. */
  availableCheckers: FlowEditorDedupChecker[]
  /** Record schema declared above in the same stash block — the only
   * fields a checker can be mapped to. Empty = the user needs to add
   * record fields first; we render an explanatory placeholder
   * instead of an unusable mapping table. */
  recordSchema: IterationCarryField[]
}

/**
 * Inspector subsection for ``node.config.stash.dedup``. UX goals:
 *
 *   - **One dropdown to opt in.** Picking a checker reveals the rest;
 *     picking "(no dedup)" wipes the config (we emit ``undefined`` so
 *     the backend resolver returns None and the runtime skips the
 *     whole dedup branch — no half-set state).
 *   - **One row per checker-required field.** No JSON to hand-edit,
 *     no template strings. Each row says "the checker needs X — point
 *     at one of your record fields". The right-hand dropdown lists
 *     only fields from the record_schema, filtered to compatible
 *     types so a string-typed checker field can't be wired to an
 *     object record field.
 *   - **Optional fields are visibly optional.** A "(optional)" badge
 *     and a "(skip)" sentinel value make it clear the user can leave
 *     them blank without breaking anything — used for things like a
 *     semantic-fingerprint-only field that sharpens dedup but isn't
 *     required for the cheap exact-match path.
 *
 * Errors are not blocking at edit time; the backend resolver raises a
 * NodeExecutionError at run time if a required field is unmapped. We
 * still surface inline hints for the common cases (no record fields
 * yet, type mismatch picked manually) so the user catches them before
 * a save attempt.
 */
export function DedupConfigEditor({
  value,
  onChange,
  availableCheckers,
  recordSchema,
}: DedupConfigEditorProps) {
  if (availableCheckers.length === 0) return null

  const selectedName = value?.checker ?? ''
  const selectedChecker = availableCheckers.find(
    (c) => c.name === selectedName,
  )

  function pickChecker(name: string) {
    if (name === NONE_VALUE || name === '') {
      // Emitting undefined drops the key entirely — clean state, no
      // orphaned `fields` from a previous checker.
      onChange(undefined)
      return
    }
    // Wipe the previous field map so we don't carry mappings whose
    // canonical names don't exist on the new checker.
    onChange({ checker: name, fields: {} })
  }

  function patchField(canonical: string, recordField: string) {
    const nextFields = { ...(value?.fields ?? {}) }
    if (!recordField) {
      delete nextFields[canonical]
    } else {
      nextFields[canonical] = recordField
    }
    onChange({
      checker: selectedName,
      fields: nextFields,
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-bg/40 p-3">
      <div className="flex items-start gap-2">
        <ShieldCheck
          size={14}
          className="mt-0.5 text-text-muted shrink-0"
          aria-hidden
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-text-primary">
            Reject duplicates
          </span>
          <span className="text-[11px] text-text-muted leading-snug">
            Records that already exist in the chosen store are rejected
            before they reach the scratchpad. The agent sees a
            <span className="font-mono"> duplicates </span> array and is
            told to pick another candidate — these rejections do NOT
            count against its iteration quota.
          </span>
        </div>
      </div>

      <FormField label="Check against">
        {/* Trigger + items stay single-line on purpose: Radix copies the
         * SelectItem's children into the trigger when an option is picked,
         * so a multi-line block here would overflow the trigger box.
         * The description below renders reactively from the selected
         * checker — same information, lives outside the Select. */}
        <div className="flex flex-col gap-1.5">
          <Select
            value={selectedName || NONE_VALUE}
            onValueChange={pickChecker}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>
                <span className="text-text-muted italic">(no dedup)</span>
              </SelectItem>
              {availableCheckers.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.label || c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedChecker?.description && (
            <span className="text-[11px] text-text-muted leading-snug px-0.5">
              {selectedChecker.description}
            </span>
          )}
        </div>
      </FormField>

      {selectedChecker && (
        <FieldMappingTable
          checker={selectedChecker}
          recordSchema={recordSchema}
          fields={value?.fields ?? {}}
          onPatch={patchField}
        />
      )}
    </div>
  )
}

interface FieldMappingTableProps {
  checker: FlowEditorDedupChecker
  recordSchema: IterationCarryField[]
  fields: Record<string, string>
  onPatch: (canonical: string, recordField: string) => void
}

function FieldMappingTable({
  checker,
  recordSchema,
  fields,
  onPatch,
}: FieldMappingTableProps) {
  if (recordSchema.length === 0) {
    return (
      <div className="rounded border border-dashed border-border bg-bg-muted/40 px-3 py-3 text-[11px] text-text-muted leading-snug">
        Add at least one field to <span className="font-semibold">Record schema</span>{' '}
        above before mapping it here. The dedup checker reads its lookup
        fields from each record the agent produces.
      </div>
    )
  }

  return (
    <FormField
      label="Field mapping"
      hint={
        "For each field the checker needs, point at the record field that " +
        "carries that value. Optional fields can be left blank — the checker " +
        "will simply skip them for that record."
      }
    >
      <div className="flex flex-col gap-2">
        <FieldMappingHeader />
        {checker.required_fields.map((spec) => (
          <FieldMappingRow
            key={spec.name}
            spec={spec}
            recordSchema={recordSchema}
            value={fields[spec.name] ?? ''}
            onChange={(v) => onPatch(spec.name, v)}
          />
        ))}
      </div>
    </FormField>
  )
}

function FieldMappingHeader() {
  return (
    <div className="grid grid-cols-[1.2fr_auto_1.5fr] gap-2 px-1 text-[10px] uppercase tracking-wide text-text-muted">
      <span>Checker field</span>
      <span aria-hidden />
      <span>Record field</span>
    </div>
  )
}

interface FieldMappingRowProps {
  spec: FlowEditorDedupField
  recordSchema: IterationCarryField[]
  value: string
  onChange: (recordField: string) => void
}

function FieldMappingRow({
  spec,
  recordSchema,
  value,
  onChange,
}: FieldMappingRowProps) {
  const compatible = recordSchema.filter((f) =>
    isCompatible(spec.type, f.type),
  )
  const compatibleNames = new Set(compatible.map((f) => f.name))
  // If the user previously mapped to a field that's been deleted from
  // the record schema, keep the orphan visible so they can see + fix
  // it instead of silently losing it.
  const orphan =
    value && !compatibleNames.has(value)
      ? { name: value, type: 'string' as const, nullable: false, default: '' }
      : null
  const options = orphan ? [...compatible, orphan] : compatible
  const placeholderLabel = spec.optional ? '(skip)' : 'pick a record field'

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[1.2fr_auto_1.5fr] gap-2 items-center">
        <div className="flex flex-col">
          <span className="text-xs font-mono text-text-primary leading-tight">
            {spec.name}
            {spec.optional && (
              <span className="ml-1.5 text-[10px] text-text-muted italic font-sans">
                (optional)
              </span>
            )}
          </span>
          <span className="text-[10px] text-text-muted">{spec.type}</span>
        </div>
        <span className="text-text-muted text-xs" aria-hidden>
          ←
        </span>
        <Select
          value={value || NONE_VALUE}
          onValueChange={(v) => onChange(v === NONE_VALUE ? '' : v)}
        >
          <SelectTrigger className="text-xs">
            <SelectValue placeholder={placeholderLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>
              <span className="text-text-muted italic">{placeholderLabel}</span>
            </SelectItem>
            {options.map((f) => (
              <SelectItem key={f.name} value={f.name}>
                <span className="flex items-center gap-2">
                  <span className="text-xs font-mono">{f.name}</span>
                  <span className="text-[10px] text-text-muted">
                    {f.type}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {spec.description && (
        <span className="px-1 text-[10px] text-text-muted leading-snug">
          {spec.description}
        </span>
      )}
      {orphan && (
        <span className="px-1 text-[10px] text-warning">
          Field <span className="font-mono">{orphan.name}</span> no longer
          exists in the record schema — pick a replacement.
        </span>
      )}
    </div>
  )
}

/**
 * Loose compatibility check between a checker-declared field type
 * (subset: string / integer / number / boolean / array) and a record
 * field type (IterationCarryType). Permissive on purpose:
 *
 *   - `string` accepts only string record fields.
 *   - numeric checker fields accept integer or number record fields.
 *   - `boolean` accepts only boolean.
 *   - `array` accepts only array.
 *
 * This is editor-side scaffolding to keep the dropdowns clean — the
 * authoritative validation happens at run time in the bound checker
 * (it'll surface a tool error if the projected value is the wrong type).
 */
function isCompatible(
  checkerType: string,
  recordType: IterationCarryType,
): boolean {
  switch (checkerType) {
    case 'string':
      return recordType === IterationCarryType.String
    case 'integer':
      return recordType === IterationCarryType.Integer
    case 'number':
      return (
        recordType === IterationCarryType.Number ||
        recordType === IterationCarryType.Integer
      )
    case 'boolean':
      return recordType === IterationCarryType.Boolean
    case 'array':
      return recordType === IterationCarryType.Array
    default:
      return true
  }
}
