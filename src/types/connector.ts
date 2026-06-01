export const ConnectorAuthType = {
  None: 'none',
  ApiKey: 'api_key',
  Basic: 'basic',
  OAuth2: 'oauth2',
} as const
export type ConnectorAuthType =
  (typeof ConnectorAuthType)[keyof typeof ConnectorAuthType]

export const HttpMethod = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Delete: 'DELETE',
  Patch: 'PATCH',
} as const
export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod]

export const ApiKeyScheme = {
  Bearer: 'bearer',
  Header: 'header',
  Query: 'query',
} as const
export type ApiKeyScheme = (typeof ApiKeyScheme)[keyof typeof ApiKeyScheme]

export const ParameterType = {
  String: 'string',
  Integer: 'integer',
  Number: 'number',
  Boolean: 'boolean',
  Array: 'array',
  Object: 'object',
} as const
export type ParameterType = (typeof ParameterType)[keyof typeof ParameterType]

export const ParameterIn = {
  Path: 'path',
  Query: 'query',
  Body: 'body',
  Header: 'header',
} as const
export type ParameterIn = (typeof ParameterIn)[keyof typeof ParameterIn]

/**
 * Visual definition of an operation input parameter. Matches the backend's
 * Pydantic ParameterDef. `properties` is recursive for `type: 'object'`.
 *
 * The frontend hands these to the backend and the backend derives the
 * JSON-Schema view stored on the Operation row — the AI's MCP tool schema
 * is generated from there, not from this list directly.
 */
export interface ParameterDef {
  name: string
  type: ParameterType
  description: string
  required: boolean
  /** Destination at HTTP time: `path`, `query`, `body`, or `header`. */
  in: ParameterIn
  /** Restricts string values; rendered as JSON Schema `enum`. */
  enumValues: string[] | null
  /** Element type when `type === 'array'`. */
  itemType: ParameterType | null
  /** Nested parameters when `type === 'object'`. */
  properties: ParameterDef[] | null
  /**
   * Optional fallback the dispatcher injects when the caller's input
   * omits this key entirely. Also rendered as JSON Schema `default`
   * so the LLM sees it as documentation in the tool definition.
   * `null` means "no default" (omitted keys stay omitted at HTTP
   * time). An explicit `""` or `null` from the caller passes through
   * — defaults only fire for keys the caller didn't include at all.
   */
  default: unknown | null
}

export interface Connector {
  id: string
  name: string
  description: string
  authType: ConnectorAuthType
  baseUrl: string
  hasCredentials: boolean
  /**
   * Set only for OAuth2 conectores. `null` for other auth types.
   * `true` once the handshake completed and an access_token is on file;
   * `false` when OAuth2 is configured but the user hasn't clicked "Connect".
   */
  oauth2Connected: boolean | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Per-operation retry policy for transient HTTP failures (e.g. flaky CDNs
 * returning sporadic 404s/5xx). Auth statuses 401/403 are routed through
 * the OAuth2 refresh path and are ignored if listed here.
 */
export interface RetryPolicy {
  maxAttempts: number
  retryOnStatus: number[]
  initialDelayMs: number
  multiplier: number
  jitter: boolean
}

export interface Operation {
  id: string
  connectorId: string
  name: string
  description: string
  method: HttpMethod
  path: string
  parameters: ParameterDef[]
  fixedHeaders: Record<string, string>
  fixedBody: Record<string, unknown> | null
  retryPolicy: RetryPolicy | null
  /** Derived from `parameters` server-side. Read-only on the UI. */
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  isActive: boolean
  createdAt: string
}

/** Form state for ConnectorForm — flat, all-in-one shape. */
export interface ConnectorFormValues {
  name: string
  description: string
  baseUrl: string
  authType: ConnectorAuthType
  isActive: boolean
  /** API-key sub-form (only meaningful when authType === 'api_key'). */
  apiKeyToken: string
  apiKeyScheme: ApiKeyScheme
  apiKeyHeader: string
  apiKeyQuery: string
  /** Basic auth sub-form (only meaningful when authType === 'basic'). */
  basicUsername: string
  basicPassword: string
  /** OAuth2 sub-form (only meaningful when authType === 'oauth2'). */
  oauth2AuthorizeUrl: string
  oauth2TokenUrl: string
  oauth2ClientId: string
  oauth2ClientSecret: string
  oauth2Scope: string
}

/**
 * Emitted by ConnectorForm.onSubmit. `credentials` semantics:
 *   undefined → omit (keep stored value)
 *   null      → clear stored credentials
 *   object    → set / replace
 */
export interface ConnectorFormSubmit {
  name: string
  description: string
  baseUrl: string
  authType: ConnectorAuthType
  isActive: boolean
  credentials?: Record<string, unknown> | null
}

export interface OperationFormValues {
  name: string
  description: string
  method: HttpMethod
  path: string
  parameters: ParameterDef[]
  fixedHeaders: Array<{ name: string; value: string }>
  /** JSON template as raw text (so invalid buffers survive editing). */
  fixedBodyText: string
  /** Output schema kept as raw text — it's editor-side, not visual. */
  outputSchemaText: string
  /** Null when the user has retry disabled — the editor toggle controls this. */
  retryPolicy: RetryPolicy | null
  isActive: boolean
}

export interface OperationFormSubmit {
  name: string
  description: string
  method: HttpMethod
  path: string
  parameters: ParameterDef[]
  fixedHeaders: Record<string, string>
  fixedBody: Record<string, unknown> | null
  retryPolicy: RetryPolicy | null
  outputSchema: Record<string, unknown>
  isActive: boolean
}

export interface OperationTestResult {
  ok: boolean
  statusCode: number | null
  latencyMs: number
  requestMethod: string
  requestUrl: string
  response: Record<string, unknown> | null
  error: string | null
}

/**
 * Derive a JSON Schema view of an input-parameters list. Mirrors the
 * backend's `parameters_to_input_schema` so dialogs (e.g. the test panel)
 * can build the same skeleton on the client without a round-trip.
 *
 * `in` is intentionally not encoded — it's an execution-layer concern,
 * not part of the AI's tool schema.
 */
export function parametersToInputSchema(
  parameters: ParameterDef[],
): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (const p of parameters) {
    properties[p.name] = parameterToSchema(p)
    if (p.required) required.push(p.name)
  }
  const schema: Record<string, unknown> = {
    type: 'object',
    properties,
  }
  if (required.length > 0) schema.required = required
  return schema
}

function parameterToSchema(param: ParameterDef): Record<string, unknown> {
  const out: Record<string, unknown> = { type: param.type }
  if (param.description) out.description = param.description
  if (param.type === ParameterType.String && param.enumValues) {
    out.enum = [...param.enumValues]
  }
  if (param.type === ParameterType.Array) {
    out.items = { type: param.itemType ?? ParameterType.String }
  }
  if (param.type === ParameterType.Object) {
    const subProps: Record<string, unknown> = {}
    const subRequired: string[] = []
    for (const sub of param.properties ?? []) {
      subProps[sub.name] = parameterToSchema(sub)
      if (sub.required) subRequired.push(sub.name)
    }
    out.properties = subProps
    if (subRequired.length > 0) out.required = subRequired
  }
  // Params without a default omit the key entirely so we don't ship
  // `"default": null` (which an LLM might read as "send null").
  if (param.default !== null && param.default !== undefined) {
    out.default = param.default
  }
  return out
}
