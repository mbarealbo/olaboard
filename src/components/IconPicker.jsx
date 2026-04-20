import { useState } from 'react'
import { ICON_MAP, ICON_CATEGORIES, ICON_COLORS } from '../lib/icons'

const COLOR_MAP = {
  yellow: '#FAC775', orange: '#EF9F27', green: '#b8e986',
  blue: '#89cff0', pink: '#ffb3c6', purple: '#d4a8ff',
  white: '#f5f5f5', red: '#ff8a80',
}

export default function IconPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const [activeColor, setActiveColor] = useState('blue')

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
            autoFocus
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

        {/* Icon grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
          {filtered !== null ? (
            filtered.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', margin: '24px 0' }}>No icons found</p>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
                  {filtered.map(name => (
                    <IconBtn key={name} name={name} color={activeColor} onSelect={onSelect} />
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
                    <IconBtn key={name} name={name} color={activeColor} onSelect={onSelect} />
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
                background: COLOR_MAP[c],
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

function IconBtn({ name, color, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const IconComp = ICON_MAP[name]
  if (!IconComp) return null
  return (
    <button
      title={name}
      onClick={() => onSelect(name, color)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: hovered ? '1px solid var(--border)' : '1px solid transparent',
        borderRadius: 8,
        background: hovered ? 'var(--btn-bg)' : 'transparent',
        cursor: 'pointer',
        padding: '7px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s',
        color: 'var(--text)',
      }}
    >
      <IconComp size={20} strokeWidth={1.5} style={{ display: 'block' }} />
    </button>
  )
}
