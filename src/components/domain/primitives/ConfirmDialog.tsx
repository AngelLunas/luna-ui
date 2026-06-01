import * as React from 'react'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  /** Optional error message shown above the buttons (e.g. server-side 409). */
  error?: string | null
  confirmLabel?: string
  cancelLabel?: string
  /** Visual treatment of the confirm button. */
  variant?: 'default' | 'danger'
  /** Disables both buttons and shows "…" on the confirm label. */
  busy?: boolean
  /**
   * Called when the user confirms. May be async — keep `busy` true while it
   * resolves so the dialog can stay open if the call fails (set `error` then).
   */
  onConfirm: () => void | Promise<void>
  /** Extra content rendered between the description and the error/footer. */
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  error,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  busy = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'default'}
            onClick={() => void onConfirm()}
            disabled={busy}
          >
            {busy ? '…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
