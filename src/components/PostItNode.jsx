import { useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'

export default function PostItNode({ data, selected }) {
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
      data.onRename?.(title.trim() || 'Senza titolo')
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
        className="rounded-sm shadow-md select-none"
        style={{
          width: 180,
          minHeight: 100,
          background: '#FAC775',
          border: selected ? '2px solid #378ADD' : '2px solid transparent',
          padding: '28px 12px 12px',
          position: 'relative',
        }}
      >
        {/* Tape effect */}
        <div
          style={{
            position: 'absolute',
            top: -6,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 48,
            height: 14,
            background: 'rgba(255,255,255,0.6)',
            borderRadius: 2,
          }}
        />

        {editing ? (
          <input
            ref={inputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none text-sm font-semibold text-gray-800 resize-none"
            style={{ fontFamily: 'inherit' }}
          />
        ) : (
          <p
            className="text-sm font-semibold text-gray-800 break-words leading-snug cursor-text"
            onDoubleClick={handleDoubleClick}
          >
            {title || 'Senza titolo'}
          </p>
        )}

        {data.body && (
          <p className="text-xs text-gray-600 mt-2 line-clamp-3 leading-snug">
            {data.body}
          </p>
        )}
      </div>

      {/* Action buttons */}
      {showActions && !editing && (
        <div
          className="absolute flex gap-1"
          style={{ bottom: -30, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
        >
          <button
            className="bg-white rounded-md shadow px-2 py-1 text-xs hover:bg-gray-50 border border-gray-200"
            title="Apri note"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); data.handlersRef?.current?.onNoteOpen?.(data.card) }}
          >
            ↓ note
          </button>
          <button
            className="bg-white rounded-md shadow px-2 py-1 text-xs hover:bg-gray-50 border border-gray-200"
            title="Converti in testo libero"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); data.handlersRef?.current?.onConvertToText?.(data.card) }}
          >
            T testo
          </button>
          <button
            className="bg-white rounded-md shadow px-2 py-1 text-xs hover:bg-gray-50 border border-gray-200"
            title="Converti in cartella"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); data.handlersRef?.current?.onConvertToFolder?.(data.card) }}
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
