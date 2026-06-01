import type { ContextSource } from '../../../../types/contextSource'
import { pathExists } from './schemaPaths'

export type ChipValidationState = 'ok' | 'unknown-source' | 'unknown-path'

export interface ChipValidation {
  state: ChipValidationState
  message?: string
}

export type ChipValidator = (source: string, path: string) => ChipValidation

export function makeChipValidator(sources: ContextSource[]): ChipValidator {
  const bySource = new Map(sources.map((s) => [s.name, s]))
  return (source, path) => {
    const src = bySource.get(source)
    if (!src) {
      return {
        state: 'unknown-source',
        message: `Source "${source}" is not registered.`,
      }
    }
    // Path normalization: backend treats `${context.profile.id}` as the
    // implicit id even though it isn't always in the schema. Skip path
    // validation for the bare source root.
    if (!path) return { state: 'ok' }
    if (!pathExists(src.schema, path)) {
      return {
        state: 'unknown-path',
        message: `Path "${path}" does not exist in ${source}'s schema.`,
      }
    }
    return { state: 'ok' }
  }
}
