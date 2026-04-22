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

const LABEL_FONTS = [
  { key: 'sans',  label: 'Normal', family: 'system-ui, sans-serif' },
  { key: 'mono',  label: 'Mono',   family: "'Space Mono', monospace" },
  { key: 'hand',  label: 'Hand',   family: "'Caveat', cursive" },
  { key: 'serif', label: 'Serif',  family: "'Lora', serif" },
]

export function CanvasLabel({ label, selected, editing, onMouseDown, onStartEdit, onEndEdit, onTextChange, onDelete, onConnectDot, onConvertToPostIt, onConvertToFolder, onFontChange, onSizeChange, onResizeMouseDown, onFontScaleMouseDown }) {
  const { t } = useLang()
  const elRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const hoverTimeout = useRef(null)

  const startHover = () => { clearTimeout(hoverTimeout.current); setHovered(true) }
  const endHover   = () => { hoverTimeout.current = setTimeout(() => setHovered(false), 200) }

  const activeFontKey = label.fontFamily || 'sans'
  const fontFamily = LABEL_FONTS.find(f => f.key === activeFontKey)?.family || 'system-ui, sans-serif'
  const fontSize = label.fontSize || 16

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

  const hasFixedWidth = !!label.width
  const textStyle = { fontSize, fontFamily, color: 'var(--text)', outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', ...(hasFixedWidth ? {} : { minWidth: 80 }) }

  return (
    <div
      data-card-id={label.id}
      className="canvas-label"
      style={{
        position: 'absolute', left: label.x, top: label.y,
        padding: '8px 16px', cursor: editing ? 'text' : 'move', zIndex: 1,
        border: selected || hovered ? '1px dashed #ccc' : '1px dashed transparent',
        borderRadius: 2, userSelect: 'none',
        ...(label.width ? { width: label.width } : {}),
      }}
      onMouseDown={e => { if (editing) return; e.stopPropagation(); onMouseDown(e) }}
      onDoubleClick={e => { e.stopPropagation(); onStartEdit() }}
      onMouseEnter={startHover}
      onMouseLeave={endHover}
    >
      {editing ? (
        <div
          ref={elRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={t('untitled')}
          style={{ ...textStyle, cursor: 'text' }}
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
        <p style={{ ...textStyle, margin: 0, cursor: 'move' }}>
          {label.text
            ? parseTextWithLinks(label.text)
            : <span style={{ opacity: 0.35, pointerEvents: 'none', fontStyle: 'italic' }}>{t('untitled')}</span>
          }
        </p>
      )}
      {onConnectDot && (
        <>
          {['top','right','bottom','left'].map(anchor => (
            <div key={anchor} className={`connect-dot connect-dot-${anchor}`}
              style={{ display: hovered ? 'block' : undefined }}
              onMouseEnter={startHover}
              onMouseLeave={endHover}
              onMouseDown={e => {
                e.stopPropagation(); e.preventDefault()
                const rect = e.currentTarget.closest('.canvas-label')?.getBoundingClientRect()
                onConnectDot(e, anchor, rect ? { w: rect.width, h: rect.height } : null)
              }}
            />
          ))}
        </>
      )}
      {/* Horizontal handle (width/wrap) — inside, hover only */}
      {hovered && !editing && onResizeMouseDown && (
        <div
          title="Drag to set wrap width"
          style={{
            position: 'absolute', top: '50%', right: 18,
            transform: 'translateY(-50%)',
            width: 5, height: 18, background: 'rgba(55,138,221,0.25)',
            border: '1.5px solid #378ADD', borderRadius: 3,
            cursor: 'ew-resize', zIndex: 10,
          }}
          onMouseDown={e => { e.stopPropagation(); onResizeMouseDown(e) }}
        />
      )}
      {/* Diagonal handle (font scale) — inside, hover + selected */}
      {(selected || hovered) && !editing && onFontScaleMouseDown && (
        <div
          title="Drag to scale font size"
          style={{
            position: 'absolute', bottom: 16, right: 16,
            width: 9, height: 9, background: 'rgba(55,138,221,0.25)',
            border: '1.5px solid #378ADD', borderRadius: 2,
            cursor: 'se-resize', zIndex: 10,
          }}
          onMouseDown={e => { e.stopPropagation(); onFontScaleMouseDown(e) }}
        />
      )}
      {(selected || hovered) && !editing && (onConvertToPostIt || onConvertToFolder) && (
        <div
          style={{
            position: 'absolute', bottom: -46, left: '50%',
            transform: 'translateX(-50%)', display: 'flex', alignItems: 'center',
            gap: 2, zIndex: 9999, pointerEvents: 'all',
            background: '#fff', border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 20, padding: '3px 8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            whiteSpace: 'nowrap',
          }}
          onMouseDown={e => e.stopPropagation()}
          onMouseEnter={startHover}
          onMouseLeave={endHover}
        >
          {onConvertToPostIt && (
            <button onClick={e => { e.stopPropagation(); onConvertToPostIt() }} style={{ background: 'transparent', border: 'none', borderRadius: 10, padding: '2px 6px', fontSize: 11, cursor: 'pointer', color: '#444', whiteSpace: 'nowrap' }}>{t('convertToPostIt')}</button>
          )}
          {onConvertToPostIt && onConvertToFolder && (
            <div style={{ width: 1, height: 14, background: '#ddd', margin: '0 2px', flexShrink: 0 }} />
          )}
          {onConvertToFolder && (
            <button onClick={e => { e.stopPropagation(); onConvertToFolder() }} style={{ background: 'transparent', border: 'none', borderRadius: 10, padding: '2px 6px', fontSize: 11, cursor: 'pointer', color: '#444' }}><Folder size={11} /></button>
          )}
        </div>
      )}
    </div>
  )
}
