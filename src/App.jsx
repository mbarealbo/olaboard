import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, Moon, Sun, Monitor, Zap, Folder, LogOut, Maximize2 } from 'lucide-react'
import BlockEditor from './components/BlockEditor'
import PostIt from './components/PostIt'
import { Group, CanvasLabel } from './components/GroupBox'
import { useCanvas } from './hooks/useCanvas'
import { CARD_W, CARD_H_HALF, uid } from './utils'
import { supabase } from './lib/supabase'
import AuthPage from './components/AuthPage'
import {
  fetchBoards as fetchBoardsDB,
  createBoard as createBoardDB,
  updateBoard as updateBoardDB,
  deleteBoard as deleteBoardDB,
  fetchCanvas as fetchCanvasDB,
  createCanvas as createCanvasDB,
  updateCanvas as updateCanvasDB,
  fetchCards as fetchCardsDB,
  fetchConnections as fetchConnectionsDB,
  upsertCards,
  deleteCardsByIds,
  upsertConnections,
  deleteConnectionsByIds,
} from './lib/db'

const STACK_KEY = 'olaboard_stack'

// ─── FolderTree ───────────────────────────────────────────────────────────────
function FolderTree({ db, currentId, onNavigate, id, depth, theme, collapsedIds, onToggleCollapse, sidebarFocusId, skipSelf }) {
  depth = depth ?? 0
  const canvas = db[id]
  if (!canvas) return null
  const isActive = id === currentId ||
    canvas.cards.some(c => c.isFolder && c.id === currentId)
  const subFolders = canvas.cards.filter(c => c.isFolder && !c.isLabel)
  const hasChildren = subFolders.length > 0
  const isCollapsed = collapsedIds ? collapsedIds.has(id) : false
  const isFocused = sidebarFocusId === id
  const showToggle = !skipSelf && hasChildren

  return (
    <>
      {!skipSelf && (
        <div
          className={isActive ? 'sidebar-active' : undefined}
          style={{
            paddingLeft: depth * 12 + (showToggle ? 4 : 8), paddingRight: 8,
            paddingTop: 4, paddingBottom: 4,
            cursor: 'pointer', fontSize: 12,
            background: isFocused ? 'var(--border)' : isActive ? '#EBF4FF' : 'transparent',
            color: isActive ? 'var(--accent)' : 'var(--text)',
            display: 'flex', alignItems: 'center', gap: 4,
            userSelect: 'none',
          }}
          onClick={() => onNavigate(id)}
        >
          {showToggle && (
            <span
              style={{ fontSize: 8, width: 12, flexShrink: 0, textAlign: 'center', color: 'var(--text-muted)' }}
              onClick={e => { e.stopPropagation(); onToggleCollapse(id) }}
            >{isCollapsed ? '▶' : '▼'}</span>
          )}
          <span><Folder size={14} /></span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{canvas.name}</span>
        </div>
      )}
      {!isCollapsed && subFolders.map(f => {
        const fCanvas = db[f.id] || {
          id: f.id, name: f.title,
          cards: [], connections: [], groups: [], labels: []
        }
        return (
          <FolderTree
            key={f.id}
            db={{ ...db, [f.id]: fCanvas }}
            currentId={currentId}
            onNavigate={onNavigate}
            id={f.id}
            depth={depth + 1}
            theme={theme}
            collapsedIds={collapsedIds}
            onToggleCollapse={onToggleCollapse}
            sidebarFocusId={sidebarFocusId}
          />
        )
      })}
    </>
  )
}

