import { cn } from '../../../lib/utils'

export interface ParamChipPaletteProps {
  /** Names of available parameters. */
  paramNames: string[]
  /** Called when the user clicks a chip — the consumer decides how to insert. */
  onInsert: (paramName: string) => void
  /** Optional label rendered before the chips. */
  label?: string
  className?: string
}

/**
 * Horizontal list of clickable parameter chips. Each chip renders as
 * `{name}` so the user sees the exact placeholder text that will be
 * substituted at HTTP time. The consuming component is responsible for
 * actually inserting the placeholder text into its target editor.
 */
export function ParamChipPalette({
  paramNames,
  onInsert,
  label = 'Insert',
  className,
}: ParamChipPaletteProps) {
  if (paramNames.length === 0) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      <span className="text-[10px] uppercase tracking-wide text-text-muted">
        {label}:
      </span>
      {paramNames.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onInsert(name)}
          className="inline-flex items-center rounded border border-accent-border bg-accent-subtle/50 px-1.5 py-0.5 font-mono text-[10px] text-accent hover:bg-accent-subtle transition-colors"
        >
          {`{${name}}`}
        </button>
      ))}
    </div>
  )
}
