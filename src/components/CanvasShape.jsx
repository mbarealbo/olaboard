import { useState, useRef, useEffect } from 'react'

export const SHAPE_FILL_PRESETS = [
  'transparent', '#dbeafe', '#d1fae5', '#fce7f3', '#fef9c3', '#ede9fe', '#f3f4f6',
]
export const SHAPE_STROKE_MAP = {
  'transparent': '#000000',
  '#dbeafe': '#3b82f6',
  '#d1fae5': '#10b981',
  '#fce7f3': '#ec4899',
  '#fef9c3': '#f59e0b',
  '#ede9fe': '#8b5cf6',
  '#f3f4f6': '#6b7280',
}
const SHAPE_TYPES = [
  { key: 'rect',    label: '▭', radius: 0 },
  { key: 'rounded', label: '▢', radius: 16 },
  { key: 'circle',  label: '○', radius: '50%' },
]
const FONT_FAMILY_MAP = {
  sans:  'system-ui, sans-serif',
  mono:  "'Space Mono', monospace",
  hand:  "'Caveat', cursive",
  serif: "'Lora', serif",
}

export function CanvasShape({
  shape, selected, editing,
  onMouseDown, onStartEdit, onEndEdit, onTextChange, onDelete,
  onConnectDot, onResizeMouseDown,
  onFillColorChange, onShapeTypeChange,
}) {
  const [hovered, setHovered] = useState(false)
  const hoverTimeout = useRef(null)
  const elRef = useRef(null)

  const startHover = () => { clearTimeout(hoverTimeout.current); setHovered(true) }
  const endHover   = () => { hoverTimeout.current = setTimeout(() => setHovered(false), 200) }

  useEffect(() => {
    if (editing && elRef.current) {
      elRef.current.textContent = shape.text || ''
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

  const shapeType  = shape.shapeType || 'rounded'
  const typeInfo   = SHAPE_TYPES.find(t => t.key === shapeType) || SHAPE_TYPES[1]
  const fillColor  = shape.fillColor != null ? shape.fillColor : 'transparent'
  const strokeColor = shape.strokeColor || SHAPE_STROKE_MAP[fillColor] || '#3b82f6'
  const fontSize   = shape.fontSize   || 14
  const fontFamily = FONT_FAMILY_MAP[shape.fontFamily || 'sans']

  const showPill = selected && !editing && (onFillColorChange || onShapeTypeChange)

  return (
    <div
      data-card-id={shape.id}
      className="canvas-shape"
      style={{
        position: 'absolute',
        left: shape.x, top: shape.y,
        width: shape.width || 160, height: shape.height || 100,
        background: fillColor,
        border: `2px solid ${strokeColor}`,
        borderRadius: typeInfo.radius,
        boxShadow: selected ? `0 0 0 2px #378ADD` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: editing ? 'text' : 'move',
        userSelect: 'none',
        zIndex: 1,
        boxSizing: 'border-box',
      }}
      onMouseDown={e => { if (editing) return; e.stopPropagation(); onMouseDown(e) }}
      onDoubleClick={e => { e.stopPropagation(); onStartEdit() }}
      onMouseEnter={startHover}
      onMouseLeave={endHover}
    >
      {/* text content wrapper — overflow hidden here, not on outer div */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: typeInfo.radius }}>
      {editing ? (
        <div
          ref={elRef}
          contentEditable
          suppressContentEditableWarning
          style={{
            fontSize, fontFamily, color: strokeColor, outline: 'none',
            textAlign: 'center', padding: '4px 8px', width: '100%', cursor: 'text',
            wordBreak: 'break-word',
          }}
          onMouseDown={e => e.stopPropagation()}
          onBlur={e => { onTextChange(e.target.textContent.trim()); onEndEdit() }}
          onKeyDown={e => {
            e.stopPropagation()
            if (e.key === 'Escape') elRef.current.blur()
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); elRef.current.blur() }
          }}
        />
      ) : (
        <p style={{
          fontSize, fontFamily, color: strokeColor,
          margin: 0, textAlign: 'center', padding: '4px 12px',
          pointerEvents: 'none', wordBreak: 'break-word', lineHeight: 1.4,
        }}>
          {shape.text || <span style={{ opacity: 0.3, fontStyle: 'italic' }}>...</span>}
        </p>
      )}
      </div>

      {/* Connect dots */}
      {onConnectDot && ['top', 'right', 'bottom', 'left'].map(anchor => (
        <div
          key={anchor}
          className={`connect-dot connect-dot-${anchor}`}
          style={{ display: hovered || selected ? 'block' : undefined }}
          onMouseEnter={startHover}
          onMouseLeave={endHover}
          onMouseDown={e => {
            e.stopPropagation(); e.preventDefault()
            const rect = e.currentTarget.closest('.canvas-shape')?.getBoundingClientRect()
            onConnectDot(e, anchor, rect ? { w: rect.width, h: rect.height } : null)
          }}
        />
      ))}

      {/* SE resize handle */}
      {(selected || hovered) && !editing && onResizeMouseDown && (
        <div
          style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 8, height: 8,
            background: '#fff', border: '1px solid #aaa',
            cursor: 'se-resize', zIndex: 10,
          }}
          onMouseDown={e => { e.stopPropagation(); onResizeMouseDown(e) }}
        />
      )}

      {/* Context pill: fill colors + shape type */}
      {showPill && (
        <div
          style={{
            position: 'absolute', bottom: -46, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 4, zIndex: 9999,
            background: '#fff', border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 20, padding: '4px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)', whiteSpace: 'nowrap',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {SHAPE_FILL_PRESETS.map(color => (
            <div
              key={color}
              onClick={e => { e.stopPropagation(); onFillColorChange(color, SHAPE_STROKE_MAP[color] || '#6b7280') }}
              style={{
                width: 16, height: 16, borderRadius: '50%', cursor: 'pointer',
                background: color === 'transparent'
                  ? 'linear-gradient(135deg, #fff 40%, #f87171 40%, #f87171 60%, #fff 60%)'
                  : color,
                border: color === fillColor ? '2px solid #378ADD' : '1.5px solid rgba(0,0,0,0.15)',
                flexShrink: 0,
              }}
            />
          ))}
          <div style={{ width: 1, height: 14, background: '#ddd', margin: '0 2px', flexShrink: 0 }} />
          {SHAPE_TYPES.map(t => (
            <button
              key={t.key}
              onClick={e => { e.stopPropagation(); onShapeTypeChange(t.key) }}
              style={{
                background: t.key === shapeType ? '#378ADD' : 'transparent',
                color: t.key === shapeType ? '#fff' : '#555',
                border: 'none', borderRadius: 6, padding: '2px 6px',
                cursor: 'pointer', fontSize: 13, lineHeight: 1,
              }}
            >{t.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}
