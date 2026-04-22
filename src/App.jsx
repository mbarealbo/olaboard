import { useState, useEffect, useRef, useCallback } from 'react'
import { useLang } from './contexts/LangContext'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Trash2, Moon, Sun, Monitor, Zap, Folder, LogOut, Maximize2, Undo2, Redo2, User, MousePointerClick, Search, PenLine, ImageIcon } from 'lucide-react'
import BlockEditor from './components/BlockEditor'
import PostIt from './components/PostIt'
import ImageCard from './components/ImageCard'
import IconCard from './components/IconCard'
import IconPicker from './components/IconPicker'
import IllustrationNode from './components/IllustrationNode'
import IllustrationPicker from './components/IllustrationPicker'
import { fetchIllustrationSvg } from './components/IllustrationNode'
import { ICON_MAP, ICON_STROKE_COLORS } from './lib/icons'
import { Group, CanvasLabel } from './components/GroupBox'
import { useCanvas } from './hooks/useCanvas'
import { useHistory } from './hooks/useHistory'
import { CARD_W, CARD_H_HALF, uid } from './utils'
import { supabase } from './lib/supabase'
import AuthPage from './components/AuthPage'
import OlaboardLogo from './components/OlaboardLogo'
import LandingPage from './components/LandingPage'
import PricingPage from './components/PricingPage'
import PrivacyPage from './components/PrivacyPage'
import TermsPage from './components/TermsPage'
import MobileBlock from './components/MobileBlock'
import { PlanProvider, usePlan } from './contexts/PlanContext'
import { countTotalCanvases } from './lib/plans'
import {
  fetchBoards as fetchBoardsDB,
  searchCards,
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
  return <PlanProvider userId={session.user.id}><AppInner userId={session.user.id} userEmail={session.user.email} /></PlanProvider>
}

