import * as React from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { X } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import { ChipValidatorContext } from './context'

export function ContextRefNodeView(props: NodeViewProps) {
  const { node, deleteNode } = props
  const source = (node.attrs.source as string) ?? ''
  const path = (node.attrs.path as string) ?? ''

  const validator = React.useContext(ChipValidatorContext)
  const validation = validator ? validator(source, path) : { state: 'ok' as const }
  const tone = validation.state

  return (
    <NodeViewWrapper as="span" className="inline-block align-baseline">
      <span
        data-context-ref
        title={
          validation.message ?? (path ? `${source}.${path}` : `${source} (full source)`)
        }
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono align-baseline border',
          tone === 'ok' &&
            'bg-accent-subtle text-text-primary border-accent-border',
          tone === 'unknown-source' &&
            'bg-danger/15 text-danger border-danger/40',
          tone === 'unknown-path' &&
            'bg-warning/15 text-warning border-warning/40',
        )}
        contentEditable={false}
      >
        {path ? (
          <>
            <span className="opacity-60">{source}.</span>
            <span>{path}</span>
          </>
        ) : (
          <span>{source}</span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            deleteNode()
          }}
          aria-label="Remove context reference"
          className="opacity-50 hover:opacity-100 ml-0.5"
        >
          <X size={11} />
        </button>
      </span>
    </NodeViewWrapper>
  )
}
