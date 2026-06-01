import * as React from 'react'
import { Badge } from '../../ui/badge'
import { Checkbox } from '../../ui/checkbox'
import { cn } from '../../../lib/utils'

export interface PickerSystemTool {
  /** Catalog tool name — also the key persisted in AgentSystemToolGrant. */
  name: string
  description?: string
}

export interface SystemToolsPickerProps {
  tools: PickerSystemTool[]
  selectedNames: string[]
  onChange: (names: string[]) => void
  emptyMessage?: React.ReactNode
  className?: string
}

/**
 * Flat checkbox list of catalog system tools (stash_records, etc).
 * Parallels OperationsPicker but without connector grouping — system
 * tools have no hierarchy. Names not present in `tools` but selected
 * (dangling grants from a tool that was removed from the registry)
 * are rendered at the bottom with a "missing" badge so the user can
 * notice and clean them up.
 */
export function SystemToolsPicker({
  tools,
  selectedNames,
  onChange,
  emptyMessage = 'No system tools registered.',
  className,
}: SystemToolsPickerProps) {
  const selected = React.useMemo(() => new Set(selectedNames), [selectedNames])
  const knownNames = React.useMemo(() => new Set(tools.map((t) => t.name)), [tools])
  // Selected names that aren't in the catalog — surface them so the
  // user can prune. Don't drop silently: that hides a real problem.
  const dangling = React.useMemo(
    () => selectedNames.filter((n) => !knownNames.has(n)),
    [selectedNames, knownNames],
  )

  function toggle(name: string) {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onChange([...next])
  }

  if (tools.length === 0 && dangling.length === 0) {
    return (
      <div className={cn('text-xs text-text-muted italic', className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      className={cn('rounded border border-border bg-bg/40 p-2 flex flex-col gap-1', className)}
    >
      {tools.map((tool) => (
        <Checkbox
          key={tool.name}
          checked={selected.has(tool.name)}
          onCheckedChange={() => toggle(tool.name)}
          label={
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-mono">{tool.name}</span>
            </span>
          }
          description={tool.description}
        />
      ))}
      {dangling.map((name) => (
        <Checkbox
          key={`dangling:${name}`}
          checked
          onCheckedChange={() => toggle(name)}
          label={
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-mono">{name}</span>
              <Badge variant="muted" className="text-[10px]">
                missing from registry
              </Badge>
            </span>
          }
          description="This grant references a tool that is no longer registered. Toggle off to clean up."
        />
      ))}
    </div>
  )
}
