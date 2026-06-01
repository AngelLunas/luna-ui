import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import {
  ScheduleMode,
  type ScheduleConfig,
  type ScheduleRule,
} from '../../../types/schedule'
import { defaultRule, describeRule } from '../../../helpers/schedule'
import { Button } from '../../ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { TimePicker } from '../../ui/time-picker'
import { DayOfWeekToggle } from '../../ui/day-of-week-toggle'
import { NumberStepper } from '../../ui/number-stepper'

export interface SchedulePickerProps {
  value: ScheduleConfig
  onChange: (next: ScheduleConfig) => void
  className?: string
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-[11px] uppercase tracking-wider text-text-muted">
        {label}
      </span>
      {children}
    </label>
  )
}

function RuleRow({
  rule,
  onChange,
  onRemove,
}: {
  rule: ScheduleRule
  onChange: (next: ScheduleRule) => void
  onRemove: () => void
}) {
  const setMode = (mode: ScheduleMode) => {
    // Carry forward what makes sense; otherwise reset to defaults for the new
    // mode so the picker doesn't show stale fields the user can't see.
    const fresh = defaultRule(mode)
    onChange({ ...fresh, tz: rule.tz })
  }

  return (
    <div className="rounded border border-border bg-surface p-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Field label="Repeat" className="flex-1">
          <Select
            value={rule.mode}
            onValueChange={(v) => setMode(v as ScheduleMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ScheduleMode.EveryNMinutes}>
                Every N minutes
              </SelectItem>
              <SelectItem value={ScheduleMode.EveryNHours}>
                Every N hours
              </SelectItem>
              <SelectItem value={ScheduleMode.EveryNDays}>
                Every N days at time
              </SelectItem>
              <SelectItem value={ScheduleMode.Weekly}>
                Weekly on days at time
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove rule"
          className="mt-5 text-text-muted hover:text-danger transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {(rule.mode === ScheduleMode.EveryNMinutes ||
        rule.mode === ScheduleMode.EveryNHours) && (
        <Field label={rule.mode === ScheduleMode.EveryNMinutes ? 'Every (minutes)' : 'Every (hours)'}>
          <NumberStepper
            value={rule.everyN ?? 1}
            min={1}
            max={rule.mode === ScheduleMode.EveryNMinutes ? 59 : 23}
            onChange={(n) => onChange({ ...rule, everyN: n })}
            aria-label="Interval"
          />
        </Field>
      )}

      {rule.mode === ScheduleMode.EveryNDays && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Every (days)">
            <NumberStepper
              value={rule.everyN ?? 1}
              min={1}
              max={30}
              onChange={(n) => onChange({ ...rule, everyN: n })}
            />
          </Field>
          <Field label="Time">
            <TimePicker
              value={rule.time ?? '09:00'}
              onChange={(t) => onChange({ ...rule, time: t })}
            />
          </Field>
        </div>
      )}

      {rule.mode === ScheduleMode.Weekly && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Days" className="flex-1">
            <DayOfWeekToggle
              value={rule.daysOfWeek ?? []}
              onChange={(d) => onChange({ ...rule, daysOfWeek: d })}
            />
          </Field>
          <Field label="Time" className="w-32">
            <TimePicker
              value={rule.time ?? '09:00'}
              onChange={(t) => onChange({ ...rule, time: t })}
            />
          </Field>
        </div>
      )}

      <div className="text-xs text-text-muted italic">{describeRule(rule)}</div>
    </div>
  )
}

export function SchedulePicker({ value, onChange, className }: SchedulePickerProps) {
  const updateRule = (idx: number, next: ScheduleRule) => {
    const rules = value.rules.slice()
    rules[idx] = next
    onChange({ rules })
  }
  const removeRule = (idx: number) => {
    onChange({ rules: value.rules.filter((_, i) => i !== idx) })
  }
  const addRule = () => {
    onChange({
      rules: [...value.rules, defaultRule(ScheduleMode.EveryNMinutes)],
    })
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {value.rules.length === 0 && (
        <p className="text-sm text-text-muted">
          No rules — the flow will only run when triggered manually.
        </p>
      )}
      {value.rules.map((r, i) => (
        <RuleRow
          key={i}
          rule={r}
          onChange={(next) => updateRule(i, next)}
          onRemove={() => removeRule(i)}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRule}
        className="self-start"
      >
        <Plus size={14} className="mr-1" />
        Add rule
      </Button>
    </div>
  )
}
