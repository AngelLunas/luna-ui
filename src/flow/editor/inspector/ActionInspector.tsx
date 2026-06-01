import { useMemo, useState } from 'react'

import { FormField } from '../../../components/domain/primitives/FormField'
import { JsonEditor } from '../../../components/domain/forms/JsonEditor'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select'
import { Badge } from '../../../components/ui/badge'
import { useFlowEditor, useFlowEditorActions } from '../store'
import type { FlowEditorCatalogs } from '../FlowEditor'

export interface ActionInspectorProps {
  nodeId: string
  catalogs?: FlowEditorCatalogs
}

/**
 * Action node target = either a connector operation OR a system tool.
 * The single Select uses a prefix scheme so the visible value stays a
 * plain string the underlying primitive understands:
 *   ``op:<uuid>``   -> connector operation
 *   ``sys:<name>``  -> in-process system tool
 *
 * On selection the inspector writes exactly one of ``operation_id`` /
 * ``system_tool_name`` into ``node.config`` and deletes the other so
 * the validator (which rejects both-or-neither) stays happy.
 */

const OperationKindPrefix = {
  Operation: 'op:',
  SystemTool: 'sys:',
} as const

export function ActionInspector({ nodeId, catalogs }: ActionInspectorProps) {
  const node = useFlowEditor((s) => s.nodes.find((n) => n.id === nodeId) ?? null)
  const actions = useFlowEditorActions()

  const flatOperations = useMemo(() => {
    if (!catalogs?.connectors) return []
    return catalogs.connectors.flatMap((c) =>
      c.operations.map((o) => ({
        ...o,
        connectorId: c.id,
        connectorName: c.name,
      })),
    )
  }, [catalogs?.connectors])

  const systemTools = catalogs?.systemTools ?? []

  const config = node?.config ?? {}
  const operationId =
    typeof config.operation_id === 'string' ? config.operation_id : ''
  const systemToolName =
    typeof config.system_tool_name === 'string'
      ? config.system_tool_name
      : ''
  const inputObj =
    typeof config.input === 'object' && config.input !== null
      ? (config.input as Record<string, unknown>)
      : {}

  const [inputText, setInputText] = useState(JSON.stringify(inputObj, null, 2))
  const [inputError, setInputError] = useState<string | undefined>()

  if (!node) return null
  const nid = node.id

  const selectedOp = operationId
    ? flatOperations.find((o) => o.id === operationId)
    : undefined
  const selectedSystemTool = systemToolName
    ? systemTools.find((t) => t.name === systemToolName)
    : undefined

  const selectValue = operationId
    ? `${OperationKindPrefix.Operation}${operationId}`
    : systemToolName
      ? `${OperationKindPrefix.SystemTool}${systemToolName}`
      : ''

  function setTarget(value: string) {
    // Always clear both keys so we never persist a stale pair — the
    // engine + the validator both reject both-or-neither.
    const next = { ...config }
    delete next.operation_id
    delete next.system_tool_name
    if (value.startsWith(OperationKindPrefix.Operation)) {
      next.operation_id = value.slice(OperationKindPrefix.Operation.length)
    } else if (value.startsWith(OperationKindPrefix.SystemTool)) {
      next.system_tool_name = value.slice(OperationKindPrefix.SystemTool.length)
    }
    actions.updateNode(nid, { config: next })
  }

  function setInput(text: string, meta: { parsed?: unknown; error?: string }) {
    setInputText(text)
    setInputError(meta.error)
    if (
      meta.parsed &&
      typeof meta.parsed === 'object' &&
      !Array.isArray(meta.parsed)
    ) {
      actions.updateNode(nid, {
        config: { ...config, input: meta.parsed as Record<string, unknown> },
      })
    }
  }

  return (
    <>
      <FormField label="Operation">
        <Select value={selectValue} onValueChange={setTarget}>
          <SelectTrigger>
            <SelectValue placeholder="Pick an operation or system tool" />
          </SelectTrigger>
          <SelectContent>
            {(catalogs?.connectors ?? []).map((connector) => (
              <SelectGroup key={connector.id}>
                <SelectLabel>{connector.name}</SelectLabel>
                {connector.operations.map((op) => (
                  <SelectItem
                    key={op.id}
                    value={`${OperationKindPrefix.Operation}${op.id}`}
                  >
                    <span className="flex items-center gap-2">
                      {op.method && (
                        <Badge variant="muted" className="text-[10px] font-mono">
                          {op.method}
                        </Badge>
                      )}
                      <span>{op.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            {systemTools.length > 0 && (
              <SelectGroup>
                <SelectLabel>System tools</SelectLabel>
                {systemTools.map((tool) => (
                  <SelectItem
                    key={tool.name}
                    value={`${OperationKindPrefix.SystemTool}${tool.name}`}
                  >
                    <span className="flex items-center gap-2">
                      <Badge variant="muted" className="text-[10px] font-mono">
                        SYS
                      </Badge>
                      <span>{tool.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </FormField>

      {selectedOp && (
        <div className="rounded border border-border bg-bg px-2 py-1.5 text-xs text-text-muted">
          <div>
            <span className="text-text-primary">{selectedOp.connectorName}</span>
            {' · '}
            {selectedOp.method && (
              <code className="font-mono text-[11px]">{selectedOp.method}</code>
            )}
            {selectedOp.path && (
              <code className="font-mono text-[11px] ml-1">{selectedOp.path}</code>
            )}
          </div>
          {selectedOp.description && (
            <div className="mt-1">{selectedOp.description}</div>
          )}
        </div>
      )}

      {selectedSystemTool && (
        <div className="rounded border border-border bg-bg px-2 py-1.5 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="text-[10px] font-mono">
              SYS
            </Badge>
            <code className="font-mono text-[11px] text-text-primary">
              {selectedSystemTool.name}
            </code>
          </div>
          {selectedSystemTool.description && (
            <div className="mt-1">{selectedSystemTool.description}</div>
          )}
        </div>
      )}

      <FormField
        label="Input mapping"
        hint="Object whose values can reference ${inputs.x} or ${outputs.<nodeId>...}."
        error={inputError}
      >
        <JsonEditor value={inputText} onChange={setInput} height={180} />
      </FormField>
    </>
  )
}
