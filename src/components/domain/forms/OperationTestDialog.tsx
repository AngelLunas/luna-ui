import * as React from 'react'
import { Play } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { OperationTestResult } from '../../../types/connector'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { MethodBadge } from '../primitives/MethodBadge'
import { JsonEditor } from './JsonEditor'

export interface OperationTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  operation: {
    name: string
    method: string
    path: string
    inputSchema: Record<string, unknown>
  }
  /**
   * Called when the user hits Run. Should return the test result so the dialog
   * can append it to its internal history. Non-2xx responses come back as a
   * resolved `OperationTestResult` with `ok=false` — still worth displaying.
   * Reject only on unexpected client/transport failures.
   */
  onRun: (input: Record<string, unknown>) => Promise<OperationTestResult>
  /** Permanent banner across the dialog (e.g. registry not wired → 503). */
  unavailable?: string | null
}

interface HistoryEntry {
  id: string
  input: Record<string, unknown>
  result: OperationTestResult
  ranAt: string
}

function statusTone(result: OperationTestResult): string {
  if (result.statusCode === null) return 'bg-danger/15 text-danger border-danger/40'
  if (result.statusCode >= 200 && result.statusCode < 300)
    return 'bg-success/15 text-success border-success/40'
  if (result.statusCode >= 400 && result.statusCode < 500)
    return 'bg-warning/15 text-warning border-warning/40'
  return 'bg-danger/15 text-danger border-danger/40'
}

function statusLabel(result: OperationTestResult): string {
  if (result.statusCode === null) return 'Transport error'
  return `${result.statusCode}`
}

/**
 * Derive a starter object for the input editor from a JSON Schema:
 * one entry per top-level property, required first, values null/''/defaults.
 */
export function buildInputSkeleton(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const props = (schema as { properties?: unknown }).properties
  if (!props || typeof props !== 'object' || Array.isArray(props)) return {}
  const propMap = props as Record<string, unknown>
  const required = (schema as { required?: unknown }).required
  const requiredList: string[] = Array.isArray(required)
    ? (required as unknown[]).filter((s): s is string => typeof s === 'string')
    : []
  const keys = Object.keys(propMap)
  const ordered = [
    ...requiredList.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !requiredList.includes(k)),
  ]
  const out: Record<string, unknown> = {}
  for (const k of ordered) {
    const def = propMap[k] as { type?: unknown; default?: unknown }
    if (def && 'default' in def) {
      out[k] = def.default as unknown
      continue
    }
    const t = def?.type
    if (t === 'string') out[k] = ''
    else if (t === 'integer' || t === 'number') out[k] = 0
    else if (t === 'boolean') out[k] = false
    else if (t === 'array') out[k] = []
    else if (t === 'object') out[k] = {}
    else out[k] = null
  }
  return out
}

function describeProperties(
  schema: Record<string, unknown>,
): { name: string; type: string; required: boolean; description?: string }[] {
  const props = (schema as { properties?: unknown }).properties
  if (!props || typeof props !== 'object' || Array.isArray(props)) return []
  const propMap = props as Record<string, unknown>
  const required = (schema as { required?: unknown }).required
  const reqSet = new Set(
    Array.isArray(required)
      ? (required as unknown[]).filter((s): s is string => typeof s === 'string')
      : [],
  )
  return Object.entries(propMap).map(([name, def]) => {
    const d = def as { type?: unknown; description?: unknown }
    return {
      name,
      type: typeof d.type === 'string' ? d.type : 'any',
      required: reqSet.has(name),
      description:
        typeof d.description === 'string' ? d.description : undefined,
    }
  })
}

