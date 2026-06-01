import * as React from 'react'
import { cn } from '../../../lib/utils'
import {
  ApiKeyScheme,
  ConnectorAuthType,
  type ConnectorFormSubmit,
  type ConnectorFormValues,
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

export interface ConnectorFormProps {
  mode: 'create' | 'edit'
  initialValues?: Partial<ConnectorFormValues>
  /** edit mode: whether the backend reports stored credentials. */
  hasCredentials?: boolean
  /**
   * OAuth2 callback URL the deployment registered with each IdP. Surfaced
   * in the OAuth2 sub-form as a copy-pasteable hint — the actual URL is
   * server-controlled (via env var) so we just display whatever the
   * dashboard fetched from /connectors/oauth2/config.
   */
  oauth2CallbackUrl?: string
  saving?: boolean
  error?: string | null
  submitLabel?: string
  onSubmit: (values: ConnectorFormSubmit) => void | Promise<void>
  onCancel?: () => void
  className?: string
}

const EMPTY: ConnectorFormValues = {
  name: '',
  description: '',
  baseUrl: '',
  authType: ConnectorAuthType.None,
  isActive: true,
  apiKeyToken: '',
  apiKeyScheme: ApiKeyScheme.Bearer,
  apiKeyHeader: 'X-Api-Key',
  apiKeyQuery: 'api_key',
  basicUsername: '',
  basicPassword: '',
  oauth2AuthorizeUrl: '',
  oauth2TokenUrl: '',
  oauth2ClientId: '',
  oauth2ClientSecret: '',
  oauth2Scope: '',
}

function buildCredentials(
  values: ConnectorFormValues,
): Record<string, unknown> | null {
  if (values.authType === ConnectorAuthType.ApiKey) {
    const creds: Record<string, unknown> = {
      token: values.apiKeyToken,
      scheme: values.apiKeyScheme,
    }
    if (values.apiKeyScheme === ApiKeyScheme.Header) {
      creds.header = values.apiKeyHeader
    } else if (values.apiKeyScheme === ApiKeyScheme.Query) {
      creds.query = values.apiKeyQuery
    }
    return creds
  }
  if (values.authType === ConnectorAuthType.Basic) {
    return {
      username: values.basicUsername,
      password: values.basicPassword,
    }
  }
  if (values.authType === ConnectorAuthType.OAuth2) {
    // OAuth2 credentials hold both the static app config (URLs + secret) and
    // the dynamic tokens minted at handshake time. The form only edits the
    // static half — we splice any pre-existing tokens through so saving the
    // form doesn't un-connect an already-connected conector. After the user
    // hits "Connect", the backend writes access_token / refresh_token /
    // expires_at into this same blob.
    const creds: Record<string, unknown> = {
      authorize_url: values.oauth2AuthorizeUrl,
      token_url: values.oauth2TokenUrl,
      client_id: values.oauth2ClientId,
      client_secret: values.oauth2ClientSecret,
    }
    if (values.oauth2Scope) creds.scope = values.oauth2Scope
    return creds
  }
  return null
}

export function ConnectorForm({
  mode,
  initialValues,
  hasCredentials = false,
  oauth2CallbackUrl,
  saving = false,
  error,
  submitLabel,
  onSubmit,
  onCancel,
  className,
}: ConnectorFormProps) {
  const [values, setValues] = React.useState<ConnectorFormValues>(() => ({
    ...EMPTY,
    ...initialValues,
  }))

  // Credentials UX (parallel to LLMProviderForm's API-key model):
  //   create     → sub-form always visible (or hidden when authType=none).
  //   edit/has   → sub-form hidden behind "Replace credentials" toggle.
  //   edit/none  → sub-form always visible.
  const [replaceOpen, setReplaceOpen] = React.useState(
    mode === 'create' || !hasCredentials,
  )

  const set = <K extends keyof ConnectorFormValues>(
    field: K,
    value: ConnectorFormValues[K],
  ) => setValues((v) => ({ ...v, [field]: value }))

  const needsCredSubform =
    values.authType === ConnectorAuthType.ApiKey ||
    values.authType === ConnectorAuthType.Basic ||
    values.authType === ConnectorAuthType.OAuth2

  function buildSubmit(): ConnectorFormSubmit {
    const base: ConnectorFormSubmit = {
      name: values.name,
      description: values.description,
      baseUrl: values.baseUrl,
      authType: values.authType,
      isActive: values.isActive,
    }

    // Credentials payload semantics:
    //   none auth        → null (clear any stored creds).
    //   create + has sub → object (always send what's in the form).
    //   edit + replace   → object (intentional rotation).
    //   edit + keep      → undefined (omit, backend keeps stored value).
    if (!needsCredSubform) {
      base.credentials = null
    } else if (mode === 'create') {
      base.credentials = buildCredentials(values)
    } else if (replaceOpen) {
      base.credentials = buildCredentials(values)
    } else {
      // undefined → don't include
    }

    return base
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(buildSubmit())
  }

  const defaultSubmit = mode === 'create' ? 'Create connector' : 'Save changes'

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={cn('space-y-4', className)}
    >
      <FormField
        label="Name"
        htmlFor="conn_name"
        hint={mode === 'edit' ? 'Renaming is not supported.' : undefined}
      >
        <Input
          id="conn_name"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="stripe"
          required
          maxLength={255}
          disabled={mode === 'edit'}
        />
      </FormField>

      <FormField label="Description" htmlFor="conn_description">
        <textarea
          id="conn_description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
          placeholder="What this connector talks to…"
          className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </FormField>

      <FormField
        label="Base URL"
        htmlFor="conn_base_url"
        hint="HTTP(S) root the operations append paths to."
      >
        <Input
          id="conn_base_url"
          type="url"
          value={values.baseUrl}
          onChange={(e) => set('baseUrl', e.target.value)}
          placeholder="https://api.example.com"
          required
          maxLength={1024}
        />
      </FormField>

      <FormField label="Auth type" htmlFor="conn_auth_type">
        <Select
          value={values.authType}
          onValueChange={(v) => set('authType', v as ConnectorAuthType)}
        >
          <SelectTrigger id="conn_auth_type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ConnectorAuthType.None}>None</SelectItem>
            <SelectItem value={ConnectorAuthType.ApiKey}>API key</SelectItem>
            <SelectItem value={ConnectorAuthType.Basic}>Basic auth</SelectItem>
            <SelectItem value={ConnectorAuthType.OAuth2}>OAuth2</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {needsCredSubform && (
        <div className="rounded border border-border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-text-muted">
              Credentials
            </span>
            {mode === 'edit' && hasCredentials && (
              <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceOpen}
                  onChange={(e) => setReplaceOpen(e.target.checked)}
                  className="accent-accent"
                />
                Replace credentials
              </label>
            )}
          </div>

          {mode === 'edit' && !replaceOpen ? (
            <p className="text-xs text-text-muted">
              {hasCredentials
                ? 'Credentials are set — leave unchanged to keep them.'
                : 'No credentials set.'}
            </p>
          ) : (
            <>
              {values.authType === ConnectorAuthType.ApiKey && (
                <>
                  <FormField label="Token" htmlFor="conn_api_key_token">
                    <Input
                      id="conn_api_key_token"
                      type="password"
                      autoComplete="off"
                      value={values.apiKeyToken}
                      onChange={(e) => set('apiKeyToken', e.target.value)}
                      placeholder="sk_…"
                    />
                  </FormField>
                  <FormField label="Scheme" htmlFor="conn_api_key_scheme">
                    <Select
                      value={values.apiKeyScheme}
                      onValueChange={(v) =>
                        set('apiKeyScheme', v as ApiKeyScheme)
                      }
                    >
                      <SelectTrigger id="conn_api_key_scheme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ApiKeyScheme.Bearer}>
                          Authorization: Bearer
                        </SelectItem>
                        <SelectItem value={ApiKeyScheme.Header}>
                          Custom header
                        </SelectItem>
                        <SelectItem value={ApiKeyScheme.Query}>
                          Query parameter
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  {values.apiKeyScheme === ApiKeyScheme.Header && (
                    <FormField label="Header name" htmlFor="conn_api_key_header">
                      <Input
                        id="conn_api_key_header"
                        value={values.apiKeyHeader}
                        onChange={(e) => set('apiKeyHeader', e.target.value)}
                        placeholder="X-Api-Key"
                      />
                    </FormField>
                  )}
                  {values.apiKeyScheme === ApiKeyScheme.Query && (
                    <FormField label="Query name" htmlFor="conn_api_key_query">
                      <Input
                        id="conn_api_key_query"
                        value={values.apiKeyQuery}
                        onChange={(e) => set('apiKeyQuery', e.target.value)}
                        placeholder="api_key"
                      />
                    </FormField>
                  )}
                </>
              )}

              {values.authType === ConnectorAuthType.Basic && (
                <>
                  <FormField label="Username" htmlFor="conn_basic_username">
                    <Input
                      id="conn_basic_username"
                      value={values.basicUsername}
                      onChange={(e) => set('basicUsername', e.target.value)}
                      autoComplete="off"
                    />
                  </FormField>
                  <FormField label="Password" htmlFor="conn_basic_password">
                    <Input
                      id="conn_basic_password"
                      type="password"
                      value={values.basicPassword}
                      onChange={(e) => set('basicPassword', e.target.value)}
                      autoComplete="off"
                    />
                  </FormField>
                </>
              )}

              {values.authType === ConnectorAuthType.OAuth2 && (
                <>
                  {oauth2CallbackUrl && (
                    <div className="rounded border border-accent-border bg-accent-subtle/30 p-2">
                      <div className="text-[10px] uppercase tracking-wide text-text-muted">
                        Callback URL to register with the IdP
                      </div>
                      <div className="font-mono text-xs text-text-primary break-all">
                        {oauth2CallbackUrl}
                      </div>
                    </div>
                  )}
                  <FormField
                    label="Authorize URL"
                    htmlFor="conn_oauth2_authorize"
                    hint="Where the popup sends the user to log in."
                  >
                    <Input
                      id="conn_oauth2_authorize"
                      type="url"
                      value={values.oauth2AuthorizeUrl}
                      onChange={(e) =>
                        set('oauth2AuthorizeUrl', e.target.value)
                      }
                    />
                  </FormField>
                  <FormField
                    label="Token URL"
                    htmlFor="conn_oauth2_token"
                    hint="Where we exchange the code for access/refresh tokens."
                  >
                    <Input
                      id="conn_oauth2_token"
                      type="url"
                      value={values.oauth2TokenUrl}
                      onChange={(e) => set('oauth2TokenUrl', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Client ID" htmlFor="conn_oauth2_cid">
                    <Input
                      id="conn_oauth2_cid"
                      value={values.oauth2ClientId}
                      onChange={(e) =>
                        set('oauth2ClientId', e.target.value)
                      }
                      autoComplete="off"
                    />
                  </FormField>
                  <FormField label="Client secret" htmlFor="conn_oauth2_csec">
                    <Input
                      id="conn_oauth2_csec"
                      type="password"
                      value={values.oauth2ClientSecret}
                      onChange={(e) =>
                        set('oauth2ClientSecret', e.target.value)
                      }
                      autoComplete="off"
                    />
                  </FormField>
                  <FormField
                    label="Scope"
                    htmlFor="conn_oauth2_scope"
                    hint="Space-separated scopes the IdP expects, if any."
                  >
                    <Input
                      id="conn_oauth2_scope"
                      value={values.oauth2Scope}
                      onChange={(e) => set('oauth2Scope', e.target.value)}
                    />
                  </FormField>
                  {mode === 'edit' && hasCredentials && replaceOpen && (
                    <p className="text-xs text-warning">
                      Replacing app config will clear the stored tokens —
                      you'll need to click Connect again after saving.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => set('isActive', e.target.checked)}
          className="accent-accent"
        />
        Active
        <span className="text-xs text-text-muted">
          Inactive connectors can't be invoked by agents.
        </span>
      </label>

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
