import { useState, useRef, useEffect } from 'react'
import { ICON_MAP, ICON_CATEGORIES, ICON_COLORS, ICON_STROKE_COLORS, ICON_SWATCH_BG } from '../lib/icons'

export default function IconPicker({ onDragStart, onClose }) {
  const [query, setQuery] = useState('')
  const [activeColor, setActiveColor] = useState('blue')
  const inputRef = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = q.length > 0
    ? ICON_CATEGORIES.flatMap(cat => cat.icons.filter(name => name.toLowerCase().includes(q))).slice(0, 40)
    : null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          width: 420, maxHeight: '72vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'system-ui, sans-serif',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            ref={inputRef}
            placeholder="Search icons…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)', color: 'var(--text)',
              fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)',
              lineHeight: 1, padding: '2px 6px',
            }}
          >×</button>
        </div>

        {/* Hint */}
        <p style={{ margin: '6px 16px 0', fontSize: 11, color: 'var(--text-muted)' }}>
          Trascina un'icona sul canvas per posizionarla
        </p>

        {/* Icon grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 10px' }}>
          {filtered !== null ? (
            filtered.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', margin: '24px 0' }}>No icons found</p>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
                  {filtered.map(name => (
                    <IconBtn key={name} name={name} color={activeColor} onDragStart={onDragStart} />
                  ))}
                </div>
              )
          ) : (
            ICON_CATEGORIES.map(cat => (
              <div key={cat.label} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {cat.label}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
                  {cat.icons.map(name => (
                    <IconBtn key={name} name={name} color={activeColor} onDragStart={onDragStart} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Color picker footer */}
        <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 2 }}>Color:</span>
          {ICON_COLORS.map(c => (
            <button
              key={c}
              title={c}
              onClick={() => setActiveColor(c)}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: ICON_SWATCH_BG[c],
                border: activeColor === c ? '2.5px solid #378ADD' : '1.5px solid rgba(0,0,0,0.15)',
                cursor: 'pointer', padding: 0, flexShrink: 0,
                transition: 'border 0.1s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function IconBtn({ name, color, onDragStart }) {
  const [hovered, setHovered] = useState(false)
  const IconComp = ICON_MAP[name]
  if (!IconComp) return null
  const strokeColor = ICON_STROKE_COLORS[color] || ICON_STROKE_COLORS.blue
  return (
    <button
      title={name}
      onMouseDown={e => {
        e.preventDefault()
        onDragStart(name, color, e.clientX, e.clientY)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: hovered ? '1px solid var(--border)' : '1px solid transparent',
        borderRadius: 8,
        background: hovered ? 'var(--btn-bg)' : 'transparent',
        cursor: 'grab',
        padding: '7px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s',
      }}
    >
      <IconComp size={20} strokeWidth={1.5} color={strokeColor} style={{ display: 'block', pointerEvents: 'none' }} />
    </button>
  )
}