// ─── LoadingOverlay ───────────────────────────────────────────────────────────
function LoadingOverlay({ loading }) {
  const [hidden, setHidden] = useState(false)

  return (
    <div
      onTransitionEnd={() => { if (!loading) setHidden(true) }}
      style={{
        display: hidden ? 'none' : 'flex',
        position: 'fixed', inset: 0, zIndex: 9999,
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg, #ffffff)',
        color: 'var(--text, #1a1a1a)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 24, fontWeight: 700,
        letterSpacing: '-0.5px',
        opacity: loading ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: loading ? 'auto' : 'none',
      }}
    >
      Olaboard
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading, null = not logged in

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null // loading
  if (session === null) return <AuthPage />

  return <AppInner userId={session.user.id} />
}

function AppInner({ userId }) {
  const [db, setDb] = useState({})
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [renamingBoardId, setRenamingBoardId] = useState(null)
  const [stack, setStack] = useState(['__loading__'])
  const [displayName, setDisplayName] = useState('')
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
  const [listSelectMode, setListSelectMode] = useState(false)
  const [selectedConn, setSelectedConn] = useState(null)
  const [editingConnId, setEditingConnId] = useState(null)
  const [editingGroupId, setEditingGroupId] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [editingConnValue, setEditingConnValue] = useState('')
  const [collapsedIds, setCollapsedIds] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('olaboard_expanded'))
      return new Set(Array.isArray(s) ? s : [])
    } catch { return new Set() }
  })
  const [sidebarFocusId, setSidebarFocusId] = useState(null)

  const currentIdRef = useRef('__loading__')
  const dbRef = useRef(db)
  useEffect(() => { dbRef.current = db }, [db])
  const boardsRef = useRef(boards)
  useEffect(() => { boardsRef.current = boards }, [boards])

  // Stack persisted as UI preference only
  useEffect(() => { localStorage.setItem(STACK_KEY, JSON.stringify(stack)) }, [stack])
  // Collapsed folders persisted
  useEffect(() => { localStorage.setItem('olaboard_expanded', JSON.stringify([...collapsedIds])) }, [collapsedIds])

  // ── map Supabase rows → app shape ─────────────────────────────────────────
  function mapCard(row) {
    return { id: row.id, title: row.title || '', body: row.body || '', x: row.x, y: row.y, isFolder: row.is_folder || false, isLabel: row.is_label || false, color: row.color || 'yellow', createdAt: row.created_at }
  }
  function mapConn(row) {
    return { id: row.id, from: row.from_card_id, to: row.to_card_id, label: row.label || '', fromAnchor: row.from_anchor || 'right', toAnchor: row.to_anchor || 'left' }
  }

  // ── load canvas data from Supabase into db state ──────────────────────────
  const loadCanvasData = useCallback(async (canvasId, boardId, folderName) => {
    try {
      let canvasData = await fetchCanvasDB(canvasId).catch(() => null)
      if (!canvasData) {
        // Canvas row doesn't exist yet — create it
        const bid = boardId || canvasId // for root boards, canvasId === boardId
        const canvasName = folderName || boardsRef.current.find(b => b.id === canvasId)?.name || canvasId
        canvasData = await createCanvasDB({ id: canvasId, boardId: bid, name: canvasName, userId }).catch(() => null)
      }
      const [cardsData, connectionsData] = await Promise.all([
        fetchCardsDB(canvasId).catch(() => []),
        fetchConnectionsDB(canvasId).catch(() => []),
      ])
      const confirmedName = canvasData?.name || folderName || canvasId
      const loadedCanvas = {
        id: canvasId,
        name: confirmedName,
        cards: (cardsData || []).map(mapCard),
        connections: (connectionsData || []).map(mapConn),
        groups: canvasData?.groups || [],
        labels: canvasData?.labels || [],
      }
      setDb(prev => ({ ...prev, [canvasId]: loadedCanvas }))
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(confirmedName)
      if (canvasId === currentIdRef.current && !isUUID) setDisplayName(confirmedName)
      return loadedCanvas
    } catch (err) {
      console.error('loadCanvasData error:', err)
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── initial load: boards + first canvas ───────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        let boardsData = await fetchBoardsDB(userId)
        if (!boardsData.length) {
          const board = await createBoardDB({ name: 'La mia lavagna', userId })
          await createCanvasDB({ id: board.id, boardId: board.id, name: board.name, userId })
          boardsData = [board]
        }
        const mapped = boardsData.map(b => ({ id: b.id, name: b.name }))
        setBoards(mapped)
        setDisplayName(boardsData[0]?.name || 'La mia lavagna')

        const savedStack = (() => {
          try {
            const s = JSON.parse(localStorage.getItem(STACK_KEY))
            if (Array.isArray(s) && s.length > 0 && mapped.some(b => b.id === s[0])) return s
          } catch {}
          return [boardsData[0].id]
        })()

        setStack(savedStack)
        const firstCanvasId = savedStack[savedStack.length - 1]
        const firstBoardId = savedStack[0]
        const initName = mapped.find(b => b.id === firstCanvasId)?.name || mapped.find(b => b.id === firstBoardId)?.name || ''
        setDisplayName(initName)
        loadedRef.current.add(firstCanvasId)
        const loaded = await loadCanvasData(firstCanvasId, firstBoardId, initName)
        centerCanvas(firstCanvasId, loaded)
      } catch (err) {
        console.error('init error:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [userId, loadCanvasData])

  // ── load canvas data when navigating to an unloaded canvas ────────────────
  const loadedRef = useRef(new Set())
  const currentId = stack[stack.length - 1]
  // Auto-expand the current canvas in the sidebar when navigating into it
  useEffect(() => {
    if (!currentId || currentId === '__loading__') return
    setCollapsedIds(prev => {
      if (!prev.has(currentId)) return prev
      const next = new Set(prev)
      next.delete(currentId)
      return next
    })
  }, [currentId])
  useEffect(() => {
    if (loading || !currentId || currentId === '__loading__') return
    if (loadedRef.current.has(currentId)) return
    loadedRef.current.add(currentId)
    const folderName = dbRef.current[currentId]?.name
    loadCanvasData(currentId, stack[0], folderName)
  }, [currentId, loading, loadCanvasData]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── debounced Supabase sync ───────────────────────────────────────────────
  const syncedRef = useRef({}) // canvasId → { cardIds, connectionIds }
  const syncTimerRef = useRef(null)

  const syncCanvas = useCallback(async (canvasId, canvas) => {
    try {
      const prev = syncedRef.current[canvasId] || { cardIds: new Set(), connectionIds: new Set() }
      const curCardIds = new Set(canvas.cards.map(c => c.id))
      const curConnIds = new Set(canvas.connections.map(c => c.id))

      await Promise.all([
        upsertCards(canvas.cards, canvasId),
        deleteCardsByIds([...prev.cardIds].filter(id => !curCardIds.has(id))),
        upsertConnections(canvas.connections, canvasId),
        deleteConnectionsByIds([...prev.connectionIds].filter(id => !curConnIds.has(id))),
        updateCanvasDB(canvasId, { groups: canvas.groups || [], labels: canvas.labels || [] }),
      ])
      syncedRef.current[canvasId] = { cardIds: curCardIds, connectionIds: curConnIds }
    } catch (err) {
      console.error('sync error:', err)
    }
  }, [])

  useEffect(() => {
    if (loading || !currentId || currentId === '__loading__') return
    const canvas = dbRef.current[currentId]
    if (!canvas) return
    clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => syncCanvas(currentId, canvas), 500)
  }) // runs after every render — intentional, checks db[currentId]

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
      const next = { ...prev, [cId]: { ...canvas, cards: canvas.cards.map(c => c.id === cardId ? { ...c, ...updates } : c) } }
      // If renaming a folder card, also update the canvas entry name
      if (updates.title && prev[cardId]) {
        next[cardId] = { ...prev[cardId], name: updates.title }
      }
      return next
    })
    // If renaming a folder card that is a board root, update boards state
    if (updates.title) {
      setBoards(prev => prev.map(b => b.id === cardId ? { ...b, name: updates.title } : b))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
  } = useCanvas({ db, setDb, currentIdRef, updateCardFn, addConnectionFn, setActiveNoteId, view, activeTool, setActiveTool, selectMode, setMultiSelected, setSelectionRect, onGroupCreated: id => setEditingGroupId(id) })

  useEffect(() => { activeAutoCreateRef.current = autoCreate }, [autoCreate, activeAutoCreateRef])
  useEffect(() => { activeToolRef.current = activeTool }, [activeTool, activeToolRef])
  useEffect(() => { multiSelectedRef.current = multiSelected }, [multiSelected, multiSelectedRef])

  // ── navigation ───────────────────────────────────────────────────────────
  function centerCanvas(canvasId, canvasOverride) {
    const canvas = canvasOverride || dbRef.current[canvasId]
    if (!canvas) { setOffset({ x: 0, y: 0 }); setScale(1); return }
    const elements = [
      ...(canvas.cards || []).map(c => ({ x: c.x, y: c.y, w: CARD_W, h: CARD_H_HALF * 2 })),
      ...(canvas.groups || []).map(g => ({ x: g.x, y: g.y, w: g.width, h: g.height })),
      ...(canvas.labels || []).map(l => ({ x: l.x, y: l.y, w: 100, h: 30 })),
    ]
    if (elements.length === 0) { setOffset({ x: 0, y: 0 }); setScale(1); return }
    const minX = Math.min(...elements.map(e => e.x))
    const minY = Math.min(...elements.map(e => e.y))
    const maxX = Math.max(...elements.map(e => e.x + e.w))
    const maxY = Math.max(...elements.map(e => e.y + e.h))
    const contentW = maxX - minX
    const contentH = maxY - minY
    const contentCX = minX + contentW / 2
    const contentCY = minY + contentH / 2
    const vpW = window.innerWidth - 200
    const vpH = window.innerHeight - 44
    const scaleX = (vpW * 0.8) / contentW
    const scaleY = (vpH * 0.8) / contentH
    const newScale = Math.min(1, Math.max(0.2, Math.min(scaleX, scaleY)))
    setScale(newScale)
    setOffset({ x: vpW / 2 - contentCX * newScale, y: vpH / 2 - contentCY * newScale })
  }

  async function enterCanvas(id, name) {
    const resolvedName = name || boardsRef.current.find(b => b.id === id)?.name || id
    setDisplayName(resolvedName)
    setDb(prev => prev[id] ? prev : { ...prev, [id]: { id, name: resolvedName, cards: [], connections: [], groups: [], labels: [] } })
    setStack(prev => [...prev, id])
    setSelected(null); setActiveNoteId(null)
    if (!loadedRef.current.has(id)) {
      loadedRef.current.add(id)
      const loaded = await loadCanvasData(id, stack[0], resolvedName)
      centerCanvas(id, loaded)
    } else {
      setTimeout(() => centerCanvas(id), 50)
    }
  }

  function navigateTo(idx) {
    const targetId = stack[idx]
    const targetName = dbRef.current[targetId]?.name || boardsRef.current.find(b => b.id === targetId)?.name || ''
    setDisplayName(targetName)
    setStack(prev => prev.slice(0, idx + 1))
    setSelected(null); setActiveNoteId(null)
    setTimeout(() => centerCanvas(targetId), 50)
  }

  const handleSidebarNavigate = useCallback(async (targetId) => {
    if (targetId === currentIdRef.current) return

    function findPath(canvasId, target, pathSoFar) {
      if (canvasId === target) return [...pathSoFar, canvasId]
      const canvas = dbRef.current[canvasId]
      if (!canvas) return null
      for (const card of (canvas.cards || [])) {
        if (!card.isFolder) continue
        if (card.id === target) return [...pathSoFar, canvasId, card.id]
        const result = findPath(card.id, target, [...pathSoFar, canvasId])
        if (result) return result
      }
      return null
    }

    const boardsList = dbRef.current.boards || [{ id: 'root' }]
    let path = null
    for (const board of boardsList) {
      path = findPath(board.id, targetId, [])
      if (path) break
    }
    if (!path) path = [targetId]

    const currentBoards = boardsRef.current
    const boardIds = currentBoards.map(b => b.id)
    if (path.length === 1 && !boardIds.includes(path[0])) {
      for (const board of currentBoards) {
        const fullPath = findPath(board.id, targetId, [])
        if (fullPath && fullPath.length > 1) {
          path = fullPath
          break
        }
      }
    }

    // Resolve human-readable name: already-loaded canvas > board root > card title in parent
    function findCardTitle(id) {
      for (const board of boardsRef.current) {
        function search(canvasId) {
          const cv = dbRef.current[canvasId]
          if (!cv) return null
          const found = cv.cards.find(c => c.id === id)
          if (found) return found.title
          for (const c of cv.cards) {
            if (c.isFolder) { const r = search(c.id); if (r) return r }
          }
          return null
        }
        const r = search(board.id)
        if (r) return r
      }
      return null
    }

    const targetName = dbRef.current[targetId]?.name
      || boardsRef.current.find(b => b.id === targetId)?.name
      || findCardTitle(targetId)
      || ''

    setDb(prev => {
      if (prev[targetId]) return prev
      return {
        ...prev,
        [targetId]: { id: targetId, name: targetName || targetId, cards: [], connections: [], groups: [], labels: [] }
      }
    })

    setDisplayName(targetName)
    setStack(path)
    setSelected(null)
    setActiveNoteId(null)

    if (!loadedRef.current.has(targetId)) {
      loadedRef.current.add(targetId)
      const loaded = await loadCanvasData(targetId, path[0], targetName)
      centerCanvas(targetId, loaded)
    } else {
      setTimeout(() => centerCanvas(targetId), 50)
    }
  }, [loadCanvasData])

  // ── multi-select delete ───────────────────────────────────────────────────
  function deleteMultiSelected() {
    const ids = new Set(multiSelected)
    const cId = currentIdRef.current
    const canvas = dbRef.current[cId]
    if (!canvas) return
    const removedConnIds = canvas.connections
      .filter(c => ids.has(c.from) || ids.has(c.to))
      .map(c => c.id)
    setDb(prev => {
      const cv = prev[cId]
      if (!cv) return prev
      return {
        ...prev, [cId]: {
          ...cv,
          cards: cv.cards.filter(c => !ids.has(c.id)),
          connections: cv.connections.filter(c => !ids.has(c.from) && !ids.has(c.to)),
          groups: (cv.groups || []).filter(g => !ids.has(g.id)),
          labels: (cv.labels || []).filter(l => !ids.has(l.id)),
        }
      }
    })
    deleteCardsByIds([...ids]).catch(err => console.error('deleteCardsByIds error:', err))
    if (removedConnIds.length > 0) {
      deleteConnectionsByIds(removedConnIds).catch(err => console.error('deleteConnectionsByIds error:', err))
    }
    setMultiSelected([])
  }

  // ── connection delete (keyboard) ──────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (multiSelected.length > 0) {
          deleteMultiSelected()
          return
        }
        if (selectedGroup) {
          setDb(prev => {
            const cId = currentIdRef.current
            const canvas = prev[cId]
            if (!canvas) return prev
            return { ...prev, [cId]: { ...canvas, groups: (canvas.groups || []).filter(g => g.id !== selectedGroup) } }
          })
          setSelectedGroup(null)
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
  }, [selectedConn, selectedGroup, multiSelected]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── tool + navigation keyboard shortcuts ─────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      if (e.key === 'Tab') {
        e.preventDefault()
        const isRoot = stack.length === 1
        if (isRoot) {
          const idx = boards.findIndex(b => b.id === stack[0])
          const next = boards[(idx + 1) % boards.length]
          if (next && next.id !== stack[0]) handleSidebarNavigate(next.id)
        } else {
          const parentId = stack[stack.length - 2]
          const parentCanvas = dbRef.current[parentId]
          if (parentCanvas) {
            const siblings = parentCanvas.cards.filter(c => c.isFolder && !c.isLabel)
            const idx = siblings.findIndex(c => c.id === currentIdRef.current)
            if (siblings.length > 1) {
              const next = siblings[(idx + 1) % siblings.length]
              handleSidebarNavigate(next.id)
            }
          }
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        if (view !== 'canvas') return
        e.preventDefault()
        const canvas = dbRef.current[currentIdRef.current]
        if (!canvas) return
        const allIds = [
          ...canvas.cards.map(c => c.id),
          ...(canvas.groups || []).map(g => g.id),
          ...(canvas.labels || []).map(l => l.id),
        ]
        if (selectMode && multiSelected.length === allIds.length) {
          setMultiSelected([]); setSelectMode(false)
        } else {
          setMultiSelected(allIds); setSelectMode(true)
        }
        return
      }
      if (view !== 'canvas') return
      if (e.key === 's' || e.key === 'S') {
        if (selectMode) { setSelectMode(false); setMultiSelected([]) }
        else { setSelectMode(true); setActiveTool('note'); setAutoCreate(false) }
      } else if (e.key === 'q' || e.key === 'Q') {
        if (autoCreate) { setAutoCreate(false) }
        else { setAutoCreate(true); setSelectMode(false); setActiveTool('note') }
      } else if (e.key === 'g' || e.key === 'G') {
        setActiveTool(t => t === 'group' ? 'note' : 'group'); setSelectMode(false); setAutoCreate(false)
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTool(t => t === 'text' ? 'note' : 'text'); setSelectMode(false); setAutoCreate(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, stack, boards, selectMode, autoCreate, multiSelected, handleSidebarNavigate]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── sidebar collapse toggle ───────────────────────────────────────────────
  function toggleCollapse(id) {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ── sidebar keyboard navigation ───────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (e.shiftKey) {
          e.preventDefault()
          if (e.key === 'ArrowDown' && sidebarFocusId) handleSidebarNavigate(sidebarFocusId)
          else if (e.key === 'ArrowUp' && stack.length > 1) navigateTo(stack.length - 2)
          return
        }
        e.preventDefault()
        // Build flat list of visible sidebar items
        const items = []
        for (const board of boards) {
          items.push({ id: board.id })
          if (stack[0] === board.id && !collapsedIds.has(board.id)) {
            function addItems(canvasId) {
              const canvas = dbRef.current[canvasId]
              if (!canvas) return
              for (const f of canvas.cards.filter(c => c.isFolder && !c.isLabel)) {
                items.push({ id: f.id })
                if (!collapsedIds.has(f.id)) addItems(f.id)
              }
            }
            addItems(board.id)
          }
        }
        const curIdx = sidebarFocusId ? items.findIndex(it => it.id === sidebarFocusId) : -1
        const nextIdx = e.key === 'ArrowDown'
          ? (curIdx < items.length - 1 ? curIdx + 1 : 0)
          : (curIdx > 0 ? curIdx - 1 : items.length - 1)
        setSidebarFocusId(items[nextIdx]?.id ?? null)
      } else if (e.key === 'Enter' && sidebarFocusId) {
        handleSidebarNavigate(sidebarFocusId)
        setSidebarFocusId(null)
      } else if (e.key === 'Escape') {
        setSidebarFocusId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarFocusId, stack, boards, collapsedIds, handleSidebarNavigate]) // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* Loading overlay */}
      <LoadingOverlay loading={loading} />

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div style={{ width: 210, flexShrink: 0, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top scrollable section */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '14px 12px 10px', fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)', fontFamily: 'system-ui, sans-serif' }}>Olaboard</div>
            <div style={{ padding: '0 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>Lavagne</div>
            {boards.map(board => {
              const isActive = stack[0] === board.id
              const isRenaming = renamingBoardId === board.id
              return (
                <div key={board.id}>
                  {/* Board row */}
                  <div
                    style={{ padding: '4px 8px 4px 12px', fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, background: sidebarFocusId === board.id ? 'var(--border)' : 'transparent' }}
                    onMouseEnter={e => { e.currentTarget.dataset.hover = '1'; if (sidebarFocusId !== board.id) e.currentTarget.style.background = 'var(--border)'; e.currentTarget.querySelectorAll('.board-action').forEach(b => b.style.opacity = '1') }}
                    onMouseLeave={e => { e.currentTarget.dataset.hover = ''; e.currentTarget.style.background = sidebarFocusId === board.id ? 'var(--border)' : 'transparent'; e.currentTarget.querySelectorAll('.board-action').forEach(b => b.style.opacity = '0') }}
                  >
                    <span
                      style={{ fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
                      onClick={e => { e.stopPropagation(); toggleCollapse(board.id) }}
                    >{collapsedIds.has(board.id) ? '▸' : '▾'}</span>
                    {isRenaming ? (
                      <input
                        autoFocus
                        defaultValue={board.name}
                        style={{ border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text)', background: 'transparent', flex: 1, fontFamily: 'inherit' }}
                        onBlur={e => {
                          const name = e.target.value.trim() || board.name
                          setBoards(prev => prev.map(b => b.id === board.id ? { ...b, name } : b))
                          setDb(prev => prev[board.id] ? { ...prev, [board.id]: { ...prev[board.id], name } } : prev)
                          if (board.id === currentIdRef.current) setDisplayName(name)
                          updateBoardDB(board.id, { name }).catch(console.error)
                          setRenamingBoardId(null)
                        }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') e.target.blur(); e.stopPropagation() }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, cursor: 'pointer' }}
                        onClick={() => handleSidebarNavigate(board.id)}
                      >{board.name}</span>
                    )}
                    <button
                      className="board-action"
                      style={{ opacity: 0, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 3px', borderRadius: 4, lineHeight: 1 }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); setRenamingBoardId(board.id) }}
                      title="Rinomina"
                    ><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    {boards.length > 1 && (
                      <button
                        className="board-action"
                        style={{ opacity: 0, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 3px', borderRadius: 4, lineHeight: 1 }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#e53935' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => {
                          e.stopPropagation()
                          if (!window.confirm('Eliminare questa lavagna e tutto il suo contenuto?')) return
                          setBoards(prev => prev.filter(b => b.id !== board.id))
                          setDb(prev => { const next = { ...prev }; delete next[board.id]; return next })
                          deleteBoardDB(board.id).catch(console.error)
                        }}
                        title="Elimina"
                      ><Trash2 size={12} /></button>
                    )}
                  </div>
                  {/* Folder tree when active and not collapsed */}
                  {isActive && !collapsedIds.has(board.id) && (
                    <FolderTree db={db} currentId={currentId} onNavigate={handleSidebarNavigate} id={board.id} depth={1} theme={theme} collapsedIds={collapsedIds} onToggleCollapse={toggleCollapse} sidebarFocusId={sidebarFocusId} skipSelf />
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
              onClick={async () => {
                const name = 'Nuova lavagna'
                try {
                  const board = await createBoardDB({ name, userId })
                  const id = board.id
                  await createCanvasDB({ id, boardId: id, name, userId })
                  loadedRef.current.add(id)
                  setBoards(prev => [...prev, { id, name }])
                  setDb(prev => ({ ...prev, [id]: { id, name, cards: [], connections: [], groups: [], labels: [] } }))
                  setDisplayName(name)
                  setStack([id]); localStorage.setItem(STACK_KEY, JSON.stringify([id])); setSelected(null); setActiveNoteId(null)
                  setOffset({ x: 0, y: 0 }); setScale(1)
                  setRenamingBoardId(id)
                } catch (err) {
                  console.error('createBoard error:', err)
                }
              }}
            >+ Nuova lavagna</button>
            <button
              style={{ width: '100%', textAlign: 'left', padding: '10px 12px', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              onClick={() => supabase.auth.signOut()}
            ><LogOut size={14} /> Esci</button>
          </div>
        </div>
      )}

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Top bar ──────────────────────────────────────────────────────*/}
        <div style={{ height: 44, background: 'var(--topbar-bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flexShrink: 0 }}>
          <button style={iconBtn} onClick={() => setSidebarOpen(v => !v)}>☰</button>

          {/* Current canvas name */}
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{displayName || db[currentId]?.name || ''}</span>

          <div style={{ flex: 1 }} />

          {/* View tabs */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2, gap: 1 }}>
            {[['canvas', 'Canvas'], ['list', 'Elenco']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ fontSize: 12, padding: '3px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === v ? 'var(--btn-bg)' : 'transparent', color: view === v ? 'var(--btn-text)' : 'var(--text-muted)', fontWeight: view === v ? 600 : 400, boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>{l}</button>
            ))}
          </div>

          {/* Canvas tools */}
          {(activeColor => <>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                disabled={view !== 'canvas'}
                style={{ ...smallBtn, background: activeTool === 'group' ? activeColor : 'var(--btn-bg)', color: activeTool === 'group' ? '#fff' : 'var(--btn-text)', borderColor: activeTool === 'group' ? activeColor : 'var(--btn-border)', ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                onClick={view === 'canvas' ? () => setActiveTool(t => t === 'group' ? 'note' : 'group') : undefined}
                title="Disegna gruppo"
              >□ Gruppo</button>
              <button
                disabled={view !== 'canvas'}
                style={{ ...smallBtn, background: activeTool === 'text' ? activeColor : 'var(--btn-bg)', color: activeTool === 'text' ? '#fff' : 'var(--btn-text)', borderColor: activeTool === 'text' ? activeColor : 'var(--btn-border)', ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
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
                style={{ ...smallBtn, background: autoCreate ? activeColor : 'var(--btn-bg)', color: autoCreate ? '#fff' : 'var(--btn-text)', borderColor: autoCreate ? activeColor : 'var(--btn-border)', ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                onClick={view === 'canvas' ? () => setAutoCreate(v => !v) : undefined}
                title="Crea elemento al termine della freccia"
              ><Zap size={14} /> Quick</button>
              <button
                disabled={view !== 'canvas'}
                style={{ ...smallBtn, background: selectMode ? activeColor : 'var(--btn-bg)', color: selectMode ? '#fff' : 'var(--btn-text)', borderColor: selectMode ? activeColor : 'var(--btn-border)', ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                onClick={view === 'canvas' ? () => { setSelectMode(v => !v); setActiveTool('note'); setAutoCreate(false) } : undefined}
                title="Selezione multipla"
              >⬚ Select</button>
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              <button disabled={view !== 'canvas'} style={{ ...smallBtn, ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={view === 'canvas' ? () => zoomBy(1.2) : undefined}>+</button>
              <button disabled={view !== 'canvas'} style={{ ...smallBtn, ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={view === 'canvas' ? () => zoomBy(0.8) : undefined}>−</button>
              <button disabled={view !== 'canvas'} style={{ ...smallBtn, ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={view === 'canvas' ? () => centerCanvas(currentId) : undefined} title="Centra elementi"><Maximize2 size={13} /></button>
            </div>
          </>)(theme === 'high-contrast' ? '#7b2fff' : 'var(--accent)')}

          <button disabled={view !== 'canvas'} style={{ ...smallBtn, ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={view === 'canvas' ? exportMd : undefined}>↓ MD</button>
        </div>

        {/* ── Content ─────────────────────────────────────────────���────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {view === 'canvas' ? (
            <div
              ref={boardRef}
              style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: boardCursor, userSelect: 'none', backgroundColor: 'var(--bg)', backgroundImage: showGrid ? 'radial-gradient(circle, var(--grid-dot) 1px, transparent 1px)' : 'none', backgroundSize: `${20 * scale}px ${20 * scale}px`, backgroundPosition: `${offset.x % (20 * scale)}px ${offset.y % (20 * scale)}px` }}
              onMouseDown={e => { setSelectedConn(null); setSelectedGroup(null); onBoardMouseDown(e) }}
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
                    initialEditing={editingGroupId === group.id}
                    isSelected={selectedGroup === group.id}
                    onSelect={() => { setSelectedGroup(group.id); setSelectedConn(null) }}
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
                      onClick={e => { if (activeNoteId && !card.isFolder) { e.stopPropagation(); openNote(card) } }}
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
                      cardColor={card.color || 'yellow'}
                      theme={theme}
                    />
                  )
                })}
              </div>
              {/* Multi-select panel */}
              {multiSelected.length > 0 && (
                <div
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                  position: 'absolute', top: 16, right: 16, zIndex: 200,
                  width: 220, background: 'var(--bg-panel)', border: '1px solid var(--border)',
                  borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  fontFamily: 'system-ui, sans-serif',
                }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                    {multiSelected.length} element{multiSelected.length === 1 ? 'o' : 'i'} selezionat{multiSelected.length === 1 ? 'o' : 'i'}
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto', padding: '6px 0' }}>
                    {multiSelected.map(id => {
                      const card = cards.find(c => c.id === id)
                      const group = groups.find(g => g.id === id)
                      const label = labels.find(l => l.id === id)
                      const name = card?.title || group?.title || label?.text || 'Senza titolo'
                      const type = card ? (card.isFolder ? 'Cartella' : card.isLabel ? 'Testo' : 'Post-it') : group ? 'Gruppo' : 'Testo'
                      return (
                        <label key={id} style={{ padding: '4px 10px 4px 10px', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked
                            onChange={() => setMultiSelected(prev => prev.filter(i => i !== id))}
                            style={{ flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }}
                          />
                          <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 48, flexShrink: 0 }}>{type}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{name}</span>
                        </label>
                      )
                    })}
                  </div>
                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
                    <button
                      onClick={deleteMultiSelected}
                      style={{ width: '100%', padding: '7px 0', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', background: '#e53935', color: '#fff' }}
                    >Elimina</button>
                  </div>
                </div>
              )}

              {/* Keyboard shortcut legend */}
              <div style={{
                position: 'absolute', bottom: 16, right: 72, zIndex: 50,
                display: 'flex', gap: 4, alignItems: 'center',
                pointerEvents: 'none', userSelect: 'none',
              }}>
                {['S', 'Q', 'G', 'T', 'Tab'].map(k => (
                  <kbd key={k} style={{
                    fontSize: 10, color: 'var(--text-muted)',
                    background: 'var(--bg-panel)', border: '1px solid var(--border)',
                    borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace',
                    boxShadow: '0 1px 0 var(--border)',
                  }}>{k}</kbd>
                ))}
              </div>

              {/* Breadcrumb overlay */}
              {stack.length > 1 && (
                <div style={{
                  position: 'absolute', bottom: 16, left: 16, zIndex: 100,
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(4px)', borderRadius: 20,
                  padding: '4px 12px', fontSize: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  pointerEvents: 'all',
                }}>
                  {stack.map((id, i) => {
                    const isLast = i === stack.length - 1
                    return (
                      <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {i > 0 && <span style={{ color: 'var(--text-muted)' }}>›</span>}
                        <span
                          style={{ fontWeight: isLast ? 600 : 400, color: isLast ? 'var(--text)' : 'var(--accent)', cursor: isLast ? 'default' : 'pointer', textDecoration: 'none' }}
                          onMouseEnter={e => { if (!isLast) e.currentTarget.style.textDecoration = 'underline' }}
                          onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
                          onClick={() => !isLast && navigateTo(i)}
                        >{db[id]?.name || id}</span>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

          ) : (
            /* ── List view ───────────────────────────────────────────────── */
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'var(--bg)' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[['az', 'A→Z'], ['za', 'Z→A'], ['date', 'Creazione']].map(([v, l]) => (
                  <button key={v} onClick={() => setListSort(v)} style={{ ...smallBtn, fontWeight: listSort === v ? 700 : 400, background: listSort === v ? 'var(--accent)' : 'var(--btn-bg)', color: listSort === v ? '#fff' : 'var(--btn-text)', border: '1px solid var(--border)' }}>{l}</button>
                ))}
                <button
                  onClick={() => { setListSelectMode(v => !v); if (listSelectMode) setMultiSelected([]) }}
                  style={{ ...smallBtn, marginLeft: 'auto', background: listSelectMode ? 'var(--accent)' : 'var(--btn-bg)', color: listSelectMode ? '#fff' : 'var(--btn-text)', border: '1px solid var(--border)' }}
                >☑ Seleziona</button>
              </div>
              {listItems.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nessun elemento in questo canvas.</p>}
              {listItems.map(item => {
                const badgeIcon = item.type === 'folder' ? <Folder size={12} /> : item.type === 'label' ? <span style={{fontSize:11}}>T</span> : <span style={{fontSize:11}}>✎</span>
                const badgeLabel = item.type === 'folder' ? 'Cartella' : item.type === 'label' ? 'Testo' : 'Nota'
                const dateStr = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : '—'
                const isChecked = multiSelected.includes(item.id)
                function handleClick() {
                  if (listSelectMode) {
                    setMultiSelected(prev => isChecked ? prev.filter(i => i !== item.id) : [...prev, item.id])
                    return
                  }
                  if (item.type === 'folder') enterCanvas(item._card.id, item._card.title)
                  else if (item.type === 'note') openNote(item._card)
                  else setSelected(item.id)
                }
                return (
                  <div
                    key={item.id}
                    style={{ background: isChecked ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-panel))' : 'var(--bg-panel)', borderRadius: 6, padding: '10px 14px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${isChecked ? 'var(--accent)' : 'var(--border)'}` }}
                    onClick={handleClick}
                  >
                    {listSelectMode && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={handleClick}
                        onClick={e => e.stopPropagation()}
                        style={{ flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 70, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>{badgeIcon}{badgeLabel}</span>
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
              activeCard={cards.find(c => c.id === activeNoteId)}
              onColorChange={color => updateCardFn(activeNoteId, { color })}
              onToggleMode={() => setNotePanelMode(m => m === 'side' ? 'full' : 'side')}
              theme={theme}
            />
          )}
        </div>
      </div>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(t => t === 'light' ? 'dark' : t === 'dark' ? 'high-contrast' : 'light')}
        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 12px', fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer', color: 'var(--text)' }}
      >{theme === 'light' ? <Sun size={14} /> : theme === 'dark' ? <Moon size={14} /> : <Monitor size={14} />}</button>

    </div>
  )
}

// ─── NotePanel ────────────────────────────────────────────────────────────────
const NOTE_COLOR_MAP = {
  yellow: '#FAC775', orange: '#EF9F27', green: '#b8e986',
  blue: '#89cff0', pink: '#ffb3c6', purple: '#d4a8ff',
  white: '#f5f5f5', red: '#ff8a80',
}

const HC_NOTE_COLOR_MAP = {
  yellow: '#00ffff', orange: '#ff00ff', green: '#00ff41',
  blue: '#ffff00', pink: '#ff6600', purple: '#ff00ff',
  white: '#000099', red: '#ff0000',
}

function NotePanel({ mode, noteForm, onChangeForm, onSave, onClose, onToggleMode, activeCard, onColorChange, theme }) {
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
          {activeCard && !activeCard.isFolder && onColorChange && (
            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Colore</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {Object.entries(NOTE_COLOR_MAP).map(([name]) => {
                  const circleColor = theme === 'high-contrast' ? HC_NOTE_COLOR_MAP[name] : NOTE_COLOR_MAP[name]
                  const active = (activeCard.color || 'yellow') === name
                  return (
                    <div
                      key={name}
                      onClick={() => onColorChange(name)}
                      style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: circleColor,
                        border: active ? '2px solid #333' : '2px solid transparent',
                        cursor: 'pointer',
                        transform: active ? 'scale(1.2)' : 'scale(1)',
                        transition: 'transform 0.1s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )}
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
