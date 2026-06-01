import type { JSONContent } from '@tiptap/core'

/**
 * Inline marker the backend uses to reference a context source inside an
 * instruction template:
 *
 *   `${context.<source>}`           — whole source dict (stringified)
 *   `${context.<source>.<path>}`    — drilled-in scalar/branch
 *
 * The path part is optional — without it, the backend's `_format_template`
 * substitutes the full loaded dict (str-coerced). The brackets in `[*]`
 * and dots inside paths are part of the path grammar — match the backend's
 * parser, not a stricter identifier rule.
 */
export const CONTEXT_REF_RE =
  /\$\{context\.([A-Za-z_][\w]*)(?:\.([\w.\[\]*]+))?\}/g

export interface ContextRefAttrs {
  source: string
  path: string
}

/**
 * Tiptap doc → string. Each `contextRef` node serializes back into the
 * `${context.<source>.<path>}` marker; paragraph boundaries emit `\n`.
 * Idempotent with {@link parseInstructions}.
 */
export function serializeInstructions(doc: JSONContent | null | undefined): string {
  if (!doc) return ''
  let out = ''
  walk(doc, (node) => {
    if (node.type === 'text') {
      out += node.text ?? ''
      return
    }
    if (node.type === 'contextRef') {
      const attrs = (node.attrs ?? {}) as Partial<ContextRefAttrs>
      if (attrs.source) {
        out += attrs.path
          ? `\${context.${attrs.source}.${attrs.path}}`
          : `\${context.${attrs.source}}`
      }
      return
    }
    if (node.type === 'hardBreak') {
      out += '\n'
      return
    }
  }, (node) => {
    // After a block-level node closes, emit a newline so paragraphs
    // separate cleanly. Tiptap's default block-ish nodes are paragraph,
    // heading, blockquote, codeBlock, listItem — paragraph covers our case.
    if (node.type === 'paragraph') out += '\n'
  })
  // Collapse triple+ newlines and trim trailing whitespace.
  return out.replace(/\n{3,}/g, '\n\n').replace(/\s+$/g, '')
}

/**
 * String → Tiptap doc. Each `${context.<source>.<path>}` marker becomes
 * an atomic inline `contextRef` node; everything else is text. Newlines
 * split into separate paragraph nodes.
 */
export function parseInstructions(text: string): JSONContent {
  const lines = (text ?? '').split('\n')
  const paragraphs: JSONContent[] = lines.map((line) => ({
    type: 'paragraph',
    content: parseLine(line),
  }))
  return { type: 'doc', content: paragraphs }
}

function parseLine(line: string): JSONContent[] {
  if (!line) return []
  const content: JSONContent[] = []
  let last = 0
  // Reset the regex's lastIndex — global regexes are stateful.
  const re = new RegExp(CONTEXT_REF_RE.source, 'g')
  for (let m = re.exec(line); m !== null; m = re.exec(line)) {
    const [full, source, path] = m
    if (m.index > last) {
      content.push({ type: 'text', text: line.slice(last, m.index) })
    }
    content.push({
      type: 'contextRef',
      attrs: { source, path: path ?? '' },
    })
    last = m.index + full.length
  }
  if (last < line.length) {
    content.push({ type: 'text', text: line.slice(last) })
  }
  return content
}

/** Extracts the unique `source` names referenced by `${context.<source>.…}`. */
export function extractRequiredSources(text: string): string[] {
  const set = new Set<string>()
  const re = new RegExp(CONTEXT_REF_RE.source, 'g')
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    set.add(m[1])
  }
  return [...set].sort()
}

function walk(
  node: JSONContent,
  enter: (n: JSONContent) => void,
  leave: (n: JSONContent) => void,
): void {
  enter(node)
  if (node.content) for (const child of node.content) walk(child, enter, leave)
  leave(node)
}
