import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Input } from '../../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { FormField } from '../primitives/FormField'
import { LLMProviderModelsList } from '../cards/LLMProviderModelsList'
import {
  InstructionsEditor,
  RequiredSourcesPreview,
  type InstructionsPreviewResult,
} from './InstructionsEditor'
import { JsonEditor } from './JsonEditor'
import { OperationsPicker, type PickerConnector } from './OperationsPicker'
import {
  SystemToolsPicker,
  type PickerSystemTool,
} from './SystemToolsPicker'
import type { ContextSource } from '../../../types/contextSource'
import { cn } from '../../../lib/utils'

export interface AgentFormProvider {
  id: string
  name: string
  is_active?: boolean
}

export interface AgentFormModel {
  id: string
}

export interface AgentFormValues {
  name: string
  role: string
  llmProviderId: string
  model: string
  temperature: number
  instructions: string
  outputSchema: Record<string, unknown>
  operationIds: string[]
  /** Catalog system-tool names the agent is granted access to. Parallel
   * to operationIds — same wipe-and-replace semantics on save. */
  systemToolNames: string[]
}

export interface AgentFormSubmit extends AgentFormValues {
  /** Live-extracted required sources — same algorithm as the backend. */
  requiredSources: string[]
}

export interface AgentFormProps {
  mode: 'create' | 'edit'
  initialValues?: Partial<AgentFormValues>
  providers: AgentFormProvider[]
  /**
   * Resolver for the model list of a given provider. Called whenever the
   * provider selection changes; the form caches by provider id.
   */
  loadModels: (providerId: string) => Promise<AgentFormModel[]>
  connectors: PickerConnector[]
  /** Catalog of in-process system tools currently registered. Empty
   * array hides the picker entirely; the form doesn't fetch — the
   * caller supplies whatever the backend's GET /system-tools returned. */
  systemTools: PickerSystemTool[]
  contextSources: ContextSource[]
  saving?: boolean
  error?: string | null
  submitLabel?: string
  onSubmit: (values: AgentFormSubmit) => void | Promise<void>
  onCancel?: () => void
  className?: string
  /**
   * Optional preview callback forwarded to the instructions editor. When
   * supplied, the editor renders a "Preview" button that opens a dialog
   * with the backend-resolved instructions.
   */
  onPreviewInstructions?: (
    instructions: string,
  ) => Promise<InstructionsPreviewResult>
}

const EMPTY: AgentFormValues = {
  name: '',
  role: '',
  llmProviderId: '',
  model: '',
  temperature: 0.7,
  instructions: '',
  outputSchema: {},
  operationIds: [],
  systemToolNames: [],
}

/**
 * Full create/edit form for an agent. Composes name/role inputs, provider
 * and model dropdowns, temperature slider, instructions editor (with
 * context-source chips), output-schema JSON editor, and an operations
 * checkbox tree. The form is generic — it doesn't know about the backend
 * client; submission is delegated via `onSubmit`.
 */
