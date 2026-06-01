import * as React from 'react'
import { ChevronDown, ChevronRight, Play } from 'lucide-react'
import { cn } from '../../../lib/utils'
import {
  HttpMethod,
  ParameterIn,
  parametersToInputSchema,
  type OperationFormSubmit,
  type OperationFormValues,
  type OperationTestResult,
} from '../../../types/connector'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select'
import { FormField } from '../primitives/FormField'
import { FixedBodyEditor } from './FixedBodyEditor'
import { FixedHeadersEditor } from './FixedHeadersEditor'
import { JsonEditor } from './JsonEditor'
import { OperationTestDialog } from './OperationTestDialog'
import { ParameterListEditor, emptyParameter } from './ParameterListEditor'
import { RetryPolicyEditor } from './RetryPolicyEditor'

export interface OperationFormProps {
  mode: 'create' | 'edit'
  initialValues?: Partial<OperationFormValues>
  saving?: boolean
  error?: string | null
  submitLabel?: string
  /**
   * When provided, the form renders a Test button next to Save. Clicking it
   * opens an inline test dialog that calls back here for each Run with the
   * current draft + user-supplied input. The form re-evaluates the draft
   * at every Run, so live edits to the form propagate without re-opening.
   */
  onTest?: (
    draft: OperationFormSubmit,
    input: Record<string, unknown>,
  ) => Promise<OperationTestResult>
  /** Optional banner for the test dialog (e.g. 503 from `connectors:test`). */
  testUnavailable?: string | null
  onSubmit: (values: OperationFormSubmit) => void | Promise<void>
  onCancel?: () => void
  className?: string
}

const PATH_PARAM_RE = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g

const EMPTY: OperationFormValues = {
  name: '',
  description: '',
  method: HttpMethod.Get,
  path: '/',
  parameters: [],
  fixedHeaders: [],
  fixedBodyText: '',
  outputSchemaText: '{\n  "type": "object"\n}',
  retryPolicy: null,
  isActive: true,
}

function detectPathParams(path: string): string[] {
  const out: string[] = []
  for (const m of path.matchAll(PATH_PARAM_RE)) out.push(m[1])
  return out
}

