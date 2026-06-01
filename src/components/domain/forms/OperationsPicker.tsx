import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '../../ui/badge'
import { Checkbox } from '../../ui/checkbox'
import { cn } from '../../../lib/utils'

export interface PickerOperation {
  id: string
  name: string
  description?: string
  method?: string
  path?: string
}

export interface PickerConnector {
  id: string
  name: string
  description?: string
  operations: PickerOperation[]
}

export interface OperationsPickerProps {
  connectors: PickerConnector[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  /** Hides connectors that have zero operations after filter. */
  emptyMessage?: React.ReactNode
  className?: string
  /** Open every connector group by default. */
  defaultExpanded?: boolean
}

/**
 * Generic checkbox tree that lets the user toggle individual operations
 * grouped by connector. Connector-level checkbox is a tri-state:
 * unchecked / indeterminate / checked, and toggling it selects or clears
 * every operation in that group at once.
 */
export function OperationsPicker({
  connectors,
  selectedIds,
  onChange,
  emptyMessage = 'No connectors available.',
  className,
  defaultExpanded = true,
}: OperationsPickerProps) {
  const selected = React.useMemo(() => new Set(selectedIds), [selectedIds])

  function toggleOne(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next])
  }

  function toggleGroup(connector: PickerConnector, allSelected: boolean) {
    const next = new Set(selected)
    if (allSelected) {
      for (const op of connector.operations) next.delete(op.id)
    } else {
      for (const op of connector.operations) next.add(op.id)
    }
    onChange([...next])
  }

  if (connectors.length === 0) {
    return (
      <div className={cn('text-xs text-text-muted italic', className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {connectors.map((connector) => (
        <ConnectorGroup
          key={connector.id}
          connector={connector}
          selected={selected}
          onToggleOne={toggleOne}
          onToggleGroup={toggleGroup}
          defaultExpanded={defaultExpanded}
        />
      ))}
    </div>
  )
}

function ConnectorGroup({
  connector,
  selected,
  onToggleOne,
  onToggleGroup,
  defaultExpanded,
}: {
  connector: PickerConnector
  selected: Set<string>
  onToggleOne: (id: string) => void
  onToggleGroup: (c: PickerConnector, allSelected: boolean) => void
  defaultExpanded: boolean
}) {
  const [open, setOpen] = React.useState(defaultExpanded)
  const total = connector.operations.length
  const selectedCount = connector.operations.filter((o) => selected.has(o.id)).length
  const groupState: boolean | 'indeterminate' =
    selectedCount === 0 ? false : selectedCount === total ? true : 'indeterminate'

  return (
    <div className="rounded border border-border bg-bg/40">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-text-muted hover:text-text-primary"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <Checkbox
          checked={groupState}
          onCheckedChange={() => onToggleGroup(connector, groupState === true)}
          align="center"
          label={
            <span className="flex items-center gap-2">
              <span className="font-medium text-sm">{connector.name}</span>
              <span className="text-[11px] text-text-muted">
                {selectedCount}/{total}
              </span>
            </span>
          }
        />
      </div>
      {open && (
        <div className="pl-8 pr-2 pb-2 flex flex-col gap-1">
          {connector.description && (
            <p className="text-[11px] text-text-muted mb-1">
              {connector.description}
            </p>
          )}
          {connector.operations.length === 0 ? (
            <p className="text-[11px] text-text-muted italic">
              No operations.
            </p>
          ) : (
            connector.operations.map((op) => (
              <Checkbox
                key={op.id}
                checked={selected.has(op.id)}
                onCheckedChange={() => onToggleOne(op.id)}
                label={
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">{op.name}</span>
                    {op.method && (
                      <Badge variant="muted" className="text-[10px] font-mono">
                        {op.method}
                      </Badge>
                    )}
                    {op.path && (
                      <code className="text-[10px] text-text-muted">{op.path}</code>
                    )}
                  </span>
                }
                description={op.description}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
