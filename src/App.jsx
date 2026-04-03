import { useState, useEffect, useRef, useCallback } from 'react'

// ─── constants ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'olaboard_data'
const CARD_W = 130
const CARD_H_HALF = 37   // half of min-height 74px

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}

function defaultDb() {
  return { root: { id: 'root', name: 'La mia lavagna', cards: [], connections: [] } }
}

function loadDb() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultDb() }
  catch { return defaultDb() }
}

// Build the stack path from 'root' to targetId via BFS through db folder graph
function buildPath(db, targetId) {
  function search(id, path) {
    if (id === targetId) return [...path, id]
    const canvas = db[id]
    if (!canvas) return null
    for (const c of canvas.cards) {
      if (c.isFolder) {
        const r = search(c.id, [...path, id])
        if (r) return r
      }
    }
    return null
  }
  return search('root', []) || ['root']
}

// ─── FolderTree (defined outside App to avoid remount on each render) ─────────
// Renders from card data, not from db keys — so folders appear immediately on creation.
function FolderTree({ db, currentId, onNavigate, id, depth }) {
  depth = depth ?? 0
  const canvas = db[id]
  if (!canvas) return null
  const isActive = id === currentId
  // Read folder cards directly from canvas data
  const subFolders = canvas.cards.filter(c => c.isFolder)
  return (
    <>
      <div
        style={{
          paddingLeft: depth * 12 + 8, paddingRight: 8,
          paddingTop: 4, paddingBottom: 4,
          cursor: 'pointer', fontSize: 12,
          background: isActive ? '#EBF4FF' : 'transparent',
          color: isActive ? '#378ADD' : '#333',
          display: 'flex', alignItems: 'center', gap: 4,
          userSelect: 'none',
        }}
        onClick={() => onNavigate(id)}
      >
        <span>{depth === 0 ? '🏠' : '📁'}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{canvas.name}</span>
      </div>
      {subFolders.map(f => (
        // Always render the row; recurse into children only if canvas entry exists
        <FolderTree key={f.id} db={{ ...db, [f.id]: db[f.id] || { id: f.id, name: f.title, cards: [], connections: [] } }} currentId={currentId} onNavigate={onNavigate} id={f.id} depth={depth + 1} />
      ))}
    </>
  )
}

