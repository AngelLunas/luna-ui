import { cn } from '../../../lib/utils'

export interface DetailFieldProps {
  label: string
  value?: React.ReactNode
  placeholder?: string
  className?: string
}

export function DetailField({ label, value, placeholder = '—', className }: DetailFieldProps) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-xs text-text-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm text-text-primary">
        {value !== undefined && value !== null && value !== '' ? value : (
          <span className="text-text-muted">{placeholder}</span>
        )}
      </span>
    </div>
  )
}
