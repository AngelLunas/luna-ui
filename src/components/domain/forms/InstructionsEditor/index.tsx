import * as React from 'react'
import { EditorContent, useEditor, type Editor, type JSONContent } from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import HardBreak from '@tiptap/extension-hard-break'
import History from '@tiptap/extension-history'
import Placeholder from '@tiptap/extension-placeholder'
import { Eye, Loader2 } from 'lucide-react'
import { Badge } from '../../../ui/badge'
import { Button } from '../../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog'
import { cn } from '../../../../lib/utils'
import type { ContextSource } from '../../../../types/contextSource'
import { ContextRefNode } from './ContextRefNode'
import { ContextChipPalette } from './ContextChipPalette'
import {
  extractRequiredSources,
  parseInstructions,
  serializeInstructions,
} from './serialize'
import { makeChipValidator } from './validation'
import { ChipValidatorContext } from './context'

export interface InstructionsPreviewResult {
  resolved: string
  required_sources?: string[]
  diagnostics?: Array<{
    name: string
    status: string
    detail?: string
  }>
}

export interface InstructionsEditorProps {
  /**
   * Current serialized value (`${context.<source>.<path>}` markers + plain text).
   * The editor is controlled-by-value: when this changes from the outside
   * (e.g. loading an agent), the doc is re-parsed.
   */
  value: string
  /**
   * Fired on every doc change. `requiredSources` is the deduplicated list of
   * source names referenced — same algorithm as the backend's
   * `extract_context_sources`, surfaced live for the UI.
   */
  onChange: (
    value: string,
    meta: { requiredSources: string[]; hasInvalidChip: boolean },
  ) => void
  /** Context sources used to validate chips and to power the side palette. */
  contextSources: ContextSource[]
  placeholder?: string
  /** Hide the chip palette (e.g. read-only / mobile). */
  hidePalette?: boolean
  /** Read-only mode: doc not editable, palette hidden. */
  readOnly?: boolean
  /** Footer slot rendered below the editor (e.g. required-sources preview). */
  footer?: React.ReactNode
  className?: string
  /** Min height in px for the editor surface. */
  minHeight?: number
  /**
   * When provided, a "Preview" button appears in the editor toolbar. The
   * callback is given the current serialized instructions and is expected
   * to return what the backend would render (typically by calling
   * `POST /agents/preview-instructions`). The editor opens a dialog with
   * the resolved text and per-source diagnostics. Omit this prop to hide
   * the preview button entirely.
   */
  onPreview?: (instructions: string) => Promise<InstructionsPreviewResult>
}

/**
 * Reusable rich-text editor for AI agent instructions.
 *
 * Inline `${context.<source>.<path>}` markers render as atomic chips with
 * validation tone (unknown source → red, unknown path → amber).
 * Inserting a chip is handled by the side palette; deleting one uses
 * Backspace like any atomic node. The serialized output round-trips
 * losslessly through {@link parseInstructions} / {@link serializeInstructions}.
 */
