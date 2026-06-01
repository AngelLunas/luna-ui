import * as React from 'react'
import { cn } from '../../../lib/utils'

export interface PageLayoutProps {
  sidebar: React.ReactNode
  topbar: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageLayout({ sidebar, topbar, children, className }: PageLayoutProps) {
  return (
    <div className={cn('flex h-screen w-screen bg-bg text-text-primary font-sans', className)}>
      {sidebar}
      <div className="flex flex-1 flex-col min-w-0">
        {topbar}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
