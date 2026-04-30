import { useState, useRef, useCallback } from 'react'
import { useClickOutside } from '../lib/useClickOutside'

export default function TagPicker({ tag, allTags, onChange }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)

  const filtered = allTags
    .map(([t]) => t)
    .filter(t => !input || t.includes(input.toLowerCase()))

  function apply(val) {
    onChange(val)
    setOpen(false)
    setInput('')
  }

  function handleKey(e) {
    e.stopPropagation()
    if (e.key === 'Enter') {
      const val = input.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30)
      if (val) apply(val)
    }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); setInput('') }}
        style={{
          fontSize: 11, padding: '3px 8px', borderRadius: 6,
          border: `1px solid ${tag ? 'var(--accent)' : 'var(--btn-border)'}`,
          background: tag ? 'var(--accent)' : 'var(--btn-bg)',
          color: tag ? '#fff' : 'var(--text-muted)',
          cursor: 'pointer', fontFamily: 'inherit',
          maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
        title={tag ? `Tag: #${tag}` : 'Aggiungi tag'}
      >
        {tag ? `#${tag}` : '#'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: 8, minWidth: 160,
        }}>
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="nome tag…"
            style={{
              width: '100%', fontSize: 12, padding: '5px 8px', borderRadius: 6,
              border: '1px solid #e5e7eb', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box', marginBottom: (filtered.length || tag) ? 6 : 0,
            }}
          />
          {tag && (
            <button
              onClick={() => apply(null)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px', fontSize: 11, borderRadius: 5, border: 'none', background: 'none', cursor: 'pointer', color: '#e53935', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
              ✕ Rimuovi tag
            </button>
          )}
          {filtered.map(t => (
            <button
              key={t}
              onClick={() => apply(t)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px', fontSize: 12, borderRadius: 5, border: 'none', background: t === tag ? '#eff6ff' : 'none', cursor: 'pointer', color: '#111', fontFamily: 'inherit' }}
              onMouseEnter={e => { if (t !== tag) e.currentTarget.style.background = '#f3f4f6' }}
              onMouseLeave={e => { e.currentTarget.style.background = t === tag ? '#eff6ff' : 'none' }}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
