import { cn } from '../../../lib/utils'
import { JsonEditor } from './JsonEditor'
import { ParamChipPalette } from './ParamChipPalette'

export interface FixedBodyEditorProps {
  /** Raw JSON text (controlled). */
  value: string
  onChange: (text: string) => void
  /** Parameter names available for `{param}` substitution. */
  paramNames: string[]
  /** Live JSON parse error, surfaced under the editor. */
  error?: string | null
  className?: string
}

/**
 * Monaco-backed JSON editor for the operation body template, paired with
 * a chip palette that appends `{param}` references to the text.
 *
 * Insertion is intentionally append-only — Monaco's cursor API would
 * require exposing the editor instance through the JsonEditor wrapper,
 * which leaks Monaco types into the public surface. Appending is the
 * pragmatic compromise; users can drag the placeholder around afterwards.
 */
export function FixedBodyEditor({
  value,
  onChange,
  paramNames,
  error,
  className,
}: FixedBodyEditorProps) {
  function insertParam(name: string) {
    const placeholder = `"{${name}}"`
    // Append on its own line for readability when the buffer already has
    // content. Empty buffer → start with a fresh object scaffold so the
    // user sees a working starting point.
    if (!value.trim()) {
      onChange(`{\n  "${name}": ${placeholder}\n}`)
      return
    }
    const sep = value.endsWith('\n') ? '' : '\n'
    onChange(`${value}${sep}${placeholder}`)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <JsonEditor
        value={value}
        onChange={(v) => onChange(v)}
        height={180}
      />
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-text-muted">
          {'`{param}`'} placeholders interpolate from input at call time. Whole-value
          placeholders preserve the typed value (numbers stay numbers).
        </p>
        <ParamChipPalette
          paramNames={paramNames}
          onInsert={insertParam}
          label="Insert"
        />
      </div>
    </div>
  )
}
