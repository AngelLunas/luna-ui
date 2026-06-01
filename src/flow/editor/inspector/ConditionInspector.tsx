import { useFlowEditor } from '../store'
import { edgeKey } from '../store'

export interface ConditionInspectorProps {
  nodeId: string
}

export function ConditionInspector({ nodeId }: ConditionInspectorProps) {
  const outgoing = useFlowEditor((s) =>
    s.edges
      .map((e, i) => ({ edge: e, key: edgeKey(e, i) }))
      .filter((x) => x.edge.from === nodeId),
  )

  return (
    <div className="text-xs text-text-muted leading-relaxed">
      <p>
        Condition nodes route by{' '}
        <span className="text-text-primary">edge predicates</span>. Select an
        outgoing edge in the canvas to set its condition.
      </p>
      {outgoing.length > 0 && (
        <ul className="mt-2 list-disc list-inside flex flex-col gap-0.5">
          {outgoing.map(({ edge, key }) => (
            <li key={key}>
              → {edge.to}
              {edge.condition && (
                <span className="text-text-primary">
                  {' '}
                  ({edge.condition.field} {edge.condition.operator}{' '}
                  {String(edge.condition.value)})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
