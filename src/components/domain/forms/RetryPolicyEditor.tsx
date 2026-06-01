import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { RetryPolicy } from '../../../types/connector'
import { Checkbox } from '../../ui/checkbox'
import { Input } from '../../ui/input'
import { FormField } from '../primitives/FormField'

export interface RetryPolicyEditorProps {
  value: RetryPolicy | null
  onChange: (next: RetryPolicy | null) => void
  className?: string
}

// Tuned to mask 1-2 transient edge failures (~5-15% rate) without noticeable
// latency on the happy path. Matches the backend default in retry.py.
const DEFAULT_POLICY: RetryPolicy = {
  maxAttempts: 3,
  retryOnStatus: [404, 502, 503, 504],
  initialDelayMs: 200,
  multiplier: 3,
  jitter: true,
}

// 401/403 route through the OAuth2 refresh path, not this loop. Backend
// strips them on save anyway; we surface a hint instead of silently dropping.
const AUTH_STATUSES = new Set([401, 403])

function previewSequence(policy: RetryPolicy): string {
  const retries = Math.max(0, policy.maxAttempts - 1)
  if (retries === 0) return 'No retries — single attempt.'
  const delays: string[] = []
  for (let i = 1; i <= retries; i += 1) {
    const ms = Math.round(
      policy.initialDelayMs * Math.pow(policy.multiplier, i - 1),
    )
    delays.push(`${ms}ms`)
  }
  const tail = policy.jitter ? ' (± jitter)' : ''
  return `Retries after: ${delays.join(', ')}${tail}.`
}

export function RetryPolicyEditor({
  value,
  onChange,
  className,
}: RetryPolicyEditorProps) {
  const enabled = value !== null
  const policy = value ?? DEFAULT_POLICY
  const [statusDraft, setStatusDraft] = React.useState('')
  const [statusError, setStatusError] = React.useState<string | null>(null)

  function patch(p: Partial<RetryPolicy>) {
    if (!enabled) return
    onChange({ ...policy, ...p })
  }

  function toggle(on: boolean) {
    onChange(on ? DEFAULT_POLICY : null)
    setStatusDraft('')
    setStatusError(null)
  }

  function addStatus() {
    const raw = statusDraft.trim()
    if (raw === '') return
    const code = Number(raw)
    if (!Number.isInteger(code) || code < 100 || code > 599) {
      setStatusError('Status must be an integer 100-599.')
      return
    }
    if (AUTH_STATUSES.has(code)) {
      setStatusError(
        '401/403 are handled by the OAuth2 refresh path — not configurable here.',
      )
      return
    }
    if (policy.retryOnStatus.includes(code)) {
      setStatusDraft('')
      setStatusError(null)
      return
    }
    patch({ retryOnStatus: [...policy.retryOnStatus, code].sort((a, b) => a - b) })
    setStatusDraft('')
    setStatusError(null)
  }

  function removeStatus(code: number) {
    patch({ retryOnStatus: policy.retryOnStatus.filter((s) => s !== code) })
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Checkbox
        checked={enabled}
        onCheckedChange={toggle}
        label="Enable retry on transient failures"
        description="Useful for upstreams that occasionally return spurious 404s/5xx (CDN/edge flakiness). OAuth2 401/403 are always handled separately by the auth-refresh path."
        align="center"
      />

      {enabled && (
        <div className="rounded border border-border bg-surface/50 p-3 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Max attempts" htmlFor="rp_max_attempts">
              <Input
                id="rp_max_attempts"
                type="number"
                min={1}
                max={10}
                value={policy.maxAttempts}
                onChange={(e) =>
                  patch({ maxAttempts: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </FormField>
            <FormField label="Initial delay (ms)" htmlFor="rp_initial_delay">
              <Input
                id="rp_initial_delay"
                type="number"
                min={0}
                max={30000}
                step={50}
                value={policy.initialDelayMs}
                onChange={(e) =>
                  patch({
                    initialDelayMs: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </FormField>
            <FormField label="Backoff multiplier" htmlFor="rp_multiplier">
              <Input
                id="rp_multiplier"
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={policy.multiplier}
                onChange={(e) =>
                  patch({ multiplier: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </FormField>
            <div className="flex items-end">
              <Checkbox
                checked={policy.jitter}
                onCheckedChange={(j) => patch({ jitter: j })}
                label="Jitter"
                description="Randomize each delay in [0, computed] to avoid lockstep retries."
              />
            </div>
          </div>

          <FormField
            label="Retry on status codes"
            htmlFor="rp_status_input"
            error={statusError ?? undefined}
            hint="Common transient codes: 404 (edge flakiness), 429 (rate limit), 502/503/504 (upstream)."
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {policy.retryOnStatus.map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 rounded border border-border bg-bg px-2 py-0.5 font-mono text-xs text-text-primary"
                >
                  {code}
                  <button
                    type="button"
                    onClick={() => removeStatus(code)}
                    className="text-text-muted hover:text-danger"
                    aria-label={`Remove ${code}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <Input
                id="rp_status_input"
                value={statusDraft}
                onChange={(e) => {
                  setStatusDraft(e.target.value)
                  setStatusError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addStatus()
                  }
                }}
                onBlur={addStatus}
                placeholder="add code"
                className="w-24 font-mono text-xs"
              />
            </div>
          </FormField>

          <p className="text-xs text-text-muted">{previewSequence(policy)}</p>
        </div>
      )}
    </div>
  )
}
