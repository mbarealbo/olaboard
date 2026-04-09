import { useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Trash2, Moon, Sun, Monitor, Zap, Folder, LogOut, Maximize2, Undo2, Redo2, User } from 'lucide-react'
import BlockEditor from './components/BlockEditor'
import PostIt from './components/PostIt'
import ImageCard from './components/ImageCard'
import { Group, CanvasLabel } from './components/GroupBox'
import { useCanvas } from './hooks/useCanvas'
import { useHistory } from './hooks/useHistory'
import { CARD_W, CARD_H_HALF, uid } from './utils'
import { supabase } from './lib/supabase'
import AuthPage from './components/AuthPage'
import LandingPage from './components/LandingPage'
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
  uploadImage as uploadImageDB,
  deleteImage as deleteImageDB,
  getUserStorageUsed,
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

// ─── LoginRoute ───────────────────────────────────────────────────────────────
function LoginRoute() {
  const navigate = useNavigate()
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate('/board', { replace: true })
    })
    return () => subscription.unsubscribe()
  }, [navigate])
  return <AuthPage />
}

// ─── BoardRoute ───────────────────────────────────────────────────────────────
function BoardRoute() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])
  if (session === undefined) return null
  if (session === null) return <Navigate to="/login" replace />
  return <AppInner userId={session.user.id} userEmail={session.user.email} />
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AppInner userId="local" userEmail="" />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/board" element={<BoardRoute />} />
    </Routes>
  )
}

