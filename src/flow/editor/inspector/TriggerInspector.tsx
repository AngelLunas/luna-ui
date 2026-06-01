import { useMemo } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { FormField } from '../../../components/domain/primitives/FormField'
import { SchedulePicker } from '../../../components/domain/forms/SchedulePicker'
import {
  PerRuleInputsEditor,
  type PerRuleInputsRow,
} from '../../../components/domain/forms/PerRuleInputsEditor'
import {
  backendToRule,
  configToBackend,
  describeRule,
} from '../../../helpers/schedule'
import type {
  ScheduleConfig,
  ScheduleRuleBackend,
} from '../../../types/schedule'
import {
  FlowTriggerKind,
  type FlowScheduleRule,
} from '../../core/types'
import { useFlowEditor, useFlowEditorActions } from '../store'

export interface TriggerInspectorProps {
  nodeId: string
}

export function TriggerInspector({ nodeId: _nodeId }: TriggerInspectorProps) {
  const trigger = useFlowEditor((s) => s.trigger)
  const declaredInputs = useFlowEditor((s) => s.inputs)
  const actions = useFlowEditorActions()

  const kind = trigger?.type ?? FlowTriggerKind.Manual
  const schedules = useMemo<FlowScheduleRule[]>(
    () => (trigger?.schedules ?? []) as FlowScheduleRule[],
    [trigger?.schedules],
  )
  const scheduleConfig: ScheduleConfig = useMemo(
    () => ({
      rules: schedules.map((s) => backendToRule(s as ScheduleRuleBackend)),
    }),
    [schedules],
  )

  const perRuleRows: PerRuleInputsRow[] = useMemo(
    () =>
      schedules.map((rule, idx) => ({
        label: scheduleConfig.rules[idx]
          ? describeRule(scheduleConfig.rules[idx])
          : rule.cron,
        inputs: rule.inputs ?? {},
      })),
    [schedules, scheduleConfig.rules],
  )

  function setKind(next: FlowTriggerKind) {
    actions.setTrigger({
      type: next,
      cron: trigger?.cron ?? null,
      schedules: trigger?.schedules,
      config: trigger?.config,
    })
  }

  function setSchedules(value: ScheduleConfig) {
    const { schedules: nextBackend, cron } = configToBackend(value)
    // Preserve per-rule ``inputs`` across pattern edits: configToBackend
    // rebuilds cron/tz/value only, so we merge inputs by index from the
    // previous state onto the new rules.
    const previous = (trigger?.schedules ?? []) as FlowScheduleRule[]
    const merged: FlowScheduleRule[] = nextBackend.map((r, i) => ({
      ...r,
      inputs: previous[i]?.inputs ?? {},
    }))
    actions.setTrigger({
      type: FlowTriggerKind.Schedule,
      cron,
      schedules: merged,
      config: trigger?.config,
    })
  }

  function setRuleInputs(idx: number, next: Record<string, unknown>) {
    const merged = schedules.map((r, i) =>
      i === idx ? { ...r, inputs: next } : r,
    )
    actions.setTrigger({
      type: trigger?.type ?? FlowTriggerKind.Schedule,
      cron: trigger?.cron ?? null,
      schedules: merged,
      config: trigger?.config,
    })
  }

  return (
    <>
      <FormField label="Kind">
        <Select value={kind} onValueChange={(v) => setKind(v as FlowTriggerKind)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FlowTriggerKind.Manual}>Manual</SelectItem>
            <SelectItem value={FlowTriggerKind.Schedule}>Schedule</SelectItem>
            <SelectItem value={FlowTriggerKind.Webhook}>Webhook</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {kind === FlowTriggerKind.Schedule && (
        <>
          <FormField label="Schedules">
            <SchedulePicker value={scheduleConfig} onChange={setSchedules} />
          </FormField>

          <FormField
            label="Per-rule inputs"
            hint="Each rule can override flow-level input defaults. Empty fields fall back to the saved default."
          >
            <PerRuleInputsEditor
              rules={perRuleRows}
              declaredInputs={declaredInputs}
              onChange={setRuleInputs}
            />
          </FormField>
        </>
      )}

      {kind === FlowTriggerKind.Webhook && (
        <p className="text-xs text-text-muted">
          Webhook trigger details are configured server-side; nothing else to
          edit here.
        </p>
      )}
    </>
  )
}
