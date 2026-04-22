import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchIllustrationSvg } from './IllustrationNode'

let manifestCache = null

async function loadManifest() {
  if (manifestCache) return manifestCache
  const res = await fetch('/illustrations/manifest.json')
  manifestCache = res.ok ? await res.json() : []
  return manifestCache
}

const TABS = ['all', 'open-doodles', 'humaans', 'open-peeps']

export default function IllustrationPicker({ onDragStart, onClick, onClose }) {
  const [manifest, setManifest] = useState([])
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const inputRef = useRef(null)

  useEffect(() => {
    loadManifest().then(setManifest)
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = manifest.filter(ill => {
    if (tab !== 'all' && ill.source !== tab) return false
    if (!q) return true
    return ill.name.toLowerCase().includes(q) || ill.tags.some(t => t.includes(q))
  })

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
          width: 460, maxHeight: '76vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', fontFamily: 'system-ui, sans-serif',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            ref={inputRef}
            placeholder="Search illustrations…"
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
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)', lineHeight: 1, padding: '2px 6px' }}
          >×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 16px 0', borderBottom: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontSize: 11, fontWeight: tab === t ? 600 : 400,
                padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: tab === t ? 'var(--accent)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-muted)',
                textTransform: t === 'all' ? 'capitalize' : 'none',
                marginBottom: 6,
              }}
            >
              {t === 'all' ? 'All' : t === 'open-doodles' ? 'Open Doodles' : t === 'humaans' ? 'Humaans' : 'Open Peeps'}
            </button>
          ))}
        </div>

        {/* Hint */}
        <p style={{ margin: '6px 16px 0', fontSize: 11, color: 'var(--text-muted)' }}>
          Click to insert at center · drag to position
        </p>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 12px' }}>
          {filtered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', margin: '24px 0' }}>
              {manifest.length === 0 ? 'No illustrations loaded. Run the normalize script first.' : 'No results'}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {filtered.map(ill => (
                <LazyThumbnail
                  key={ill.id}
                  illustration={ill}
                  onClick={onClick}
                  onDragStart={onDragStart}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LazyThumbnail({ illustration, onClick, onDragStart }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  const [svgHtml, setSvgHtml] = useState(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold: 0.05 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    fetchIllustrationSvg(illustration.path).then(setSvgHtml)
  }, [visible, illustration.path])

  return (
    <div
      ref={ref}
      title={illustration.name}
      style={{
        aspectRatio: '1',
        border: `1px solid ${hovered ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        background: hovered ? 'var(--btn-bg)' : 'transparent',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 6,
        transition: 'border-color 0.1s, background 0.1s',
        color: 'var(--text)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick?.(illustration)}
      onMouseDown={e => {
        e.preventDefault()
        onDragStart?.(illustration, e.clientX, e.clientY)
      }}
    >
      {svgHtml ? (
        <div
          dangerouslySetInnerHTML={{ __html: svgHtml }}
          style={{ width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'var(--border)', borderRadius: 4, opacity: 0.4 }} />
      )}
      <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3, textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {illustration.name}
      </span>
    </div>
  )
}