function tryParseObject(
  text: string,
  allowEmpty = false,
): { value?: Record<string, unknown> | null; error?: string } {
  const trimmed = text.trim()
  if (trimmed === '') {
    return allowEmpty ? { value: null } : { value: {} }
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { error: 'Must be a JSON object.' }
    }
    return { value: parsed as Record<string, unknown> }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

function bodyMethod(method: HttpMethod): boolean {
  return (
    method === HttpMethod.Post ||
    method === HttpMethod.Put ||
    method === HttpMethod.Patch
  )
}

export function OperationForm({
  mode,
  initialValues,
  saving = false,
  error,
  submitLabel,
  onTest,
  testUnavailable,
  onSubmit,
  onCancel,
  className,
}: OperationFormProps) {
  const [values, setValues] = React.useState<OperationFormValues>(() => ({
    ...EMPTY,
    ...initialValues,
  }))
  const [advancedOpen, setAdvancedOpen] = React.useState(
    Boolean(
      initialValues?.fixedHeaders?.length ||
        initialValues?.fixedBodyText?.trim() ||
        initialValues?.retryPolicy,
    ),
  )
  const [testDialogOpen, setTestDialogOpen] = React.useState(false)
  // `latestDraft` is read by the dialog's onRun callback. Keeping it in a
  // ref means live edits to the form propagate to in-flight test runs
  // without forcing the dialog to re-derive its input skeleton on every
  // keystroke (which would clobber what the user typed in the editor).
  const latestDraftRef = React.useRef<OperationFormSubmit | null>(null)

  const set = <K extends keyof OperationFormValues>(
    field: K,
    value: OperationFormValues[K],
  ) => setValues((v) => ({ ...v, [field]: value }))

  const pathParams = React.useMemo(
    () => detectPathParams(values.path),
    [values.path],
  )
  const declaredPathParams = React.useMemo(
    () =>
      new Set(
        values.parameters
          .filter((p) => p.in === ParameterIn.Path)
          .map((p) => p.name),
      ),
    [values.parameters],
  )
  const missingPathDeclarations = pathParams.filter(
    (name) => !declaredPathParams.has(name),
  )

  const bodyParse = React.useMemo(
    () => tryParseObject(values.fixedBodyText, true),
    [values.fixedBodyText],
  )
  const outputParse = React.useMemo(
    () => tryParseObject(values.outputSchemaText),
    [values.outputSchemaText],
  )
  const pathInvalid = values.path !== '' && !values.path.startsWith('/')

  const paramNames = values.parameters.map((p) => p.name).filter(Boolean)

  const formInvalid =
    Boolean(bodyParse.error) || Boolean(outputParse.error) || pathInvalid

  function autoDeclarePathParam(name: string) {
    const next = [
      ...values.parameters,
      { ...emptyParameter(), name, in: ParameterIn.Path, required: true },
    ]
    set('parameters', next)
  }

  function buildSubmit(): OperationFormSubmit {
    const fixedHeaders: Record<string, string> = {}
    for (const row of values.fixedHeaders) {
      if (row.name.trim() !== '') fixedHeaders[row.name] = row.value
    }
    return {
      name: values.name,
      description: values.description,
      method: values.method,
      path: values.path,
      parameters: values.parameters,
      fixedHeaders,
      fixedBody: (bodyParse.value as Record<string, unknown> | null) ?? null,
      retryPolicy: values.retryPolicy,
      outputSchema: outputParse.value ?? {},
      isActive: values.isActive,
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (formInvalid) return
    await onSubmit(buildSubmit())
  }

  function handleTest() {
    if (formInvalid || !onTest) return
    latestDraftRef.current = buildSubmit()
    setTestDialogOpen(true)
  }

  async function runTest(
    input: Record<string, unknown>,
  ): Promise<OperationTestResult> {
    if (!onTest) throw new Error('onTest not wired')
    // Re-evaluate the draft at run time so live form edits flow into the test.
    const draft = buildSubmit()
    latestDraftRef.current = draft
    return onTest(draft, input)
  }

  const testInputSchema = React.useMemo(
    () => parametersToInputSchema(values.parameters),
    [values.parameters],
  )

  const defaultSubmit = mode === 'create' ? 'Create operation' : 'Save changes'

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={cn('space-y-4', className)}
    >
      <FormField
        label="Name"
        htmlFor="op_name"
        hint={mode === 'edit' ? 'Renaming is not supported.' : undefined}
      >
        <Input
          id="op_name"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="list_jobs"
          required
          maxLength={255}
          disabled={mode === 'edit'}
        />
      </FormField>

      <FormField label="Description" htmlFor="op_description">
        <textarea
          id="op_description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
          placeholder="What this operation does — shown to the agent as the tool description."
          className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </FormField>

      <div className="grid grid-cols-[120px_1fr] gap-3">
        <FormField label="Method" htmlFor="op_method">
          <Select
            value={values.method}
            onValueChange={(v) => set('method', v as HttpMethod)}
          >
            <SelectTrigger id="op_method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={HttpMethod.Get}>GET</SelectItem>
              <SelectItem value={HttpMethod.Post}>POST</SelectItem>
              <SelectItem value={HttpMethod.Put}>PUT</SelectItem>
              <SelectItem value={HttpMethod.Patch}>PATCH</SelectItem>
              <SelectItem value={HttpMethod.Delete}>DELETE</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Path"
          htmlFor="op_path"
          error={pathInvalid ? 'Path must start with /.' : undefined}
          hint={
            pathParams.length > 0
              ? `Path params: ${pathParams.map((p) => `{${p}}`).join(', ')}`
              : 'Use {param} syntax for path parameters.'
          }
        >
          <Input
            id="op_path"
            value={values.path}
            onChange={(e) => set('path', e.target.value)}
            placeholder="/jobs/{job_id}"
            required
            maxLength={1024}
            className="font-mono text-xs"
          />
        </FormField>
      </div>

      {missingPathDeclarations.length > 0 && (
        <div className="rounded border border-warning bg-warning/10 px-3 py-2 text-xs text-warning flex flex-col gap-1">
          <span>
            Path uses {missingPathDeclarations.map((n) => `{${n}}`).join(', ')}{' '}
            but no parameter declares them yet.
          </span>
          <div className="flex flex-wrap gap-1">
            {missingPathDeclarations.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => autoDeclarePathParam(n)}
                className="inline-flex items-center rounded border border-warning bg-warning/10 px-1.5 py-0.5 font-mono text-[10px] text-warning hover:bg-warning/20"
              >
                + add {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <FormField
        label="Parameters"
        hint="The AI sees these as the tool's input. `in` decides where each value lands at HTTP time."
      >
        <ParameterListEditor
          value={values.parameters}
          onChange={(v) => set('parameters', v)}
        />
      </FormField>

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
          Fixed headers, body template &amp; retry policy
        </button>
        {advancedOpen && (
          <div className="space-y-4 px-3 pb-3">
            <FormField
              label="Fixed headers"
              hint="Always-included headers. Values may contain {param} placeholders."
            >
              <FixedHeadersEditor
                value={values.fixedHeaders}
                onChange={(v) => set('fixedHeaders', v)}
                paramNames={paramNames}
              />
            </FormField>
            {bodyMethod(values.method) && (
              <FormField
                label="Fixed body template"
                error={bodyParse.error}
                hint="JSON template merged with body-destined parameters. Leave empty to send only the parameters."
              >
                <FixedBodyEditor
                  value={values.fixedBodyText}
                  onChange={(v) => set('fixedBodyText', v)}
                  paramNames={paramNames}
                  error={bodyParse.error ?? null}
                />
              </FormField>
            )}
            <RetryPolicyEditor
              value={values.retryPolicy}
              onChange={(v) => set('retryPolicy', v)}
            />
          </div>
        )}
      </div>

      <FormField
        label="Output schema"
        error={outputParse.error}
        hint="JSON Schema for the response shape (optional). Not shown to the AI."
      >
        <JsonEditor
          value={values.outputSchemaText}
          onChange={(v) => set('outputSchemaText', v)}
          height={120}
        />
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
          Inactive operations are hidden from agents.
        </span>
      </label>

      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving || formInvalid}>
          {saving ? 'Saving…' : (submitLabel ?? defaultSubmit)}
        </Button>
        {onTest && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleTest}
            disabled={saving || formInvalid}
            title={
              formInvalid ? 'Fix validation errors before testing.' : undefined
            }
          >
            <Play size={14} />
            Test
          </Button>
        )}
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {onTest && (
        <OperationTestDialog
          open={testDialogOpen}
          onOpenChange={setTestDialogOpen}
          operation={{
            name: values.name || 'untitled',
            method: values.method,
            path: values.path,
            inputSchema: testInputSchema,
          }}
          onRun={runTest}
          unavailable={testUnavailable}
        />
      )}
    </form>
  )
}
