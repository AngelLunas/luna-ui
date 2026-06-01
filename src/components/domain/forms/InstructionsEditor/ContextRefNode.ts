import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ContextRefNodeView } from './ContextRefNodeView'

/**
 * Inline atomic node that represents `${context.<source>.<path>}`.
 *
 * `atom: true` means ProseMirror treats it as a single token — Backspace
 * deletes it whole, the cursor never enters it. The node lives inline
 * so it can sit between text runs the way a chip would.
 */
export const ContextRefNode = Node.create({
  name: 'contextRef',

  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      source: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-source') ?? '',
        renderHTML: (attrs) => ({ 'data-source': attrs.source as string }),
      },
      path: {
        default: '',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-path') ?? '',
        renderHTML: (attrs) => ({ 'data-path': attrs.path as string }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-context-ref]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const source = HTMLAttributes['data-source'] as string
    const path = HTMLAttributes['data-path'] as string
    const marker = path
      ? `\${context.${source}.${path}}`
      : `\${context.${source}}`
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-context-ref': '', contenteditable: 'false' }),
      marker,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ContextRefNodeView)
  },
})