export function OperationTestDialog({
  open,
  onOpenChange,
  operation,
  onRun,
  unavailable,
}: OperationTestDialogProps) {
  const [inputText, setInputText] = React.useState('')
  const [inputError, setInputError] = React.useState<string | null>(null)
  const [running, setRunning] = React.useState(false)
  const [history, setHistory] = React.useState<HistoryEntry[]>([])

  // Reset input + history each time the dialog opens against this operation.
  React.useEffect(() => {
    if (!open) return
    const skeleton = buildInputSkeleton(operation.inputSchema)
    setInputText(JSON.stringify(skeleton, null, 2))
    setInputError(null)
    setHistory([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, operation.name])

  const schemaProps = React.useMemo(
    () => describeProperties(operation.inputSchema),
    [operation.inputSchema],
  )

  async function handleRun() {
    let parsed: Record<string, unknown>
    try {
      const v = inputText.trim() === '' ? {} : JSON.parse(inputText)
      if (typeof v !== 'object' || v === null || Array.isArray(v)) {
        setInputError('Input must be a JSON object.')
        return
      }
      parsed = v as Record<string, unknown>
    } catch (e) {
      setInputError((e as Error).message)
      return
    }
    setInputError(null)
    setRunning(true)
    try {
      const result = await onRun(parsed)
      setHistory((h) => [
        ...h,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          input: parsed,
          result,
          ranAt: new Date().toISOString(),
        },
      ])
    } catch (e) {
      setInputError((e as Error).message || 'Test run failed.')
    } finally {
      setRunning(false)
    }
  }

  const current = history[history.length - 1]
  const past = history.slice(0, -1).reverse()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Test operation:</span>
            <span className="font-mono">{operation.name}</span>
            <MethodBadge method={operation.method} />
            <span className="font-mono text-xs text-text-muted truncate">
              {operation.path}
            </span>
          </DialogTitle>
        </DialogHeader>

        {unavailable && (
          <div className="rounded border border-warning bg-warning/10 px-3 py-2 text-xs text-warning">
            {unavailable}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="text-xs uppercase tracking-wide text-text-muted">
              Input
            </div>
            <JsonEditor
              value={inputText}
              onChange={(v) => setInputText(v)}
              height={260}
            />
            {inputError && (
              <p className="text-xs text-danger" role="alert">
                {inputError}
              </p>
            )}
            {schemaProps.length > 0 && (
              <div className="rounded border border-border p-2">
                <div className="text-[10px] uppercase tracking-wide text-text-muted mb-1">
                  Schema
                </div>
                <ul className="space-y-0.5 text-xs">
                  {schemaProps.map((p) => (
                    <li key={p.name} className="text-text-muted">
                      <span className="font-mono text-text-primary">
                        {p.name}
                      </span>
                      <span> ({p.type}, </span>
                      <span className={p.required ? 'text-warning' : ''}>
                        {p.required ? 'required' : 'optional'}
                      </span>
                      <span>)</span>
                      {p.description && (
                        <span className="text-text-muted">
                          {' '}
                          — {p.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                onClick={() => void handleRun()}
                disabled={running || Boolean(unavailable)}
              >
                <Play size={14} />
                {running ? 'Running…' : 'Run'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={running}
              >
                Close
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-0">
            <div className="text-xs uppercase tracking-wide text-text-muted">
              Result
            </div>
            {!current && !running && (
              <div className="flex-1 flex items-center justify-center rounded border border-dashed border-border p-8 text-xs text-text-muted">
                No runs yet — hit Run to fire the operation.
              </div>
            )}
            {running && !current && (
              <div className="flex-1 flex items-center justify-center rounded border border-border p-8 text-xs text-text-muted animate-pulse">
                Calling operation…
              </div>
            )}
            {current && (
              <ResultPanel result={current.result} loading={running} />
            )}

            {past.length > 0 && (
              <div className="flex flex-col gap-2 mt-3">
                <div className="text-[10px] uppercase tracking-wide text-text-muted">
                  Past runs
                </div>
                <div className="flex flex-col gap-2 max-h-48 overflow-auto">
                  {past.map((h) => (
                    <PastRunRow key={h.id} entry={h} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ResultPanel({
  result,
  loading,
}: {
  result: OperationTestResult
  loading: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded border border-border bg-bg/40 p-2',
        loading && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold',
            statusTone(result),
          )}
        >
          ● {statusLabel(result)}
        </span>
        <span className="text-[11px] text-text-muted">
          {Math.round(result.latencyMs)} ms
        </span>
      </div>
      <div className="font-mono text-[11px] text-text-muted truncate">
        {result.requestMethod} {result.requestUrl}
      </div>
      {result.error ? (
        <pre className="rounded border border-danger/40 bg-danger/5 p-2 text-xs text-danger whitespace-pre-wrap">
          {result.error}
        </pre>
      ) : (
        <pre className="rounded border border-border bg-bg p-2 text-xs text-text-primary overflow-auto max-h-72 whitespace-pre-wrap">
          {JSON.stringify(result.response, null, 2)}
        </pre>
      )}
    </div>
  )
}

function PastRunRow({ entry }: { entry: HistoryEntry }) {
  const [open, setOpen] = React.useState(false)
  const r = entry.result
  return (
    <div className="rounded border border-border bg-bg/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
      >
        <span
          className={cn(
            'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold',
            statusTone(r),
          )}
        >
          {statusLabel(r)}
        </span>
        <span className="text-[10px] text-text-muted">
          {Math.round(r.latencyMs)} ms
        </span>
        <span className="text-[10px] text-text-muted">
          {new Date(entry.ranAt).toLocaleTimeString()}
        </span>
      </button>
      {open && (
        <div className="border-t border-border p-2 space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            Input
          </div>
          <pre className="rounded border border-border bg-bg p-2 text-[11px] text-text-primary overflow-auto max-h-40 whitespace-pre-wrap">
            {JSON.stringify(entry.input, null, 2)}
          </pre>
          <div className="text-[10px] uppercase tracking-wide text-text-muted">
            Response
          </div>
          <pre className="rounded border border-border bg-bg p-2 text-[11px] text-text-primary overflow-auto max-h-40 whitespace-pre-wrap">
            {r.error ? r.error : JSON.stringify(r.response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
