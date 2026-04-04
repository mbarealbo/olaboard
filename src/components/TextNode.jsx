import { useState, useEffect } from 'react'
import { Handle, Position } from '@xyflow/react'

export default function TextNode({ data, selected }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(data.title || 'Testo libero')
  const [hover, setHover] = useState(false)

  useEffect(() => { setTitle(data.title || 'Testo libero') }, [data.title])

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: '#ffffff',
        border: `2px solid ${selected ? '#378ADD' : hover ? '#aaa' : '#d0d0d0'}`,
        borderRadius: 8,
        minWidth: 140,
        minHeight: 60,
        padding: '10px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        cursor: 'default',
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => {
            setEditing(false)
            data.onRename?.(title.trim() || 'Testo libero')
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === 'Escape') e.target.blur()
            e.stopPropagation()
          }}
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: '#222', width: '100%', fontFamily: 'inherit'
          }}
        />
      ) : (
        <p
          style={{ fontSize: 13, color: '#333', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}
          onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
        >
          {title}
        </p>
      )}

      {hover && !editing && (
        <div style={{
          position: 'absolute', bottom: -34, left: '50%',
          transform: 'translateX(-50%)', display: 'flex',
          gap: 4, zIndex: 9999,
        }}>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); data.handlersRef?.current?.onConvertToPostIt?.(data.card) }}
            style={{ background: '#fff', border: '1px solid #d0d0d0', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
          >🗒 post-it</button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); data.handlersRef?.current?.onNoteOpen?.(data.card) }}
            style={{ background: '#fff', border: '1px solid #d0d0d0', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
          >↓ note</button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); data.handlersRef?.current?.onConvertToFolder?.(data.card) }}
            style={{ background: '#fff', border: '1px solid #d0d0d0', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
          >📁</button>
        </div>
      )}

      <Handle type="target" position={Position.Top} style={{ opacity: 0.4 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0.4 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0.4 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0.4 }} />
    </div>
  )
}