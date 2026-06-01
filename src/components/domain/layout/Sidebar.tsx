import * as React from 'react'
import { cn } from '../../../lib/utils'
import { Badge } from '../../ui/badge'

export interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  badge?: string | number
  active?: boolean
  onClick?: () => void
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

export interface SidebarProps {
  logo: React.ReactNode
  sections: NavSection[]
  bottomItems?: NavItem[]
  onNavigate?: (href: string) => void
  className?: string
}

function NavItemButton({
  item,
  onNavigate,
}: {
  item: NavItem
  onNavigate?: (href: string) => void
}) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    item.onClick?.()
    onNavigate?.(item.href)
  }

  return (
    <a
      href={item.href}
      onClick={handleClick}
      className={cn(
        'group flex h-9 items-center gap-3 rounded px-3 text-sm transition-colors',
        '[&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
        item.active
          ? 'bg-accent-subtle text-accent border border-accent-border'
          : 'text-text-muted hover:text-text-primary hover:bg-surface border border-transparent',
      )}
    >
      <span className={cn(item.active ? 'text-accent' : 'text-text-muted group-hover:text-text-primary')}>
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && (
        <Badge variant={item.active ? 'accent' : 'muted'} className="ml-auto">
          {item.badge}
        </Badge>
      )}
    </a>
  )
}

export function Sidebar({
  logo,
  sections,
  bottomItems,
  onNavigate,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full w-60 flex-col border-r border-border bg-bg',
        className,
      )}
    >
      <div className="flex h-14 items-center px-4 border-b border-border">
        {logo}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {sections.map((section, i) => (
          <div key={i} className={cn(i > 0 && 'mt-6')}>
            {section.label && (
              <p className="px-3 mb-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">
                {section.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item, j) => (
                <NavItemButton key={j} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {bottomItems && bottomItems.length > 0 && (
        <div className="border-t border-border p-2">
          <div className="flex flex-col gap-0.5">
            {bottomItems.map((item, i) => (
              <NavItemButton key={i} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
