export const FlowStatus = {
  Pending: 'pending',
  Running: 'running',
  Paused: 'paused',
  Completed: 'completed',
  Failed: 'failed',
} as const
export type FlowStatus = typeof FlowStatus[keyof typeof FlowStatus]

export const TriggerType = {
  Manual: 'manual',
  Schedule: 'schedule',
  Webhook: 'webhook',
} as const
export type TriggerType = typeof TriggerType[keyof typeof TriggerType]

export interface Flow {
  id: string
  name: string
  description?: string
  status: FlowStatus
  triggerType: TriggerType
  schedule?: string
  lastRunAt?: string
  lastRunDuration?: string
  nextRunAt?: string
}

/**
 * Wire shape of a flow run as returned by `GET /flows/{flow_id}/runs` and
 * `GET /runs/{id}`. Field names mirror the backend (snake_case) so the UI can
 * consume the API response directly without an adapter.
 */
export interface FlowRun {
  id: string
  flow_id: string
  status: FlowStatus
  trigger: Record<string, unknown>
  state: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  cleared_at: string | null
  created_at: string
}
