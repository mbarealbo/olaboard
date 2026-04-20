import { useState } from 'react'
import { ICON_MAP } from '../lib/icons'

export const ICON_CARD_SIZE = 80

const COLOR_MAP = {
  yellow: '#FAC775', orange: '#EF9F27', green: '#b8e986',
  blue: '#89cff0', pink: '#ffb3c6', purple: '#d4a8ff',
  white: '#f5f5f5', red: '#ff8a80',
}

function getTextColor(bgHex) {
  if (!bgHex) return '#1a1a1a'
  const r = parseInt(bgHex.slice(1, 3), 16)
  const g = parseInt(bgHex.slice(3, 5), 16)
  const b = parseInt(bgHex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1a1a1a' : '#ffffff'
}

export default function IconCard({ card, selected, onMouseDown, onDelete, onConnectDot }) {
  const [hovered, setHovered] = useState(false)
  const IconComp = ICON_MAP[card.body] || ICON_MAP.Star
  const bg = COLOR_MAP[card.color] || COLOR_MAP.blue
  const textColor = getTextColor(bg)

  return (
    <div
      data-card-id={card.id}
      className="image-card"
      style={{
        position: 'absolute', left: card.x, top: card.y,
        width: ICON_CARD_SIZE, height: ICON_CARD_SIZE,
        border: selected ? '2px solid #378ADD' : '2px solid rgba(0,0,0,0.10)',
        borderRadius: 14,
        background: bg,
        cursor: 'move', userSelect: 'none', zIndex: 2,
        boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3,
        boxShadow: selected ? '0 0 0 3px rgba(55,138,221,0.20)' : '0 2px 6px rgba(0,0,0,0.08)',
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <IconComp size={30} color={textColor} strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
      {card.title && (
        <span style={{
          fontSize: 9, color: textColor, fontWeight: 600,
          textAlign: 'center', lineHeight: 1.2,
          padding: '0 5px', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 70,
          pointerEvents: 'none',
        }}>
          {card.title}
        </span>
      )}
      {(hovered || selected) && (
        <button
          style={{
            position: 'absolute', top: 3, right: 3,
            background: 'rgba(0,0,0,0.40)', color: '#fff',
            border: 'none', borderRadius: '50%',
            width: 18, height: 18, fontSize: 14, lineHeight: '18px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
          }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete() }}
        >×</button>
      )}
      <div className="connect-dot connect-dot-top"    onMouseDown={e => onConnectDot(e, 'top')} />
      <div className="connect-dot connect-dot-right"  onMouseDown={e => onConnectDot(e, 'right')} />
      <div className="connect-dot connect-dot-bottom" onMouseDown={e => onConnectDot(e, 'bottom')} />
      <div className="connect-dot connect-dot-left"   onMouseDown={e => onConnectDot(e, 'left')} />
    </div>
  )
}
