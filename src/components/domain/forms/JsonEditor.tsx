import Editor, { type OnMount } from '@monaco-editor/react'
import { cn } from '../../../lib/utils'

export interface JsonEditorProps {
  /** Raw JSON text (controlled). */
  value: string
  /**
   * Fired on every keystroke. `parsed` is undefined while the buffer is
   * invalid JSON — callers can store the text and only persist when
   * `parsed` is available.
   */
  onChange: (
    value: string,
    meta: { parsed?: unknown; error?: string },
  ) => void
  /** Default Monaco language is 'json'. Override only for variants like 'jsonc'. */
  language?: 'json' | 'jsonc'
  /** Approximate height in px or any CSS height string. */
  height?: number | string
  readOnly?: boolean
  placeholder?: string
  className?: string
}

/**
 * Monaco-backed JSON editor with live parse-error reporting.
 *
 * Wrapped so the rest of the system never has to think about Monaco's
 * `OnMount` / theme setup. Theme is registered once on first mount —
 * Monaco's theme registry is global, so colliding registrations would
 * stomp each other.
 */
export function JsonEditor({
  value,
  onChange,
  language = 'json',
  height = 220,
  readOnly = false,
  placeholder,
  className,
}: JsonEditorProps) {
  const handleMount: OnMount = (_editor, monaco) => {
    if (!themeRegistered) {
      monaco.editor.defineTheme('luna-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#0d0f14',
          'editor.foreground': '#e2e4ed',
          'editorLineNumber.foreground': '#6b7280',
          'editor.lineHighlightBackground': '#161922',
          'editorCursor.foreground': '#6366f1',
          'editor.selectionBackground': '#6366f133',
        },
      })
      themeRegistered = true
    }
    monaco.editor.setTheme('luna-dark')
  }

  function handleChange(next: string | undefined) {
    const text = next ?? ''
    if (text.trim() === '') {
      onChange(text, { parsed: undefined })
      return
    }
    try {
      const parsed = JSON.parse(text) as unknown
      onChange(text, { parsed })
    } catch (e) {
      onChange(text, { error: (e as Error).message })
    }
  }

  return (
    <div
      className={cn(
        'rounded border border-border overflow-hidden bg-bg/40',
        className,
      )}
    >
      <Editor
        height={height}
        language={language}
        value={value}
        onMount={handleMount}
        onChange={handleChange}
        options={{
          readOnly,
          minimap: { enabled: false },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          tabSize: 2,
          formatOnPaste: true,
          formatOnType: false,
          renderWhitespace: 'none',
          fixedOverflowWidgets: true,
          placeholder,
        }}
      />
    </div>
  )
}

let themeRegistered = false
