import { cn } from '../../../lib/utils'
import { PulseIndicator } from '../primitives/PulseIndicator'

export interface StatCardProps {
  label: string
  value: string | number
  change?: string
  accent?: boolean
  live?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  change,
  accent,
  live,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded border p-4',
        accent
          ? 'border-accent-border bg-accent-subtle'
          : 'border-border bg-surface',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-text-muted">{label}</span>
        {live && <PulseIndicator size="sm" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'text-2xl font-semibold tabular-nums',
            accent ? 'text-accent' : 'text-text-primary',
          )}
        >
          {value}
        </span>
        {change && <span className="text-xs text-text-muted">{change}</span>}
      </div>
    </div>
  )
}
