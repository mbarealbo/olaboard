import { useState, useEffect, useRef, useCallback } from 'react'
import BlockEditor from './components/BlockEditor'
import PostIt from './components/PostIt'
import { Group, CanvasLabel } from './components/GroupBox'
import { useCanvas } from './hooks/useCanvas'
import { STORAGE_KEY, CARD_W, CARD_H_HALF, uid, loadDb, buildPath } from './utils'

const BOARDS_KEY = 'olaboard_boards'

function loadBoards() {
  try {
    const raw = JSON.parse(localStorage.getItem(BOARDS_KEY))
    if (Array.isArray(raw) && raw.length > 0) return raw
  } catch {}
  return [{ id: 'root', name: 'La mia lavagna' }]
}

// ─── FolderTree ───────────────────────────────────────────────────────────────
function FolderTree({ db, currentId, onNavigate, id, depth }) {
  depth = depth ?? 0
  const canvas = db[id]
  if (!canvas) return null
  const isActive = id === currentId
  const subFolders = canvas.cards.filter(c => c.isFolder && !c.isLabel)
  return (
    <>
      <div
        style={{
          paddingLeft: depth * 12 + 8, paddingRight: 8,
          paddingTop: 4, paddingBottom: 4,
          cursor: 'pointer', fontSize: 12,
          background: isActive ? '#EBF4FF' : 'transparent',
          color: isActive ? 'var(--accent)' : 'var(--text)',
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
  const [boards, setBoards] = useState(loadBoards)
  const [renamingBoardId, setRenamingBoardId] = useState(null)
  const [stack, setStack] = useState(['root'])
  const [view, setView] = useState('canvas')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [noteForm, setNoteForm] = useState({ title: '', body: '' })
  const [notePanelMode, setNotePanelMode] = useState('side')
  const [listSort, setListSort] = useState('az')
  const [showGrid, setShowGrid] = useState(true)
  const [theme, setTheme] = useState('light')
  const [activeTool, setActiveTool] = useState('note')
  const [autoCreate, setAutoCreate] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [multiSelected, setMultiSelected] = useState([])
  const [selectionRect, setSelectionRect] = useState(null)
  const [selectedConn, setSelectedConn] = useState(null)
  const [editingConnId, setEditingConnId] = useState(null)
  const [editingConnValue, setEditingConnValue] = useState('')

  const currentIdRef = useRef('root')

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)) }, [db])
  useEffect(() => { localStorage.setItem(BOARDS_KEY, JSON.stringify(boards)) }, [boards])

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
    connectLine,
    groupDrawPreview,
    selectedLabel,
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
    activeAutoCreateRef, activeToolRef, multiSelectedRef,
  } = useCanvas({ db, setDb, currentIdRef, updateCardFn, addConnectionFn, setActiveNoteId, view, activeTool, setActiveTool, selectMode, setMultiSelected, setSelectionRect })

  useEffect(() => { activeAutoCreateRef.current = autoCreate }, [autoCreate, activeAutoCreateRef])
  useEffect(() => { activeToolRef.current = activeTool }, [activeTool, activeToolRef])
  useEffect(() => { multiSelectedRef.current = multiSelected }, [multiSelected, multiSelectedRef])

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

  // ── connection delete ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (multiSelected.length > 0) {
          const ids = new Set(multiSelected)
          setDb(prev => {
            const cId = currentIdRef.current
            const canvas = prev[cId]
            if (!canvas) return prev
            return {
              ...prev, [cId]: {
                ...canvas,
                cards: canvas.cards.filter(c => !ids.has(c.id)),
                groups: (canvas.groups || []).filter(g => !ids.has(g.id)),
                labels: (canvas.labels || []).filter(l => !ids.has(l.id)),
              }
            }
          })
          setMultiSelected([])
          return
        }
        if (selectedConn) {
          setDb(prev => {
            const cId = currentIdRef.current
            const canvas = prev[cId]
            if (!canvas) return prev
            return { ...prev, [cId]: { ...canvas, connections: canvas.connections.filter(c => c.id !== selectedConn) } }
          })
          setSelectedConn(null)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedConn, multiSelected])

  // ── board delete (keyboard) ───────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected === null && boards.length > 1) {
        const boardId = stack[0]
        if (!window.confirm('Eliminare questa lavagna e tutto il suo contenuto?')) return
        // collect all canvas IDs rooted at boardId
        function collectIds(db, id) {
          const canvas = db[id]
          if (!canvas) return [id]
          const ids = [id]
          for (const c of canvas.cards) {
            if (c.isFolder && !c.isLabel) ids.push(...collectIds(db, c.id))
          }
          return ids
        }
        setBoards(prev => {
          const next = prev.filter(b => b.id !== boardId)
          const firstId = next[0].id
          setDb(prev2 => {
            const idsToRemove = collectIds(prev2, boardId)
            const next2 = { ...prev2 }
            for (const id of idsToRemove) delete next2[id]
            return next2
          })
          setStack([firstId])
          setSelected(null); setActiveNoteId(null)
          setOffset({ x: 0, y: 0 }); setScale(1)
          return next
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, boards, stack])

  // ── connection label ──────────────────────────────────────────────────────
  function saveConnLabel(connId, label) {
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
  const listItems = [
    ...cards.map(c => ({
      id: c.id,
      title: c.title || 'Senza titolo',
      type: c.isFolder ? 'folder' : c.isLabel ? 'label' : 'note',
      createdAt: c.createdAt || null,
      _card: c,
    })),
    ...labels.map(l => ({
      id: l.id,
      title: l.text || 'Senza titolo',
      type: 'label',
      createdAt: l.createdAt || null,
      _label: l,
    })),
  ].sort((a, b) => {
    if (listSort === 'az') return a.title.localeCompare(b.title)
    if (listSort === 'za') return b.title.localeCompare(a.title)
    if (listSort === 'date') return (a.createdAt || 0) - (b.createdAt || 0)
    return 0
  })

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div data-theme={theme} style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div style={{ width: 210, flexShrink: 0, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top scrollable section */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '10px 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Lavagne</div>
            {boards.map(board => {
              const isActive = stack[0] === board.id
              const isRenaming = renamingBoardId === board.id
              return (
                <div key={board.id}>
                  {/* Board row */}
                  <div
                    style={{ padding: '6px 12px', fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'transparent' }}
                    onClick={() => {
                      if (isRenaming) return
                      if (!isActive) {
                        setStack([board.id])
                        setSelected(null); setActiveNoteId(null)
                        setOffset({ x: 0, y: 0 }); setScale(1)
                        setDb(prev => prev[board.id] ? prev : { ...prev, [board.id]: { id: board.id, name: board.name, cards: [], connections: [], groups: [], labels: [] } })
                      } else {
                        setRenamingBoardId(board.id)
                      }
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f5f5f5' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: 11 }}>{isActive ? '▾' : '▸'}</span>
                    {isRenaming ? (
                      <input
                        autoFocus
                        defaultValue={board.name}
                        style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text)', background: 'transparent', width: '100%', fontFamily: 'inherit' }}
                        onBlur={e => {
                          const name = e.target.value.trim() || board.name
                          setBoards(prev => prev.map(b => b.id === board.id ? { ...b, name } : b))
                          setDb(prev => prev[board.id] ? { ...prev, [board.id]: { ...prev[board.id], name } } : prev)
                          setRenamingBoardId(null)
                        }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') e.target.blur(); e.stopPropagation() }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{board.name}</span>
                    )}
                    {!isActive && boards.length > 1 && (
                      <button
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#e53935' }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#bbb' }}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => {
                          e.stopPropagation()
                          if (!window.confirm('Eliminare questa lavagna e tutto il suo contenuto?')) return
                          setBoards(prev => prev.filter(b => b.id !== board.id))
                          setDb(prev => { const next = { ...prev }; delete next[board.id]; return next })
                        }}
                      >🗑</button>
                    )}
                  </div>
                  {/* Folder tree when active */}
                  {isActive && (
                    <FolderTree db={db} currentId={currentId} onNavigate={handleSidebarNavigate} id={board.id} depth={1} />
                  )}
                </div>
              )
            })}
          </div>
          {/* Bottom fixed section */}
          <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              style={{ width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              onClick={() => {
                const id = uid()
                const name = 'Nuova lavagna'
                setBoards(prev => [...prev, { id, name }])
                setDb(prev => ({ ...prev, [id]: { id, name, cards: [], connections: [], groups: [], labels: [] } }))
                setStack([id]); setSelected(null); setActiveNoteId(null)
                setOffset({ x: 0, y: 0 }); setScale(1)
                setRenamingBoardId(id)
              }}
            >+ Nuova lavagna</button>
            <button
              style={{ width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', color: '#555' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              onClick={() => alert('Coming soon')}
            >👤 Account</button>
          </div>
        </div>
      )}

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Top bar ──────────────────────────────────────────────────────*/}
        <div style={{ height: 44, background: 'var(--topbar-bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flexShrink: 0 }}>
          <button style={iconBtn} onClick={() => setSidebarOpen(v => !v)}>☰</button>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, overflow: 'hidden' }}>
            {stack.map((id, i) => {
              const isLast = i === stack.length - 1
              return (
                <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {i > 0 && <span style={{ color: '#ddd' }}>/</span>}
                  <span
                    style={{ cursor: isLast ? 'default' : 'pointer', color: isLast ? 'var(--text)' : 'var(--accent)', fontWeight: isLast ? 600 : 400 }}
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
              <button key={v} onClick={() => setView(v)} style={{ fontSize: 12, padding: '3px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === v ? 'var(--btn-bg)' : 'transparent', color: view === v ? 'var(--btn-text)' : 'var(--text-muted)', fontWeight: view === v ? 600 : 400, boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>{l}</button>
            ))}
          </div>

          {/* Canvas tools */}
          <>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                disabled={view !== 'canvas'}
                style={{ ...smallBtn, background: activeTool === 'group' ? 'var(--accent)' : 'var(--btn-bg)', color: activeTool === 'group' ? '#fff' : 'var(--btn-text)', borderColor: activeTool === 'group' ? 'var(--accent)' : 'var(--btn-border)', ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                onClick={view === 'canvas' ? () => setActiveTool(t => t === 'group' ? 'note' : 'group') : undefined}
                title="Disegna gruppo"
              >□ Gruppo</button>
              <button
                disabled={view !== 'canvas'}
                style={{ ...smallBtn, background: activeTool === 'text' ? 'var(--accent)' : 'var(--btn-bg)', color: activeTool === 'text' ? '#fff' : 'var(--btn-text)', borderColor: activeTool === 'text' ? 'var(--accent)' : 'var(--btn-border)', ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                onClick={view === 'canvas' ? () => setActiveTool(t => t === 'text' ? 'note' : 'text') : undefined}
                title="Aggiungi testo"
              >T Testo</button>
              <button
                disabled={view !== 'canvas'}
                style={{ ...smallBtn, ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                onClick={view === 'canvas' ? () => setShowGrid(v => !v) : undefined}
                title="Mostra/nascondi griglia"
              >{showGrid ? '⊞ Grid' : '⊟ Grid'}</button>
              <button
                disabled={view !== 'canvas'}
                style={{ ...smallBtn, background: autoCreate ? 'var(--accent)' : 'var(--btn-bg)', color: autoCreate ? '#fff' : 'var(--btn-text)', borderColor: autoCreate ? 'var(--accent)' : 'var(--btn-border)', ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                onClick={view === 'canvas' ? () => setAutoCreate(v => !v) : undefined}
                title="Crea elemento al termine della freccia"
              >⚡ Quick</button>
              <button
                disabled={view !== 'canvas'}
                style={{ ...smallBtn, background: selectMode ? 'var(--accent)' : 'var(--btn-bg)', color: selectMode ? '#fff' : 'var(--btn-text)', borderColor: selectMode ? 'var(--accent)' : 'var(--btn-border)', ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                onClick={view === 'canvas' ? () => { setSelectMode(v => !v); setActiveTool('note'); setAutoCreate(false) } : undefined}
                title="Selezione multipla"
              >⬚ Select</button>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              <button disabled={view !== 'canvas'} style={{ ...smallBtn, ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={view === 'canvas' ? () => zoomBy(1.2) : undefined}>+</button>
              <button disabled={view !== 'canvas'} style={{ ...smallBtn, ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={view === 'canvas' ? () => zoomBy(0.8) : undefined}>−</button>
              <button disabled={view !== 'canvas'} style={{ ...smallBtn, ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={view === 'canvas' ? () => { setScale(1); setOffset({ x: 0, y: 0 }) } : undefined}>1:1</button>
            </div>
          </>

          <button disabled={view !== 'canvas'} style={{ ...smallBtn, ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={view === 'canvas' ? exportMd : undefined}>↓ MD</button>
        </div>

        {/* ── Content ─────────────────────────────────────────────���────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {view === 'canvas' ? (
            <div
              ref={boardRef}
              style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: boardCursor, userSelect: 'none', backgroundColor: 'var(--bg)', backgroundImage: showGrid ? 'radial-gradient(circle, var(--grid-dot) 1px, transparent 1px)' : 'none', backgroundSize: `${20 * scale}px ${20 * scale}px`, backgroundPosition: `${offset.x % (20 * scale)}px ${offset.y % (20 * scale)}px` }}
              onMouseDown={e => { setSelectedConn(null); onBoardMouseDown(e) }}
              onDoubleClick={onBoardDblClick}
            >
              {/* SVG overlay – arrows in screen-space */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                <defs>
                  <marker id="ah" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#378ADD" />
                  </marker>
                  <marker id="ah-sel" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#e53935" />
                  </marker>
                </defs>
                {connections.map(conn => {
                  const isSel = selectedConn === conn.id
                  const allLabels = [...labels, ...cards.filter(c => c.isLabel).map(c => ({ id: c.id, x: c.x, y: c.y }))]
                  function resolveEntity(id) {
                    const card = cards.find(c => c.id === id && !c.isLabel)
                    if (card) return { entity: card, isLabel: false }
                    const lbl = allLabels.find(l => l.id === id)
                    if (lbl) return { entity: lbl, isLabel: true }
                    return null
                  }
                  const fromRes = resolveEntity(conn.from)
                  const toRes   = resolveEntity(conn.to)
                  if (!fromRes || !toRes) return null
                  const fe = fromRes.entity, te = toRes.entity
                  const fCX = fromRes.isLabel ? fe.x + 50 : fe.x + CARD_W / 2
                  const fCY = fromRes.isLabel ? fe.y + 15 : fe.y + CARD_H_HALF
                  const tCX = toRes.isLabel   ? te.x + 50 : te.x + CARD_W / 2
                  const tCY = toRes.isLabel   ? te.y + 15 : te.y + CARD_H_HALF
                  const wdx = tCX - fCX, wdy = tCY - fCY
                  const horiz = Math.abs(wdx) > Math.abs(wdy)
                  function exitPoint(entity, isLbl, goingRight, goingDown, isHoriz, isSource) {
                    const w = isLbl ? 112 : CARD_W
                    const h = isLbl ? 40 : CARD_H_HALF * 2
                    const P = isSource ? 0 : (isLbl ? 20 : 36)
                    const cx = entity.x + w / 2
                    const cy = entity.y + h / 2
                    if (isHoriz) {
                      if (isSource) return goingRight ? [entity.x + w + P, cy] : [entity.x - P, cy]
                      else          return goingRight ? [entity.x - P, cy]     : [entity.x + w + P, cy]
                    } else {
                      if (isSource) return goingDown ? [cx, entity.y + h + P] : [cx, entity.y - P]
                      else          return goingDown ? [cx, entity.y - P]     : [cx, entity.y + h + P]
                    }
                  }
                  const [fpx, fpy] = exitPoint(fe, fromRes.isLabel, wdx > 0, wdy > 0, horiz, true)
                  const [tpx, tpy] = exitPoint(te, toRes.isLabel,   wdx > 0, wdy > 0, horiz, false)
                  const [sx1, sy1] = w2s(fpx, fpy)
                  const [sx2, sy2] = w2s(tpx, tpy)
                  const dist = Math.sqrt((sx2 - sx1) ** 2 + (sy2 - sy1) ** 2)
                  const off = dist / 3
                  let cp1x, cp1y, cp2x, cp2y
                  if (horiz) {
                    const dir = sx2 > sx1 ? 1 : -1
                    cp1x = sx1 + dir * off; cp1y = sy1
                    cp2x = sx2 - dir * off; cp2y = sy2
                  } else {
                    const dir = sy2 > sy1 ? 1 : -1
                    cp1x = sx1; cp1y = sy1 + dir * off
                    cp2x = sx2; cp2y = sy2 - dir * off
                  }
                  const t = 0.5
                  const mx = (1-t)**3*sx1 + 3*(1-t)**2*t*cp1x + 3*(1-t)*t**2*cp2x + t**3*sx2
                  const my = (1-t)**3*sy1 + 3*(1-t)**2*t*cp1y + 3*(1-t)*t**2*cp2y + t**3*sy2
                  const d = `M${sx1},${sy1} C${cp1x},${cp1y} ${cp2x},${cp2y} ${sx2},${sy2}`
                  const stroke = isSel ? '#e53935' : '#378ADD'
                  const markerEnd = isSel ? 'url(#ah-sel)' : 'url(#ah)'
                  return (
                    <g key={conn.id} style={{ pointerEvents: 'all' }} onClick={e => { e.stopPropagation(); setSelectedConn(isSel ? null : conn.id) }}>
                      <path d={d} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: 'pointer' }} />
                      <path d={d} fill="none" stroke={stroke} strokeWidth={isSel ? 3 : 2} markerEnd={markerEnd} style={{ pointerEvents: 'none' }} />
                      {editingConnId !== conn.id && (
                        <circle cx={mx} cy={my} r={7} fill={conn.label ? stroke : (isSel ? 'rgba(229,57,53,0.18)' : 'rgba(55,138,221,0.18)')} stroke="none" style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setEditingConnId(conn.id); setEditingConnValue(conn.label || '') }} />
                      )}
                      {conn.label && editingConnId !== conn.id && (
                        <text x={mx} y={my - 10} textAnchor="middle" fontSize={11} fill={stroke} style={{ pointerEvents: 'none' }}>{conn.label}</text>
                      )}
                      {editingConnId === conn.id && (
                        <foreignObject x={mx - 60} y={my - 14} width={120} height={28}>
                          <input
                            autoFocus
                            value={editingConnValue}
                            onChange={e => setEditingConnValue(e.target.value)}
                            onBlur={() => { saveConnLabel(editingConnId, editingConnValue); setEditingConnId(null) }}
                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingConnId(null) }}
                            style={{ width: '100%', height: '100%', border: '1px solid #378ADD', borderRadius: 4, padding: '2px 6px', fontSize: 11, background: 'white', outline: 'none', textAlign: 'center' }}
                          />
                        </foreignObject>
                      )}
                    </g>
                  )
                })}
                {connectLine && (
                  <line x1={connectLine.x1} y1={connectLine.y1} x2={connectLine.x2} y2={connectLine.y2} stroke="#378ADD" strokeWidth={2} strokeDasharray="5,4" />
                )}
              </svg>

              {/* Selection lasso rect */}
              {selectionRect && (() => {
                const [sx, sy] = w2s(selectionRect.x, selectionRect.y)
                return (
                  <div style={{
                    position: 'absolute',
                    left: sx, top: sy,
                    width: selectionRect.w * scale,
                    height: selectionRect.h * scale,
                    border: '2px dashed #378ADD',
                    background: 'rgba(55,138,221,0.08)',
                    borderRadius: 4,
                    pointerEvents: 'none',
                    zIndex: 9999,
                  }} />
                )
              })()}

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
                    selected={selectedLabel === label.id || multiSelected.includes(label.id)}
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
                    onConnectDot={(e, anchor) => onConnectDotMouseDown(e, label, anchor)}
                  />
                ))}

                {/* Cards – on top */}
                {cards.map(card => {
                  if (card.isLabel) {
                    const labelObj = { id: card.id, x: card.x, y: card.y, text: card.title || '', fontSize: 16 }
                    return (
                      <CanvasLabel
                        key={card.id}
                        label={labelObj}
                        selected={selectedLabel === card.id || multiSelected.includes(card.id)}
                        editing={editingLabelId === card.id}
                        onMouseDown={e => onLabelMouseDown(e, labelObj, true)}
                        onStartEdit={() => setEditingLabelId(card.id)}
                        onEndEdit={() => setEditingLabelId(null)}
                        onTextChange={text => updateCardFn(card.id, { title: text })}
                        onDelete={() => setDb(prev => {
                          const cId = currentId
                          const canvas = prev[cId]
                          if (!canvas) return prev
                          return { ...prev, [cId]: { ...canvas, cards: canvas.cards.filter(c => c.id !== card.id) } }
                        })}
                        onConnectDot={(e, anchor) => onConnectDotMouseDown(e, labelObj, anchor)}
                        onConvertToPostIt={() => updateCardFn(card.id, { isLabel: false })}
                        onConvertToFolder={() => updateCardFn(card.id, { isLabel: false, isFolder: true })}
                      />
                    )
                  }
                  return (
                    <PostIt
                      key={card.id}
                      card={card}
                      selected={selected === card.id || multiSelected.includes(card.id)}
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
                      onConvertToLabel={() => updateCardFn(card.id, { isLabel: true })}
                      onConnectDot={(e, anchor) => onConnectDotMouseDown(e, card, anchor)}
                      initialEditing={editingCardId === card.id}
                      onEditStarted={() => setEditingCardId(null)}
                    />
                  )
                })}
              </div>
            </div>

          ) : (
            /* ── List view ───────────────────────────────────────────────── */
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'var(--bg)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[['az', 'A→Z'], ['za', 'Z→A'], ['date', 'Creazione']].map(([v, l]) => (
                  <button key={v} onClick={() => setListSort(v)} style={{ ...smallBtn, fontWeight: listSort === v ? 700 : 400, background: listSort === v ? '#EBF4FF' : '#fff', color: listSort === v ? '#378ADD' : '#555' }}>{l}</button>
                ))}
              </div>
              {listItems.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nessun elemento in questo canvas.</p>}
              {listItems.map(item => {
                const badge = item.type === 'folder' ? '📁 Cartella' : item.type === 'label' ? 'T Testo' : '📝 Nota'
                const dateStr = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '—'
                function handleClick() {
                  if (item.type === 'folder') enterCanvas(item._card.id, item._card.title)
                  else if (item.type === 'note') openNote(item._card)
                  else setSelected(item.id)
                }
                return (
                  <div
                    key={item.id}
                    style={{ background: '#fff', borderRadius: 6, padding: '10px 14px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                    onClick={handleClick}
                  >
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 70, flexShrink: 0 }}>{badge}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{dateStr}</span>
                  </div>
                )
              })}
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

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(t => t === 'light' ? 'dark' : t === 'dark' ? 'high-contrast' : 'light')}
        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 12px', fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer', color: 'var(--text)' }}
      >{theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💾'}</button>

    </div>
  )
}

// ─── NotePanel ────────────────────────────────────────────────────────────────
function NotePanel({ mode, noteForm, onChangeForm, onSave, onClose, onToggleMode }) {
  const isFull = mode === 'full'
  const [titleFocused, setTitleFocused] = useState(false)

  const panelStyle = isFull
    ? { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)', overflow: 'hidden' }
    : { width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)', overflow: 'hidden' }

  return (
    <div style={panelStyle}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Note</span>
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
            style={{ width: '100%', border: 'none', outline: 'none', borderBottom: `2px solid ${titleFocused ? 'var(--accent)' : 'var(--border)'}`, padding: '12px 20px', fontSize: 16, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit', background: 'transparent' }}
          />
          <BlockEditor value={noteForm.body} onChange={body => onChangeForm(f => ({ ...f, body }))} />
        </div>
      </div>
      <button onClick={onSave} style={{ height: 44, width: '100%', background: '#111', color: '#fff', border: 'none', borderRadius: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>Salva</button>
    </div>
  )
}

// ─── shared button styles ─────────────────────────────────────────────────────
const iconBtn = { border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: '2px 4px', lineHeight: 1 }
const smallBtn = { border: '1px solid var(--btn-border)', borderRadius: 4, background: 'var(--btn-bg)', cursor: 'pointer', fontSize: 12, padding: '3px 8px', color: 'var(--btn-text)' }
