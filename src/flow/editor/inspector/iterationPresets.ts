import {
  IterationCarryType,
  type IterationCarryField,
} from '../../core/types'

/**
 * Named presets the user can drop into the carry schema editor with one
 * click. Each preset spans the typical shape of a single iteration
 * variable for common pagination/iteration patterns — cursor, offset,
 * page, etc. The user is free to edit any field after applying.
 *
 * Adding presets here is the right place to expand the editor's "Suggest
 * from common patterns" menu without touching component logic.
 */
export interface IterationPreset {
  /** Stable id used as the React key + dropdown value. */
  id: string
  /** Label shown in the dropdown. */
  label: string
  /** Short hint shown next to the label so the user knows what they're
   * choosing without having to read the field defaults. */
  hint: string
  /** The actual field that gets appended (or replaces, see editor) when
   * the user picks this preset. */
  field: IterationCarryField
}

export const ITERATION_CARRY_PRESETS: IterationPreset[] = [
  {
    id: 'cursor',
    label: 'cursor',
    hint: 'string|null — opaque next-page token',
    field: {
      name: 'cursor',
      type: IterationCarryType.String,
      nullable: true,
      default: null,
      description:
        'Opaque pagination cursor returned by the upstream API. Pass null when no further pages exist.',
    },
  },
  {
    id: 'offset',
    label: 'offset',
    hint: 'integer — running row offset',
    field: {
      name: 'offset',
      type: IterationCarryType.Integer,
      default: 0,
      description: 'Running offset to send to the upstream API on the next call.',
    },
  },
  {
    id: 'page',
    label: 'page',
    hint: 'integer — 1-based page index',
    field: {
      name: 'page',
      type: IterationCarryType.Integer,
      default: 1,
      description: '1-based page index for APIs that paginate by page number.',
    },
  },
  {
    id: 'last_seen_id',
    label: 'last_seen_id',
    hint: 'string|null — for ID-based pagination',
    field: {
      name: 'last_seen_id',
      type: IterationCarryType.String,
      nullable: true,
      default: null,
      description:
        'Last record id seen in the previous batch. Useful for APIs that paginate by sort-key after.',
    },
  },
  {
    id: 'next_token',
    label: 'next_token',
    hint: 'string|null — AWS-style next page token',
    field: {
      name: 'next_token',
      type: IterationCarryType.String,
      nullable: true,
      default: null,
      description: 'Continuation token returned by the upstream API for the next call.',
    },
  },
  {
    id: 'fetched_count',
    label: 'fetched_count',
    hint: 'integer — running count for quota checks',
    field: {
      name: 'fetched_count',
      type: IterationCarryType.Integer,
      default: 0,
      description:
        'Running total of items processed so far. Compare against the input quota to decide when done.',
    },
  },
]

export const VALID_CARRY_NAME = /^[a-z_][a-z0-9_]*$/