export function AgentForm({
  mode,
  initialValues,
  providers,
  loadModels,
  connectors,
  systemTools,
  contextSources,
  saving = false,
  error,
  submitLabel,
  onSubmit,
  onCancel,
  className,
  onPreviewInstructions,
}: AgentFormProps) {
  const [values, setValues] = React.useState<AgentFormValues>(() => ({
    ...EMPTY,
    ...initialValues,
  }))

  const [outputSchemaText, setOutputSchemaText] = React.useState<string>(() =>
    JSON.stringify(initialValues?.outputSchema ?? EMPTY.outputSchema, null, 2),
  )
  const [outputSchemaError, setOutputSchemaError] = React.useState<string | null>(null)

  const [requiredSources, setRequiredSources] = React.useState<string[]>([])
  const [hasInvalidChip, setHasInvalidChip] = React.useState(false)

  const [modelPickerOpen, setModelPickerOpen] = React.useState(false)

  // Provider-scoped model cache so flipping providers back and forth
  // doesn't re-hit the network.
  const [modelsByProvider, setModelsByProvider] = React.useState<
    Record<string, AgentFormModel[]>
  >({})
  const [modelsLoading, setModelsLoading] = React.useState(false)
  const [modelsError, setModelsError] = React.useState<string | null>(null)

  const set = <K extends keyof AgentFormValues>(field: K, value: AgentFormValues[K]) =>
    setValues((v) => ({ ...v, [field]: value }))

  // Load models when provider changes (and on initial mount if a provider
  // is preselected). Keeping the user's chosen model is the caller's job:
  // if it isn't in the new list, we clear the field so they re-pick.
  React.useEffect(() => {
    const providerId = values.llmProviderId
    if (!providerId) return
    if (modelsByProvider[providerId]) {
      // Provider's models already cached — drop the current model if it
      // vanished from the new provider's catalog.
      const ids = modelsByProvider[providerId].map((m) => m.id)
      if (values.model && !ids.includes(values.model)) {
        set('model', '')
      }
      return
    }
    let cancelled = false
    setModelsLoading(true)
    setModelsError(null)
    loadModels(providerId)
      .then((models) => {
        if (cancelled) return
        setModelsByProvider((m) => ({ ...m, [providerId]: models }))
        const ids = models.map((mm) => mm.id)
        if (values.model && !ids.includes(values.model)) set('model', '')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setModelsError((e as Error).message || 'Failed to load models')
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false)
      })
    return () => {
      cancelled = true
    }
    // values.model intentionally excluded — changing model shouldn't reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.llmProviderId])

  const currentModels = modelsByProvider[values.llmProviderId] ?? []
  const modelMissing =
    values.model &&
    !currentModels.find((m) => m.id === values.model) &&
    !modelsLoading

  // Surface providers that the initial form value referenced but that are
  // no longer in the list (deactivated or deleted upstream) so the user
  // can either keep or replace the orphan binding without silently losing it.
  const providerMissing =
    values.llmProviderId &&
    !providers.find((p) => p.id === values.llmProviderId)

  function handleInstructionsChange(
    text: string,
    meta: { requiredSources: string[]; hasInvalidChip: boolean },
  ) {
    set('instructions', text)
    setRequiredSources(meta.requiredSources)
    setHasInvalidChip(meta.hasInvalidChip)
  }

  function handleOutputSchemaChange(
    text: string,
    meta: { parsed?: unknown; error?: string },
  ) {
    setOutputSchemaText(text)
    if (meta.error) {
      setOutputSchemaError(meta.error)
      return
    }
    setOutputSchemaError(null)
    if (meta.parsed !== undefined) {
      // Only object schemas are meaningful for output structure.
      if (typeof meta.parsed === 'object' && meta.parsed !== null) {
        set('outputSchema', meta.parsed as Record<string, unknown>)
      }
    } else {
      set('outputSchema', {})
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (outputSchemaError) return
    await onSubmit({ ...values, requiredSources })
  }

  const defaultSubmit = mode === 'create' ? 'Create agent' : 'Save changes'

  const submitDisabled =
    saving ||
    !values.name.trim() ||
    !values.llmProviderId ||
    !values.model ||
    Boolean(outputSchemaError)

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={cn('space-y-6', className)}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Name" htmlFor="agent_name">
          <Input
            id="agent_name"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="job_analyst"
            required
            maxLength={255}
            disabled={mode === 'edit'}
            title={mode === 'edit' ? 'Name cannot be changed after creation' : undefined}
          />
        </FormField>

        <FormField label="Role" htmlFor="agent_role">
          <Input
            id="agent_role"
            value={values.role}
            onChange={(e) => set('role', e.target.value)}
            placeholder="Analyze job postings"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="LLM provider"
          htmlFor="agent_provider"
          error={providerMissing ? 'The previously assigned provider is no longer available.' : undefined}
        >
          <Select
            value={values.llmProviderId || undefined}
            onValueChange={(v) => set('llmProviderId', v)}
          >
            <SelectTrigger id="agent_provider">
              <SelectValue placeholder="Select a provider…" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.is_active === false && ' (inactive)'}
                </SelectItem>
              ))}
              {providerMissing && (
                <SelectItem value={values.llmProviderId}>
                  {values.llmProviderId} (missing)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Model"
          htmlFor="agent_model"
          error={
            modelsError
              ? modelsError
              : modelMissing
                ? `Model "${values.model}" is not in this provider's catalog.`
                : undefined
          }
          hint={
            !values.llmProviderId
              ? 'Pick a provider first.'
              : modelsLoading
                ? 'Loading models…'
                : undefined
          }
        >
          <button
            id="agent_model"
            type="button"
            onClick={() => setModelPickerOpen(true)}
            disabled={!values.llmProviderId || modelsLoading}
            className={cn(
              'flex h-9 w-full items-center justify-between rounded border border-border bg-transparent px-3 py-1 text-sm text-text-primary',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent-border',
              'disabled:cursor-not-allowed disabled:opacity-50 hover:border-accent-border transition-colors',
            )}
          >
            <span
              className={cn(
                'truncate font-mono',
                !values.model && 'font-sans text-text-muted',
              )}
            >
              {values.model || 'Select a model…'}
            </span>
            <ChevronDown size={14} className="text-text-muted shrink-0" />
          </button>
        </FormField>
      </div>

      <Dialog open={modelPickerOpen} onOpenChange={setModelPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a model</DialogTitle>
            <DialogDescription>
              Models reported by the selected provider.
            </DialogDescription>
          </DialogHeader>
          <LLMProviderModelsList
            models={currentModels.map((m) => ({
              id: m.id,
              ownedBy: (m as { ownedBy?: string | null }).ownedBy ?? null,
            }))}
            loading={modelsLoading}
            error={modelsError}
            selectedId={values.model}
            onSelect={(m) => {
              set('model', m.id)
              setModelPickerOpen(false)
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModelPickerOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FormField label={`Temperature (${values.temperature.toFixed(1)})`} htmlFor="agent_temperature">
        <input
          id="agent_temperature"
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={values.temperature}
          onChange={(e) => set('temperature', Number(e.target.value))}
          className="w-full accent-accent"
        />
      </FormField>

      <FormField label="Instructions">
        <InstructionsEditor
          value={values.instructions}
          onChange={handleInstructionsChange}
          contextSources={contextSources}
          footer={<RequiredSourcesPreview sources={requiredSources} />}
          onPreview={onPreviewInstructions}
        />
        {hasInvalidChip && (
          <p className="text-xs text-warning mt-1">
            Some context references point to sources or paths that aren't
            registered. The agent will save but may fail at runtime.
          </p>
        )}
      </FormField>

      <FormField
        label="Tools (operations)"
        hint="Pick the connector operations this agent can call."
      >
        <OperationsPicker
          connectors={connectors}
          selectedIds={values.operationIds}
          onChange={(ids) => set('operationIds', ids)}
        />
      </FormField>

      <FormField
        label="System tools"
        hint="Built-in runtime tools (e.g. stash_records). Toggle on the ones this agent may call; unselected tools are hidden from the agent's tool list."
      >
        <SystemToolsPicker
          tools={systemTools}
          selectedNames={values.systemToolNames}
          onChange={(names) => set('systemToolNames', names)}
        />
      </FormField>

      <FormField
        label="Output schema"
        hint="JSON Schema for the agent's structured output. Leave as `{}` for unstructured."
        error={outputSchemaError ?? undefined}
      >
        <JsonEditor
          value={outputSchemaText}
          onChange={handleOutputSchemaChange}
        />
      </FormField>

      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={submitDisabled}>
          {saving ? 'Saving…' : (submitLabel ?? defaultSubmit)}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
