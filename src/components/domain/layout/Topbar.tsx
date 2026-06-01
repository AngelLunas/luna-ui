import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function Topbar({ title, subtitle, actions, className }: TopbarProps) {
  return (
    <header
      className={cn(
        'flex h-14 items-center justify-between gap-4 border-b border-border bg-bg px-6',
        className,
      )}
    >
      <div className="flex flex-col min-w-0">
        <h1 className="text-sm font-medium text-text-primary truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-text-muted truncate">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  )
}
