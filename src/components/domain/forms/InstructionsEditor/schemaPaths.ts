/**
 * Walks a JSON Schema and yields the dotted paths to every leaf property.
 * Arrays surface as `field[*]` so the caller can show the wildcard form
 * (matches the runtime expansion done by `extract_context_sources`).
 *
 * Object branches are emitted as paths too, so the palette can show the
 * branch and still let the user drill in.
 */
export interface SchemaPath {
  /** Dotted path, e.g. `client.industry` or `experience[*].title`. */
  path: string
  /** Last segment for display; falls back to root marker. */
  label: string
  /** True when this is a JSON-Schema leaf (string / number / boolean / …). */
  isLeaf: boolean
}

type JsonSchema = {
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  items?: JsonSchema | JsonSchema[]
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  allOf?: JsonSchema[]
}

function isObject(schema: JsonSchema | undefined): boolean {
  if (!schema) return false
  if (Array.isArray(schema.type)) return schema.type.includes('object')
  return schema.type === 'object' || Boolean(schema.properties)
}

function isArray(schema: JsonSchema | undefined): boolean {
  if (!schema) return false
  if (Array.isArray(schema.type)) return schema.type.includes('array')
  return schema.type === 'array' || Boolean(schema.items)
}

function mergeComposites(schema: JsonSchema | undefined): JsonSchema | undefined {
  if (!schema) return schema
  const composites = [schema.anyOf, schema.oneOf, schema.allOf].filter(
    Boolean,
  ) as JsonSchema[][]
  if (composites.length === 0) return schema
  // Pick the first composite branch that has structure — schemas generated
  // by Pydantic for optionals look like {anyOf: [<real>, {type: 'null'}]}.
  for (const list of composites) {
    for (const candidate of list) {
      if (isObject(candidate) || isArray(candidate)) return candidate
    }
  }
  return schema
}

export function listSchemaPaths(
  rawSchema: JsonSchema | undefined,
  prefix = '',
): SchemaPath[] {
  const schema = mergeComposites(rawSchema)
  if (!schema) {
    return prefix ? [{ path: prefix, label: tailSegment(prefix), isLeaf: true }] : []
  }

  if (isObject(schema) && schema.properties) {
    const out: SchemaPath[] = []
    if (prefix) {
      out.push({ path: prefix, label: tailSegment(prefix), isLeaf: false })
    }
    for (const [key, sub] of Object.entries(schema.properties)) {
      const next = prefix ? `${prefix}.${key}` : key
      out.push(...listSchemaPaths(sub, next))
    }
    return out
  }

  if (isArray(schema)) {
    const items = Array.isArray(schema.items) ? schema.items[0] : schema.items
    const next = prefix ? `${prefix}[*]` : '[*]'
    if (isObject(items) || isArray(items)) {
      return listSchemaPaths(items, next)
    }
    return [{ path: next, label: tailSegment(next), isLeaf: true }]
  }

  return prefix
    ? [{ path: prefix, label: tailSegment(prefix), isLeaf: true }]
    : []
}

function tailSegment(path: string): string {
  const lastDot = path.lastIndexOf('.')
  return lastDot === -1 ? path : path.slice(lastDot + 1)
}

/**
 * Validates that `path` (no wildcards) resolves inside `schema`.
 * `[*]` segments in the path are treated as array drill-in.
 *
 * Returns true when the path lands on a leaf or branch, false when
 * the schema rejects the path entirely.
 */
export function pathExists(
  schema: JsonSchema | undefined,
  path: string,
): boolean {
  if (!schema) return false
  if (!path) return true
  const segments = path
    .split('[*]')
    .join('.[*]')
    .split('.')
    .filter(Boolean)

  let cursor: JsonSchema | undefined = mergeComposites(schema)
  for (const seg of segments) {
    cursor = mergeComposites(cursor)
    if (!cursor) return false
    if (seg === '[*]') {
      if (!isArray(cursor)) return false
      cursor = Array.isArray(cursor.items) ? cursor.items[0] : cursor.items
      continue
    }
    if (!isObject(cursor) || !cursor.properties) return false
    cursor = cursor.properties[seg]
    if (!cursor) return false
  }
  return true
}
