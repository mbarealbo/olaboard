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
        className="rounded-sm select-none"
        style={{
          minWidth: 140,
          maxWidth: 260,
          background: '#ffffff',
          border: selected ? '2px solid #378ADD' : '1px solid #d1d5db',
          boxShadow: selected ? '0 0 0 3px rgba(55,138,221,0.15)' : '0 1px 4px rgba(0,0,0,0.10)',
          padding: '10px 14px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 10,
            fontSize: 10,
            color: '#9ca3af',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontWeight: 600,
            userSelect: 'none',
          }}
        >
          T
        </div>

        <div style={{ marginTop: 14 }}>
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
              className="text-sm text-gray-800 break-words leading-snug cursor-text"
              onDoubleClick={handleDoubleClick}
            >
              {title || 'Testo libero'}
            </p>
          )}
        </div>
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
            post-it
          </button>
          <button
            className="bg-white rounded-md shadow px-2 py-1 text-xs hover:bg-gray-50 border border-gray-200"
            title="Apri note"
            onMouseDown={e => { e.stopPropagation(); data.onOpenNote?.() }}
          >
            note
          </button>
          <button
            className="bg-white rounded-md shadow px-2 py-1 text-xs hover:bg-gray-50 border border-gray-200"
            title="Converti in cartella"
            onMouseDown={e => { e.stopPropagation(); data.onConvertToFolder?.() }}
          >
            cartella
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
