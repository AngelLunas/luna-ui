import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '../../../lib/utils'

export interface MarkdownTextProps {
  text: string
  className?: string
}

const components: Components = {
  p: ({ node: _node, ...props }) => (
    <p className="text-sm text-text-primary whitespace-pre-wrap [&:not(:last-child)]:mb-2" {...props} />
  ),
  a: ({ node: _node, ...props }) => (
    <a
      className="text-accent underline underline-offset-2 hover:text-text-primary"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  strong: ({ node: _node, ...props }) => (
    <strong className="font-semibold text-text-primary" {...props} />
  ),
  em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
  del: ({ node: _node, ...props }) => (
    <del className="text-text-muted line-through" {...props} />
  ),
  ul: ({ node: _node, ...props }) => (
    <ul className="my-2 ml-5 list-disc text-sm text-text-primary [&_ul]:my-0 [&_ol]:my-0" {...props} />
  ),
  ol: ({ node: _node, ...props }) => (
    <ol className="my-2 ml-5 list-decimal text-sm text-text-primary [&_ul]:my-0 [&_ol]:my-0" {...props} />
  ),
  li: ({ node: _node, ...props }) => <li className="my-0.5" {...props} />,
  h1: ({ node: _node, ...props }) => (
    <h1 className="mb-2 mt-3 text-base font-semibold text-text-primary" {...props} />
  ),
  h2: ({ node: _node, ...props }) => (
    <h2 className="mb-2 mt-3 text-sm font-semibold text-text-primary" {...props} />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3 className="mb-1 mt-2 text-sm font-semibold text-text-primary" {...props} />
  ),
  h4: ({ node: _node, ...props }) => (
    <h4 className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wider text-text-muted" {...props} />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="my-2 border-l-2 border-border pl-3 text-sm italic text-text-muted"
      {...props}
    />
  ),
  hr: ({ node: _node, ...props }) => <hr className="my-3 border-border" {...props} />,
  code: ({ node: _node, className, children, ...props }) => {
    const isInline = !/language-/.test(className ?? '')
    if (isInline) {
      return (
        <code
          className="rounded bg-surface px-1 py-0.5 font-mono text-[12px] text-text-primary"
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code className={cn('font-mono text-[12px]', className)} {...props}>
        {children}
      </code>
    )
  },
  pre: ({ node: _node, ...props }) => (
    <pre
      className="my-2 max-h-96 overflow-auto rounded border border-border bg-surface p-2 text-[12px] font-mono text-text-primary"
      {...props}
    />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="my-2 overflow-x-auto rounded border border-border">
      <table className="w-full border-collapse text-xs" {...props} />
    </div>
  ),
  thead: ({ node: _node, ...props }) => (
    <thead className="bg-surface text-left" {...props} />
  ),
  tbody: ({ node: _node, ...props }) => <tbody {...props} />,
  tr: ({ node: _node, ...props }) => (
    <tr className="border-b border-border last:border-b-0" {...props} />
  ),
  th: ({ node: _node, ...props }) => (
    <th
      className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted"
      {...props}
    />
  ),
  td: ({ node: _node, ...props }) => (
    <td className="px-2 py-1.5 align-top text-text-primary" {...props} />
  ),
  input: ({ node: _node, type, checked, ...props }) => {
    if (type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mr-1 align-middle accent-accent"
          {...props}
        />
      )
    }
    return <input type={type} {...props} />
  },
}

/**
 * Renders markdown text using `react-markdown` with GitHub Flavored Markdown
 * (tables, strikethrough, task lists, autolinks) via `remark-gfm`.
 */
export function MarkdownText({ text, className }: MarkdownTextProps) {
  return (
    <div className={cn('text-sm text-text-primary', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
