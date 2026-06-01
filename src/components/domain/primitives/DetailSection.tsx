import { cn } from '../../../lib/utils'

export interface DetailSectionProps {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function DetailSection({ title, action, children, className }: DetailSectionProps) {
  return (
    <section className={cn('rounded border border-border bg-surface', className)}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}