export function InstructionsEditor({
  value,
  onChange,
  contextSources,
  placeholder = 'Write instructions… use the palette to insert context references.',
  hidePalette = false,
  readOnly = false,
  footer,
  className,
  minHeight = 200,
  onPreview,
}: InstructionsEditorProps) {
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewBusy, setPreviewBusy] = React.useState(false)
  const [previewResult, setPreviewResult] =
    React.useState<InstructionsPreviewResult | null>(null)
  const [previewError, setPreviewError] = React.useState<string | null>(null)
  // Keep the latest serialized value in a ref so the preview-button handler
  // doesn't go stale when the editor updates between renders.
  const valueRef = React.useRef(value)
  React.useEffect(() => {
    valueRef.current = value
  }, [value])

  async function handlePreview() {
    if (!onPreview) return
    setPreviewOpen(true)
    setPreviewBusy(true)
    setPreviewError(null)
    setPreviewResult(null)
    try {
      const result = await onPreview(valueRef.current)
      setPreviewResult(result)
    } catch (err) {
      setPreviewError((err as Error).message || 'Preview failed')
    } finally {
      setPreviewBusy(false)
    }
  }

  const validator = React.useMemo(
    () => makeChipValidator(contextSources),
    [contextSources],
  )

  const editor: Editor | null = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      History,
      Placeholder.configure({ placeholder }),
      ContextRefNode,
    ],
    content: parseInstructions(value),
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: cn(
          'w-full px-3 py-2 text-sm text-text-primary outline-none',
          'whitespace-pre-wrap break-words leading-relaxed',
        ),
      },
    },
    onUpdate({ editor }: { editor: Editor }) {
      const doc = editor.getJSON()
      const serialized = serializeInstructions(doc)
      const requiredSources = extractRequiredSources(serialized)
      const hasInvalidChip = collectChips(doc).some(({ source, path }) =>
        validator(source, path).state !== 'ok',
      )
      onChange(serialized, { requiredSources, hasInvalidChip })
    },
  })

  // Sync external `value` → editor when it diverges (e.g. when the agent
  // loads after mount). Guard with a serialize round-trip to avoid loops.
  React.useEffect(() => {
    if (!editor) return
    const current = serializeInstructions(editor.getJSON())
    if (current === value) return
    editor.commands.setContent(parseInstructions(value), false)
  }, [editor, value])

  // Force chip NodeViews to re-render when the validator changes (e.g. the
  // context-sources list arrived from the network). Dispatching an empty
  // transaction is the canonical ProseMirror way to refresh views.
  React.useEffect(() => {
    if (!editor) return
    editor.view.dispatch(editor.state.tr)
  }, [editor, validator])

  const showPalette = !hidePalette && !readOnly

  return (
    <ChipValidatorContext.Provider value={validator}>
      <div className={cn('flex gap-3', className)}>
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div
            className="rounded border border-border bg-bg/40 focus-within:border-accent-border focus-within:ring-1 focus-within:ring-accent"
            style={{ minHeight }}
          >
            <EditorContent editor={editor} />
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0 flex-1">{footer}</div>
            {onPreview && !readOnly && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handlePreview()}
                disabled={previewBusy}
              >
                {previewBusy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Eye size={14} />
                )}
                Preview
              </Button>
            )}
          </div>
        </div>
        {showPalette && (
          <aside className="w-64 shrink-0">
            <p className="text-xs text-text-muted mb-1.5">Context sources</p>
            <ContextChipPalette
              sources={contextSources}
              editor={editor}
              className="max-h-[420px] overflow-y-auto pr-1"
            />
          </aside>
        )}
      </div>
      <InstructionsPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        busy={previewBusy}
        result={previewResult}
        error={previewError}
      />
    </ChipValidatorContext.Provider>
  )
}

function InstructionsPreviewDialog({
  open,
  onOpenChange,
  busy,
  result,
  error,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy: boolean
  result: InstructionsPreviewResult | null
  error: string | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Instructions preview</DialogTitle>
          <DialogDescription>
            Exact text the agent will receive after the backend resolves every
            <code className="mx-1 text-xs font-mono">${'${context.…}'}</code>
            reference.
          </DialogDescription>
        </DialogHeader>

        {busy && (
          <p className="text-sm text-text-muted flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Resolving…
          </p>
        )}

        {error && !busy && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {result && !busy && (
          <div className="flex flex-col gap-3">
            {result.diagnostics && result.diagnostics.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.diagnostics.map((d) => (
                  <Badge
                    key={d.name}
                    variant={
                      d.status === 'ok'
                        ? 'success'
                        : d.status === 'unknown-source'
                          ? 'danger'
                          : 'warning'
                    }
                    title={d.detail}
                    className="text-[10px]"
                  >
                    {d.name}: {d.status}
                  </Badge>
                ))}
              </div>
            )}
            <pre className="text-xs whitespace-pre-wrap font-mono text-text-primary bg-bg/40 border border-border rounded p-3 max-h-[60vh] overflow-y-auto">
              {result.resolved || (
                <span className="text-text-muted italic">
                  (empty after resolution)
                </span>
              )}
            </pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Convenience footer showing the required-sources chip strip. Use as the
 * `footer` prop of {@link InstructionsEditor} to mirror the server's
 * `extract_context_sources` output for the user.
 */
export function RequiredSourcesPreview({
  sources,
  className,
}: {
  sources: string[]
  className?: string
}) {
  if (sources.length === 0) {
    return (
      <p className={cn('text-xs text-text-muted', className)}>
        No context sources required yet.
      </p>
    )
  }
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <span className="text-xs text-text-muted">Required sources:</span>
      {sources.map((s) => (
        <Badge key={s} variant="accent" className="text-[10px]">
          {s}
        </Badge>
      ))}
    </div>
  )
}

interface RawNode {
  type?: string
  attrs?: Record<string, unknown>
  content?: RawNode[]
}

function collectChips(doc: JSONContent): { source: string; path: string }[] {
  const out: { source: string; path: string }[] = []
  const walk = (node: RawNode): void => {
    if (node?.type === 'contextRef') {
      out.push({
        source: (node.attrs?.source as string) ?? '',
        path: (node.attrs?.path as string) ?? '',
      })
    }
    if (Array.isArray(node?.content)) {
      for (const child of node.content) walk(child)
    }
  }
  walk(doc as RawNode)
  return out
}

export { serializeInstructions, parseInstructions, extractRequiredSources } from './serialize'
export { listSchemaPaths, pathExists } from './schemaPaths'
export type { ContextSource } from '../../../../types/contextSource'
