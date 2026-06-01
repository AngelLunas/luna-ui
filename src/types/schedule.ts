export const ScheduleMode = {
  EveryNMinutes: 'every_n_minutes',
  EveryNHours: 'every_n_hours',
  EveryNDays: 'every_n_days',
  Weekly: 'weekly',
} as const
export type ScheduleMode = typeof ScheduleMode[keyof typeof ScheduleMode]

export interface ScheduleRule {
  mode: ScheduleMode
  /** N for every-N modes (minutes | hours | days). */
  everyN?: number
  /** "HH:MM" 24h local wall-clock. Required for EveryNDays and Weekly. */
  time?: string
  /** 0=Sunday..6=Saturday. Required for Weekly. */
  daysOfWeek?: number[]
  /** IANA timezone the user authored the rule in. */
  tz: string
}

export interface ScheduleConfig {
  rules: ScheduleRule[]
}

/** Backend wire shape for a single rule. */
export interface ScheduleRuleBackend {
  cron: string
  tz: string
  value: Record<string, unknown>
}
