import * as React from 'react'
import { ChevronDown, ChevronRight, Database } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import type { ContextSource } from '../../../../types/contextSource'
import { cn } from '../../../../lib/utils'
import { listSchemaPaths } from './schemaPaths'

export interface ContextChipPaletteProps {
  sources: ContextSource[]
  editor: Editor | null
  /** Optional className for the palette container. */
  className?: string
}

/**
 * Side panel that lists every context source with its expandable JSON-schema
 * tree. Clicking a leaf inserts a `contextRef` chip at the editor's caret.
 */
export function ContextChipPalette({
  sources,
  editor,
  className,
}: ContextChipPaletteProps) {
  if (sources.length === 0) {
    return (
      <div
        className={cn(
          'text-xs text-text-muted p-3 border border-dashed border-border rounded',
          className,
        )}
      >
        No context sources registered.
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {sources.map((source) => (
        <SourceBlock key={source.name} source={source} editor={editor} />
      ))}
    </div>
  )
}

function SourceBlock({
  source,
  editor,
}: {
  source: ContextSource
  editor: Editor | null
}) {
  const [open, setOpen] = React.useState(true)
  const paths = React.useMemo(() => listSchemaPaths(source.schema), [source.schema])

  function insert(path: string) {
    if (!editor) return
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'contextRef',
        attrs: { source: source.name, path },
      })
      .insertContent(' ')
      .run()
  }

  return (
    <div className="rounded border border-border bg-bg/40">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-text-muted hover:text-text-primary"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <Database size={12} className="text-text-muted" />
        <button
          type="button"
          onClick={() => insert('')}
          disabled={!editor}
          title={`Insert whole \${context.${source.name}}`}
          className="font-medium text-xs text-text-primary hover:text-accent text-left flex-1"
        >
          {source.name}
        </button>
        {source.id_implicit && (
          <span className="text-[10px] text-text-muted">implicit</span>
        )}
      </div>
      {open && (
        <div className="px-2 pb-2">
          {source.description && (
            <p className="text-[11px] text-text-muted mb-1.5">
              {source.description}
            </p>
          )}
          {paths.length === 0 ? (
            <p className="text-[11px] text-text-muted italic">
              No drilldown paths. Click the source name above to insert it whole.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {paths.map((p) => (
                <li key={p.path}>
                  <button
                    type="button"
                    disabled={!editor}
                    onClick={() => insert(p.path)}
                    title={`Insert ${source.name}.${p.path}${p.isLeaf ? '' : ' (whole branch)'}`}
                    className={cn(
                      'w-full text-left px-1.5 py-0.5 rounded text-[11px] font-mono cursor-pointer',
                      p.isLeaf
                        ? 'text-text-primary hover:bg-accent-subtle'
                        : 'text-text-muted hover:bg-accent-subtle hover:text-text-primary',
                    )}
                  >
                    {p.path}
                    {!p.isLeaf && <span className="opacity-50 ml-1">·</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
