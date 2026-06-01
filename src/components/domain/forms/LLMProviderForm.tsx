import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type {
  LLMProviderFormSubmit,
  LLMProviderFormValues,
} from '../../../types/llmProvider'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { FormField } from '../primitives/FormField'

export interface LLMProviderFormProps {
  mode: 'create' | 'edit'
  /** Initial values. Required fields fall back to '' / true if not provided. */
  initialValues?: Partial<LLMProviderFormValues>
  /**
   * In edit mode, whether the backend reports the provider has an API key.
   * Drives the masked-key / "Change API key" UX. Ignored in create mode.
   */
  hasApiKey?: boolean
  saving?: boolean
  error?: string | null
  submitLabel?: string
  onSubmit: (values: LLMProviderFormSubmit) => void | Promise<void>
  onCancel?: () => void
  className?: string
}

const EMPTY: LLMProviderFormValues = {
  name: '',
  baseUrl: '',
  chatUrl: null,
  modelsUrl: null,
  isActive: true,
}

export function LLMProviderForm({
  mode,
  initialValues,
  hasApiKey = false,
  saving = false,
  error,
  submitLabel,
  onSubmit,
  onCancel,
  className,
}: LLMProviderFormProps) {
  const [values, setValues] = React.useState<LLMProviderFormValues>(() => ({
    ...EMPTY,
    ...initialValues,
  }))

  // API key UX:
  //   create     → plain input, value always sent.
  //   edit/has   → masked placeholder; user clicks "Change" to expand a fresh input.
  //                empty submit while expanded = clear key (sends '').
  //   edit/none  → plain input, optional (omit if empty).
  const [keyOpen, setKeyOpen] = React.useState(mode === 'create' || !hasApiKey)
  const [apiKeyInput, setApiKeyInput] = React.useState('')
  const [advancedOpen, setAdvancedOpen] = React.useState(
    Boolean(initialValues?.chatUrl || initialValues?.modelsUrl),
  )

  const set = <K extends keyof LLMProviderFormValues>(
    field: K,
    value: LLMProviderFormValues[K],
  ) => setValues((v) => ({ ...v, [field]: value }))

  function buildSubmit(): LLMProviderFormSubmit {
    let apiKey: string | undefined
    if (mode === 'create') {
      apiKey = apiKeyInput.trim() === '' ? undefined : apiKeyInput
    } else if (keyOpen) {
      // user opened the input → whatever is in it is intentional.
      // empty string explicitly clears the stored key.
      apiKey = apiKeyInput
    } else {
      // user never touched the key → omit so backend keeps current value.
      apiKey = undefined
    }
    return {
      ...values,
      chatUrl: values.chatUrl?.trim() ? values.chatUrl.trim() : null,
      modelsUrl: values.modelsUrl?.trim() ? values.modelsUrl.trim() : null,
      apiKey,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(buildSubmit())
  }

  const defaultSubmit = mode === 'create' ? 'Create provider' : 'Save changes'

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={cn('space-y-4', className)}
    >
      <FormField label="Name" htmlFor="llm_name">
        <Input
          id="llm_name"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="OpenAI"
          required
          maxLength={255}
        />
      </FormField>

      <FormField
        label="Base URL"
        htmlFor="llm_base_url"
        hint="OpenAI-compatible root, e.g. https://api.openai.com/v1"
      >
        <Input
          id="llm_base_url"
          type="url"
          value={values.baseUrl}
          onChange={(e) => set('baseUrl', e.target.value)}
          placeholder="https://api.openai.com/v1"
          required
          maxLength={1024}
        />
      </FormField>

      <FormField
        label="API key"
        htmlFor="llm_api_key"
        hint={
          mode === 'edit' && keyOpen && hasApiKey
            ? 'Leave empty and save to remove the stored key.'
            : undefined
        }
      >
        {mode === 'edit' && hasApiKey && !keyOpen ? (
          <div className="flex items-center gap-2">
            <Input
              value="•••••••••••• (configured)"
              disabled
              className="font-mono"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setKeyOpen(true)}
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              id="llm_api_key"
              type="password"
              autoComplete="off"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={
                mode === 'create' ? 'sk-…' : 'New API key (empty to remove)'
              }
            />
            {mode === 'edit' && hasApiKey && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setKeyOpen(false)
                  setApiKeyInput('')
                }}
              >
                Keep current
              </Button>
            )}
          </div>
        )}
      </FormField>

      <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
          className="accent-accent"
        />
        Active
        <span className="text-xs text-text-muted">
          Inactive providers can't be used by agents.
        </span>
      </label>

      <div className="rounded border border-border">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-muted hover:text-text-primary"
        >
          {advancedOpen ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
          Advanced configuration
        </button>
        {advancedOpen && (
          <div className="space-y-3 px-3 pb-3">
            <FormField
              label="Chat URL override"
              htmlFor="llm_chat_url"
              hint="Optional. Leave empty unless this provider needs a non-standard chat endpoint."
            >
              <Input
                id="llm_chat_url"
                type="url"
                value={values.chatUrl ?? ''}
                onChange={(e) => set('chatUrl', e.target.value || null)}
                placeholder=""
              />
            </FormField>
            <FormField
              label="Models URL override"
              htmlFor="llm_models_url"
              hint="Optional. Endpoint used to list available models."
            >
              <Input
                id="llm_models_url"
                type="url"
                value={values.modelsUrl ?? ''}
                onChange={(e) => set('modelsUrl', e.target.value || null)}
                placeholder=""
              />
            </FormField>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving}>
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
