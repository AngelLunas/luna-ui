/**
 * Generic shape of a context source registered in a luna-core backend.
 * The InstructionsEditor and ContextChipPalette work against this type
 * — they don't depend on any specific app/domain.
 */
export interface ContextSource {
  name: string
  description: string
  id_implicit?: boolean
  /** JSON Schema (Pydantic's `.model_json_schema()` output). */
  schema: Record<string, unknown>
}
