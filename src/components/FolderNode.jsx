import { useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'

export default function FolderNode({ data, selected }) {
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
    // If not editing text, enter the folder
    if (!editing) {
      data.onEnter?.()
    }
  }, [editing, data])

  const handleTitleDoubleClick = useCallback((e) => {
    e.stopPropagation()
    setEditing(true)
  }, [])

  const handleBlur = useCallback(() => {
    setEditing(false)
    if (title.trim() !== data.title) {
      data.onRename?.(title.trim() || 'Cartella')
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
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="rounded-sm shadow-md select-none"
        style={{
          width: 180,
          minHeight: 100,
          background: '#EF9F27',
          border: selected ? '2px solid #378ADD' : '2px solid transparent',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Folder tab */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 28,
            background: 'rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>📁</span>
          {editing ? (
            <input
              ref={inputRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-white"
              style={{ fontFamily: 'inherit' }}
            />
          ) : (
            <span
              className="text-xs font-semibold text-white truncate flex-1"
              onDoubleClick={handleTitleDoubleClick}
            >
              {title || 'Cartella'}
            </span>
          )}
        </div>

        <div style={{ padding: '36px 12px 12px' }}>
          <p className="text-xs text-white opacity-75 text-center">
            Doppio click per entrare →
          </p>
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
            title="Entra nella cartella"
            onMouseDown={e => { e.stopPropagation(); data.onEnter?.() }}
          >
            → entra
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
