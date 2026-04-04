import { useState, useEffect, useRef } from 'react'
import { uid, anchorPoint } from '../utils'

export function useCanvas({ db, setDb, currentIdRef, updateCardFn, addConnectionFn, setActiveNoteId, view }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [connectLine, setConnectLine] = useState(null)
  const [drawingGroup, setDrawingGroup] = useState(false)
  const [textMode, setTextMode] = useState(false)
  const [groupDrawPreview, setGroupDrawPreview] = useState(null)
  const [selectedLabel, setSelectedLabel] = useState(null)
  const [editingLabelId, setEditingLabelId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [editingCardId, setEditingCardId] = useState(null)

  const offsetRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const boardRef = useRef(null)
  const dragging = useRef(null)
  const connecting = useRef(null)
  const groupDrawing = useRef(null)
  const dbRef = useRef(db)

  useEffect(() => { offsetRef.current = offset }, [offset])
  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { dbRef.current = db }, [db])

  // ── world-to-screen ──────────────────────────────��────────────────────────
  function w2s(wx, wy) {
    return [wx * scale + offset.x, wy * scale + offset.y]
  }

  // ── global mouse events ──────────────────────────��────────────────────────
  useEffect(() => {
    function getBoardRect() { return boardRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 } }

    function onMove(e) {
      // Group draw preview
      if (groupDrawing.current) {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        const { startWX, startWY } = groupDrawing.current
        setGroupDrawPreview({
          x: Math.min(wx, startWX), y: Math.min(wy, startWY),
          w: Math.abs(wx - startWX), h: Math.abs(wy - startWY),
        })
        return
      }

      if (connecting.current) {
        const r = getBoardRect()
        const els = document.elementsFromPoint(e.clientX, e.clientY)
        const cardEl = els.find(el => el.getAttribute?.('data-card-id') && el.getAttribute('data-card-id') !== connecting.current.fromId)
        const prevId = connecting.current.toCardId
        if (prevId && prevId !== cardEl?.getAttribute('data-card-id')) {
          document.querySelectorAll(`[data-card-id="${prevId}"] .connect-dot`).forEach(d => d.classList.remove('anchor-hover'))
        }
        let x2 = e.clientX - r.left, y2 = e.clientY - r.top
        if (cardEl) {
          const rect = cardEl.getBoundingClientRect()
          const anchors = [
            { name: 'top',    x: rect.left + rect.width / 2, y: rect.top },
            { name: 'bottom', x: rect.left + rect.width / 2, y: rect.bottom },
            { name: 'left',   x: rect.left,                   y: rect.top + rect.height / 2 },
            { name: 'right',  x: rect.right,                  y: rect.top + rect.height / 2 },
          ]
          let best = anchors[0], bestDist = Infinity
          anchors.forEach(a => { const d = Math.hypot(a.x - e.clientX, a.y - e.clientY); if (d < bestDist) { bestDist = d; best = a } })
          cardEl.querySelectorAll('.connect-dot').forEach(d => d.classList.remove('anchor-hover'))
          const dotEl = cardEl.querySelector(`.connect-dot-${best.name}`)
          if (dotEl) dotEl.classList.add('anchor-hover')
          x2 = best.x - r.left
          y2 = best.y - r.top
          connecting.current.toCardId = cardEl.getAttribute('data-card-id')
          connecting.current.toAnchor = best.name
        } else {
          connecting.current.toCardId = null
          connecting.current.toAnchor = null
        }
        setConnectLine(l => l ? { ...l, x2, y2 } : null)
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
      } else if (d.type === 'group') {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        const dx = wx - d.startWX, dy = wy - d.startWY
        setDb(prev => {
          const cId = currentIdRef.current
          const canvas = prev[cId]
          if (!canvas) return prev
          const newGroups = (canvas.groups || []).map(g =>
            g.id === d.groupId ? { ...g, x: d.origGX + dx, y: d.origGY + dy } : g
          )
          const newCards = canvas.cards.map(c => {
            const orig = d.cardOrigins.find(oc => oc.id === c.id)
            return orig ? { ...c, x: orig.x + dx, y: orig.y + dy } : c
          })
          return { ...prev, [cId]: { ...canvas, groups: newGroups, cards: newCards } }
        })
      } else if (d.type === 'group-resize') {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        const dx = wx - d.startWX, dy = wy - d.startWY
        const h = d.handle
        let x = d.origGX, y = d.origGY, width = d.origGW, height = d.origGH
        if (h.includes('e')) width  = Math.max(120, d.origGW + dx)
        if (h.includes('s')) height = Math.max(80,  d.origGH + dy)
        if (h.includes('w')) { const nw = Math.max(120, d.origGW - dx); x = d.origGX + (d.origGW - nw); width = nw }
        if (h.includes('n')) { const nh = Math.max(80,  d.origGH - dy); y = d.origGY + (d.origGH - nh); height = nh }
        setDb(prev => {
          const cId = currentIdRef.current
          const canvas = prev[cId]
          if (!canvas) return prev
          return { ...prev, [cId]: { ...canvas, groups: (canvas.groups||[]).map(g => g.id === d.groupId ? { ...g, x, y, width, height } : g) } }
        })
      } else if (d.type === 'label') {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        setDb(prev => {
          const cId = currentIdRef.current
          const canvas = prev[cId]
          if (!canvas) return prev
          return { ...prev, [cId]: { ...canvas, labels: (canvas.labels||[]).map(l =>
            l.id === d.labelId ? { ...l, x: d.origX + (wx - d.startWX), y: d.origY + (wy - d.startWY) } : l
          )}}
        })
      }
    }

    function onUp(e) {
      // Group draw completion
      if (groupDrawing.current) {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        const { startWX, startWY } = groupDrawing.current
        const rx = Math.min(wx, startWX), ry = Math.min(wy, startWY)
        const rw = Math.abs(wx - startWX), rh = Math.abs(wy - startWY)
        if (rw >= 30 && rh >= 30) {
          setDb(prev => {
            const cId = currentIdRef.current
            const canvas = prev[cId]
            if (!canvas) return prev
            const cardIds = canvas.cards
              .filter(c => { const cx = c.x + 65, cy = c.y + 37; return cx >= rx && cx <= rx + rw && cy >= ry && cy <= ry + rh })
              .map(c => c.id)
            const newGroup = { id: uid(), title: 'Gruppo', x: rx, y: ry, width: Math.max(120, rw), height: Math.max(80, rh), cardIds }
            return { ...prev, [cId]: { ...canvas, groups: [...(canvas.groups||[]), newGroup] } }
          })
        }
        groupDrawing.current = null
        setGroupDrawPreview(null)
        setDrawingGroup(false)
        return
      }

      if (connecting.current) {
        document.querySelectorAll('.connect-dot.anchor-hover').forEach(d => d.classList.remove('anchor-hover'))
        const fromId = connecting.current.fromId
        const fromAnchor = connecting.current.fromAnchor || 'right'
        const toId = connecting.current.toCardId
        const toAnchor = connecting.current.toAnchor || 'left'
        if (toId) {
          setDb(prev => {
            const cId = currentIdRef.current
            const canvas = prev[cId]
            if (!canvas) return prev
            return { ...prev, [cId]: { ...canvas, connections: [...canvas.connections, { id: uid(), from: fromId, to: toId, fromAnchor, toAnchor, label: '' }] } }
          })
        }
        connecting.current = null
        setConnectLine(null)
        return
      }

      // Card drop: recalculate group membership
      if (dragging.current?.type === 'card') {
        const cardId = dragging.current.cardId
        setDb(prev => {
          const cId = currentIdRef.current
          const canvas = prev[cId]
          if (!canvas) return prev
          const card = canvas.cards.find(c => c.id === cardId)
          if (!card) return prev
          const cx = card.x + 65, cy = card.y + 37
          const newGroups = (canvas.groups || []).map(g => {
            const inside = cx >= g.x && cx <= g.x + g.width && cy >= g.y && cy <= g.y + g.height
            const filtered = g.cardIds.filter(id => id !== cardId)
            return { ...g, cardIds: inside ? [...filtered, cardId] : filtered }
          })
          return { ...prev, [cId]: { ...canvas, groups: newGroups } }
        })
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
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selected) {
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
                groups: (canvas.groups||[]).map(g => ({ ...g, cardIds: g.cardIds.filter(id => id !== selected) })),
              }
            }
          })
          setSelected(null)
          setActiveNoteId(id => id === selected ? null : id)
        } else if (selectedLabel) {
          setDb(prev => {
            const cId = currentIdRef.current
            const canvas = prev[cId]
            if (!canvas) return prev
            return { ...prev, [cId]: { ...canvas, labels: (canvas.labels||[]).filter(l => l.id !== selectedLabel) } }
          })
          setSelectedLabel(null)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, selectedLabel])

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
  }, [view])

  // ── board event handlers ──────────────────────────────���───────────────────
  function onBoardMouseDown(e) {
    if (e.target.closest('.postit')) return

    if (drawingGroup) {
      const r = boardRef.current.getBoundingClientRect()
      const o = offsetRef.current, s = scaleRef.current
      const wx = (e.clientX - r.left - o.x) / s
      const wy = (e.clientY - r.top  - o.y) / s
      groupDrawing.current = { startWX: wx, startWY: wy }
      return
    }

    if (textMode) {
      const r = boardRef.current.getBoundingClientRect()
      const o = offsetRef.current, s = scaleRef.current
      const wx = (e.clientX - r.left - o.x) / s
      const wy = (e.clientY - r.top  - o.y) / s
      const labelId = createLabel(wx, wy)
      setTextMode(false)
      setSelectedLabel(labelId)
      setEditingLabelId(labelId)
      return
    }

    setSelected(null); setSelectedLabel(null)
    dragging.current = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y }
  }

  function onBoardDblClick(e) {
    if (drawingGroup || textMode) return
    if (e.target.closest('.postit')) return
    const r = boardRef.current.getBoundingClientRect()
    const wx = (e.clientX - r.left - offset.x) / scale
    const wy = (e.clientY - r.top  - offset.y) / scale
    const id = createCard(wx, wy)
    setSelected(id); setEditingCardId(id)
  }

  function onCardMouseDown(e, card) {
    e.stopPropagation()
    setSelected(card.id); setSelectedLabel(null)
    const r = boardRef.current.getBoundingClientRect()
    const o = offsetRef.current, s = scaleRef.current
    const wx = (e.clientX - r.left - o.x) / s
    const wy = (e.clientY - r.top  - o.y) / s
    dragging.current = { type: 'card', cardId: card.id, startWX: wx, startWY: wy, origX: card.x, origY: card.y }
  }

  function onConnectDotMouseDown(e, card, anchor) {
    e.stopPropagation(); e.preventDefault()
    const [wx, wy] = anchorPoint(card, anchor)
    const [sx, sy] = w2s(wx, wy)
    connecting.current = { fromId: card.id, fromAnchor: anchor }
    setConnectLine({ x1: sx, y1: sy, x2: sx, y2: sy })
  }

  // ── group event handlers ──────────────────────────────────────────────────
  function onGroupTitleBarMouseDown(e, group) {
    e.stopPropagation()
    setSelected(null); setSelectedLabel(null)
    const r = boardRef.current.getBoundingClientRect()
    const o = offsetRef.current, s = scaleRef.current
    const wx = (e.clientX - r.left - o.x) / s
    const wy = (e.clientY - r.top  - o.y) / s
    const cards = dbRef.current[currentIdRef.current]?.cards || []
    const cardOrigins = (group.cardIds || []).map(cid => {
      const card = cards.find(c => c.id === cid)
      return card ? { id: cid, x: card.x, y: card.y } : null
    }).filter(Boolean)
    dragging.current = { type: 'group', groupId: group.id, startWX: wx, startWY: wy, origGX: group.x, origGY: group.y, cardOrigins }
  }

  function onGroupResizeHandleMouseDown(e, group, handle) {
    e.stopPropagation()
    const r = boardRef.current.getBoundingClientRect()
    const o = offsetRef.current, s = scaleRef.current
    const wx = (e.clientX - r.left - o.x) / s
    const wy = (e.clientY - r.top  - o.y) / s
    dragging.current = { type: 'group-resize', groupId: group.id, handle, startWX: wx, startWY: wy, origGX: group.x, origGY: group.y, origGW: group.width, origGH: group.height }
  }

  // ── label event handlers ────────────────────────────────────��─────────────
  function onLabelMouseDown(e, label) {
    e.stopPropagation()
    setSelectedLabel(label.id); setSelected(null)
    const r = boardRef.current.getBoundingClientRect()
    const o = offsetRef.current, s = scaleRef.current
    const wx = (e.clientX - r.left - o.x) / s
    const wy = (e.clientY - r.top  - o.y) / s
    dragging.current = { type: 'label', labelId: label.id, startWX: wx, startWY: wy, origX: label.x, origY: label.y }
  }

  // ── zoom buttons ────────────────────────────────���─────────────────────────
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

  // ── label creation & update ───────────────────────────────────────────────
  function createLabel(wx, wy) {
    const label = { id: uid(), x: wx, y: wy, text: '', fontSize: 16 }
    setDb(prev => {
      const cId = currentIdRef.current
      const canvas = prev[cId]
      if (!canvas) return prev
      return { ...prev, [cId]: { ...canvas, labels: [...(canvas.labels||[]), label] } }
    })
    return label.id
  }

  function updateLabel(id, changes) {
    setDb(prev => {
      const cId = currentIdRef.current
      const canvas = prev[cId]
      if (!canvas) return prev
      return { ...prev, [cId]: { ...canvas, labels: (canvas.labels||[]).map(l => l.id === id ? { ...l, ...changes } : l) } }
    })
  }

  const boardCursor = drawingGroup || textMode ? 'crosshair' : 'grab'

  return {
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
    createLabel, updateLabel,
  }
}
