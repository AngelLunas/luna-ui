import {
  ScheduleMode,
  type ScheduleConfig,
  type ScheduleRule,
  type ScheduleRuleBackend,
} from '../types/schedule'

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function defaultTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function defaultRule(mode: ScheduleMode): ScheduleRule {
  const base: ScheduleRule = { mode, tz: defaultTz() }
  switch (mode) {
    case ScheduleMode.EveryNMinutes:
      return { ...base, everyN: 30 }
    case ScheduleMode.EveryNHours:
      return { ...base, everyN: 1 }
    case ScheduleMode.EveryNDays:
      return { ...base, everyN: 1, time: '09:00' }
    case ScheduleMode.Weekly:
      return { ...base, daysOfWeek: [1], time: '09:00' }
  }
}

function parseTime(time: string | undefined): [number, number] | null {
  if (!time) return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return [h, min]
}

/**
 * Convert a rule to a 5-field cron expression.
 *
 * The expression is authored in the rule's wall-clock timezone — we DO NOT
 * pre-shift to UTC. The backend dispatcher evaluates with that tz, so DST
 * transitions are handled natively without re-writing stored crons.
 */
export function ruleToCron(rule: ScheduleRule): string | null {
  switch (rule.mode) {
    case ScheduleMode.EveryNMinutes: {
      const n = rule.everyN
      if (!n || n < 1 || n > 59) return null
      return `*/${n} * * * *`
    }
    case ScheduleMode.EveryNHours: {
      const n = rule.everyN
      if (!n || n < 1 || n > 23) return null
      return `0 */${n} * * *`
    }
    case ScheduleMode.EveryNDays: {
      const n = rule.everyN
      const t = parseTime(rule.time)
      if (!n || n < 1 || !t) return null
      const [h, m] = t
      // `*/N` in day-of-month is an approximation when N doesn't divide the
      // month length — but for N=1..7 it matches "every N days" closely enough
      // and is the only way to express it in 5-field cron. UI surfaces a hint.
      return `${m} ${h} */${n} * *`
    }
    case ScheduleMode.Weekly: {
      const days = (rule.daysOfWeek ?? []).filter((d) => d >= 0 && d <= 6)
      const t = parseTime(rule.time)
      if (days.length === 0 || !t) return null
      const [h, m] = t
      const sorted = [...new Set(days)].sort((a, b) => a - b)
      return `${m} ${h} * * ${sorted.join(',')}`
    }
    default:
      return null
  }
}

export function ruleToBackend(rule: ScheduleRule): ScheduleRuleBackend | null {
  const cron = ruleToCron(rule)
  if (!cron) return null
  return {
    cron,
    tz: rule.tz || 'UTC',
    value: rule as unknown as Record<string, unknown>,
  }
}

export function configToBackend(
  config: ScheduleConfig,
): { schedules: ScheduleRuleBackend[]; cron: string | null } {
  const schedules = config.rules
    .map(ruleToBackend)
    .filter((r): r is ScheduleRuleBackend => r !== null)
  return { schedules, cron: schedules[0]?.cron ?? null }
}

/** Try to rebuild a ScheduleRule from the backend wire shape. */
export function backendToRule(s: ScheduleRuleBackend): ScheduleRule {
  // Prefer the rich `value` blob — it's what we wrote. If absent (legacy flow
  // that only had a cron string) we infer the mode by pattern-matching the
  // expression. The inference is best-effort: anything we can't classify
  // falls back to "every minute" so the user sees something editable.
  const v = (s.value ?? {}) as Partial<ScheduleRule>
  if (v.mode && Object.values(ScheduleMode).includes(v.mode as ScheduleMode)) {
    return {
      mode: v.mode as ScheduleMode,
      everyN: v.everyN,
      time: v.time,
      daysOfWeek: v.daysOfWeek,
      tz: s.tz || v.tz || defaultTz(),
    }
  }
  return cronToRule(s.cron, s.tz || defaultTz())
}

/** Best-effort cron → rule heuristic for legacy flows. */
export function cronToRule(cron: string, tz: string): ScheduleRule {
  const parts = cron.trim().split(/\s+/)
  if (parts.length === 5) {
    const [min, hour, dom, , dow] = parts
    // Every N minutes
    const everyMin = /^\*\/(\d+)$/.exec(min)
    if (everyMin && hour === '*' && dom === '*' && dow === '*') {
      return { mode: ScheduleMode.EveryNMinutes, everyN: Number(everyMin[1]), tz }
    }
    // Every N hours
    const everyHour = /^\*\/(\d+)$/.exec(hour)
    if (min === '0' && everyHour && dom === '*' && dow === '*') {
      return { mode: ScheduleMode.EveryNHours, everyN: Number(everyHour[1]), tz }
    }
    // Every N days at HH:MM
    const everyDay = /^\*\/(\d+)$/.exec(dom)
    if (everyDay && dow === '*' && /^\d+$/.test(min) && /^\d+$/.test(hour)) {
      return {
        mode: ScheduleMode.EveryNDays,
        everyN: Number(everyDay[1]),
        time: `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`,
        tz,
      }
    }
    // Weekly on N days at HH:MM
    if (
      /^\d+$/.test(min) &&
      /^\d+$/.test(hour) &&
      dom === '*' &&
      /^(\d+)(,\d+)*$/.test(dow)
    ) {
      const days = dow.split(',').map(Number)
      return {
        mode: ScheduleMode.Weekly,
        daysOfWeek: days,
        time: `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`,
        tz,
      }
    }
  }
  // Unrecognised → safe fallback so the picker still opens with something.
  return { mode: ScheduleMode.EveryNMinutes, everyN: 30, tz }
}

export function describeRule(rule: ScheduleRule): string {
  switch (rule.mode) {
    case ScheduleMode.EveryNMinutes:
      return `Every ${rule.everyN ?? '?'} minute${rule.everyN === 1 ? '' : 's'}`
    case ScheduleMode.EveryNHours:
      return `Every ${rule.everyN ?? '?'} hour${rule.everyN === 1 ? '' : 's'}`
    case ScheduleMode.EveryNDays: {
      const t = rule.time ?? '—'
      const n = rule.everyN ?? 1
      const every = n === 1 ? 'Daily' : `Every ${n} days`
      return `${every} at ${t} (${rule.tz})`
    }
    case ScheduleMode.Weekly: {
      const days = (rule.daysOfWeek ?? [])
        .slice()
        .sort((a, b) => a - b)
        .map((d) => DAY_NAMES_SHORT[d] ?? `?${d}`)
        .join(', ')
      return `Weekly on ${days || '—'} at ${rule.time ?? '—'} (${rule.tz})`
    }
  }
}

export function describeConfig(config: ScheduleConfig): string {
  if (!config.rules.length) return 'Manual'
  return config.rules.map(describeRule).join(' · ')
}
