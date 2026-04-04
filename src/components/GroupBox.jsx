import { useRef, useState, useEffect } from 'react'

const RESIZE_HANDLES = [
  { id: 'nw', style: { top: -4, left:  -4, cursor: 'nw-resize' } },
  { id: 'n',  style: { top: -4, left: 'calc(50% - 4px)', cursor: 'n-resize' } },
  { id: 'ne', style: { top: -4, right: -4, cursor: 'ne-resize' } },
  { id: 'e',  style: { top: 'calc(50% - 4px)', right: -4, cursor: 'e-resize' } },
  { id: 'se', style: { bottom: -4, right: -4, cursor: 'se-resize' } },
  { id: 's',  style: { bottom: -4, left: 'calc(50% - 4px)', cursor: 's-resize' } },
  { id: 'sw', style: { bottom: -4, left: -4, cursor: 'sw-resize' } },
  { id: 'w',  style: { top: 'calc(50% - 4px)', left: -4, cursor: 'w-resize' } },
]

export function Group({ group, onTitleBarMouseDown, onResizeHandleMouseDown, onDelete, onTitleChange }) {
  return (
    <div
      style={{
        position: 'absolute', left: group.x, top: group.y,
        width: group.width, height: group.height,
        background: 'rgba(255,255,255,0.6)',
        border: '1.5px solid #d0d0d0', borderRadius: 8,
        zIndex: 0,
      }}
    >
      {/* Title bar */}
      <div
        style={{ height: 24, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'move' }}
        onMouseDown={onTitleBarMouseDown}
      >
        <span
          contentEditable
          suppressContentEditableWarning
          style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, outline: 'none', background: 'transparent', cursor: 'text', minWidth: 20 }}
          onMouseDown={e => e.stopPropagation()}
          onBlur={e => onTitleChange(e.target.textContent.trim() || 'Gruppo')}
          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); e.target.blur() } }}
        >{group.title}</span>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete() }}
        >×</button>
      </div>

      {/* Resize handles */}
      {RESIZE_HANDLES.map(h => (
        <div
          key={h.id}
          style={{ position: 'absolute', width: 8, height: 8, background: '#fff', border: '1px solid #aaa', ...h.style }}
          onMouseDown={e => { e.stopPropagation(); onResizeHandleMouseDown(e, h.id) }}
        />
      ))}
    </div>
  )
}

export function CanvasLabel({ label, selected, editing, onMouseDown, onStartEdit, onEndEdit, onTextChange, onDelete }) {
  const elRef = useRef(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (elRef.current) elRef.current.textContent = label.text
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editing && elRef.current) {
      elRef.current.focus()
      try {
        const range = document.createRange()
        range.selectNodeContents(elRef.current)
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
      } catch (_) {}
    }
  }, [editing])

  return (
    <div
      style={{
        position: 'absolute', left: label.x, top: label.y,
        padding: '2px 4px', cursor: 'move', zIndex: 1,
        border: selected || hovered ? '1px dashed #ccc' : '1px dashed transparent',
        borderRadius: 2, userSelect: 'none',
      }}
      onMouseDown={e => { e.stopPropagation(); onMouseDown(e) }}
      onDoubleClick={e => { e.stopPropagation(); onStartEdit() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={elRef}
        contentEditable={editing}
        suppressContentEditableWarning
        style={{ fontSize: label.fontSize, color: '#555', outline: 'none', minWidth: 80, pointerEvents: editing ? 'auto' : 'none', cursor: editing ? 'text' : 'move', whiteSpace: 'pre-wrap' }}
        onMouseDown={e => { if (editing) e.stopPropagation() }}
        onBlur={e => {
          const text = e.target.textContent.trim()
          onEndEdit()
          if (!text) onDelete(); else onTextChange(text)
        }}
        onKeyDown={e => {
          if (!editing) return
          e.stopPropagation()
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); elRef.current.blur() }
          if (e.key === 'Escape') elRef.current.blur()
        }}
      />
    </div>
  )
}
