import { useState } from 'react'
import { ICON_MAP } from '../lib/icons'

export const ICON_CARD_SIZE = 80

const ICON_STROKE = {
  yellow: '#d97706',
  orange: '#ea580c',
  green: '#16a34a',
  blue: '#2563eb',
  pink: '#db2777',
  purple: '#9333ea',
  white: '#6b7280',
  red: '#dc2626',
}

const SWATCH_BG = {
  yellow: '#FAC775',
  orange: '#EF9F27',
  green: '#b8e986',
  blue: '#89cff0',
  pink: '#ffb3c6',
  purple: '#d4a8ff',
  white: '#e5e7eb',
  red: '#ff8a80',
}

const COLORS = ['yellow', 'orange', 'green', 'blue', 'pink', 'purple', 'white', 'red']

export default function IconCard({ card, selected, onMouseDown, onDelete, onConnectDot, onColorChange }) {
  const [hovered, setHovered] = useState(false)
  const IconComp = ICON_MAP[card.body] || ICON_MAP.Star
  const strokeColor = ICON_STROKE[card.color] || ICON_STROKE.blue

  return (
    <div
      data-card-id={card.id}
      className="image-card"
      style={{
        position: 'absolute', left: card.x, top: card.y,
        width: ICON_CARD_SIZE, height: ICON_CARD_SIZE,
        border: selected ? '1px dashed #378ADD' : (hovered ? '1px dashed #ccc' : '1px dashed transparent'),
        borderRadius: 8,
        background: 'transparent',
        cursor: 'move', userSelect: 'none', zIndex: 2,
        boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3,
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <IconComp size={32} color={strokeColor} strokeWidth={1.8} style={{ pointerEvents: 'none' }} />
      {card.title && (
        <span style={{
          fontSize: 9, color: '#555', fontWeight: 600,
          textAlign: 'center', lineHeight: 1.2,
          padding: '0 5px', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 70,
          pointerEvents: 'none',
        }}>
          {card.title}
        </span>
      )}

      {/* Delete button */}
      {(hovered || selected) && (
        <button
          style={{
            position: 'absolute', top: 3, right: 3,
            background: 'rgba(0,0,0,0.35)', color: '#fff',
            border: 'none', borderRadius: '50%',
            width: 18, height: 18, fontSize: 14, lineHeight: '18px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete() }}
        >×</button>
      )}

      {/* Inline color picker shown when selected */}
      {selected && onColorChange && (
        <div
          style={{
            position: 'absolute', bottom: -32, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 4, alignItems: 'center',
            background: '#fff', border: '1px solid rgba(0,0,0,0.12)',
            borderRadius: 20, padding: '4px 8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            zIndex: 20,
            whiteSpace: 'nowrap',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          {COLORS.map(c => (
            <button
              key={c}
              title={c}
              onClick={e => { e.stopPropagation(); onColorChange(c) }}
              style={{
                width: 16, height: 16, borderRadius: '50%',
                background: SWATCH_BG[c],
                border: card.color === c ? '2px solid #378ADD' : '1.5px solid rgba(0,0,0,0.15)',
                cursor: 'pointer', padding: 0, flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}

      <div className="connect-dot connect-dot-top"    onMouseDown={e => onConnectDot(e, 'top')} />
      <div className="connect-dot connect-dot-right"  onMouseDown={e => onConnectDot(e, 'right')} />
      <div className="connect-dot connect-dot-bottom" onMouseDown={e => onConnectDot(e, 'bottom')} />
      <div className="connect-dot connect-dot-left"   onMouseDown={e => onConnectDot(e, 'left')} />
    </div>
  )
}
