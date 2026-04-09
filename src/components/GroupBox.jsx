import { useRef, useState, useEffect } from 'react'
import { Folder } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:com|it|io|net|org|dev|app|co|ai|me|eu)[^\s]*)/g
const IS_URL = /^(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(?:com|it|io|net|org|dev|app|co|ai|me|eu))/

function parseTextWithLinks(text) {
  if (!text) return text
  const parts = text.split(URL_REGEX)
  return parts.map((part, i) => {
    if (!part || !IS_URL.test(part)) return part
    const href = part.startsWith('http') ? part : `https://${part}`
    return (
      <a
        key={i}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--accent)', textDecoration: 'underline', fontWeight: 500, cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >{part}</a>
    )
  })
}

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

export function Group({ group, onTitleBarMouseDown, onResizeHandleMouseDown, onDelete, onTitleChange, initialEditing, isSelected, onSelect }) {
  const { t } = useLang()
  const titleRef = useRef(null)

  useEffect(() => {
    if (initialEditing && titleRef.current) {
      const el = titleRef.current
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }, [initialEditing])

  return (
    <div
      style={{
        position: 'absolute', left: group.x, top: group.y,
        width: group.width, height: group.height,
        background: 'rgba(255,255,255,0.6)',
        border: isSelected ? '1.5px solid rgba(55,138,221,0.7)' : '1.5px solid #d0d0d0', borderRadius: 8,
        zIndex: 0,
        boxShadow: 'none',
      }}
      onMouseDown={e => {
        if (e.target.closest('[data-card-id]')) return
        e.stopPropagation()
        onSelect()
        onTitleBarMouseDown(e)
      }}
    >
      {/* Title bar */}
      <div
        style={{ height: 24, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'move' }}
        onMouseDown={e => { e.stopPropagation(); onTitleBarMouseDown(e) }}
      >
        <span
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, outline: 'none', background: 'transparent', cursor: 'text', minWidth: 20 }}
          onMouseDown={e => e.stopPropagation()}
          onBlur={e => onTitleChange(e.target.textContent.trim() || t('defaultGroupTitle'))}
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

export function CanvasLabel({ label, selected, editing, onMouseDown, onStartEdit, onEndEdit, onTextChange, onDelete, onConnectDot, onConvertToPostIt, onConvertToFolder }) {
  const { t } = useLang()
  const elRef = useRef(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (editing && elRef.current) {
      elRef.current.textContent = label.text
      elRef.current.focus()
      try {
        const range = document.createRange()
        range.selectNodeContents(elRef.current)
        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
      } catch (_) {}
    }
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      data-card-id={label.id}
      className="canvas-label"
      style={{
        position: 'absolute', left: label.x, top: label.y,
        padding: '8px 16px', cursor: editing ? 'text' : 'move', zIndex: 1,
        border: selected || hovered ? '1px dashed #ccc' : '1px dashed transparent',
        borderRadius: 2, userSelect: 'none',
      }}
      onMouseDown={e => { if (editing) return; e.stopPropagation(); onMouseDown(e) }}
      onDoubleClick={e => { e.stopPropagation(); onStartEdit() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editing ? (
        <div
          ref={elRef}
          contentEditable
          suppressContentEditableWarning
          style={{ fontSize: label.fontSize, color: 'var(--text)', outline: 'none', minWidth: 80, cursor: 'text', whiteSpace: 'pre-wrap' }}
          onMouseDown={e => e.stopPropagation()}
          onBlur={e => {
            const text = e.target.textContent.trim()
            if (!text) { onEndEdit(); onDelete() }
            else { onTextChange(text); onEndEdit() }
          }}
          onKeyDown={e => {
            e.stopPropagation()
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); elRef.current.blur() }
            if (e.key === 'Escape') elRef.current.blur()
          }}
        />
      ) : (
        <p style={{ fontSize: label.fontSize, color: 'var(--text)', margin: 0, minWidth: 80, whiteSpace: 'pre-wrap', cursor: 'move' }}>
          {parseTextWithLinks(label.text)}
        </p>
      )}
      {onConnectDot && (
        <>
          <div className="connect-dot connect-dot-top"    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onConnectDot(e, 'top') }} />
          <div className="connect-dot connect-dot-right"  onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onConnectDot(e, 'right') }} />
          <div className="connect-dot connect-dot-bottom" onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onConnectDot(e, 'bottom') }} />
          <div className="connect-dot connect-dot-left"   onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onConnectDot(e, 'left') }} />
        </>
      )}
      {(selected || hovered) && !editing && (
        <div style={{
          position: 'absolute', bottom: -30, left: '50%',
          transform: 'translateX(-50%)', display: 'flex',
          gap: 4, zIndex: 9999, pointerEvents: 'all',
        }}>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onConvertToPostIt?.() }}
            style={{ background: '#fff', border: '1px solid #d0d0d0', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
          >{t('convertToPostIt')}</button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onConvertToFolder?.() }}
            style={{ background: '#fff', border: '1px solid #d0d0d0', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
          ><Folder size={12} /></button>
        </div>
      )}
    </div>
  )
}
