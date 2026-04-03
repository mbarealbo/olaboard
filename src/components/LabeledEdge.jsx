import { useState, useCallback } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react'

export default function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  selected,
}) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelValue, setLabelValue] = useState(data?.label || '')
  const { setEdges } = useReactFlow()

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const handleLabelClick = useCallback((e) => {
    e.stopPropagation()
    setEditingLabel(true)
  }, [])

  const handleLabelBlur = useCallback(() => {
    setEditingLabel(false)
    data?.onLabelChange?.(id, labelValue)
  }, [id, labelValue, data])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.target.blur()
    }
    e.stopPropagation()
  }, [])

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#1a5fa8' : '#378ADD',
          strokeWidth: 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 10,
          }}
          className="nodrag nopan"
        >
          {editingLabel ? (
            <input
              autoFocus
              value={labelValue}
              onChange={e => setLabelValue(e.target.value)}
              onBlur={handleLabelBlur}
              onKeyDown={handleKeyDown}
              className="bg-white border border-blue-400 rounded px-2 py-0.5 text-xs shadow text-gray-700 outline-none"
              style={{ minWidth: 60 }}
            />
          ) : (
            <div
              onClick={handleLabelClick}
              className="cursor-pointer"
              title="Clicca per aggiungere etichetta"
            >
              {labelValue ? (
                <span className="bg-white border border-gray-200 rounded px-2 py-0.5 text-xs shadow text-gray-700">
                  {labelValue}
                </span>
              ) : (
                <span
                  className="w-3 h-3 rounded-full bg-blue-400 block opacity-0 hover:opacity-100 transition-opacity"
                  style={{ border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
                />
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
