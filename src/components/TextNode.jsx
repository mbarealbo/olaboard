import { useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'

export default function TextNode({ data, selected }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(data.title)
  const [showActions, setShowActions] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setTitle(data.title)
  }, [data.title])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation()
    setEditing(true)
  }, [])

  const handleBlur = useCallback(() => {
    setEditing(false)
    if (title.trim() !== data.title) {
      data.onRename?.(title.trim() || 'Testo')
    }
  }, [title, data])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      inputRef.current?.blur()
    }
    e.stopPropagation()
  }, [])

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        style={{
          minWidth: 120,
          maxWidth: 260,
          border: selected ? '1px dashed #378ADD' : '1px dashed #d1d5db',
          borderRadius: 4,
          padding: '6px 10px',
          background: 'rgba(255,255,255,0.01)',
        }}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none outline-none text-sm text-gray-800 w-full"
            style={{ fontFamily: 'inherit', minWidth: 80 }}
          />
        ) : (
          <p
            className="text-sm text-gray-800 break-words leading-snug cursor-text select-none"
            onDoubleClick={handleDoubleClick}
          >
            {title || 'Testo libero'}
          </p>
        )}
      </div>

      {showActions && !editing && (
        <div
          className="absolute flex gap-1"
          style={{ bottom: -30, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
        >
          <button
            className="bg-white rounded-md shadow px-2 py-1 text-xs hover:bg-gray-50 border border-gray-200"
            title="Converti in post-it"
            onMouseDown={e => { e.stopPropagation(); data.onConvertToPostIt?.() }}
          >
            🗒 post-it
          </button>
          <button
            className="bg-white rounded-md shadow px-2 py-1 text-xs hover:bg-gray-50 border border-gray-200"
            title="Apri note"
            onMouseDown={e => { e.stopPropagation(); data.onOpenNote?.() }}
          >
            ↓ note
          </button>
          <button
            className="bg-white rounded-md shadow px-2 py-1 text-xs hover:bg-gray-50 border border-gray-200"
            title="Converti in cartella"
            onMouseDown={e => { e.stopPropagation(); data.onConvertToFolder?.() }}
          >
            📁
          </button>
        </div>
      )}

      <Handle type="target" position={Position.Top} style={{ opacity: 0.5 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0.5 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0.5 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0.5 }} />
    </div>
  )
}
