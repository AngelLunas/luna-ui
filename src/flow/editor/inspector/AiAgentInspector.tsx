import { useRef, useState } from 'react'

import { FormField } from '../../../components/domain/primitives/FormField'
import { JsonEditor } from '../../../components/domain/forms/JsonEditor'
import { Checkbox } from '../../../components/ui/checkbox'
import { Input } from '../../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import {
  FlowNodeType,
  type IterationCarryField,
  type IterationConfig,
  type StashConfig,
} from '../../core/types'
import { useFlowEditor, useFlowEditorActions } from '../store'
import type { FlowEditorCatalogs } from '../FlowEditor'
import { IterationConfigEditor } from './IterationConfigEditor'
import { PromptVariableInserter } from './PromptVariableInserter'
import { StashConfigEditor } from './StashConfigEditor'
import { useDerivedItemSchema } from './useDerivedItemSchema'

const STASH_RECORDS_TOOL_NAME = 'stash_records'

export interface AiAgentInspectorProps {
  nodeId: string
  catalogs?: FlowEditorCatalogs
}

export function AiAgentInspector({ nodeId, catalogs }: AiAgentInspectorProps) {
  const node = useFlowEditor((s) => s.nodes.find((n) => n.id === nodeId) ?? null)
  const allNodes = useFlowEditor((s) => s.nodes)
  const actions = useFlowEditorActions()

  const config = node?.config ?? {}

  const agentId = typeof config.agent_id === 'string' ? config.agent_id : ''
  const prompt = typeof config.prompt === 'string' ? config.prompt : ''
  const inheritFrom = Array.isArray(config.inherit_history_from)
    ? (config.inherit_history_from as string[])
    : []
  const inheritTools =
    typeof config.inherit_tool_interactions === 'boolean'
      ? config.inherit_tool_interactions
      : true

  const contextBindings =
    typeof config.context_bindings === 'object' && config.context_bindings !== null
      ? (config.context_bindings as Record<string, unknown>)
      : {}

  const iteration: IterationConfig =
    typeof config.iteration === 'object' && config.iteration !== null
      ? (config.iteration as IterationConfig)
      : { enabled: false, carry_schema: [] }
  const carrySchema: IterationCarryField[] = Array.isArray(iteration.carry_schema)
    ? iteration.carry_schema
    : []

  // Resolved live from the producer node whose stash.collection_hint
  // matches this iterator's collection. Drives ${iteration.item.<field>}
  // chips in the prompt inserter — see useDerivedItemSchema.
  const derivedItemSchema = useDerivedItemSchema(
    iteration.enabled ? iteration.source_config?.collection : undefined,
  )

  const stash: StashConfig =
    typeof config.stash === 'object' && config.stash !== null
      ? (config.stash as StashConfig)
      : {}

  const [bindingsText, setBindingsText] = useState(
    JSON.stringify(contextBindings, null, 2),
  )
  const [bindingsError, setBindingsError] = useState<string | undefined>()
  const promptRef = useRef<HTMLTextAreaElement | null>(null)

  if (!node) return null
  const nid = node.id

  const selectedAgent =
    catalogs?.agents?.find((a) => a.id === agentId) ?? null

  // Stash editor visibility — rule R2: only show if the selected agent
  // has stash_records granted. If the catalog didn't load grants (e.g.
  // the host forgot ?include=system_tools), `system_tool_names` is
  // undefined; we err on the side of hiding to keep the inspector
  // focused. The hint below points the user at where to grant it when
  // they have an agent but no grant.
  const agentHasStashGrant = (selectedAgent?.system_tool_names ?? []).includes(
    STASH_RECORDS_TOOL_NAME,
  )

  function insertAtCursor(token: string) {
    const ta = promptRef.current
    if (!ta) {
      update({ prompt: (prompt ?? '') + token })
      return
    }
    const start = ta.selectionStart ?? prompt.length
    const end = ta.selectionEnd ?? prompt.length
    const next = prompt.slice(0, start) + token + prompt.slice(end)
    update({ prompt: next })
    // Restore caret right after the inserted token on the next paint.
    requestAnimationFrame(() => {
      const pos = start + token.length
      ta.focus()
      ta.setSelectionRange(pos, pos)
    })
  }

  function update(patch: Record<string, unknown>) {
    actions.updateNode(nid, { config: { ...config, ...patch } })
  }

  const inheritableNodes = allNodes.filter(
    (n) => n.type === FlowNodeType.AiAgent && n.id !== nid,
  )

  function toggleInherit(id: string) {
    const next = inheritFrom.includes(id)
      ? inheritFrom.filter((x) => x !== id)
      : [...inheritFrom, id]
    update({ inherit_history_from: next })
  }

  return (
    <>
      <FormField label="Agent">
        <Select value={agentId} onValueChange={(v) => update({ agent_id: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Pick an agent" />
          </SelectTrigger>
          <SelectContent>
            {(catalogs?.agents ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <span className="flex items-center gap-2">
                  <span>{a.name}</span>
                  {a.model && (
                    <span className="text-[10px] text-text-muted font-mono">
                      {a.model}
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Prompt"
        hint="Use the chips to insert references — no need to type ${...} by hand."
      >
        <div className="flex flex-col gap-2">
          <PromptVariableInserter
            ownerNodeId={nid}
            agent={selectedAgent}
            contextSources={catalogs?.contextSources ?? []}
            iterationCarry={iteration.enabled ? carrySchema : []}
            iterationSource={iteration.enabled ? iteration.source : undefined}
            iterationItemFields={
              iteration.enabled ? derivedItemSchema?.fields ?? [] : []
            }
            onInsert={insertAtCursor}
          />
          <textarea
            ref={promptRef}
            className="w-full min-h-[120px] rounded border border-border bg-bg p-2 text-sm text-text-primary"
            value={prompt}
            onChange={(e) => update({ prompt: e.target.value })}
            placeholder="What should the agent do this turn?"
          />
        </div>
      </FormField>

      <FormField label="Iteration">
        <IterationConfigEditor
          value={iteration}
          onChange={(next) => update({ iteration: next })}
        />
      </FormField>

      {agentHasStashGrant ? (
        <StashConfigEditor
          value={stash}
          onChange={(next) => update({ stash: next })}
          availableDedupCheckers={catalogs?.dedupCheckers}
        />
      ) : (
        selectedAgent && (
          <p className="text-[11px] text-text-muted italic px-1">
            To stage records with <span className="font-mono">stash_records</span>,
            grant the tool to <span className="font-mono">{selectedAgent.name}</span>{' '}
            in the Agents view.
          </p>
        )
      )}

      <FormField
        label="Context bindings"
        hint="Map of source name → { from: 'inputs.x' } or { static_id: '<uuid>' }."
        error={bindingsError}
      >
        <JsonEditor
          value={bindingsText}
          onChange={(text, meta) => {
            setBindingsText(text)
            setBindingsError(meta.error)
            if (
              meta.parsed &&
              typeof meta.parsed === 'object' &&
              !Array.isArray(meta.parsed)
            ) {
              update({
                context_bindings: meta.parsed as Record<string, unknown>,
              })
            }
          }}
          height={140}
        />
      </FormField>

      <FormField
        label="Inherit history from"
        hint="Earlier AI agent nodes whose messages should seed this turn's context."
      >
        {inheritableNodes.length === 0 ? (
          <span className="text-xs text-text-muted italic">
            No other AI agent nodes available.
          </span>
        ) : (
          <div className="flex flex-col gap-1">
            {inheritableNodes.map((n) => (
              <Checkbox
                key={n.id}
                checked={inheritFrom.includes(n.id)}
                onCheckedChange={() => toggleInherit(n.id)}
                label={
                  <span className="text-sm">
                    {n.name || n.id}{' '}
                    <span className="text-text-muted text-[11px]">({n.id})</span>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </FormField>

      {inheritFrom.length > 0 && (
        <FormField label="Inherit tool interactions">
          <Checkbox
            checked={inheritTools}
            onCheckedChange={(v) =>
              update({ inherit_tool_interactions: v === true })
            }
            label={
              <span className="text-xs text-text-muted">
                Include tool_use / tool_result blocks from inherited messages.
              </span>
            }
          />
        </FormField>
      )}

      <FormField label="Custom config keys" hint="Any extra config the runner reads.">
        <Input
          value={typeof config.notes === 'string' ? config.notes : ''}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Free-form notes (not consumed by the runner)"
        />
      </FormField>
    </>
  )
}
