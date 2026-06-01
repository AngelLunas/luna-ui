import * as React from 'react'
import { cn } from '../../../lib/utils'
import { Button } from '../../ui/button'

/**
 * Action rendered below the empty-state copy. The simple
 * ``{ label, onClick }`` form renders a default secondary button —
 * keeps the common case one line. Callers that need a custom button
 * (icons, disabled-while-loading, danger variant, etc.) pass a
 * ReactNode and own the rendering.
 */
export type EmptyStateAction =
  | { label: string; onClick: () => void }
  | React.ReactNode

export interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: EmptyStateAction
  className?: string
}

function isLabelAction(
  action: EmptyStateAction,
): action is { label: string; onClick: () => void } {
  return (
    typeof action === 'object' &&
    action !== null &&
    !React.isValidElement(action) &&
    'label' in (action as object) &&
    'onClick' in (action as object)
  )
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded border border-dashed border-border p-12 text-center',
        className,
      )}
    >
      <div className="text-text-muted [&_svg]:h-8 [&_svg]:w-8">{icon}</div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        {description && <p className="text-xs text-text-muted">{description}</p>}
      </div>
      {action !== undefined && action !== null && (
        <div className="mt-2">
          {isLabelAction(action) ? (
            <Button variant="secondary" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : (
            action
          )}
        </div>
      )}
    </div>
  )
}
