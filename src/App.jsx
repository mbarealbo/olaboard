import { useState, useEffect, useRef, useCallback } from 'react'
import BlockEditor from './components/BlockEditor'
import PostIt from './components/PostIt'
import { Group, CanvasLabel } from './components/GroupBox'
import { useCanvas } from './hooks/useCanvas'
import { STORAGE_KEY, uid, loadDb, buildPath, anchorPoint } from './utils'

// ─── FolderTree ───────────────────────────────────────────────────────────────
function FolderTree({ db, currentId, onNavigate, id, depth }) {
  depth = depth ?? 0
  const canvas = db[id]
  if (!canvas) return null
  const isActive = id === currentId
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
        <FolderTree key={f.id} db={{ ...db, [f.id]: db[f.id] || { id: f.id, name: f.title, cards: [], connections: [], groups: [], labels: [] } }} currentId={currentId} onNavigate={onNavigate} id={f.id} depth={depth + 1} />
      ))}
    </>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [db, setDb] = useState(loadDb)
  const [stack, setStack] = useState(['root'])
  const [view, setView] = useState('canvas')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [noteForm, setNoteForm] = useState({ title: '', body: '' })
  const [notePanelMode, setNotePanelMode] = useState('side')
  const [listSort, setListSort] = useState('az')

  const currentIdRef = useRef('root')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)) }, [db])

  const currentId = stack[stack.length - 1]
  useEffect(() => { currentIdRef.current = currentId }, [currentId])

  const currentCanvas = db[currentId] || { cards: [], connections: [], groups: [], labels: [] }
  const cards = currentCanvas.cards
  const connections = currentCanvas.connections
  const groups = currentCanvas.groups || []
  const labels = currentCanvas.labels || []

  // ── stable db mutators ────────────────────────────────────────────────────
  const updateCardFn = useCallback((cardId, updates) => {
    setDb(prev => {
      const cId = currentIdRef.current
      const canvas = prev[cId]
      if (!canvas) return prev
      return { ...prev, [cId]: { ...canvas, cards: canvas.cards.map(c => c.id === cardId ? { ...c, ...updates } : c) } }
    })
  }, [])

  const addConnectionFn = useCallback((from, to, fromAnchor, toAnchor) => {
    if (from === to) return
    setDb(prev => {
      const cId = currentIdRef.current
      const canvas = prev[cId]
      if (!canvas) return prev
      return { ...prev, [cId]: { ...canvas, connections: [...canvas.connections, { id: uid(), from, to, fromAnchor: fromAnchor || 'right', toAnchor: toAnchor || 'left', label: '' }] } }
    })
  }, [])

  // ── canvas state & handlers ───────────────────────────────────────────────
  const {
    offset, setOffset,
    scale, setScale,
    scaleRef,
    connectLine,
    drawingGroup, setDrawingGroup,
    textMode, setTextMode,
    groupDrawPreview,
    selectedLabel, setSelectedLabel,
    editingLabelId, setEditingLabelId,
    selected, setSelected,
    editingCardId, setEditingCardId,
    boardRef,
    boardCursor,
    w2s,
    onBoardMouseDown, onBoardDblClick,
    onCardMouseDown, onConnectDotMouseDown,
    onGroupTitleBarMouseDown, onGroupResizeHandleMouseDown,
    onLabelMouseDown, zoomBy,
  } = useCanvas({ db, setDb, currentIdRef, updateCardFn, addConnectionFn, setActiveNoteId, view })

  // ── navigation ───────────────────────────────────────────────────────────
  function enterCanvas(id, name) {
    setDb(prev => prev[id] ? prev : { ...prev, [id]: { id, name: name || 'Cartella', cards: [], connections: [], groups: [], labels: [] } })
    setStack(prev => [...prev, id])
    setSelected(null); setActiveNoteId(null)
    setOffset({ x: 0, y: 0 }); setScale(1)
  }

  function navigateTo(idx) {
    setStack(prev => prev.slice(0, idx + 1))
    setSelected(null); setActiveNoteId(null)
  }

  const handleSidebarNavigate = useCallback((targetId) => {
    if (targetId === currentIdRef.current) return
    setDb(prev => {
      if (prev[targetId]) return prev
      function findCard(canvasId) {
        const cv = prev[canvasId]
        if (!cv) return null
        const found = cv.cards.find(c => c.id === targetId)
        if (found) return found
        for (const c of cv.cards) if (c.isFolder) { const r = findCard(c.id); if (r) return r }
        return null
      }
      const fc = findCard('root')
      return { ...prev, [targetId]: { id: targetId, name: fc?.title || 'Cartella', cards: [], connections: [], groups: [], labels: [] } }
    })
    setStack(buildPath(db, targetId))
    setSelected(null); setActiveNoteId(null)
  }, [db])

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
    return 0
  })

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div style={{ width: 190, flexShrink: 0, background: '#fff', borderRight: '1px solid #e5e7eb', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 8px 4px', fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 1, textTransform: 'uppercase' }}>Lavagne</div>
          <FolderTree db={db} currentId={currentId} onNavigate={handleSidebarNavigate} id="root" />
        </div>
      )}

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Top bar ──────────────────────────────────────────────────────*/}
        <div style={{ height: 44, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flexShrink: 0 }}>
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
              <button key={v} onClick={() => setView(v)} style={{ fontSize: 12, padding: '3px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === v ? '#fff' : 'transparent', color: view === v ? '#111' : '#888', fontWeight: view === v ? 600 : 400, boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>{l}</button>
            ))}
          </div>

          {/* Canvas tools */}
          {view === 'canvas' && (
            <>
              <div style={{ display: 'flex', gap: 2 }}>
                <button
                  style={{ ...smallBtn, background: drawingGroup ? '#EBF4FF' : '#fff', color: drawingGroup ? '#378ADD' : '#555', borderColor: drawingGroup ? '#378ADD' : '#e5e7eb' }}
                  onClick={() => { setDrawingGroup(v => !v); setTextMode(false) }}
                  title="Disegna gruppo"
                >□ Gruppo</button>
                <button
                  style={{ ...smallBtn, background: textMode ? '#EBF4FF' : '#fff', color: textMode ? '#378ADD' : '#555', borderColor: textMode ? '#378ADD' : '#e5e7eb' }}
                  onClick={() => { setTextMode(v => !v); setDrawingGroup(false) }}
                  title="Aggiungi testo"
                >T Testo</button>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <button style={smallBtn} onClick={() => zoomBy(1.2)}>+</button>
                <button style={smallBtn} onClick={() => zoomBy(0.8)}>−</button>
                <button style={smallBtn} onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}>1:1</button>
              </div>
            </>
          )}

          <button style={smallBtn} onClick={exportMd}>↓ MD</button>
        </div>

        {/* ── Content ─────────────────────────────────────────────���────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {view === 'canvas' ? (
            <div
              ref={boardRef}
              style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#f0f0f0', cursor: boardCursor, userSelect: 'none' }}
              onMouseDown={onBoardMouseDown}
              onDoubleClick={onBoardDblClick}
            >
              {/* SVG overlay – arrows in screen-space */}
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
                  const fa = conn.fromAnchor || 'right'
                  const ta = conn.toAnchor   || 'left'
                  const [fpx, fpy] = anchorPoint(fc, fa)
                  const [tpx, tpy] = anchorPoint(tc, ta)
                  const [x1, y1] = w2s(fpx, fpy)
                  const [x2, y2] = w2s(tpx, tpy)
                  const OFF = 60 * scaleRef.current
                  const anchorDir = a => a === 'right' ? [1,0] : a === 'left' ? [-1,0] : a === 'bottom' ? [0,1] : [0,-1]
                  const [fdx, fdy] = anchorDir(fa)
                  const [tdx, tdy] = anchorDir(ta)
                  const cp1x = x1 + fdx * OFF, cp1y = y1 + fdy * OFF
                  const cp2x = x2 + tdx * OFF, cp2y = y2 + tdy * OFF
                  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
                  return (
                    <g key={conn.id} style={{ pointerEvents: 'all' }}>
                      <path d={`M${x1},${y1} C${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`} fill="none" stroke="#378ADD" strokeWidth={2} markerEnd="url(#ah)" />
                      <circle cx={mx} cy={my} r={7} fill={conn.label ? '#378ADD' : 'rgba(55,138,221,0.18)'} stroke="none" style={{ cursor: 'pointer' }} onClick={() => updateConnLabel(conn.id)} />
                      {conn.label && (
                        <text x={mx} y={my - 10} textAnchor="middle" fontSize={11} fill="#378ADD" style={{ pointerEvents: 'none' }}>{conn.label}</text>
                      )}
                    </g>
                  )
                })}
                {connectLine && (
                  <line x1={connectLine.x1} y1={connectLine.y1} x2={connectLine.x2} y2={connectLine.y2} stroke="#378ADD" strokeWidth={2} strokeDasharray="5,4" />
                )}
              </svg>

              {/* World – groups, labels, cards, transformed for pan/zoom */}
              <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})` }}>

                {/* Groups – behind everything */}
                {groups.map(group => (
                  <Group
                    key={group.id}
                    group={group}
                    onTitleBarMouseDown={e => onGroupTitleBarMouseDown(e, group)}
                    onResizeHandleMouseDown={(e, handle) => onGroupResizeHandleMouseDown(e, group, handle)}
                    onDelete={() => setDb(prev => {
                      const cId = currentId
                      const canvas = prev[cId]
                      if (!canvas) return prev
                      return { ...prev, [cId]: { ...canvas, groups: (canvas.groups||[]).filter(g => g.id !== group.id) } }
                    })}
                    onTitleChange={title => setDb(prev => {
                      const cId = currentId
                      const canvas = prev[cId]
                      if (!canvas) return prev
                      return { ...prev, [cId]: { ...canvas, groups: (canvas.groups||[]).map(g => g.id === group.id ? { ...g, title } : g) } }
                    })}
                  />
                ))}

                {/* Group draw preview */}
                {groupDrawPreview && (
                  <div style={{
                    position: 'absolute',
                    left: groupDrawPreview.x, top: groupDrawPreview.y,
                    width: groupDrawPreview.w, height: groupDrawPreview.h,
                    border: '2px dashed #378ADD', background: 'rgba(55,138,221,0.05)',
                    borderRadius: 6, pointerEvents: 'none', zIndex: 0,
                  }} />
                )}

                {/* Labels */}
                {labels.map(label => (
                  <CanvasLabel
                    key={label.id}
                    label={label}
                    selected={selectedLabel === label.id}
                    editing={editingLabelId === label.id}
                    onMouseDown={e => onLabelMouseDown(e, label)}
                    onStartEdit={() => setEditingLabelId(label.id)}
                    onEndEdit={() => setEditingLabelId(null)}
                    onTextChange={text => setDb(prev => {
                      const cId = currentId
                      const canvas = prev[cId]
                      if (!canvas) return prev
                      return { ...prev, [cId]: { ...canvas, labels: (canvas.labels||[]).map(l => l.id === label.id ? { ...l, text } : l) } }
                    })}
                    onDelete={() => setDb(prev => {
                      const cId = currentId
                      const canvas = prev[cId]
                      if (!canvas) return prev
                      return { ...prev, [cId]: { ...canvas, labels: (canvas.labels||[]).filter(l => l.id !== label.id) } }
                    })}
                  />
                ))}

                {/* Cards – on top */}
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
                          [card.id]: { id: card.id, name: card.title, cards: [], connections: [], groups: [], labels: [] },
                        })
                      }
                    }}
                    onConnectDot={(e, anchor) => onConnectDotMouseDown(e, card, anchor)}
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
                  <button key={v} onClick={() => setListSort(v)} style={{ ...smallBtn, fontWeight: listSort === v ? 700 : 400, background: listSort === v ? '#EBF4FF' : '#fff', color: listSort === v ? '#378ADD' : '#555' }}>{l}</button>
                ))}
              </div>
              {sortedCards.length === 0 && <p style={{ color: '#bbb', fontSize: 13 }}>Nessuna scheda in questo canvas.</p>}
              {sortedCards.map(card => (
                <div key={card.id} style={{ background: '#fff', borderRadius: 6, padding: '10px 14px', marginBottom: 8, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }} onClick={() => openNote(card)}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: '#222' }}>{card.title || 'Senza titolo'}</div>
                  {card.body && <div style={{ fontSize: 12, color: '#999', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.body}</div>}
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
      <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 1, textTransform: 'uppercase' }}>Note</span>
        <div style={{ flex: 1 }} />
        <button style={iconBtn} title={isFull ? 'Vista affiancata' : 'Vista intera'} onClick={onToggleMode}>{isFull ? '⤡' : '⤢'}</button>
        <button style={iconBtn} title="Chiudi" onClick={onClose}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={isFull ? { maxWidth: 800, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 } : { display: 'flex', flexDirection: 'column', flex: 1 }}>
          <input
            value={noteForm.title}
            onChange={e => onChangeForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Titolo"
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            style={{ width: '100%', border: 'none', outline: 'none', borderBottom: `2px solid ${titleFocused ? '#378ADD' : '#f0f0f0'}`, padding: '12px 20px', fontSize: 16, fontWeight: 600, color: '#111', fontFamily: 'inherit', background: 'transparent' }}
          />
          <BlockEditor value={noteForm.body} onChange={body => onChangeForm(f => ({ ...f, body }))} />
        </div>
      </div>
      <button onClick={onSave} style={{ height: 44, width: '100%', background: '#111', color: '#fff', border: 'none', borderRadius: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>Salva</button>
    </div>
  )
}

// ─── shared button styles ─────────────────────────────────────────────────────
const iconBtn = { border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#888', padding: '2px 4px', lineHeight: 1 }
const smallBtn = { border: '1px solid #e5e7eb', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, padding: '3px 8px', color: '#555' }
