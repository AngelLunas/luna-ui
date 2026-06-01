import { useMemo } from 'react'

import {
  FlowNodeType,
  type IterationCarryField,
  type StashConfig,
} from '../../core/types'
import { useFlowEditor } from '../store'

export interface DerivedItemSchema {
  /** Node id of the producer (the one whose stash.collection_hint matched). */
  producerNodeId: string
  /** Display name to surface in the UI — falls back to id when unset. */
  producerName: string
  /** The producer's stash record_schema, used to generate
   * `${iteration.item.<field>}` chips and read-only field listings. */
  fields: IterationCarryField[]
}

/**
 * Resolves the "expected record shape" for a scratchpad-mode iterator
 * by walking the FlowEditor store for an AI-agent node whose
 * ``stash.collection_hint`` equals ``collection``. Returns ``null`` when
 * no producer exists or when ``collection`` is empty.
 *
 * The contract between producer and consumer is by collection name (the
 * Redis keyspace), not by graph topology — so this hook matches any
 * node in the flow regardless of edges. Two nodes claiming the same
 * collection is a user-config issue; we pick the first match and let
 * the user disambiguate by renaming.
 *
 * Why a hook lives here rather than a plain helper: it needs to react
 * to live store updates so adding a field to the producer's stash
 * immediately surfaces a new chip in the consumer's prompt editor.
 */
export function useDerivedItemSchema(
  collection: string | undefined,
): DerivedItemSchema | null {
  const nodes = useFlowEditor((s) => s.nodes)
  return useMemo(() => {
    if (!collection) return null
    for (const node of nodes) {
      if (node.type !== FlowNodeType.AiAgent) continue
      const stash = (node.config as { stash?: StashConfig } | undefined)?.stash
      if (!stash || stash.collection_hint !== collection) continue
      return {
        producerNodeId: node.id,
        producerName: node.name ?? node.id,
        fields: stash.record_schema ?? [],
      }
    }
    return null
  }, [nodes, collection])
}
