import { cn } from '../../../lib/utils'

export interface MethodBadgeProps {
  method: string
  className?: string
}

const METHOD_TONES: Record<string, string> = {
  GET: 'bg-accent/15 text-accent border-accent/30',
  POST: 'bg-success/15 text-success border-success/30',
  PUT: 'bg-warning/15 text-warning border-warning/30',
  PATCH: 'bg-warning/15 text-warning border-warning/30',
  DELETE: 'bg-danger/15 text-danger border-danger/30',
}

export function MethodBadge({ method, className }: MethodBadgeProps) {
  const upper = method.toUpperCase()
  const tone = METHOD_TONES[upper] ?? 'bg-surface text-text-muted border-border'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide',
        tone,
        className,
      )}
    >
      {upper}
    </span>
  )
}
