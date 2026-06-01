export interface LLMProvider {
  id: string
  name: string
  baseUrl: string
  chatUrl: string | null
  modelsUrl: string | null
  hasApiKey: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LLMProviderModel {
  id: string
  ownedBy: string | null
}

export interface LLMProviderFormValues {
  name: string
  baseUrl: string
  chatUrl: string | null
  modelsUrl: string | null
  isActive: boolean
}

/**
 * apiKey semantics mirror the backend contract:
 * - `undefined` → omit from payload (don't touch the stored key)
 * - `''`        → delete the stored key
 * - `'sk-...'`  → set / rotate the key
 */
export interface LLMProviderFormSubmit extends LLMProviderFormValues {
  apiKey?: string
}