// ─── App ─────────────────────────────────────────────────────────────────────
function useMobilePhone() {
  const check = () => window.innerWidth < 640 && window.matchMedia('(pointer: coarse)').matches
  const [is, setIs] = useState(check)
  useEffect(() => {
    const h = () => setIs(check())
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return is
}

export default function App() {
  const isMobilePhone = useMobilePhone()

  const gate = (el) => isMobilePhone ? <MobileBlock /> : el

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/landing" replace />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/app" element={gate(<PlanProvider userId="local"><AppInner userId="local" userEmail="" /></PlanProvider>)} />
      <Route path="/login" element={gate(<LoginRoute />)} />
      <Route path="/board" element={gate(<BoardRoute />)} />
    </Routes>
  )
}

function AppInner({ userId, userEmail }) {
  const { t, lang, setLang } = useLang()
  const { plan, limits } = usePlan()
  const navigate = useNavigate()
  const [limitToast, setLimitToast] = useState(null)

  function showLimitToast(type) {
    const msgs = {
      boards:         plan === 'free' ? `Limite raggiunto: max ${limits.boards} lavagne nel piano free.`         : 'Limite raggiunto.',
      cardsPerCanvas: plan === 'free' ? `Limite raggiunto: max ${limits.cardsPerCanvas} elementi per canvas.`   : 'Limite raggiunto.',
      totalCanvases:  plan === 'free' ? `Limite raggiunto: max ${limits.totalCanvases} canvas totali nel piano free.` : 'Limite raggiunto.',
      storage:        plan === 'free' ? `Limite storage: max ${limits.storageMB} MB nel piano free.`            : 'Limite raggiunto.',
    }
    setLimitToast(msgs[type] || 'Limite del piano raggiunto.')
    setTimeout(() => setLimitToast(null), 4000)
  }

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
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [isDraggingIcon, setIsDraggingIcon] = useState(false)
  const [iconDragPos, setIconDragPos] = useState({ x: 0, y: 0 })
  const iconDragRef = useRef(null) // { iconName, color } while dragging
  const [showIllustrationPicker, setShowIllustrationPicker] = useState(false)
  const [isDraggingIllustration, setIsDraggingIllustration] = useState(false)
  const [illustrationDragPos, setIllustrationDragPos] = useState({ x: 0, y: 0 })
  const [illustrationDragSvg, setIllustrationDragSvg] = useState(null)
  const illustrationDragRef = useRef(null) // { ill } while dragging
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounterRef = useRef(0)
  const imageInputRef = useRef(null)
  const [autoCreate, setAutoCreate] = useState(true)
  const [selectMode, setSelectMode] = useState(false)
  const [scrollZoom, setScrollZoom] = useState(false)
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
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [showManagePlan, setShowManagePlan] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const [showShortcuts, setShowShortcuts] = useState(() => localStorage.getItem('olaboard_shortcuts') !== '0')
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimerRef = useRef(null)
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false)
  const [upgradeYearly, setUpgradeYearly] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  async function startCheckout(priceKey) {
    setCheckoutLoading(priceKey)
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceKey, userId, userEmail, returnUrl: window.location.href }
      })
      if (error) throw error
      if (data?.url) window.location.href = data.url
    } catch (err) {
      console.error('checkout error:', err)
      const detail = err?.context ? await err.context.text().catch(() => '') : ''
      alert('Checkout error: ' + (err?.message || JSON.stringify(err)) + (detail ? '\n\n' + detail : ''))
    } finally {
      setCheckoutLoading(null)
    }
  }
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
    return { id: row.id, title: row.title || '', body: row.body || '', x: row.x, y: row.y, isFolder: row.is_folder || false, isLabel: row.is_label || false, color: row.color || 'yellow', createdAt: row.created_at, updatedAt: row.updated_at || row.created_at, url: row.url || null, width: row.width || null, height: row.height || null, isImage: !!(row.url) && row.node_type !== 'icon', nodeType: row.node_type || 'postit', isIcon: row.node_type === 'icon', isIllustration: row.node_type === 'illustration' }
  }

  // ── image upload helpers ───────────────────────────────────────────────────
  async function handleUploadImage(file) {
    if (userId === 'local') throw new Error(t('demoUploadError'))
    if (limits.storageMB !== Infinity && storageUsed !== null && storageUsed >= limits.storageMB * 1024 * 1024) {
      showLimitToast('storage')
      throw new Error('storage_limit')
    }
    return uploadImageDB(file, userId)
  }

  async function placeImageFromFile(file, wx, wy) {
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
  }

  function getStoragePath(url) {
    const marker = '/storage/v1/object/public/images/'
    const idx = url?.indexOf(marker)
    return idx >= 0 ? url.slice(idx + marker.length) : null
  }

  function placeIconCard(iconName, iconColor, x, y) {
    const cId = currentIdRef.current
    const currentCards = db[cId]?.cards || []
    if (currentCards.filter(c => !c.isLabel).length >= limits.cardsPerCanvas) {
      showLimitToast('cardsPerCanvas')
      return
    }
    const newCard = { id: uid(), nodeType: 'icon', isIcon: true, body: iconName, title: '', color: iconColor, x, y, isFolder: false, isLabel: false, isImage: false, url: null, width: 80, height: 80 }
    setDb(prev => {
      const cv = prev[cId]
      if (!cv) return prev
      return { ...prev, [cId]: { ...cv, cards: [...cv.cards, newCard] } }
    })
    pushCommand({
      undo: () => setDb(prev => { const cv = prev[cId]; if (!cv) return prev; return { ...prev, [cId]: { ...cv, cards: cv.cards.filter(c => c.id !== newCard.id) } } }),
      redo: () => setDb(prev => { const cv = prev[cId]; if (!cv) return prev; return { ...prev, [cId]: { ...cv, cards: [...cv.cards, newCard] } } }),
    })
  }

  function handleIconDragStart(iconName, color, clientX, clientY) {
    iconDragRef.current = { iconName, color }
    setIconDragPos({ x: clientX, y: clientY })
    setIsDraggingIcon(true)
    setShowIconPicker(false)
    document.body.style.cursor = 'grabbing'
  }

  useEffect(() => {
    if (!isDraggingIcon) return
    function onMouseMove(e) {
      setIconDragPos({ x: e.clientX, y: e.clientY })
    }
    function onMouseUp(e) {
      const drag = iconDragRef.current
      iconDragRef.current = null
      document.body.style.cursor = ''
      setIsDraggingIcon(false)
      if (!drag) return
      const r = boardRef.current?.getBoundingClientRect()
      if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        const o = iconDragOffsetRef.current
        const s = iconDragScaleRef.current
        const x = Math.round((e.clientX - r.left - o.x) / s - 40)
        const y = Math.round((e.clientY - r.top  - o.y) / s - 40)
        placeIconCard(drag.iconName, drag.color, x, y)
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDraggingIcon]) // eslint-disable-line react-hooks/exhaustive-deps

  function placeIllustration(ill, x, y) {
    const cId = currentIdRef.current
    const currentCards = db[cId]?.cards || []
    if (currentCards.filter(c => !c.isLabel).length >= limits.cardsPerCanvas) {
      showLimitToast('cardsPerCanvas')
      return
    }
    // Compute height from viewBox aspect ratio
    const vbParts = (ill.viewBox || '0 0 200 200').trim().split(/\s+/)
    const vbW = parseFloat(vbParts[2]) || 200
    const vbH = parseFloat(vbParts[3]) || 200
    const w = 200
    const h = vbH > 0 ? Math.round(w * vbH / vbW) : 200
    const newCard = { id: uid(), nodeType: 'illustration', isIllustration: true, body: ill.id, title: ill.name || '', x, y, width: w, height: h, isFolder: false, isLabel: false, isImage: false, isIcon: false, url: null, color: 'yellow' }
    const saved = { ...newCard }
    setDb(prev => {
      const cv = prev[cId]
      if (!cv) return prev
      return { ...prev, [cId]: { ...cv, cards: [...cv.cards, newCard] } }
    })
    pushCommand({
      undo: () => setDb(prev => { const cv = prev[cId]; if (!cv) return prev; return { ...prev, [cId]: { ...cv, cards: cv.cards.filter(c => c.id !== saved.id) } } }),
      redo: () => setDb(prev => { const cv = prev[cId]; if (!cv) return prev; return { ...prev, [cId]: { ...cv, cards: [...cv.cards, saved] } } }),
    })
  }

  function handleIllustrationClick(ill) {
    const r = boardRef.current?.getBoundingClientRect()
    if (!r) return
    const o = illDragOffsetRef.current
    const s = illDragScaleRef.current
    const cx = (r.width / 2 - o.x) / s
    const cy = (r.height / 2 - o.y) / s
    placeIllustration(ill, Math.round(cx - 100), Math.round(cy - 100))
  }

  function handleIllustrationDragStart(ill, clientX, clientY) {
    illustrationDragRef.current = { ill }
    setIllustrationDragPos({ x: clientX, y: clientY })
    setIsDraggingIllustration(true)
    setShowIllustrationPicker(false)
    document.body.style.cursor = 'grabbing'
    fetchIllustrationSvg(ill.path).then(setIllustrationDragSvg)
  }

  useEffect(() => {
    if (!isDraggingIllustration) return
    function onMouseMove(e) {
      setIllustrationDragPos({ x: e.clientX, y: e.clientY })
    }
    function onMouseUp(e) {
      const drag = illustrationDragRef.current
      illustrationDragRef.current = null
      document.body.style.cursor = ''
      setIsDraggingIllustration(false)
      setIllustrationDragSvg(null)
      if (!drag) return
      const r = boardRef.current?.getBoundingClientRect()
      if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        const o = illDragOffsetRef.current
        const s = illDragScaleRef.current
        const x = Math.round((e.clientX - r.left - o.x) / s - 100)
        const y = Math.round((e.clientY - r.top  - o.y) / s - 100)
        placeIllustration(drag.ill, x, y)
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDraggingIllustration]) // eslint-disable-line react-hooks/exhaustive-deps
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
      const boardName = t('defaultBoardName')
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
          const board = await createBoardDB({ name: t('defaultBoardName'), userId })
          await createCanvasDB({ id: board.id, boardId: board.id, name: board.name, userId })
          boardsData = [board]
        }
        const mapped = boardsData.map(b => ({ id: b.id, name: b.name }))
        setBoards(mapped)
        setDisplayName(boardsData[0]?.name || t('defaultBoardName'))

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
    onLabelMouseDown, onLabelResizeMouseDown, zoomBy,
    activeAutoCreateRef, activeToolRef, multiSelectedRef,
    snapGuides, setLastLabelStyle,
  } = useCanvas({ db, setDb, currentIdRef, updateCardFn, addConnectionFn, setActiveNoteId, view, activeTool, setActiveTool, selectMode, setMultiSelected, setSelectionRect, onGroupCreated: id => setEditingGroupId(id), pushCommand, maxCardsPerCanvas: limits.cardsPerCanvas, onLimitReached: showLimitToast, scrollZoom })

  useEffect(() => { activeAutoCreateRef.current = autoCreate }, [autoCreate, activeAutoCreateRef])
  useEffect(() => { activeToolRef.current = activeTool }, [activeTool, activeToolRef])
  useEffect(() => { multiSelectedRef.current = multiSelected }, [multiSelected, multiSelectedRef])
  useEffect(() => { if (multiSelected.length > 0) setActiveNoteId(null) }, [multiSelected])

  // refs so drag handlers always see current offset/scale without stale closures
  const iconDragOffsetRef = useRef({ x: 0, y: 0 })
  const iconDragScaleRef = useRef(1)
  useEffect(() => { iconDragOffsetRef.current = offset }, [offset])
  useEffect(() => { iconDragScaleRef.current = scale }, [scale])
  const illDragOffsetRef = useRef({ x: 0, y: 0 })
  const illDragScaleRef = useRef(1)
  useEffect(() => { illDragOffsetRef.current = offset }, [offset])
  useEffect(() => { illDragScaleRef.current = scale }, [scale])

  // ── navigation ───────────────────────────────────────────────────────────
  function centerCanvas(canvasId, canvasOverride) {
    const canvas = canvasOverride || dbRef.current[canvasId]
    if (!canvas) { setOffset({ x: 0, y: 0 }); setScale(1); return }
    const elements = [
      ...(canvas.cards || []).map(c => ({ x: c.x, y: c.y, w: (c.isImage || c.isIllustration) ? (c.width || 200) : CARD_W, h: (c.isImage || c.isIllustration) ? (c.height || 200) : CARD_H_HALF * 2 })),
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
      if (e.key === 'n' || e.key === 'N') {
        setActiveTool('note'); setSelectMode(false)
      } else if (e.key === 's' || e.key === 'S') {
        if (selectMode) { setSelectMode(false); setMultiSelected([]) }
        else { setSelectMode(true); setActiveTool('note') }
      } else if (e.key === 'q' || e.key === 'Q') {
        setAutoCreate(v => !v)
      } else if (e.key === 'g' || e.key === 'G') {
        setActiveTool(prev => prev === 'group' ? 'note' : 'group'); setSelectMode(false)
      } else if (e.key === 't' || e.key === 'T') {
        setActiveTool(prev => prev === 'text' ? 'note' : 'text'); setSelectMode(false)
      } else if (e.key === 'i' || e.key === 'I') {
        setShowIconPicker(prev => !prev)
      } else if (e.key === 'p' || e.key === 'P') {
        imageInputRef.current?.click()
      } else if (e.key === 'd' || e.key === 'D') {
        setShowIllustrationPicker(prev => !prev)
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

  // ── Cmd+K search shortcut ─────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
        setSearchQuery(''); setSearchResults([])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
      md += `### ${c.title || t('untitled')}\n\n`
      if (c.body) md += `${c.body}\n\n`
    })
    if (connections.length) {
      md += `## ${t('connections')}\n\n`
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
      title: c.title || t('untitled'),
      type: c.isFolder ? 'folder' : c.isLabel ? 'label' : 'note',
      createdAt: c.createdAt || null,
      _card: c,
    })),
    ...labels.map(l => ({
      id: l.id,
      title: l.text || t('untitled'),
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
    <div data-theme={theme} style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, sans-serif', paddingTop: userId === 'local' && !demoBannerDismissed ? 38 : 0 }}>
      {/* Demo banner */}
      {userId === 'local' && !demoBannerDismissed && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10001, background: '#1a1a1a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '9px 16px', fontSize: 13 }}>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t('demoBannerText')}</span>
          <button
            onClick={() => { setShowUpgrade(true) }}
            style={{ fontSize: 12, fontWeight: 700, background: '#378ADD', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >{t('demoBannerCta')}</button>
          <button onClick={() => setDemoBannerDismissed(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, marginLeft: 4 }}>×</button>
        </div>
      )}

      {limitToast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#1a1a1a', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
          <span>🔒 {limitToast}</span>
          <button onClick={() => setLimitToast(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

      {/* Loading overlay */}
      <LoadingOverlay loading={loading} />

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div style={{ width: 210, flexShrink: 0, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top scrollable section */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ padding: '14px 12px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <OlaboardLogo size={20} fontSize={16} gap={7} color='var(--text)' />
              <button
                onClick={() => { setShowSearch(true); setSearchQuery(''); setSearchResults([]) }}
                title="Cerca (⌘K)"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              ><Search size={14} /></button>
            </div>
            <div style={{ padding: '0 12px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>{t('boards')}</div>
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
                      title={t('renameBoard')}
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
                          setConfirmModal({
                            title: lang === 'it' ? 'Elimina lavagna' : 'Delete board',
                            message: lang === 'it' ? `Vuoi eliminare "${board.name}"? L'azione è irreversibile.` : `Delete "${board.name}"? This action cannot be undone.`,
                            confirmLabel: lang === 'it' ? 'Elimina' : 'Delete',
                            danger: true,
                            onConfirm: () => {
                              setBoards(prev => prev.filter(b => b.id !== board.id))
                              setDb(prev => { const next = { ...prev }; delete next[board.id]; return next })
                              deleteBoardDB(board.id).catch(console.error)
                            }
                          })
                        }}
                        title={t('deleteBoard')}
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
                if (boards.length >= limits.boards) { showLimitToast('boards'); return }
                const name = t('newBoardName')
                try {
                  let id
                  if (userId === 'local') {
                    id = uid()
                  } else {
                    const board = await createBoardDB({ name, userId })
                    id = board.id
                    await createCanvasDB({ id, boardId: id, name, userId })
                  }
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
            >{t('newBoard')}</button>
            <div style={{ padding: '10px 12px 12px', borderTop: '1px solid #eee', marginTop: 4 }}>
              <OlaboardLogo size={14} fontSize={12} gap={5} color='#222' />
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                Made by{' '}
                <a href="https://olab.quest" target="_blank" rel="noopener noreferrer" style={{ color: '#378ADD', textDecoration: 'none' }}>olab.quest</a>
              </div>
              <div style={{ fontSize: 10, color: '#bbb', marginTop: 4, display: 'flex', gap: 8 }}>
                <span>v0.8.0</span>
                <button onClick={() => window.revisitCkyConsent?.()} style={{ fontSize: 10, color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#378ADD'}
                  onMouseLeave={e => e.currentTarget.style.color = '#bbb'}
                >Cookie Preferences</button>
              </div>
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

          {/* Context toolbar */}
          {view === 'canvas' && (() => {
            const FONT_OPTIONS = [
              { key: 'sans',  label: 'Normal',      family: 'system-ui, sans-serif' },
              { key: 'mono',  label: 'Mono',         family: "'Space Mono', monospace" },
              { key: 'hand',  label: 'Handwriting',  family: "'Caveat', cursive" },
              { key: 'serif', label: 'Serif',        family: "'Lora', serif" },
            ]
            const COLORS = ['yellow', 'orange', 'green', 'blue', 'pink', 'purple', 'white', 'red']
            const COLOR_HEX = { yellow: '#FAC775', orange: '#EF9F27', green: '#b8e986', blue: '#89cff0', pink: '#ffb3c6', purple: '#d4a8ff', white: '#f5f5f5', red: '#ff8a80' }
            const divStyle = { display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 10, marginLeft: 2, borderLeft: '1px solid var(--border)' }

            const activeEl = selectedLabel || editingLabelId
            if (activeEl) {
              const standaloneLabel = labels.find(l => l.id === activeEl)
              const lbl = standaloneLabel || cards.find(c => c.id === activeEl && c.isLabel)
              if (!lbl) return null
              const activeFontKey = lbl.fontFamily || 'sans'
              const activeFontFamily = FONT_OPTIONS.find(f => f.key === activeFontKey)?.family || 'system-ui, sans-serif'
              const fontSize = lbl.fontSize || 16
              const updateLbl = (changes) => {
                if (changes.fontFamily || changes.fontSize) setLastLabelStyle(changes)
                if (standaloneLabel) {
                  const cId = currentId
                  setDb(prev => { const cv = prev[cId]; if (!cv) return prev; return { ...prev, [cId]: { ...cv, labels: cv.labels.map(l => l.id === activeEl ? { ...l, ...changes } : l) } } })
                } else {
                  updateCardFn(activeEl, changes)
                }
              }
              return (
                <div style={divStyle}>
                  <select
                    value={activeFontKey}
                    onChange={e => updateLbl({ fontFamily: e.target.value })}
                    style={{ fontFamily: activeFontFamily, fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--btn-border)', background: 'var(--btn-bg)', color: 'var(--btn-text)', cursor: 'pointer', outline: 'none' }}
                  >
                    {FONT_OPTIONS.map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                  <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />
                  <button onClick={() => updateLbl({ fontSize: Math.max(10, fontSize - 4) })} style={smallBtn}>−</button>
                  <span style={{ fontSize: 11, color: 'var(--text)', minWidth: 22, textAlign: 'center' }}>{fontSize}</span>
                  <button onClick={() => updateLbl({ fontSize: Math.min(120, fontSize + 4) })} style={smallBtn}>+</button>
                </div>
              )
            }

            if (selected) {
              const card = cards.find(c => c.id === selected)
              if (!card || card.isFolder || card.isLabel || card.isImage || card.isIcon || card.isIllustration) return null
              const cur = card.color || 'yellow'
              return (
                <div style={divStyle}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => updateCardFn(selected, { color: c })}
                      style={{ width: 16, height: 16, borderRadius: '50%', background: COLOR_HEX[c], border: cur === c ? '2.5px solid var(--accent)' : '1.5px solid rgba(0,0,0,0.12)', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                    />
                  ))}
                </div>
              )
            }

            return null
          })()}

          <div style={{ flex: 1 }} />

          {/* View tabs */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2, gap: 1 }}>
            {[['canvas', t('viewCanvas')], ['list', t('viewList')]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ fontSize: 12, padding: '3px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === v ? 'var(--btn-bg)' : 'transparent', color: view === v ? 'var(--btn-text)' : 'var(--text-muted)', fontWeight: view === v ? 600 : 400, boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>{l}</button>
            ))}
          </div>

          {/* Canvas tools */}
          {(activeColor => {
            const dis = view !== 'canvas'
            const disStyle = dis ? { opacity: 0.4, cursor: 'not-allowed' } : {}
            const activeBtn = (active) => ({ ...smallBtn, background: active ? activeColor : 'var(--btn-bg)', color: active ? '#fff' : 'var(--btn-text)', borderColor: active ? activeColor : 'var(--btn-border)', ...disStyle })
            const divider = <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 3px', alignSelf: 'center' }} />
            return <>
            {/* Group 1: creation */}
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <button disabled={dis} style={activeBtn(activeTool === 'note' && !selectMode)}
                onClick={!dis ? () => { setActiveTool('note'); setSelectMode(false) } : undefined}
                title={t('postItToolTitle')}
              >{t('postItTool')}</button>
              <button disabled={dis} style={activeBtn(activeTool === 'text')}
                onClick={!dis ? () => { setActiveTool(prev => prev === 'text' ? 'note' : 'text'); setSelectMode(false) } : undefined}
                title={t('textToolTitle')}
              >{t('textTool')}</button>
              <button disabled={dis} style={activeBtn(activeTool === 'group')}
                onClick={!dis ? () => { setActiveTool(prev => prev === 'group' ? 'note' : 'group'); setSelectMode(false) } : undefined}
                title={t('groupToolTitle')}
              >{t('groupTool')}</button>
            </div>
            {divider}
            {/* Group 2: media */}
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <button disabled={dis} style={activeBtn(showIconPicker)}
                onClick={!dis ? () => setShowIconPicker(v => !v) : undefined}
                title="Icons (I)"
              >⬡ Icons</button>
              <button disabled={dis} style={{ ...activeBtn(false) }}
                onClick={!dis ? () => imageInputRef.current?.click() : undefined}
                title={t('imageToolTitle')}
              ><ImageIcon size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />{t('imageTool')}</button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async e => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  const r = boardRef.current?.getBoundingClientRect()
                  const bw = r?.width ?? 800
                  const bh = r?.height ?? 600
                  const wx = (bw / 2 - offset.x) / scale
                  const wy = (bh / 2 - offset.y) / scale
                  try { await placeImageFromFile(file, wx, wy) } catch (err) { alert(err.message) }
                }}
              />
              <button disabled={dis} style={activeBtn(showIllustrationPicker)}
                onClick={!dis ? () => setShowIllustrationPicker(v => !v) : undefined}
                title={t('illustrationsToolTitle')}
              ><PenLine size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />{t('illustrationsTool')}</button>
            </div>
            {divider}
            {/* Group 3: canvas tools */}
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <button disabled={dis} style={activeBtn(selectMode)}
                onClick={!dis ? () => { setSelectMode(v => !v); setActiveTool('note') } : undefined}
                title={t('selectTitle')}
              >⬚ Select</button>
              <button disabled={dis} style={{ ...smallBtn, ...disStyle }}
                onClick={!dis ? () => setShowGrid(v => !v) : undefined}
                title={t('gridToggleTitle')}
              >{showGrid ? '⊞ Grid' : '⊟ Grid'}</button>
              <button disabled={dis} style={activeBtn(autoCreate)}
                onClick={!dis ? () => setAutoCreate(v => !v) : undefined}
                title={t('quickConnectTitle')}
              ><Zap size={14} /> Quick</button>
            </div>
            </>
          })(theme === 'high-contrast' ? '#7b2fff' : 'var(--accent)')}
            <div style={{ display: 'flex', gap: 2 }}>
              <button disabled={view !== 'canvas'} style={{ ...smallBtn, ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={view === 'canvas' ? () => zoomBy(1.2) : undefined}>+</button>
              <button disabled={view !== 'canvas'} style={{ ...smallBtn, ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={view === 'canvas' ? () => zoomBy(0.8) : undefined}>−</button>
              <button disabled={view !== 'canvas'} style={{ ...smallBtn, ...(view !== 'canvas' ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={view === 'canvas' ? () => centerCanvas(currentId) : undefined} title="Centra elementi"><Maximize2 size={13} /></button>
            </div>

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
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{t('account')}</div>
            <div style={{ fontSize: 13, color: 'var(--text)', wordBreak: 'break-all' }}>{userEmail}</div>

            {/* Plan section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginRight: 8 }}>Piano</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: plan === 'god' ? '#7b2fff' : plan === 'pro' ? '#378ADD' : 'var(--border)',
                  color: plan === 'free' ? 'var(--text-muted)' : '#fff',
                }}>
                  {plan === 'god' ? '⚡ God' : plan === 'pro' ? '★ Pro' : 'Free'}
                </span>
              </div>
              {plan === 'free' && userId !== 'local' && (
                <button onClick={() => { setShowAccount(false); setShowUpgrade(true) }}
                  style={{ fontSize: 11, fontWeight: 650, padding: '5px 10px', borderRadius: 6, border: 'none', background: '#378ADD', color: '#fff', cursor: 'pointer' }}>
                  Upgrade →
                </button>
              )}
              {plan === 'pro' && userId !== 'local' && (
                <button onClick={() => { setShowAccount(false); setShowManagePlan(true) }}
                  style={{ fontSize: 11, padding: '4px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Gestisci →
                </button>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>{t('storage')}</span>
                <span>{storageUsed !== null ? `${(storageUsed / 1024 / 1024).toFixed(1)} MB / ${limits.storageMB === Infinity ? '∞' : limits.storageMB + ' MB'}` : '…'}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: storageUsed > (limits.storageMB * 0.9) * 1024 * 1024 ? '#e53935' : 'var(--accent)',
                  width: storageUsed !== null && limits.storageMB !== Infinity ? `${Math.min(100, (storageUsed / (limits.storageMB * 1024 * 1024)) * 100).toFixed(1)}%` : storageUsed !== null ? '5%' : '0%',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: -4 }}>{t('illustrationsAttribution')}</p>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>{t('lang')}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setLang('it')} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, border: '1px solid var(--border)', background: lang === 'it' ? 'var(--accent)' : 'var(--btn-bg)', color: lang === 'it' ? '#fff' : 'var(--btn-text)', cursor: 'pointer', fontFamily: 'inherit' }}>Italiano</button>
                <button onClick={() => setLang('en')} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, border: '1px solid var(--border)', background: lang === 'en' ? 'var(--accent)' : 'var(--btn-bg)', color: lang === 'en' ? '#fff' : 'var(--btn-text)', cursor: 'pointer', fontFamily: 'inherit' }}>English</button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => supabase.auth.signOut()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer', color: '#e53935', fontFamily: 'inherit' }}
              ><LogOut size={13} /> {t('signOut')}</button>
              <button
                onClick={() => { setShowAccount(false); setDeleteConfirmText(''); setDeleteError(null); setShowDeleteAccount(true) }}
                style={{ fontSize: 11, color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}
                onMouseEnter={e => e.currentTarget.style.color = '#e53935'}
                onMouseLeave={e => e.currentTarget.style.color = '#bbb'}
              >{lang === 'it' ? 'Elimina account' : 'Delete account'}</button>
            </div>
          </div>
        )}

        {/* Upgrade modal */}
        {showManagePlan && (
          <div onMouseDown={() => setShowManagePlan(false)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onMouseDown={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '32px 28px 28px', width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', color: '#0a0a0a' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 750, letterSpacing: '-0.5px' }}>Gestisci piano</div>
                <button onClick={() => setShowManagePlan(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#aaa', lineHeight: 1 }}>×</button>
              </div>

              <div style={{ background: '#f8f8f8', borderRadius: 12, padding: '14px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: '#378ADD', color: '#fff' }}>★ Pro</span>
                <span style={{ fontSize: 13, color: '#555' }}>Piano attivo</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => setConfirmModal({
                    title: 'Passa al piano Free',
                    message: 'Perderai l\'accesso alle funzionalità Pro. Vuoi continuare?',
                    confirmLabel: 'Passa a Free',
                    danger: false,
                    onConfirm: async () => {
                      const { error } = await supabase.from('profiles').update({ plan: 'free' }).eq('id', userId)
                      if (!error) { setShowManagePlan(false); window.location.reload() }
                    }
                  })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 14, fontWeight: 600, color: '#333', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#aaa'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                >
                  <div>Passa al piano Free</div>
                  <div style={{ fontSize: 12, color: '#aaa', fontWeight: 400, marginTop: 2 }}>Effettua il downgrade e perdi le funzionalità Pro</div>
                </button>

                <button
                  onClick={() => setConfirmModal({
                    title: 'Cancella abbonamento',
                    message: 'Il tuo account tornerà al piano Free. Sei sicuro?',
                    confirmLabel: 'Cancella abbonamento',
                    danger: true,
                    onConfirm: async () => {
                      const { error } = await supabase.from('profiles').update({ plan: 'free', stripe_customer_id: null }).eq('id', userId)
                      if (!error) { setShowManagePlan(false); window.location.reload() }
                    }
                  })}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fff5f5', fontSize: 14, fontWeight: 600, color: '#dc2626', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff5f5'}
                >
                  <div>Cancella abbonamento</div>
                  <div style={{ fontSize: 12, color: '#f87171', fontWeight: 400, marginTop: 2 }}>L'account tornerà al piano Free</div>
                </button>
              </div>

              <p style={{ fontSize: 11, color: '#bbb', marginTop: 20, lineHeight: 1.5 }}>
                Per problemi con la fatturazione scrivi a <a href="mailto:privacy@olab.quest" style={{ color: '#bbb' }}>privacy@olab.quest</a>
              </p>
            </div>
          </div>
        )}

        {showIconPicker && (
          <IconPicker onDragStart={handleIconDragStart} onClose={() => setShowIconPicker(false)} />
        )}

        {showIllustrationPicker && (
          <IllustrationPicker
            onDragStart={handleIllustrationDragStart}
            onClick={handleIllustrationClick}
            onClose={() => setShowIllustrationPicker(false)}
          />
        )}

        {isDraggingIllustration && (
          <div style={{
            position: 'fixed',
            left: illustrationDragPos.x - 60, top: illustrationDragPos.y - 60,
            width: 120, height: 120,
            pointerEvents: 'none', zIndex: 99999,
            color: 'var(--text)', opacity: 0.65,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
          }}>
            {illustrationDragSvg ? (
              <div dangerouslySetInnerHTML={{ __html: illustrationDragSvg }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--border)', borderRadius: 8 }} />
            )}
          </div>
        )}

        {isDraggingIcon && iconDragRef.current && (() => {
          const GhostIcon = ICON_MAP[iconDragRef.current.iconName]
          const strokeColor = ICON_STROKE_COLORS[iconDragRef.current.color] || ICON_STROKE_COLORS.blue
          return (
            <div style={{
              position: 'fixed',
              left: iconDragPos.x - 20, top: iconDragPos.y - 20,
              width: 40, height: 40,
              pointerEvents: 'none', zIndex: 99999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0.75,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
            }}>
              {GhostIcon && <GhostIcon size={32} color={strokeColor} strokeWidth={1.8} />}
            </div>
          )
})()}

        {showSearch && (
          <div onMouseDown={() => setShowSearch(false)} style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '80px 16px 16px' }}>
            <div onMouseDown={e => e.stopPropagation()} style={{ background: 'var(--bg, #fff)', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
              {/* Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                <Search size={16} style={{ color: 'var(--text-muted, #aaa)', flexShrink: 0 }} />
                <input
                  autoFocus
                  value={searchQuery}
                  placeholder={lang === 'it' ? 'Cerca in tutti i canvas…' : 'Search all canvases…'}
                  onChange={e => {
                    const q = e.target.value
                    setSearchQuery(q)
                    clearTimeout(searchTimerRef.current)
                    if (q.trim().length < 2) { setSearchResults([]); return }
                    setSearchLoading(true)
                    searchTimerRef.current = setTimeout(async () => {
                      try {
                        const res = await searchCards(q, userId)
                        setSearchResults(res)
                      } catch (_) {}
                      setSearchLoading(false)
                    }, 280)
                  }}
                  onKeyDown={e => { if (e.key === 'Escape') setShowSearch(false) }}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: 'var(--text, #111)', fontFamily: 'inherit' }}
                />
                {searchLoading && <span style={{ fontSize: 11, color: 'var(--text-muted, #aaa)' }}>…</span>}
                <kbd style={{ fontSize: 10, color: 'var(--text-muted, #aaa)', background: 'var(--border, #f0f0f0)', borderRadius: 4, padding: '2px 5px' }}>Esc</kbd>
              </div>

              {/* Results */}
              <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                {searchQuery.trim().length >= 2 && !searchLoading && searchResults.length === 0 && (
                  <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted, #aaa)' }}>
                    {lang === 'it' ? 'Nessun risultato' : 'No results found'}
                  </div>
                )}
                {searchResults.map(card => {
                  const canvasName = card.canvases?.name || '—'
                  const boardName = boards.find(b => b.id === card.canvases?.board_id)?.name || '—'
                  const bodyPreview = (card.body || '').replace(/[#*`>\-]/g, '').trim().slice(0, 80)
                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        setShowSearch(false)
                        handleSidebarNavigate(card.canvas_id)
                      }}
                      style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border, #f0f0f0)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--border, #f5f5f5)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #111)', marginBottom: 3 }}>
                        {card.is_folder ? '📁 ' : ''}{card.title || (lang === 'it' ? 'Senza titolo' : 'Untitled')}
                      </div>
                      {bodyPreview && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted, #888)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {bodyPreview}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text-muted, #bbb)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{boardName}</span>
                        <span>›</span>
                        <span>{canvasName}</span>
                      </div>
                    </div>
                  )
                })}
                {!searchQuery.trim() && (
                  <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted, #bbb)' }}>
                    {lang === 'it' ? 'Digita almeno 2 caratteri per cercare' : 'Type at least 2 characters to search'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {confirmModal && (
          <div onMouseDown={() => setConfirmModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onMouseDown={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '28px 24px 24px', width: '100%', maxWidth: 380, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
              <div style={{ fontSize: 16, fontWeight: 750, letterSpacing: '-0.4px', marginBottom: 10 }}>{confirmModal.title}</div>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, margin: '0 0 24px' }}>{confirmModal.message}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setConfirmModal(null)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: '#333' }}
                >{lang === 'it' ? 'Annulla' : 'Cancel'}</button>
                <button
                  onClick={async () => { await confirmModal.onConfirm(); setConfirmModal(null) }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', background: confirmModal.danger ? '#e53935' : '#378ADD', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >{confirmModal.confirmLabel}</button>
              </div>
            </div>
          </div>
        )}

        {showDeleteAccount && (
          <div onMouseDown={() => !deleteLoading && setShowDeleteAccount(false)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onMouseDown={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '32px 28px 28px', width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', color: '#0a0a0a' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
                <div style={{ fontSize: 18, fontWeight: 750, letterSpacing: '-0.5px', marginBottom: 8 }}>
                  {lang === 'it' ? 'Elimina account' : 'Delete account'}
                </div>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 }}>
                  {lang === 'it'
                    ? 'Questa azione è irreversibile. Tutti i tuoi canvas, note e immagini verranno eliminati definitivamente. L\'abbonamento Pro verrà cancellato.'
                    : 'This action is irreversible. All your canvases, notes and images will be permanently deleted. Your Pro subscription will be cancelled.'}
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 650, color: '#555', display: 'block', marginBottom: 6 }}>
                  {lang === 'it' ? 'Digita ELIMINA per confermare' : 'Type DELETE to confirm'}
                </label>
                <input
                  value={deleteConfirmText}
                  onChange={e => { setDeleteConfirmText(e.target.value); setDeleteError(null) }}
                  placeholder={lang === 'it' ? 'ELIMINA' : 'DELETE'}
                  disabled={deleteLoading}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = '#e53935'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {deleteError && (
                <div style={{ marginBottom: 16, padding: '9px 12px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                  {deleteError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowDeleteAccount(false)}
                  disabled={deleteLoading}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >{lang === 'it' ? 'Annulla' : 'Cancel'}</button>
                <button
                  disabled={deleteLoading || (lang === 'it' ? deleteConfirmText !== 'ELIMINA' : deleteConfirmText !== 'DELETE')}
                  onClick={async () => {
                    setDeleteLoading(true); setDeleteError(null)
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      const res = await supabase.functions.invoke('delete-account', {
                        headers: { Authorization: `Bearer ${session.access_token}` }
                      })
                      if (res.error) throw new Error(res.error.message)
                      await supabase.auth.signOut()
                      window.location.href = '/landing'
                    } catch (err) {
                      setDeleteError(err.message || (lang === 'it' ? 'Errore durante la cancellazione.' : 'Error during deletion.'))
                      setDeleteLoading(false)
                    }
                  }}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: 'none', background: deleteLoading || (lang === 'it' ? deleteConfirmText !== 'ELIMINA' : deleteConfirmText !== 'DELETE') ? '#fca5a5' : '#e53935', color: '#fff', fontSize: 14, fontWeight: 700, cursor: deleteLoading || (lang === 'it' ? deleteConfirmText !== 'ELIMINA' : deleteConfirmText !== 'DELETE') ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                >{deleteLoading ? '…' : (lang === 'it' ? 'Elimina definitivamente' : 'Delete permanently')}</button>
              </div>
            </div>
          </div>
        )}

        {showUpgrade && (
          <div onMouseDown={() => setShowUpgrade(false)} style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onMouseDown={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '32px 28px 28px', width: '100%', maxWidth: 560, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', color: '#0a0a0a' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 18, fontWeight: 750, letterSpacing: '-0.5px' }}>
                  {userId === 'local'
                    ? (lang === 'it' ? 'Registrati per salvare i tuoi dati' : 'Sign up to save your data')
                    : 'Upgrade to Pro'}
                </div>
                <button onClick={() => setShowUpgrade(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
              </div>
              {userId === 'local' && (
                <p style={{ fontSize: 13, color: '#888', marginBottom: 20, marginTop: 0 }}>
                  {lang === 'it'
                    ? 'La demo salva i dati solo in questo browser. Con un account gratuito li tieni al sicuro e sincronizzati.'
                    : 'The demo saves data in this browser only. With a free account your data is safe and synced across devices.'}
                </p>
              )}

              {/* Toggle (only relevant for non-demo) */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ display: 'inline-flex', background: '#f5f5f5', borderRadius: 100, padding: 3 }}>
                  <button onClick={() => setUpgradeYearly(false)} style={{ padding: '5px 16px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: !upgradeYearly ? '#fff' : 'transparent', color: !upgradeYearly ? '#111' : '#888', boxShadow: !upgradeYearly ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', transition: 'all 0.15s' }}>
                    {lang === 'it' ? 'Mensile' : 'Monthly'}
                  </button>
                  <button onClick={() => setUpgradeYearly(true)} style={{ padding: '5px 16px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: upgradeYearly ? '#fff' : 'transparent', color: upgradeYearly ? '#111' : '#888', boxShadow: upgradeYearly ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {lang === 'it' ? 'Annuale' : 'Yearly'} <span style={{ fontSize: 9, fontWeight: 700, background: '#e8f5e9', color: '#2e7d32', borderRadius: 20, padding: '1px 6px' }}>-37%</span>
                  </button>
                </div>
              </div>

              {/* Two plan cards */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>

                {/* Free */}
                <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase' }}>{lang === 'it' ? 'Gratuito' : 'Free'}</div>
                  <div><span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1.5px' }}>€0</span><span style={{ fontSize: 12, color: '#999', marginLeft: 3 }}>forever</span></div>
                  {['3 boards', '150 cards/canvas', '30 canvases', '20 MB storage'].map(f => (
                    <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: '#ccc', fontSize: 13 }}>✓</span>
                      <span style={{ fontSize: 12, color: '#666' }}>{f}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => { setShowUpgrade(false); navigate('/login') }}
                    style={{ marginTop: 'auto', padding: '9px 0', borderRadius: 8, border: '1.5px solid #e0e0e0', background: '#fff', fontSize: 13, fontWeight: 650, cursor: 'pointer', color: '#111' }}
                  >{lang === 'it' ? 'Registrati gratis' : 'Sign up free'}</button>
                </div>

                {/* Pro */}
                <div style={{ flex: 1, border: '2px solid #378ADD', borderRadius: 14, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', boxShadow: '0 4px 20px rgba(55,138,221,0.12)' }}>
                  <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#378ADD', color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                    {lang === 'it' ? 'Più popolare' : 'Most popular'}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#378ADD', letterSpacing: 1, textTransform: 'uppercase' }}>Pro</div>
                  <div>
                    <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1.5px' }}>{upgradeYearly ? '€3.75' : '€6'}</span>
                    <span style={{ fontSize: 12, color: '#999', marginLeft: 3 }}>/mo</span>
                    {upgradeYearly && <div style={{ fontSize: 11, color: '#888' }}>billed €45/year</div>}
                  </div>
                  {[
                    lang === 'it' ? 'Lavagne illimitate' : 'Unlimited boards',
                    lang === 'it' ? 'Card illimitate' : 'Unlimited cards',
                    lang === 'it' ? 'Canvas illimitati' : 'Unlimited canvases',
                    '100 MB storage',
                    lang === 'it' ? 'Supporto prioritario' : 'Priority support',
                  ].map(f => (
                    <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: '#378ADD', fontSize: 13 }}>✓</span>
                      <span style={{ fontSize: 12, color: '#333' }}>{f}</span>
                    </div>
                  ))}
                  {userId === 'local' ? (
                    <button
                      onClick={() => { setShowUpgrade(false); navigate('/login?intent=pro') }}
                      style={{ marginTop: 'auto', padding: '9px 0', borderRadius: 8, border: 'none', background: '#378ADD', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                    >{lang === 'it' ? 'Registrati e vai a Pro →' : 'Sign up and go Pro →'}</button>
                  ) : (
                    <button
                      onClick={() => startCheckout(upgradeYearly ? 'yearly' : 'monthly')}
                      disabled={!!checkoutLoading}
                      style={{ marginTop: 'auto', padding: '9px 0', borderRadius: 8, border: 'none', background: '#378ADD', color: '#fff', fontSize: 13, fontWeight: 700, cursor: checkoutLoading ? 'not-allowed' : 'pointer', opacity: checkoutLoading ? 0.7 : 1, transition: 'opacity 0.15s' }}
                    >{checkoutLoading ? 'Redirecting…' : `Get Pro — ${upgradeYearly ? '€45/yr' : '€6/mo'}`}</button>
                  )}
                </div>
              </div>

              {userId !== 'local' && (
                <p style={{ textAlign: 'center', fontSize: 11, color: '#ccc', margin: 0 }}>Cancel any time · Secure payment via Stripe</p>
              )}
            </div>
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {view === 'canvas' ? (
            <div
              ref={boardRef}
              style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: boardCursor, userSelect: 'none', backgroundColor: 'var(--bg)', backgroundImage: showGrid ? 'radial-gradient(circle, var(--grid-dot) 1px, transparent 1px)' : 'none', backgroundSize: `${20 * scale}px ${20 * scale}px`, backgroundPosition: `${offset.x % (20 * scale)}px ${offset.y % (20 * scale)}px` }}
              onMouseDown={e => { setSelectedConn(null); setSelectedGroup(null); onBoardMouseDown(e) }}
              onDoubleClick={onBoardDblClick}
              onDragEnter={e => {
                e.preventDefault()
                if ([...e.dataTransfer.types].includes('Files')) {
                  dragCounterRef.current += 1
                  if (dragCounterRef.current === 1) setIsDragOver(true)
                }
              }}
              onDragLeave={e => {
                dragCounterRef.current -= 1
                if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setIsDragOver(false) }
              }}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
              onDrop={async e => {
                e.preventDefault()
                dragCounterRef.current = 0
                setIsDragOver(false)
                const file = [...e.dataTransfer.files].find(f => f.type.startsWith('image/'))
                if (!file) return
                const r = boardRef.current.getBoundingClientRect()
                const wx = (e.clientX - r.left - offset.x) / scale
                const wy = (e.clientY - r.top - offset.y) / scale
                try { await placeImageFromFile(file, wx, wy) } catch (err) { alert(err.message) }
              }}
            >
              {/* Drop overlay */}
              {isDragOver && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 500, pointerEvents: 'none',
                  background: 'rgba(55,138,221,0.08)',
                  border: '3px dashed #378ADD',
                  borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    background: 'var(--bg-panel)', borderRadius: 12,
                    border: '2px solid #378ADD',
                    padding: '18px 32px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    boxShadow: '0 4px 24px rgba(55,138,221,0.18)',
                  }}>
                    <span style={{ fontSize: 36, lineHeight: 1 }}>🖼</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#378ADD' }}>{t('dropImageHere')}</span>
                  </div>
                </div>
              )}
              {/* SVG overlay – arrows in screen-space */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                <defs>
                  <marker id="ah" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#378ADD" />
                  </marker>
                  <marker id="ah-sel" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#e53935" />
                  </marker>
                </defs>
                {(() => {
                  const allLabels = [
                    ...labels,
                    ...cards.filter(c => c.isLabel).map(c => ({ id: c.id, x: c.x, y: c.y, text: c.title || '', fontSize: 16, fontFamily: 'sans' })),
                  ]
                  function estimateLabelDims(entity) {
                    const text = entity.text || ''
                    const fontSize = entity.fontSize || 16
                    const ratios = { mono: 0.60, hand: 0.36, serif: 0.48, sans: 0.50 }
                    const charW = fontSize * (ratios[entity.fontFamily] || 0.50)
                    return { w: Math.max(50, text.length * charW + 32), h: fontSize * 1.4 + 16 }
                  }
                  function resolveEntity(id) {
                    const card = cards.find(c => c.id === id && !c.isLabel)
                    if (card) return { entity: card, isLabel: false }
                    const lbl = allLabels.find(l => l.id === id)
                    if (lbl) return { entity: lbl, isLabel: true }
                    return null
                  }
                  return connections.map(conn => {
                  const isSel = selectedConn === conn.id
                  const fromRes = resolveEntity(conn.from)
                  const toRes   = resolveEntity(conn.to)
                  if (!fromRes || !toRes) return null
                  const fe = fromRes.entity, te = toRes.entity
                  const feDims = fromRes.isLabel ? estimateLabelDims(fe) : null
                  const feW = feDims?.w ?? ((fe.isImage || fe.isIllustration) ? (fe.width || 200) : (fe.isIcon ? 80 : CARD_W))
                  const feH = feDims?.h ?? ((fe.isImage || fe.isIllustration) ? (fe.height || 200) : (fe.isIcon ? 80 : CARD_H_HALF * 2))
                  const teDims = toRes.isLabel ? estimateLabelDims(te) : null
                  const teW = teDims?.w ?? ((te.isImage || te.isIllustration) ? (te.width || 200) : (te.isIcon ? 80 : CARD_W))
                  const teH = teDims?.h ?? ((te.isImage || te.isIllustration) ? (te.height || 200) : (te.isIcon ? 80 : CARD_H_HALF * 2))
                  const fCX = fe.x + feW / 2
                  const fCY = fe.y + feH / 2
                  const tCX = te.x + teW / 2
                  const tCY = te.y + teH / 2
                  const wdx = tCX - fCX, wdy = tCY - fCY
                  const horiz = Math.abs(wdx) > Math.abs(wdy)
                  function exitPoint(entity, isLbl, goingRight, goingDown, isHoriz, isSource, ew, eh) {
                    const w = ew
                    const h = eh
                    const P = isSource ? 0 : (isLbl ? 10 : 10)
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
                  const bt = 0.5
                  const mx = (1-bt)**3*sx1 + 3*(1-bt)**2*bt*cp1x + 3*(1-bt)*bt**2*cp2x + bt**3*sx2
                  const my = (1-bt)**3*sy1 + 3*(1-bt)**2*bt*cp1y + 3*(1-bt)*bt**2*cp2y + bt**3*sy2
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
                })})()}
                {connectLine && (
                  <line x1={connectLine.x1} y1={connectLine.y1} x2={connectLine.x2} y2={connectLine.y2} stroke="#378ADD" strokeWidth={2} strokeDasharray="5,4" />
                )}
                {snapGuides.map((g, i) => {
                  if (g.axis === 'v') {
                    const sx = g.w * scale + offset.x
                    return <line key={i} x1={sx} y1={-9999} x2={sx} y2={9999} stroke="var(--accent)" strokeWidth={1} strokeDasharray="4,3" opacity={0.7} />
                  } else {
                    const sy = g.w * scale + offset.y
                    return <line key={i} x1={-9999} y1={sy} x2={9999} y2={sy} stroke="var(--accent)" strokeWidth={1} strokeDasharray="4,3" opacity={0.7} />
                  }
                })}
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
                    onConnectDot={(e, anchor, dims) => onConnectDotMouseDown(e, label, anchor, dims)}
                    onFontChange={key => {
                      const cId = currentId
                      setDb(prev => {
                        const cv = prev[cId]
                        if (!cv) return prev
                        return { ...prev, [cId]: { ...cv, labels: (cv.labels||[]).map(l => l.id === label.id ? { ...l, fontFamily: key } : l) } }
                      })
                    }}
                    onSizeChange={delta => {
                      const cId = currentId
                      setDb(prev => {
                        const cv = prev[cId]
                        if (!cv) return prev
                        return { ...prev, [cId]: { ...cv, labels: (cv.labels||[]).map(l => l.id === label.id ? { ...l, fontSize: Math.max(10, Math.min(72, (l.fontSize || 16) + delta)) } : l) } }
                      })
                    }}
                    onResizeMouseDown={e => onLabelResizeMouseDown(e, label)}
                    onConvertToPostIt={() => {
                      const cId = currentId
                      const snap = { id: label.id, x: label.x, y: label.y, text: label.text, fontSize: label.fontSize, fontFamily: label.fontFamily }
                      const newCard = { id: label.id, x: label.x, y: label.y, title: label.text || '' }
                      setDb(prev => {
                        const cv = prev[cId]
                        if (!cv) return prev
                        return { ...prev, [cId]: { ...cv, labels: (cv.labels||[]).filter(l => l.id !== label.id), cards: [...cv.cards, newCard] } }
                      })
                      setSelectedLabel(null)
                      pushCommand({
                        undo: () => setDb(prev => { const cv = prev[cId]; if (!cv) return prev; return { ...prev, [cId]: { ...cv, cards: cv.cards.filter(c => c.id !== snap.id), labels: [...(cv.labels||[]), snap] } } }),
                        redo: () => setDb(prev => { const cv = prev[cId]; if (!cv) return prev; return { ...prev, [cId]: { ...cv, labels: (cv.labels||[]).filter(l => l.id !== snap.id), cards: [...cv.cards, newCard] } } }),
                      })
                    }}
                    onConvertToFolder={() => {
                      const cId = currentId
                      const snap = { id: label.id, x: label.x, y: label.y, text: label.text, fontSize: label.fontSize, fontFamily: label.fontFamily }
                      const newCard = { id: label.id, x: label.x, y: label.y, title: label.text || '', isFolder: true }
                      setDb(prev => {
                        const cv = prev[cId]
                        if (!cv) return prev
                        return { ...prev, [cId]: { ...cv, labels: (cv.labels||[]).filter(l => l.id !== label.id), cards: [...cv.cards, newCard] } }
                      })
                      setSelectedLabel(null)
                      pushCommand({
                        undo: () => setDb(prev => { const cv = prev[cId]; if (!cv) return prev; return { ...prev, [cId]: { ...cv, cards: cv.cards.filter(c => c.id !== snap.id), labels: [...(cv.labels||[]), snap] } } }),
                        redo: () => setDb(prev => { const cv = prev[cId]; if (!cv) return prev; return { ...prev, [cId]: { ...cv, labels: (cv.labels||[]).filter(l => l.id !== snap.id), cards: [...cv.cards, newCard] } } }),
                      })
                    }}
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
                  if (card.isIcon) {
                    return (
                      <IconCard
                        key={card.id}
                        card={card}
                        selected={selected === card.id || multiSelected.includes(card.id)}
                        onMouseDown={e => onCardMouseDown(e, card)}
                        onDelete={() => {
                          const cId = currentIdRef.current
                          setDb(prev => {
                            const cv = prev[cId]
                            if (!cv) return prev
                            return { ...prev, [cId]: { ...cv, cards: cv.cards.filter(c => c.id !== card.id), connections: cv.connections.filter(c => c.from !== card.id && c.to !== card.id) } }
                          })
                        }}
                        onConnectDot={(e, anchor) => onConnectDotMouseDown(e, card, anchor)}
                        onColorChange={color => updateCardFn(card.id, { color })}
                      />
                    )
                  }
                  if (card.isIllustration) {
                    return (
                      <IllustrationNode
                        key={card.id}
                        card={card}
                        selected={selected === card.id || multiSelected.includes(card.id)}
                        onMouseDown={e => onCardMouseDown(e, card)}
                        onDelete={() => {
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
                    const labelObj = { id: card.id, x: card.x, y: card.y, text: card.title || '', fontSize: card.fontSize || 16, fontFamily: card.fontFamily || 'sans' }
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
                        onConnectDot={(e, anchor, dims) => onConnectDotMouseDown(e, labelObj, anchor, dims)}
                        onFontChange={key => updateCardFn(card.id, { fontFamily: key })}
                        onSizeChange={delta => updateCardFn(card.id, { fontSize: Math.max(10, Math.min(120, (card.fontSize || 16) + delta)) })}
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
                        if (becomingFolder && countTotalCanvases(boards, db) >= limits.totalCanvases) {
                          showLimitToast('totalCanvases'); return
                        }
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

                {/* Selected post-it hint */}
                {(() => {
                  if (!selected || editingCardId === selected || activeNoteId === selected) return null
                  const card = cards.find(c => c.id === selected)
                  if (!card || card.isFolder || card.isLabel || card.isImage || card.isIcon || card.isIllustration) return null
                  return (
                    <div style={{
                      position: 'absolute',
                      left: card.x + CARD_W / 2,
                      top: card.y + CARD_H_HALF * 2 + 8,
                      transform: 'translateX(-50%)',
                      pointerEvents: 'none',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border)',
                      borderRadius: 20,
                      padding: '3px 10px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      zIndex: 5,
                    }}>
                      {lang === 'it' ? 'Doppio click o INVIO per scrivere una nota' : 'Double click or ENTER to write a note'}
                    </div>
                  )
                })()}
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
                    {multiSelected.length === 1 ? t('selectedOne') : t('selectedMany', { n: multiSelected.length })}
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto', padding: '6px 0' }}>
                    {multiSelected.map(id => {
                      const card = cards.find(c => c.id === id)
                      const group = groups.find(g => g.id === id)
                      const label = labels.find(l => l.id === id)
                      const name = card?.title || group?.title || label?.text || t('untitled')
                      const type = card ? (card.isFolder ? t('typeFolder') : card.isLabel ? t('typeLabel') : t('typePostIt')) : group ? t('typeGroup') : t('typeLabel')
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
                    >{t('delete')}</button>
                  </div>
                </div>
              )}

              {/* Keyboard shortcut legend */}
              {(() => {
                const mod = /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘' : 'Ctrl'
                const kbdStyle = { fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace', boxShadow: '0 1px 0 var(--border)', whiteSpace: 'nowrap' }
                const labelStyle = { fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }
                const sep = <div style={{ width: 1, height: 12, background: 'var(--border)', margin: '0 2px' }} />
                const groups = [
                  [['N', 'Post-it'], ['T', lang === 'it' ? 'Testo' : 'Text'], ['G', lang === 'it' ? 'Gruppo' : 'Group'], ['I', lang === 'it' ? 'Icone' : 'Icons'], ['P', lang === 'it' ? 'Immagine' : 'Image'], ['D', lang === 'it' ? 'Disegni' : 'Draw']],
                  [['S', 'Select'], ['Q', 'Quick'], ['Space+drag', 'Pan']],
                  [['scroll', 'Pan'], [`${mod} scroll`, 'Zoom']],
                  [[`${mod}Z`, lang === 'it' ? 'Annulla' : 'Undo'], [`${mod}K`, lang === 'it' ? 'Cerca' : 'Search'], ['Del', lang === 'it' ? 'Elimina' : 'Delete']],
                ]
                return (
                  <div
                    onMouseDown={e => e.stopPropagation()}
                    onDoubleClick={e => e.stopPropagation()}
                    style={{ position: 'absolute', bottom: 16, right: 60, zIndex: 50, display: 'flex', alignItems: 'flex-end', gap: 6, userSelect: 'none' }}
                  >
                    {showShortcuts && (
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 560, pointerEvents: 'none' }}>
                        {groups.map((group, gi) => (
                          <span key={gi} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {gi > 0 && sep}
                            {group.map(([key, label]) => (
                              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <kbd style={kbdStyle}>{key}</kbd>
                                <span style={labelStyle}>{label}</span>
                              </span>
                            ))}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setShowShortcuts(v => { const next = !v; localStorage.setItem('olaboard_shortcuts', next ? '1' : '0'); return next })}
                      title={showShortcuts ? (lang === 'it' ? 'Nascondi shortcut' : 'Hide shortcuts') : (lang === 'it' ? 'Mostra shortcut' : 'Show shortcuts')}
                      style={{ fontSize: 14, lineHeight: 1, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-panel)', color: showShortcuts ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
                    >⌨</button>
                  </div>
                )
              })()}

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
                  title={t('undoTitle')}
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
                  title={t('redoTitle')}
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

              {/* Empty canvas hint */}
              {cards.length === 0 && groups.length === 0 && labels.length === 0 && (
                <div style={{
                  position: 'absolute', top: 20, left: 20,
                  pointerEvents: 'none', userSelect: 'none', zIndex: 10,
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg-panel)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '9px 14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}>
                  <MousePointerClick size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'system-ui, sans-serif' }}>
                    {activeTool === 'text'
                      ? (lang === 'it' ? 'Doppio click per aggiungere testo' : 'Double click to add text')
                      : activeTool === 'group'
                      ? (lang === 'it' ? 'Trascina per creare un gruppo' : 'Drag to create a group')
                      : activeTool === 'icon'
                      ? (lang === 'it' ? 'Scegli un\'icona dal pannello' : 'Choose an icon from the panel')
                      : t('emptyCanvasHint')}
                  </span>
                </div>
              )}

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
                {[['az', t('sortAZ')], ['za', t('sortZA')], ['date', t('sortDate')]].map(([v, l]) => (
                  <button key={v} onClick={() => setListSort(v)} style={{ ...smallBtn, fontWeight: listSort === v ? 700 : 400, background: listSort === v ? 'var(--accent)' : 'var(--btn-bg)', color: listSort === v ? '#fff' : 'var(--btn-text)', border: '1px solid var(--border)' }}>{l}</button>
                ))}
                <button
                  onClick={() => { setListSelectMode(v => !v); if (listSelectMode) setMultiSelected([]) }}
                  style={{ ...smallBtn, marginLeft: 'auto', background: listSelectMode ? 'var(--accent)' : 'var(--btn-bg)', color: listSelectMode ? '#fff' : 'var(--btn-text)', border: '1px solid var(--border)' }}
                >{t('selectItems')}</button>
              </div>
              {listItems.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('emptyCanvas')}</p>}
              {listItems.map(item => {
                const badgeIcon = item.type === 'folder' ? <Folder size={12} /> : item.type === 'label' ? <span style={{fontSize:11}}>T</span> : <span style={{fontSize:11}}>✎</span>
                const badgeLabel = item.type === 'folder' ? t('typeFolder') : item.type === 'label' ? t('typeLabel') : t('typeNote')
                const dateStr = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
        onClick={() => setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'high-contrast' : 'light')}
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
  const { t, lang } = useLang()
  const isFull = mode === 'full'
  const [titleFocused, setTitleFocused] = useState(false)

  const panelStyle = isFull
    ? { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)', overflow: 'hidden' }
    : { width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)', overflow: 'hidden' }

  return (
    <div style={panelStyle}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>{t('notes')}</span>
        <div style={{ flex: 1 }} />
        <button style={iconBtn} title={isFull ? t('sideView') : t('fullView')} onClick={onToggleMode}>{isFull ? '⤡' : '⤢'}</button>
        <button style={iconBtn} title={t('close')} onClick={onClose}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={isFull ? { maxWidth: 800, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 } : { display: 'flex', flexDirection: 'column', flex: 1 }}>
          <input
            value={noteForm.title}
            onChange={e => onTitleChange(e.target.value)}
            placeholder={t('titlePlaceholder')}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            style={{ width: '100%', border: 'none', outline: 'none', borderBottom: `2px solid ${titleFocused ? 'var(--accent)' : 'var(--border)'}`, padding: '12px 20px', fontSize: 16, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit', background: 'transparent' }}
          />
          {activeCard && (activeCard.createdAt || activeCard.updatedAt) && (
            <div style={{ padding: '6px 20px 10px', display: 'flex', flexDirection: 'column', gap: 4, borderBottom: '1px solid var(--border)' }}>
              {activeCard.createdAt && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1 }}>✦</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('createdAt')} {new Date(activeCard.createdAt).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
              )}
              {activeCard.updatedAt && activeCard.updatedAt !== activeCard.createdAt && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1 }}>✎</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('updatedAt')} {new Date(activeCard.updatedAt).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                </>
              )}
            </div>
          )}
          {activeCard && !activeCard.isFolder && onColorChange && (
            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{t('colorLabel')}</div>
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