function AppInner({ userId, userEmail }) {
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
  const [showAccount, setShowAccount] = useState(false)
  const [storageUsed, setStorageUsed] = useState(null) // bytes or null if not yet fetched

  const { push: pushCommand, undo, redo, canUndo, canRedo } = useHistory()

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
    return { id: row.id, title: row.title || '', body: row.body || '', x: row.x, y: row.y, isFolder: row.is_folder || false, isLabel: row.is_label || false, color: row.color || 'yellow', createdAt: row.created_at, updatedAt: row.updated_at || row.created_at, url: row.url || null, width: row.width || null, height: row.height || null, isImage: !!(row.url) }
  }

  // ── image upload helpers ───────────────────────────────────────────────────
  async function handleUploadImage(file) {
    if (userId === 'local') throw new Error('Upload non disponibile in modalità demo')
    return uploadImageDB(file, userId)
  }

  function getStoragePath(url) {
    const marker = '/storage/v1/object/public/images/'
    const idx = url?.indexOf(marker)
    return idx >= 0 ? url.slice(idx + marker.length) : null
  }
  function mapConn(row) {
    return { id: row.id, from: row.from_card_id, to: row.to_card_id, label: row.label || '', fromAnchor: row.from_anchor || 'right', toAnchor: row.to_anchor || 'left' }
  }

  // ── load canvas data from Supabase into db state ──────────────────────────
  const loadCanvasData = useCallback(async (canvasId, boardId, folderName) => {
    if (userId === 'local') return  // local mode: db is already in state
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

  // ── local storage helpers for demo mode ──────────────────────────────────
  const LOCAL_DB_KEY = 'olaboard_local_db'
  const LOCAL_BOARD_ID = 'local-root'

  function loadLocalDb() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_DB_KEY))
      if (raw && typeof raw === 'object') return raw
    } catch {}
    return null
  }

  function saveLocalDb(dbState) {
    try { localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(dbState)) } catch {}
  }

  // ── initial load: boards + first canvas ───────────────────────────────────
  useEffect(() => {
    if (userId === 'local') {
      const boardName = 'La mia lavagna'
      const board = { id: LOCAL_BOARD_ID, name: boardName }
      const savedDb = loadLocalDb()
      const rootCanvas = savedDb?.[LOCAL_BOARD_ID] || { id: LOCAL_BOARD_ID, name: boardName, cards: [], connections: [], groups: [], labels: [] }
      const fullDb = savedDb || { [LOCAL_BOARD_ID]: rootCanvas }
      setBoards([board])
      setDb(fullDb)
      setDisplayName(boardName)
      setStack([LOCAL_BOARD_ID])
      loadedRef.current.add(LOCAL_BOARD_ID)
      setLoading(false)
      return
    }
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
    if (userId === 'local') {
      syncTimerRef.current = setTimeout(() => saveLocalDb(dbRef.current), 500)
    } else {
      syncTimerRef.current = setTimeout(() => syncCanvas(currentId, canvas), 500)
    }
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
      const now = new Date().toISOString()
      const next = { ...prev, [cId]: { ...canvas, cards: canvas.cards.map(c => c.id === cardId ? { ...c, ...updates, updatedAt: now } : c) } }
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
    onImageResizeMouseDown,
    onLabelMouseDown, zoomBy,
    activeAutoCreateRef, activeToolRef, multiSelectedRef,
  } = useCanvas({ db, setDb, currentIdRef, updateCardFn, addConnectionFn, setActiveNoteId, view, activeTool, setActiveTool, selectMode, setMultiSelected, setSelectionRect, onGroupCreated: id => setEditingGroupId(id), pushCommand })

  useEffect(() => { activeAutoCreateRef.current = autoCreate }, [autoCreate, activeAutoCreateRef])
  useEffect(() => { activeToolRef.current = activeTool }, [activeTool, activeToolRef])
  useEffect(() => { multiSelectedRef.current = multiSelected }, [multiSelected, multiSelectedRef])

  // ── navigation ───────────────────────────────────────────────────────────
  function centerCanvas(canvasId, canvasOverride) {
    const canvas = canvasOverride || dbRef.current[canvasId]
    if (!canvas) { setOffset({ x: 0, y: 0 }); setScale(1); return }
    const elements = [
      ...(canvas.cards || []).map(c => ({ x: c.x, y: c.y, w: c.isImage ? (c.width || 200) : CARD_W, h: c.isImage ? (c.height || 200) : CARD_H_HALF * 2 })),
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
    const deletedCards = canvas.cards.filter(c => ids.has(c.id))
    const deletedConns = canvas.connections.filter(c => ids.has(c.from) || ids.has(c.to))
    const deletedGroups = (canvas.groups || []).filter(g => ids.has(g.id))
    const deletedLabels = (canvas.labels || []).filter(l => ids.has(l.id))
    const removedConnIds = deletedConns.map(c => c.id)
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
    deletedCards.filter(c => c.isImage && c.url).forEach(c => deleteImageDB(getStoragePath(c.url)).catch(console.error))
    setMultiSelected([])
    if (deletedCards.length > 0 || deletedGroups.length > 0 || deletedLabels.length > 0 || deletedConns.length > 0) {
      pushCommand({
        undo: () => setDb(prev => {
          const cv = prev[cId]
          if (!cv) return prev
          return { ...prev, [cId]: { ...cv, cards: [...cv.cards, ...deletedCards], connections: [...cv.connections, ...deletedConns], groups: [...(cv.groups || []), ...deletedGroups], labels: [...(cv.labels || []), ...deletedLabels] } }
        }),
        redo: () => setDb(prev => {
          const cv = prev[cId]
          if (!cv) return prev
          return { ...prev, [cId]: { ...cv, cards: cv.cards.filter(c => !ids.has(c.id)), connections: cv.connections.filter(c => !ids.has(c.from) && !ids.has(c.to)), groups: (cv.groups || []).filter(g => !ids.has(g.id)), labels: (cv.labels || []).filter(l => !ids.has(l.id)) } }
        }),
      })
    }
  }

  // ── connection delete (keyboard) ──────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      if (e.key === 'Enter') {
        if (selected) { setActiveNoteId(selected); return }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (multiSelected.length > 0) {
          deleteMultiSelected()
          return
        }
        if (selectedGroup) {
          const cId = currentIdRef.current
          const canvas = dbRef.current[cId]
          const deletedGroup = (canvas?.groups || []).find(g => g.id === selectedGroup)
          setDb(prev => {
            const cv = prev[cId]
            if (!cv) return prev
            return { ...prev, [cId]: { ...cv, groups: (cv.groups || []).filter(g => g.id !== selectedGroup) } }
          })
          setSelectedGroup(null)
          if (deletedGroup) {
            pushCommand({
              undo: () => setDb(prev => {
                const cv = prev[cId]
                if (!cv) return prev
                return { ...prev, [cId]: { ...cv, groups: [...(cv.groups || []), deletedGroup] } }
              }),
              redo: () => setDb(prev => {
                const cv = prev[cId]
                if (!cv) return prev
                return { ...prev, [cId]: { ...cv, groups: (cv.groups || []).filter(g => g.id !== deletedGroup.id) } }
              }),
            })
          }
          return
        }
        if (selectedConn) {
          const cId = currentIdRef.current
          const canvas = dbRef.current[cId]
          const deletedConn = canvas?.connections.find(c => c.id === selectedConn)
          setDb(prev => {
            const cv = prev[cId]
            if (!cv) return prev
            return { ...prev, [cId]: { ...cv, connections: cv.connections.filter(c => c.id !== selectedConn) } }
          })
          setSelectedConn(null)
          if (deletedConn) {
            pushCommand({
              undo: () => setDb(prev => {
                const cv = prev[cId]
                if (!cv) return prev
                return { ...prev, [cId]: { ...cv, connections: [...cv.connections, deletedConn] } }
              }),
              redo: () => setDb(prev => {
                const cv = prev[cId]
                if (!cv) return prev
                return { ...prev, [cId]: { ...cv, connections: cv.connections.filter(c => c.id !== deletedConn.id) } }
              }),
            })
          }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, selectedConn, selectedGroup, multiSelected]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── undo / redo keyboard shortcut ────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

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
    const cId = currentIdRef.current
    const oldLabel = dbRef.current[cId]?.connections.find(c => c.id === connId)?.label ?? ''
    setDb(prev => {
      const canvas = prev[cId]
      if (!canvas) return prev
      return { ...prev, [cId]: { ...canvas, connections: canvas.connections.map(c => c.id === connId ? { ...c, label } : c) } }
    })
    if (oldLabel !== label) {
      pushCommand({
        undo: () => setDb(prev => {
          const cv = prev[cId]
          if (!cv) return prev
          return { ...prev, [cId]: { ...cv, connections: cv.connections.map(c => c.id === connId ? { ...c, label: oldLabel } : c) } }
        }),
        redo: () => setDb(prev => {
          const cv = prev[cId]
          if (!cv) return prev
          return { ...prev, [cId]: { ...cv, connections: cv.connections.map(c => c.id === connId ? { ...c, label } : c) } }
        }),
      })
    }
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
            <div style={{ padding: '10px 12px 12px', borderTop: '1px solid #eee', marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#222', lineHeight: 1.4 }}>Olaboard</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                Made by{' '}
                <a href="https://olab.quest" target="_blank" rel="noopener noreferrer" style={{ color: '#378ADD', textDecoration: 'none' }}>olab.quest</a>
              </div>
              <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>v0.5.0</div>
            </div>
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

          {/* Account button */}
          <button
            style={{ ...iconBtn, position: 'relative' }}
            title="Account"
            onClick={async () => {
              setShowAccount(v => {
                if (!v && userId !== 'local') getUserStorageUsed(userId).then(setStorageUsed).catch(() => {})
                return !v
              })
            }}
          ><User size={16} /></button>
        </div>

        {/* Account panel */}
        {showAccount && (
          <div
            onMouseDown={e => e.stopPropagation()}
            style={{
              position: 'fixed', top: 52, right: 12, zIndex: 9999,
              width: 260, background: 'var(--bg-panel)', border: '1px solid var(--border)',
              borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {/* Close on outside click */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: -1 }}
              onClick={() => setShowAccount(false)}
            />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Account</div>
            <div style={{ fontSize: 13, color: 'var(--text)', wordBreak: 'break-all' }}>{userEmail}</div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>Storage</span>
                <span>{storageUsed !== null ? `${(storageUsed / 1024 / 1024).toFixed(1)} MB / 100 MB` : '…'}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: storageUsed > 90 * 1024 * 1024 ? '#e53935' : 'var(--accent)',
                  width: storageUsed !== null ? `${Math.min(100, (storageUsed / (100 * 1024 * 1024)) * 100).toFixed(1)}%` : '0%',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', color: '#e53935', fontFamily: 'inherit' }}
            ><LogOut size={13} /> Esci</button>
          </div>
        )}

        {/* ── Content ─────────────────────────────────────────────���────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {view === 'canvas' ? (
            <div
              ref={boardRef}
              style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: boardCursor, userSelect: 'none', backgroundColor: 'var(--bg)', backgroundImage: showGrid ? 'radial-gradient(circle, var(--grid-dot) 1px, transparent 1px)' : 'none', backgroundSize: `${20 * scale}px ${20 * scale}px`, backgroundPosition: `${offset.x % (20 * scale)}px ${offset.y % (20 * scale)}px` }}
              onMouseDown={e => { setSelectedConn(null); setSelectedGroup(null); onBoardMouseDown(e) }}
              onDoubleClick={onBoardDblClick}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
              onDrop={async e => {
                e.preventDefault()
                const file = [...e.dataTransfer.files].find(f => f.type.startsWith('image/'))
                if (!file) return
                const r = boardRef.current.getBoundingClientRect()
                const wx = (e.clientX - r.left - offset.x) / scale
                const wy = (e.clientY - r.top - offset.y) / scale
                try {
                  const { url } = await handleUploadImage(file)
                  const dims = await new Promise(resolve => {
                    const img = new Image()
                    img.onload = () => { const maxW = 400; const ratio = Math.min(1, maxW / img.naturalWidth); resolve({ w: Math.round(img.naturalWidth * ratio), h: Math.round(img.naturalHeight * ratio) }) }
                    img.onerror = () => resolve({ w: 300, h: 200 })
                    img.src = url
                  })
                  const newCard = { id: uid(), isImage: true, url, width: dims.w, height: dims.h, x: Math.round(wx - dims.w / 2), y: Math.round(wy - dims.h / 2), title: '', body: '', isFolder: false, isLabel: false, color: 'yellow' }
                  const cId = currentIdRef.current
                  setDb(prev => {
                    const cv = prev[cId]
                    if (!cv) return prev
                    return { ...prev, [cId]: { ...cv, cards: [...cv.cards, newCard] } }
                  })
                  pushCommand({
                    undo: () => setDb(prev => { const cv = prev[cId]; if (!cv) return prev; return { ...prev, [cId]: { ...cv, cards: cv.cards.filter(c => c.id !== newCard.id) } } }),
                    redo: () => setDb(prev => { const cv = prev[cId]; if (!cv) return prev; return { ...prev, [cId]: { ...cv, cards: [...cv.cards, newCard] } } }),
                  })
                } catch (err) {
                  alert(err.message)
                }
              }}
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
                  const feW = fromRes.isLabel ? 100 : (fe.isImage ? (fe.width || 200) : CARD_W)
                  const feH = fromRes.isLabel ? 30  : (fe.isImage ? (fe.height || 200) : CARD_H_HALF * 2)
                  const teW = toRes.isLabel   ? 100 : (te.isImage ? (te.width || 200) : CARD_W)
                  const teH = toRes.isLabel   ? 30  : (te.isImage ? (te.height || 200) : CARD_H_HALF * 2)
                  const fCX = fe.x + feW / 2
                  const fCY = fe.y + feH / 2
                  const tCX = te.x + teW / 2
                  const tCY = te.y + teH / 2
                  const wdx = tCX - fCX, wdy = tCY - fCY
                  const horiz = Math.abs(wdx) > Math.abs(wdy)
                  function exitPoint(entity, isLbl, goingRight, goingDown, isHoriz, isSource, ew, eh) {
                    const w = ew
                    const h = eh
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
                  const [fpx, fpy] = exitPoint(fe, fromRes.isLabel, wdx > 0, wdy > 0, horiz, true,  feW, feH)
                  const [tpx, tpy] = exitPoint(te, toRes.isLabel,   wdx > 0, wdy > 0, horiz, false, teW, teH)
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
                    onDelete={() => {
                      const cId = currentId
                      const deletedGroup = group
                      setDb(prev => {
                        const canvas = prev[cId]
                        if (!canvas) return prev
                        return { ...prev, [cId]: { ...canvas, groups: (canvas.groups||[]).filter(g => g.id !== group.id) } }
                      })
                      pushCommand({
                        undo: () => setDb(prev => {
                          const cv = prev[cId]
                          if (!cv) return prev
                          return { ...prev, [cId]: { ...cv, groups: [...(cv.groups || []), deletedGroup] } }
                        }),
                        redo: () => setDb(prev => {
                          const cv = prev[cId]
                          if (!cv) return prev
                          return { ...prev, [cId]: { ...cv, groups: (cv.groups || []).filter(g => g.id !== deletedGroup.id) } }
                        }),
                      })
                    }}
                    onTitleChange={title => {
                      const cId = currentId
                      const oldTitle = group.title
                      setDb(prev => {
                        const canvas = prev[cId]
                        if (!canvas) return prev
                        return { ...prev, [cId]: { ...canvas, groups: (canvas.groups||[]).map(g => g.id === group.id ? { ...g, title } : g) } }
                      })
                      if (oldTitle !== title) {
                        pushCommand({
                          undo: () => setDb(prev => {
                            const cv = prev[cId]
                            if (!cv) return prev
                            return { ...prev, [cId]: { ...cv, groups: (cv.groups||[]).map(g => g.id === group.id ? { ...g, title: oldTitle } : g) } }
                          }),
                          redo: () => setDb(prev => {
                            const cv = prev[cId]
                            if (!cv) return prev
                            return { ...prev, [cId]: { ...cv, groups: (cv.groups||[]).map(g => g.id === group.id ? { ...g, title } : g) } }
                          }),
                        })
                      }
                    }}
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
                    onTextChange={text => {
                      const oldText = label.text
                      setDb(prev => {
                        const cId = currentId
                        const canvas = prev[cId]
                        if (!canvas) return prev
                        return { ...prev, [cId]: { ...canvas, labels: (canvas.labels||[]).map(l => l.id === label.id ? { ...l, text } : l) } }
                      })
                      if (oldText !== text) {
                        const cId = currentId
                        const labelId = label.id
                        pushCommand({
                          undo: () => setDb(prev => {
                            const cv = prev[cId]
                            if (!cv) return prev
                            return { ...prev, [cId]: { ...cv, labels: (cv.labels||[]).map(l => l.id === labelId ? { ...l, text: oldText } : l) } }
                          }),
                          redo: () => setDb(prev => {
                            const cv = prev[cId]
                            if (!cv) return prev
                            return { ...prev, [cId]: { ...cv, labels: (cv.labels||[]).map(l => l.id === labelId ? { ...l, text } : l) } }
                          }),
                        })
                      }
                    }}
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
                  if (card.isImage) {
                    return (
                      <ImageCard
                        key={card.id}
                        card={card}
                        selected={selected === card.id || multiSelected.includes(card.id)}
                        onMouseDown={e => onCardMouseDown(e, card)}
                        onDelete={() => {
                          if (card.url) deleteImageDB(getStoragePath(card.url)).catch(console.error)
                          const cId = currentIdRef.current
                          setDb(prev => {
                            const cv = prev[cId]
                            if (!cv) return prev
                            return { ...prev, [cId]: { ...cv, cards: cv.cards.filter(c => c.id !== card.id), connections: cv.connections.filter(c => c.from !== card.id && c.to !== card.id) } }
                          })
                        }}
                        onResizeMouseDown={e => onImageResizeMouseDown(e, card)}
                        onConnectDot={(e, anchor) => onConnectDotMouseDown(e, card, anchor)}
                      />
                    )
                  }
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
                        onTextChange={text => {
                          const oldTitle = card.title
                          updateCardFn(card.id, { title: text })
                          if (oldTitle !== text) {
                            pushCommand({
                              undo: () => updateCardFn(card.id, { title: oldTitle }),
                              redo: () => updateCardFn(card.id, { title: text }),
                            })
                          }
                        }}
                        onDelete={() => setDb(prev => {
                          const cId = currentId
                          const canvas = prev[cId]
                          if (!canvas) return prev
                          return { ...prev, [cId]: { ...canvas, cards: canvas.cards.filter(c => c.id !== card.id) } }
                        })}
                        onConnectDot={(e, anchor) => onConnectDotMouseDown(e, labelObj, anchor)}
                        onConvertToPostIt={() => {
                          updateCardFn(card.id, { isLabel: false })
                          pushCommand({
                            undo: () => updateCardFn(card.id, { isLabel: true }),
                            redo: () => updateCardFn(card.id, { isLabel: false }),
                          })
                        }}
                        onConvertToFolder={() => {
                          updateCardFn(card.id, { isLabel: false, isFolder: true })
                          pushCommand({
                            undo: () => updateCardFn(card.id, { isLabel: true, isFolder: false }),
                            redo: () => updateCardFn(card.id, { isLabel: false, isFolder: true }),
                          })
                        }}
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
                      onRename={title => {
                        const oldTitle = card.title
                        updateCardFn(card.id, { title })
                        if (oldTitle !== title) {
                          pushCommand({
                            undo: () => updateCardFn(card.id, { title: oldTitle }),
                            redo: () => updateCardFn(card.id, { title }),
                          })
                        }
                      }}
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
                        pushCommand({
                          undo: () => updateCardFn(card.id, { isFolder: !becomingFolder }),
                          redo: () => updateCardFn(card.id, { isFolder: becomingFolder }),
                        })
                      }}
                      onConvertToLabel={() => {
                        updateCardFn(card.id, { isLabel: true })
                        pushCommand({
                          undo: () => updateCardFn(card.id, { isLabel: false }),
                          redo: () => updateCardFn(card.id, { isLabel: true }),
                        })
                      }}
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
                  onWheel={e => e.nativeEvent.stopPropagation()}
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

              {/* Undo / Redo overlay */}
              <div
                onMouseDown={e => e.stopPropagation()}
                onDoubleClick={e => e.stopPropagation()}
                onWheel={e => e.nativeEvent.stopPropagation()}
                style={{
                  position: 'absolute', bottom: 58, left: 16, zIndex: 100,
                  display: 'flex', gap: 4, pointerEvents: 'all',
                }}
              >
                <button
                  disabled={!canUndo}
                  onClick={canUndo ? undo : undefined}
                  title="Annulla (Ctrl+Z)"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30, borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    color: canUndo ? 'var(--text)' : 'var(--text-muted)',
                    cursor: canUndo ? 'pointer' : 'default',
                    opacity: canUndo ? 1 : 0.4,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                ><Undo2 size={14} /></button>
                <button
                  disabled={!canRedo}
                  onClick={canRedo ? redo : undefined}
                  title="Ripeti (Ctrl+Shift+Z)"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30, borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    color: canRedo ? 'var(--text)' : 'var(--text-muted)',
                    cursor: canRedo ? 'pointer' : 'default',
                    opacity: canRedo ? 1 : 0.4,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                ><Redo2 size={14} /></button>
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
              uploadImage={handleUploadImage}
              onChangeForm={setNoteForm}
              onTitleChange={title => { setNoteForm(f => ({ ...f, title })); updateCardFn(activeNoteId, { title }) }}
              onBodyChange={body => { setNoteForm(f => ({ ...f, body })); updateCardFn(activeNoteId, { body }) }}
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

function NotePanel({ mode, noteForm, onChangeForm, onTitleChange, onBodyChange, onClose, onToggleMode, activeCard, onColorChange, theme, uploadImage }) {
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
            onChange={e => onTitleChange(e.target.value)}
            placeholder="Titolo"
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            style={{ width: '100%', border: 'none', outline: 'none', borderBottom: `2px solid ${titleFocused ? 'var(--accent)' : 'var(--border)'}`, padding: '12px 20px', fontSize: 16, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit', background: 'transparent' }}
          />
          {activeCard && (activeCard.createdAt || activeCard.updatedAt) && (
            <div style={{ padding: '6px 20px 10px', display: 'flex', flexDirection: 'column', gap: 4, borderBottom: '1px solid var(--border)' }}>
              {activeCard.createdAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1 }}>✦</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Creata il {new Date(activeCard.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
              )}
              {activeCard.updatedAt && activeCard.updatedAt !== activeCard.createdAt && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1 }}>✎</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Modificata il {new Date(activeCard.updatedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                </>
              )}
            </div>
          )}
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
          <BlockEditor value={noteForm.body} onChange={onBodyChange} uploadImage={uploadImage} />
        </div>
      </div>
    </div>
  )
}

// ─── shared button styles ─────────────────────────────────────────────────────
const iconBtn = { border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: '2px 4px', lineHeight: 1 }
const smallBtn = { border: '1px solid var(--btn-border)', borderRadius: 4, background: 'var(--btn-bg)', cursor: 'pointer', fontSize: 12, padding: '3px 8px', color: 'var(--btn-text)' }