// ─── PostIt ──────────────────────────────────────────────────────────────────
function PostIt({ card, selected, onMouseDown, onDblClick, onRename, onNoteOpen, onToggleFolder, onConnectDot, initialEditing, onEditStarted }) {
  const titleRef = useRef(null)

  function startEdit(e) {
    if (e) e.stopPropagation()
    const el = titleRef.current
    el.contentEditable = 'true'
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }

  useEffect(() => {
    if (initialEditing) {
      startEdit(null)
      onEditStarted()
    }
  }, [])

  function commitEdit() {
    const el = titleRef.current
    el.contentEditable = 'false'
    const t = el.textContent.trim() || 'Nuova idea'
    if (t !== card.title) onRename(t)
  }

  return (
    <div
      data-card-id={card.id}
      className={`postit${card.isFolder ? ' is-folder' : ''}${selected ? ' selected' : ''}`}
      style={{ left: card.x, top: card.y }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDblClick}
    >
      <div
        ref={titleRef}
        className="postit-title"
        onDoubleClick={startEdit}
        onBlur={commitEdit}
        onKeyDown={e => {
          e.stopPropagation()
          if (e.key === 'Enter') { e.preventDefault(); titleRef.current.blur() }
        }}
        suppressContentEditableWarning
      >
        {card.title}
      </div>

      {card.body ? (
        <div style={{
          fontSize: 10, color: 'rgba(65,36,2,0.6)', lineHeight: 1.4, marginTop: 4,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        }}>{card.body}</div>
      ) : null}

      <div className="postit-actions">
        <button
          className="paction"
          title="Apri note"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onNoteOpen() }}
        >↓</button>
        <button
          className="paction"
          title={card.isFolder ? 'Rimuovi cartella' : 'Converti in cartella'}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onToggleFolder() }}
        >📁</button>
      </div>

      <div className="connect-dot" onMouseDown={onConnectDot} />
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [db, setDb] = useState(loadDb)
  const [stack, setStack] = useState(['root'])
  const [view, setView] = useState('canvas')         // 'canvas' | 'list'
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [noteForm, setNoteForm] = useState({ title: '', body: '' })
  const [notePanelMode, setNotePanelMode] = useState('side') // 'side' | 'full'
  const [selected, setSelected] = useState(null)
  const [editingCardId, setEditingCardId] = useState(null)
  const [listSort, setListSort] = useState('az')     // 'az' | 'za' | 'date'
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [connectLine, setConnectLine] = useState(null) // { x1,y1,x2,y2 } screen coords

  // Refs so event-handler closures (in useEffect []) always see the latest values
  const offsetRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const currentIdRef = useRef('root')
  const boardRef = useRef(null)
  const dragging = useRef(null)   // { type:'pan'|'card', ... }
  const connecting = useRef(null) // { fromId }

  useEffect(() => { offsetRef.current = offset }, [offset])
  useEffect(() => { scaleRef.current = scale }, [scale])

  const currentId = stack[stack.length - 1]
  useEffect(() => { currentIdRef.current = currentId }, [currentId])

  // Persist to localStorage on every db change
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)) }, [db])

  const currentCanvas = db[currentId] || { cards: [], connections: [] }
  const cards = currentCanvas.cards
  const connections = currentCanvas.connections

  // ── stable db mutators (use functional setDb + refs, safe to use in useEffect []) ──

  const updateCardFn = useCallback((cardId, updates) => {
    setDb(prev => {
      const cId = currentIdRef.current
      const canvas = prev[cId]
      if (!canvas) return prev
      return { ...prev, [cId]: { ...canvas, cards: canvas.cards.map(c => c.id === cardId ? { ...c, ...updates } : c) } }
    })
  }, [])

  const addConnectionFn = useCallback((from, to) => {
    if (from === to) return
    setDb(prev => {
      const cId = currentIdRef.current
      const canvas = prev[cId]
      if (!canvas) return prev
      if (canvas.connections.some(c => c.from === from && c.to === to)) return prev
      return { ...prev, [cId]: { ...canvas, connections: [...canvas.connections, { id: uid(), from, to, label: '' }] } }
    })
  }, [])

  // ── world-to-screen (uses state at render time — correct for SVG arrows) ──
  function w2s(wx, wy) {
    return [wx * scale + offset.x, wy * scale + offset.y]
  }

  // ── global mouse events ───────────────────────────────────────────────────
  useEffect(() => {
    function getBoardRect() { return boardRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 } }

    function onMove(e) {
      if (connecting.current) {
        const r = getBoardRect()
        setConnectLine(l => l ? { ...l, x2: e.clientX - r.left, y2: e.clientY - r.top } : null)
        return
      }
      if (!dragging.current) return
      const d = dragging.current
      if (d.type === 'pan') {
        setOffset({ x: d.ox + e.clientX - d.sx, y: d.oy + e.clientY - d.sy })
      } else if (d.type === 'card') {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        updateCardFn(d.cardId, { x: d.origX + (wx - d.startWX), y: d.origY + (wy - d.startWY) })
      }
    }

    function onUp(e) {
      if (connecting.current) {
        const el = document.elementFromPoint(e.clientX, e.clientY)
        const target = el?.closest('[data-card-id]')
        if (target && target.dataset.cardId !== connecting.current.fromId) {
          addConnectionFn(connecting.current.fromId, target.dataset.cardId)
        }
        connecting.current = null
        setConnectLine(null)
        return
      }
      dragging.current = null
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [updateCardFn, addConnectionFn])

  // ── keyboard delete ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        setDb(prev => {
          const cId = currentIdRef.current
          const canvas = prev[cId]
          if (!canvas) return prev
          return {
            ...prev,
            [cId]: {
              ...canvas,
              cards: canvas.cards.filter(c => c.id !== selected),
              connections: canvas.connections.filter(c => c.from !== selected && c.to !== selected),
            }
          }
        })
        setSelected(null)
        setActiveNoteId(id => id === selected ? null : id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  // ── wheel zoom ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    function onWheel(e) {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const cx = e.clientX - r.left, cy = e.clientY - r.top
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      setScale(s => {
        const next = Math.max(0.15, Math.min(4, s * factor))
        const ratio = next / s
        setOffset(o => ({ x: cx - ratio * (cx - o.x), y: cy - ratio * (cy - o.y) }))
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [view]) // re-attach when view toggles (board may remount)

  // ── navigation ───────────────────────────────────────────────────────────
  function enterCanvas(id, name) {
    setDb(prev => prev[id] ? prev : { ...prev, [id]: { id, name: name || 'Cartella', cards: [], connections: [] } })
    setStack(prev => [...prev, id])
    setSelected(null)
    setActiveNoteId(null)
    setOffset({ x: 0, y: 0 })
    setScale(1)
  }

  function navigateTo(idx) {
    setStack(prev => prev.slice(0, idx + 1))
    setSelected(null)
    setActiveNoteId(null)
  }

  const handleSidebarNavigate = useCallback((targetId) => {
    if (targetId === currentIdRef.current) return
    setDb(prev => {
      if (prev[targetId]) return prev
      // Find name from folder cards
      function findCard(canvasId) {
        const cv = prev[canvasId]
        if (!cv) return null
        const found = cv.cards.find(c => c.id === targetId)
        if (found) return found
        for (const c of cv.cards) if (c.isFolder) { const r = findCard(c.id); if (r) return r }
        return null
      }
      const fc = findCard('root')
      return { ...prev, [targetId]: { id: targetId, name: fc?.title || 'Cartella', cards: [], connections: [] } }
    })
    setStack(buildPath(db, targetId))
    setSelected(null)
    setActiveNoteId(null)
  }, [db])

  // ── card creation ─────────────────────────────────────────────────────────
  function createCard(wx, wy) {
    const card = { id: uid(), title: 'Nuova idea', body: '', x: wx, y: wy, isFolder: false }
    setDb(prev => {
      const cId = currentIdRef.current
      const canvas = prev[cId]
      if (!canvas) return prev
      return { ...prev, [cId]: { ...canvas, cards: [...canvas.cards, card] } }
    })
    return card.id
  }

  // ── board event handlers ──────────────────────────────────────────────────
  function onBoardMouseDown(e) {
    if (e.target.closest('.postit')) return
    setSelected(null)
    dragging.current = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y }
  }

  function onBoardDblClick(e) {
    if (e.target.closest('.postit')) return
    const r = boardRef.current.getBoundingClientRect()
    const wx = (e.clientX - r.left - offset.x) / scale
    const wy = (e.clientY - r.top  - offset.y) / scale
    const id = createCard(wx, wy)
    setSelected(id)
    setEditingCardId(id)
  }

  function onCardMouseDown(e, card) {
    e.stopPropagation()
    setSelected(card.id)
    const r = boardRef.current.getBoundingClientRect()
    const o = offsetRef.current, s = scaleRef.current
    const wx = (e.clientX - r.left - o.x) / s
    const wy = (e.clientY - r.top  - o.y) / s
    dragging.current = { type: 'card', cardId: card.id, startWX: wx, startWY: wy, origX: card.x, origY: card.y }
  }

  function onConnectDotMouseDown(e, card) {
    e.stopPropagation()
    e.preventDefault()
    const [sx, sy] = w2s(card.x + CARD_W, card.y + CARD_H_HALF)
    connecting.current = { fromId: card.id }
    setConnectLine({ x1: sx, y1: sy, x2: sx, y2: sy })
  }

  // ── zoom buttons ──────────────────────────────────────────────────────────
  function zoomBy(factor) {
    const el = boardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.width / 2, cy = r.height / 2
    setScale(s => {
      const next = Math.max(0.15, Math.min(4, s * factor))
      const ratio = next / s
      setOffset(o => ({ x: cx - ratio * (cx - o.x), y: cy - ratio * (cy - o.y) }))
      return next
    })
  }

  // ── connection label ──────────────────────────────────────────────────────
  function updateConnLabel(connId) {
    const conn = connections.find(c => c.id === connId)
    const label = window.prompt('Etichetta freccia:', conn?.label || '')
    if (label === null) return
    setDb(prev => {
      const cId = currentIdRef.current
      const canvas = prev[cId]
      if (!canvas) return prev
      return { ...prev, [cId]: { ...canvas, connections: canvas.connections.map(c => c.id === connId ? { ...c, label } : c) } }
    })
  }

  // ── note panel ────────────────────────────────────────────────────────────
  function openNote(card) {
    setActiveNoteId(card.id)
    setNoteForm({ title: card.title || '', body: card.body || '' })
  }

  function saveNote() {
    if (!activeNoteId) return
    updateCardFn(activeNoteId, { title: noteForm.title, body: noteForm.body })
  }

  // ── export markdown ───────────────────────────────────────────────────────
  function exportMd() {
    const canvas = db[currentId]
    let md = `# ${canvas.name}\n\n`
    cards.filter(c => !c.isFolder).forEach(c => {
      md += `### ${c.title || 'Senza titolo'}\n\n`
      if (c.body) md += `${c.body}\n\n`
    })
    if (connections.length) {
      md += `## Connessioni\n\n`
      connections.forEach(cn => {
        const from = cards.find(c => c.id === cn.from)
        const to = cards.find(c => c.id === cn.to)
        md += `- **${from?.title || '?'}** → **${to?.title || '?'}**${cn.label ? ` _(${cn.label})_` : ''}\n`
      })
    }
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([md], { type: 'text/markdown' })),
      download: `${canvas.name}.md`,
    })
    a.click()
  }

  // ── list view ─────────────────────────────────────────────────────────────
  const sortedCards = [...cards.filter(c => !c.isFolder)].sort((a, b) => {
    if (listSort === 'az') return (a.title || '').localeCompare(b.title || '')
    if (listSort === 'za') return (b.title || '').localeCompare(a.title || '')
    return 0 // creation order
  })

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div style={{
          width: 190, flexShrink: 0, background: '#fff',
          borderRight: '1px solid #e5e7eb', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '10px 8px 4px', fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 1, textTransform: 'uppercase' }}>
            Lavagne
          </div>
          <FolderTree db={db} currentId={currentId} onNavigate={handleSidebarNavigate} id="root" />
        </div>
      )}

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div style={{
          height: 44, background: '#fff', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flexShrink: 0,
        }}>
          <button style={iconBtn} onClick={() => setSidebarOpen(v => !v)}>☰</button>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, overflow: 'hidden' }}>
            {stack.map((id, i) => {
              const isLast = i === stack.length - 1
              return (
                <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {i > 0 && <span style={{ color: '#ddd' }}>/</span>}
                  <span
                    style={{ cursor: isLast ? 'default' : 'pointer', color: isLast ? '#111' : '#378ADD', fontWeight: isLast ? 600 : 400 }}
                    onClick={() => !isLast && navigateTo(i)}
                  >{db[id]?.name || id}</span>
                </span>
              )
            })}
          </div>

          <div style={{ flex: 1 }} />

          {/* View tabs */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2, gap: 1 }}>
            {[['canvas', 'Canvas'], ['list', 'Elenco']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  fontSize: 12, padding: '3px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: view === v ? '#fff' : 'transparent',
                  color: view === v ? '#111' : '#888',
                  fontWeight: view === v ? 600 : 400,
                  boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >{l}</button>
            ))}
          </div>

          {/* Zoom controls */}
          {view === 'canvas' && (
            <div style={{ display: 'flex', gap: 2 }}>
              <button style={smallBtn} onClick={() => zoomBy(1.2)}>+</button>
              <button style={smallBtn} onClick={() => zoomBy(0.8)}>−</button>
              <button style={smallBtn} onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}>1:1</button>
            </div>
          )}

          <button style={smallBtn} onClick={exportMd}>↓ MD</button>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {view === 'canvas' ? (
            /* ── Canvas view ─────────────────────────────────────────────── */
            <div
              ref={boardRef}
              style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#f0f0f0', cursor: 'grab', userSelect: 'none' }}
              onMouseDown={onBoardMouseDown}
              onDoubleClick={onBoardDblClick}
            >
              {/* SVG overlay – arrows are drawn in screen-space coords */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                <defs>
                  <marker id="ah" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#378ADD" />
                  </marker>
                </defs>

                {connections.map(conn => {
                  const fc = cards.find(c => c.id === conn.from)
                  const tc = cards.find(c => c.id === conn.to)
                  if (!fc || !tc) return null
                  const [x1, y1] = w2s(fc.x + CARD_W, fc.y + CARD_H_HALF)
                  const [x2, y2] = w2s(tc.x,           tc.y + CARD_H_HALF)
                  const cx = (x1 + x2) / 2
                  const mx = cx, my = (y1 + y2) / 2
                  return (
                    <g key={conn.id} style={{ pointerEvents: 'all' }}>
                      <path
                        d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                        fill="none" stroke="#378ADD" strokeWidth={2} markerEnd="url(#ah)"
                      />
                      {/* Clickable midpoint for label */}
                      <circle
                        cx={mx} cy={my} r={7}
                        fill={conn.label ? '#378ADD' : 'rgba(55,138,221,0.18)'}
                        stroke="none"
                        style={{ cursor: 'pointer' }}
                        onClick={() => updateConnLabel(conn.id)}
                      />
                      {conn.label && (
                        <text x={mx} y={my - 10} textAnchor="middle" fontSize={11} fill="#378ADD" style={{ pointerEvents: 'none' }}>
                          {conn.label}
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Temporary connecting line while dragging */}
                {connectLine && (
                  <line
                    x1={connectLine.x1} y1={connectLine.y1} x2={connectLine.x2} y2={connectLine.y2}
                    stroke="#378ADD" strokeWidth={2} strokeDasharray="5,4"
                  />
                )}
              </svg>

              {/* World – post-its live here, transformed for pan/zoom */}
              <div style={{
                position: 'absolute', top: 0, left: 0,
                transformOrigin: '0 0',
                transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`,
              }}>
                {cards.map(card => (
                  <PostIt
                    key={card.id}
                    card={card}
                    selected={selected === card.id}
                    onMouseDown={e => onCardMouseDown(e, card)}
                    onDblClick={e => { e.stopPropagation(); if (card.isFolder) enterCanvas(card.id, card.title); else openNote(card) }}
                    onRename={title => updateCardFn(card.id, { title })}
                    onNoteOpen={() => openNote(card)}
                    onToggleFolder={() => {
                      const becomingFolder = !card.isFolder
                      updateCardFn(card.id, { isFolder: becomingFolder })
                      if (becomingFolder) {
                        setDb(prev => prev[card.id] ? prev : {
                          ...prev,
                          [card.id]: { id: card.id, name: card.title, cards: [], connections: [] },
                        })
                      }
                    }}
                    onConnectDot={e => onConnectDotMouseDown(e, card)}
                    initialEditing={editingCardId === card.id}
                    onEditStarted={() => setEditingCardId(null)}
                  />
                ))}
              </div>
            </div>

          ) : (
            /* ── List view ───────────────────────────────────────────────── */
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#f0f0f0' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[['az', 'A→Z'], ['za', 'Z→A'], ['date', 'Creazione']].map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setListSort(v)}
                    style={{ ...smallBtn, fontWeight: listSort === v ? 700 : 400, background: listSort === v ? '#EBF4FF' : '#fff', color: listSort === v ? '#378ADD' : '#555' }}
                  >{l}</button>
                ))}
              </div>

              {sortedCards.length === 0 && (
                <p style={{ color: '#bbb', fontSize: 13 }}>Nessuna scheda in questo canvas.</p>
              )}

              {sortedCards.map(card => (
                <div
                  key={card.id}
                  style={{ background: '#fff', borderRadius: 6, padding: '10px 14px', marginBottom: 8, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                  onClick={() => openNote(card)}
                >
                  <div style={{ fontWeight: 500, fontSize: 14, color: '#222' }}>{card.title || 'Senza titolo'}</div>
                  {card.body && (
                    <div style={{ fontSize: 12, color: '#999', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {card.body}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Note panel ───────────────────────────────────────────────── */}
          {activeNoteId && (
            <NotePanel
              mode={notePanelMode}
              noteForm={noteForm}
              onChangeForm={setNoteForm}
              onSave={saveNote}
              onClose={() => setActiveNoteId(null)}
              onToggleMode={() => setNotePanelMode(m => m === 'side' ? 'full' : 'side')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── NotePanel ────────────────────────────────────────────────────────────────
function NotePanel({ mode, noteForm, onChangeForm, onSave, onClose, onToggleMode }) {
  const isFull = mode === 'full'
  const [titleFocused, setTitleFocused] = useState(false)

  const panelStyle = isFull
    ? { flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }
    : { width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: '1px solid #e5e7eb', overflow: 'hidden' }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 1, textTransform: 'uppercase' }}>Note</span>
        <div style={{ flex: 1 }} />
        <button style={iconBtn} title={isFull ? 'Vista affiancata' : 'Vista intera'} onClick={onToggleMode}>
          {isFull ? '⤡' : '⤢'}
        </button>
        <button style={iconBtn} title="Chiudi" onClick={onClose}>×</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={isFull ? { maxWidth: 800, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 } : { display: 'flex', flexDirection: 'column', flex: 1 }}>
          <input
            value={noteForm.title}
            onChange={e => onChangeForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Titolo"
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            style={{
              width: '100%', border: 'none', outline: 'none',
              borderBottom: `2px solid ${titleFocused ? '#378ADD' : '#f0f0f0'}`,
              padding: '12px 20px', fontSize: 16, fontWeight: 600, color: '#111',
              fontFamily: 'inherit', background: 'transparent',
            }}
          />
          <textarea
            value={noteForm.body}
            onChange={e => onChangeForm(f => ({ ...f, body: e.target.value }))}
            placeholder="Note (markdown supportato)"
            style={{
              flex: 1, width: '100%', border: 'none', outline: 'none', resize: 'none',
              padding: '16px 20px', fontSize: 14, lineHeight: 1.8, color: '#333',
              fontFamily: 'inherit', background: 'transparent',
              minHeight: isFull ? '60vh' : 0,
            }}
          />
        </div>
      </div>

      {/* Save button flush at bottom */}
      <button
        onClick={onSave}
        style={{ height: 44, width: '100%', background: '#111', color: '#fff', border: 'none', borderRadius: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}
      >Salva</button>
    </div>
  )
}

// ─── shared button styles ─────────────────────────────────────────────────────
const iconBtn = { border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#888', padding: '2px 4px', lineHeight: 1 }
const smallBtn = { border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, padding: '3px 8px', color: '#555' }
