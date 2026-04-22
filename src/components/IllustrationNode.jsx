import { useState, useEffect } from 'react'

const svgCache = new Map()
const inFlight = new Map()

function fetchSvg(path) {
  if (svgCache.has(path)) return Promise.resolve(svgCache.get(path))
  if (inFlight.has(path)) return inFlight.get(path)
  const p = fetch(path)
    .then(r => r.ok ? r.text() : null)
    .then(text => { svgCache.set(path, text); inFlight.delete(path); return text })
    .catch(() => { inFlight.delete(path); return null })
  inFlight.set(path, p)
  return p
}

export { fetchSvg as fetchIllustrationSvg }

export default function IllustrationNode({ card, selected, onMouseDown, onDelete, onResizeMouseDown, onConnectDot }) {
  const [svgHtml, setSvgHtml] = useState(null)
  const [hovered, setHovered] = useState(false)
  const w = card.width || 200
  const h = card.height || 200

  useEffect(() => {
    let cancelled = false
    fetchSvg(`/illustrations/${card.body}.svg`).then(svg => {
      if (!cancelled) setSvgHtml(svg)
    })
    return () => { cancelled = true }
  }, [card.body])

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
        color: 'var(--text)',
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {svgHtml ? (
        <div
          dangerouslySetInnerHTML={{ __html: svgHtml }}
          style={{ width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'var(--border)', borderRadius: 2, opacity: 0.4 }} />
      )}

      {(hovered || selected) && (
        <>
          <button
            style={{
              position: 'absolute', top: 4, right: 4,
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              border: 'none', borderRadius: '50%',
              width: 22, height: 22, fontSize: 15, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete?.() }}
          >×</button>

          <div
            style={{
              position: 'absolute', bottom: -4, right: -4,
              width: 8, height: 8,
              background: '#fff', border: '1px solid #aaa',
              cursor: 'se-resize', zIndex: 10,
            }}
            onMouseDown={e => { e.stopPropagation(); onResizeMouseDown?.(e) }}
          />
        </>
      )}

      <div className="connect-dot connect-dot-top"    onMouseDown={e => { e.stopPropagation(); onConnectDot?.(e, 'top') }} />
      <div className="connect-dot connect-dot-right"  onMouseDown={e => { e.stopPropagation(); onConnectDot?.(e, 'right') }} />
      <div className="connect-dot connect-dot-bottom" onMouseDown={e => { e.stopPropagation(); onConnectDot?.(e, 'bottom') }} />
      <div className="connect-dot connect-dot-left"   onMouseDown={e => { e.stopPropagation(); onConnectDot?.(e, 'left') }} />
    </div>
  )
}
