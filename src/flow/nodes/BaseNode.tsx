import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import type { RFNode } from '../core/adapter'

export interface BaseNodeProps {
  node: NodeProps<RFNode>
  icon: LucideIcon
  label: string
  accentClassName: string
  children?: ReactNode
  showSourceHandle?: boolean
  showTargetHandle?: boolean
}

export function BaseNode({
  node,
  icon: Icon,
  label,
  accentClassName,
  children,
  showSourceHandle = true,
  showTargetHandle = true,
}: BaseNodeProps) {
  const { data, selected } = node
  const displayName = data.node.name?.trim() || data.node.id

  return (
    <div
      className={cn(
        'group relative min-w-[200px] max-w-[260px] rounded-lg border bg-white shadow-sm transition',
        'dark:border-zinc-700 dark:bg-zinc-900',
        selected
          ? 'border-zinc-900 shadow-md dark:border-zinc-100'
          : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500',
      )}
    >
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2 !w-2 !border-none !bg-zinc-400"
        />
      )}

      <div className={cn('flex items-center gap-2 rounded-t-lg px-3 py-2', accentClassName)}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        {data.isEntryPoint && (
          <span className="ml-auto rounded-full bg-white/40 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider">
            entry
          </span>
        )}
      </div>

      <div className="px-3 py-2">
        <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {displayName}
        </div>
        {children && (
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{children}</div>
        )}
      </div>

      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2 !w-2 !border-none !bg-zinc-400"
        />
      )}
    </div>
  )
}
