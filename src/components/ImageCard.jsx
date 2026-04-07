import { useState } from 'react'

export default function ImageCard({ card, selected, onMouseDown, onDelete, onResizeMouseDown, onConnectDot }) {
  const [hovered, setHovered] = useState(false)
  const w = card.width || 200
  const h = card.height || 200

  return (
    <div
      data-card-id={card.id}
      className="image-card"
      style={{
        position: 'absolute', left: card.x, top: card.y,
        width: w, height: h,
        border: selected ? '2px solid #378ADD' : '2px solid transparent',
        borderRadius: 4,
        cursor: 'move', userSelect: 'none', zIndex: 2,
        boxSizing: 'border-box',
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={card.url}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', borderRadius: 2, pointerEvents: 'none' }}
        alt=""
        draggable={false}
      />
      {(hovered || selected) && (
        <>
          {/* Delete button */}
          <button
            style={{
              position: 'absolute', top: 4, right: 4,
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              border: 'none', borderRadius: '50%',
              width: 22, height: 22, fontSize: 15, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete() }}
          >×</button>

          {/* Resize handle — bottom-right, group-box style */}
          <div
            style={{
              position: 'absolute', bottom: -4, right: -4,
              width: 8, height: 8,
              background: '#fff', border: '1px solid #aaa',
              cursor: 'se-resize', zIndex: 10,
            }}
            onMouseDown={e => { e.stopPropagation(); onResizeMouseDown(e) }}
          />
        </>
      )}

      {/* Connect dots — always in DOM, shown via CSS on hover (same as PostIt) */}
      <div className="connect-dot connect-dot-top"    onMouseDown={e => onConnectDot(e, 'top')} />
      <div className="connect-dot connect-dot-right"  onMouseDown={e => onConnectDot(e, 'right')} />
      <div className="connect-dot connect-dot-bottom" onMouseDown={e => onConnectDot(e, 'bottom')} />
      <div className="connect-dot connect-dot-left"   onMouseDown={e => onConnectDot(e, 'left')} />
    </div>
  )
}
