import { useState, useEffect, useRef } from 'react'
import { uid, anchorPoint } from '../utils'
import { useLang } from '../contexts/LangContext'

export function useCanvas({ db, setDb, currentIdRef, updateCardFn, addConnectionFn, setActiveNoteId, view, activeTool, setActiveTool, selectMode, setMultiSelected, setSelectionRect, onGroupCreated, pushCommand, maxCardsPerCanvas = Infinity, onLimitReached }) {
  const { t } = useLang()
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [connectLine, setConnectLine] = useState(null)
  const [groupDrawPreview, setGroupDrawPreview] = useState(null)
  const [selectedLabel, setSelectedLabel] = useState(null)
  const [editingLabelId, setEditingLabelId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [editingCardId, setEditingCardId] = useState(null)
  const [snapGuides, setSnapGuides] = useState([])
  const [isPanning, setIsPanning] = useState(false)

  const offsetRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const boardRef = useRef(null)
  const dragging = useRef(null)
  const connecting = useRef(null)
  const groupDrawing = useRef(null)
  const textDrawing = useRef(null)
  const [textDrawPreview, setTextDrawPreview] = useState(null)
  const dbRef = useRef(db)
  const activeAutoCreateRef = useRef(false)
  const activeToolRef = useRef('note')
  const multiSelectedRef = useRef([])
  const pushCommandRef = useRef(pushCommand)

  useEffect(() => { offsetRef.current = offset }, [offset])
  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { dbRef.current = db }, [db])
  useEffect(() => { pushCommandRef.current = pushCommand }, [pushCommand])

  // ── world-to-screen ───────────────────────────────────────────────────────
  function w2s(wx, wy) {
    return [wx * scale + offset.x, wy * scale + offset.y]
  }

  // ── global mouse events ───────────────────────────────────────────────────
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

      if (textDrawing.current) {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        const { startWX, startWY } = textDrawing.current
        setTextDrawPreview({
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
        let nx = d.origX + (wx - d.startWX)
        let ny = d.origY + (wy - d.startWY)

        // ── snap-to-alignment guides ────────────────────────────────────────
        const SNAP_PX = 8
        const threshold = SNAP_PX / s
        const canvas = dbRef.current[currentIdRef.current]
        const others = (canvas?.cards || []).filter(c => c.id !== d.cardId && !c.isLabel)
        const guides = []
        let bestSnapX = null, bestSnapXDist = threshold
        let bestSnapY = null, bestSnapYDist = threshold
        for (const c of others) {
          const dragRefs = [nx, nx + 65, nx + 130]
          const otherRefs = [c.x, c.x + 65, c.x + 130]
          for (const dr of dragRefs) {
            for (const or of otherRefs) {
              const dist = Math.abs(dr - or)
              if (dist < bestSnapXDist) {
                bestSnapXDist = dist
                bestSnapX = { snapNX: nx + (or - dr), worldX: or }
              }
            }
          }
          const dragRefsY = [ny, ny + 37, ny + 74]
          const otherRefsY = [c.y, c.y + 37, c.y + 74]
          for (const dr of dragRefsY) {
            for (const or of otherRefsY) {
              const dist = Math.abs(dr - or)
              if (dist < bestSnapYDist) {
                bestSnapYDist = dist
                bestSnapY = { snapNY: ny + (or - dr), worldY: or }
              }
            }
          }
        }
        if (bestSnapX) { nx = bestSnapX.snapNX; guides.push({ axis: 'v', w: bestSnapX.worldX }) }
        if (bestSnapY) { ny = bestSnapY.snapNY; guides.push({ axis: 'h', w: bestSnapY.worldY }) }
        setSnapGuides(guides)
        // ───────────────────────────────────────────────────────────────────

        d.finalX = nx; d.finalY = ny
        updateCardFn(d.cardId, { x: nx, y: ny })
      } else if (d.type === 'multi') {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        const dx = wx - d.startWX, dy = wy - d.startWY
        d.finalDX = dx; d.finalDY = dy
        setDb(prev => {
          const cId = currentIdRef.current
          const canvas = prev[cId]
          if (!canvas) return prev
          const updatedCards = canvas.cards.map(c => {
            const origin = d.cardOrigins.find(o => o.id === c.id)
            if (!origin) return c
            return { ...c, x: origin.x + dx, y: origin.y + dy }
          })
          return { ...prev, [cId]: { ...canvas, cards: updatedCards } }
        })
      } else if (d.type === 'group') {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        const dx = wx - d.startWX, dy = wy - d.startWY
        d.finalDX = dx; d.finalDY = dy
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
        d.finalX = x; d.finalY = y; d.finalW = width; d.finalH = height
        setDb(prev => {
          const cId = currentIdRef.current
          const canvas = prev[cId]
          if (!canvas) return prev
          return { ...prev, [cId]: { ...canvas, groups: (canvas.groups||[]).map(g => g.id === d.groupId ? { ...g, x, y, width, height } : g) } }
        })
      } else if (d.type === 'image-resize') {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        const dx = wx - d.startWX
        const dy = wy - d.startWY
        // lock aspect ratio: pick whichever drag axis implies a larger resize
        const aspect = d.origW / d.origH
        const scaleFromW = (d.origW + dx) / d.origW
        const scaleFromH = (d.origH + dy) / d.origH
        const sc = Math.max(scaleFromW, scaleFromH, 40 / d.origW)
        const newW = Math.round(d.origW * sc)
        const newH = Math.round(newW / aspect)
        d.finalW = newW; d.finalH = newH
        updateCardFn(d.cardId, { width: newW, height: newH })
      } else if (d.type === 'select') {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        setSelectionRect({
          x: Math.min(wx, d.startWX), y: Math.min(wy, d.startWY),
          w: Math.abs(wx - d.startWX), h: Math.abs(wy - d.startWY),
        })
      } else if (d.type === 'label-resize') {
        const delta = (e.clientX - d.startClientX + e.clientY - d.startClientY) * 0.3
        const newSize = Math.max(8, Math.min(120, Math.round(d.origFontSize + delta)))
        d.finalFontSize = newSize
        setDb(prev => {
          const cId = currentIdRef.current
          const canvas = prev[cId]
          if (!canvas) return prev
          return { ...prev, [cId]: { ...canvas, labels: (canvas.labels||[]).map(l =>
            l.id === d.labelId ? { ...l, fontSize: newSize } : l
          )}}
        })
      } else if (d.type === 'label') {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        const nx = d.origX + (wx - d.startWX)
        const ny = d.origY + (wy - d.startWY)
        d.finalX = nx; d.finalY = ny
        setDb(prev => {
          const cId = currentIdRef.current
          const canvas = prev[cId]
          if (!canvas) return prev
          if (d.isCardLabel) {
            return { ...prev, [cId]: { ...canvas, cards: canvas.cards.map(c =>
              c.id === d.labelId ? { ...c, x: nx, y: ny } : c
            )}}
          }
          return { ...prev, [cId]: { ...canvas, labels: (canvas.labels||[]).map(l =>
            l.id === d.labelId ? { ...l, x: nx, y: ny } : l
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
          const cId = currentIdRef.current
          setDb(prev => {
            const canvas = prev[cId]
            if (!canvas) return prev
            const cardIds = canvas.cards
              .filter(c => { const cx = c.x + 65, cy = c.y + 37; return cx >= rx && cx <= rx + rw && cy >= ry && cy <= ry + rh })
              .map(c => c.id)
            const newGroup = { id: uid(), title: t('defaultGroupTitle'), x: rx, y: ry, width: Math.max(120, rw), height: Math.max(80, rh), cardIds }
            if (onGroupCreated) setTimeout(() => onGroupCreated(newGroup.id), 0)
            pushCommandRef.current({
              undo: () => setDb(prev => {
                const cv = prev[cId]
                if (!cv) return prev
                return { ...prev, [cId]: { ...cv, groups: (cv.groups || []).filter(g => g.id !== newGroup.id) } }
              }),
              redo: () => setDb(prev => {
                const cv = prev[cId]
                if (!cv) return prev
                return { ...prev, [cId]: { ...cv, groups: [...(cv.groups || []), newGroup] } }
              }),
            })
            return { ...prev, [cId]: { ...canvas, groups: [...(canvas.groups||[]), newGroup] } }
          })
        }
        groupDrawing.current = null
        setGroupDrawPreview(null)
        setActiveTool('note')
        return
      }

      if (textDrawing.current) {
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        const { startWX, startWY } = textDrawing.current
        const rx = Math.min(wx, startWX), ry = Math.min(wy, startWY)
        const rw = Math.abs(wx - startWX)
        textDrawing.current = null
        setTextDrawPreview(null)
        const labelId = createLabel(rx, ry, rw >= 40 ? Math.max(120, rw) : undefined)
        setSelectedLabel(labelId)
        setEditingLabelId(labelId)
        setActiveTool('note')
        return
      }

      if (connecting.current) {
        document.querySelectorAll('.connect-dot.anchor-hover').forEach(d => d.classList.remove('anchor-hover'))
        const fromId = connecting.current.fromId
        const fromAnchor = connecting.current.fromAnchor || 'right'
        const toId = connecting.current.toCardId
        const toAnchor = connecting.current.toAnchor || 'left'
        if (toId) {
          const newConn = { id: uid(), from: fromId, to: toId, fromAnchor, toAnchor, label: '' }
          const cId = currentIdRef.current
          setDb(prev => {
            const canvas = prev[cId]
            if (!canvas) return prev
            return { ...prev, [cId]: { ...canvas, connections: [...canvas.connections, newConn] } }
          })
          pushCommandRef.current({
            undo: () => setDb(prev => {
              const cv = prev[cId]
              if (!cv) return prev
              return { ...prev, [cId]: { ...cv, connections: cv.connections.filter(c => c.id !== newConn.id) } }
            }),
            redo: () => setDb(prev => {
              const cv = prev[cId]
              if (!cv) return prev
              return { ...prev, [cId]: { ...cv, connections: [...cv.connections, newConn] } }
            }),
          })
        } else if (activeAutoCreateRef.current) {
          const r = getBoardRect()
          const o = offsetRef.current, s = scaleRef.current
          const wx = (e.clientX - r.left - o.x) / s
          const wy = (e.clientY - r.top  - o.y) / s
          const isText = activeToolRef.current === 'text'
          const newId = uid()
          const newCard = isText
            ? { id: newId, isLabel: true, title: 'Testo libero', x: wx - 56, y: wy - 20 }
            : { id: newId, isLabel: false, title: nextCardTitle(), x: wx - 65, y: wy - 37 }
          const newConn = { id: uid(), from: fromId, to: newId, fromAnchor, toAnchor, label: '' }
          const cId = currentIdRef.current
          setDb(prev => {
            const canvas = prev[cId]
            if (!canvas) return prev
            return {
              ...prev,
              [cId]: {
                ...canvas,
                cards: [...canvas.cards, newCard],
                connections: [...canvas.connections, newConn],
              },
            }
          })
          pushCommandRef.current({
            undo: () => setDb(prev => {
              const cv = prev[cId]
              if (!cv) return prev
              return { ...prev, [cId]: { ...cv, cards: cv.cards.filter(c => c.id !== newId), connections: cv.connections.filter(c => c.id !== newConn.id) } }
            }),
            redo: () => setDb(prev => {
              const cv = prev[cId]
              if (!cv) return prev
              return { ...prev, [cId]: { ...cv, cards: [...cv.cards, newCard], connections: [...cv.connections, newConn] } }
            }),
          })
        }
        connecting.current = null
        setConnectLine(null)
        return
      }

      // Select lasso completion
      if (dragging.current?.type === 'select') {
        const { startWX, startWY } = dragging.current
        const r = getBoardRect()
        const o = offsetRef.current, s = scaleRef.current
        const wx = (e.clientX - r.left - o.x) / s
        const wy = (e.clientY - r.top  - o.y) / s
        const rx = Math.min(wx, startWX), ry = Math.min(wy, startWY)
        const rw = Math.abs(wx - startWX), rh = Math.abs(wy - startWY)
        const canvas = dbRef.current[currentIdRef.current]
        if (canvas) {
          const ids = []
          for (const c of canvas.cards) {
            const cx = c.x + (c.isLabel ? 56 : 65), cy = c.y + (c.isLabel ? 20 : 37)
            if (cx >= rx && cx <= rx + rw && cy >= ry && cy <= ry + rh) ids.push(c.id)
          }
          for (const g of (canvas.groups || [])) {
            if (g.x < rx + rw && g.x + g.width > rx && g.y < ry + rh && g.y + g.height > ry) ids.push(g.id)
          }
          for (const l of (canvas.labels || [])) {
            if (l.x >= rx && l.x <= rx + rw && l.y >= ry && l.y <= ry + rh) ids.push(l.id)
          }
          setMultiSelected(ids)
        }
        setSelectionRect(null)
        dragging.current = null
        return
      }

      // Image resize completion: push history
      if (dragging.current?.type === 'image-resize' && dragging.current.finalW !== undefined) {
        const d = dragging.current
        if ((d.finalW !== d.origW || d.finalH !== d.origH) && d.canvasSnapshot) {
          const cId = d.canvasId
          const bc = d.canvasSnapshot
          const cardId = d.cardId
          const afterCards = (bc.cards || []).map(c =>
            c.id === cardId ? { ...c, width: Math.round(d.finalW), height: Math.round(d.finalH) } : c
          )
          const afterCanvas = { ...bc, cards: afterCards }
          pushCommandRef.current({
            undo: () => setDb(prev => ({ ...prev, [cId]: bc })),
            redo: () => setDb(prev => ({ ...prev, [cId]: afterCanvas })),
          })
        }
      }

      // Multi drag completion: push history
      if (dragging.current?.type === 'multi' && dragging.current.finalDX !== undefined) {
        const d = dragging.current
        const dx = d.finalDX, dy = d.finalDY
        if ((dx !== 0 || dy !== 0) && d.canvasSnapshot) {
          const cId = d.canvasId
          const bc = d.canvasSnapshot
          const movedCards = (bc.cards || []).map(c => {
            const origin = d.cardOrigins.find(o => o.id === c.id)
            return origin ? { ...c, x: origin.x + dx, y: origin.y + dy } : c
          })
          const afterCanvas = { ...bc, cards: movedCards }
          pushCommandRef.current({
            undo: () => setDb(prev => ({ ...prev, [cId]: bc })),
            redo: () => setDb(prev => ({ ...prev, [cId]: afterCanvas })),
          })
        }
      }

      // Label drag completion: push history
      if (dragging.current?.type === 'label' && dragging.current.finalX !== undefined) {
        const d = dragging.current
        if ((d.finalX !== d.origX || d.finalY !== d.origY) && d.canvasSnapshot) {
          const cId = d.canvasId
          const bc = d.canvasSnapshot
          const labelId = d.labelId
          let afterCanvas
          if (d.isCardLabel) {
            afterCanvas = { ...bc, cards: bc.cards.map(c => c.id === labelId ? { ...c, x: d.finalX, y: d.finalY } : c) }
          } else {
            afterCanvas = { ...bc, labels: (bc.labels || []).map(l => l.id === labelId ? { ...l, x: d.finalX, y: d.finalY } : l) }
          }
          pushCommandRef.current({
            undo: () => setDb(prev => ({ ...prev, [cId]: bc })),
            redo: () => setDb(prev => ({ ...prev, [cId]: afterCanvas })),
          })
        }
      }

      // Group-resize completion: push history
      if (dragging.current?.type === 'group-resize' && dragging.current.finalX !== undefined) {
        const d = dragging.current
        if ((d.finalX !== d.origGX || d.finalY !== d.origGY || d.finalW !== d.origGW || d.finalH !== d.origGH) && d.canvasSnapshot) {
          const cId = d.canvasId
          const bc = d.canvasSnapshot
          const groupId = d.groupId
          const afterGroups = (bc.groups || []).map(g =>
            g.id === groupId ? { ...g, x: d.finalX, y: d.finalY, width: d.finalW, height: d.finalH } : g
          )
          const afterCanvas = { ...bc, groups: afterGroups }
          pushCommandRef.current({
            undo: () => setDb(prev => ({ ...prev, [cId]: bc })),
            redo: () => setDb(prev => ({ ...prev, [cId]: afterCanvas })),
          })
        }
      }

      // Group drop: sync cardIds based on final positions
      if (dragging.current?.type === 'group') {
        const d = dragging.current
        const groupId = d.groupId
        setDb(prev => {
          const cId = currentIdRef.current
          const canvas = prev[cId]
          if (!canvas) return prev
          const grp = (canvas.groups || []).find(g => g.id === groupId)
          if (!grp) return prev
          const newCardIds = canvas.cards
            .filter(c => {
              const cx = c.x + 65, cy = c.y + 37
              return cx >= grp.x && cx <= grp.x + grp.width &&
                     cy >= grp.y && cy <= grp.y + grp.height
            })
            .map(c => c.id)
          const newGroups = (canvas.groups || []).map(g => g.id === groupId ? { ...g, cardIds: newCardIds } : g)
          return { ...prev, [cId]: { ...canvas, groups: newGroups } }
        })
        // Push history for group move
        if (d.finalDX !== undefined && (d.finalDX !== 0 || d.finalDY !== 0) && d.canvasSnapshot) {
          const cId = d.canvasId
          const bc = d.canvasSnapshot
          const dx = d.finalDX, dy = d.finalDY
          const movedCards = (bc.cards || []).map(c => {
            const origin = d.cardOrigins.find(o => o.id === c.id)
            return origin ? { ...c, x: origin.x + dx, y: origin.y + dy } : c
          })
          const movedGroup = { ...(bc.groups || []).find(g => g.id === groupId), x: d.origGX + dx, y: d.origGY + dy }
          const afterGroups = (bc.groups || []).map(g => {
            if (g.id !== groupId) return g
            const newCardIds = movedCards
              .filter(c => {
                const cx = c.x + 65, cy = c.y + 37
                return cx >= movedGroup.x && cx <= movedGroup.x + movedGroup.width &&
                       cy >= movedGroup.y && cy <= movedGroup.y + movedGroup.height
              })
              .map(c => c.id)
            return { ...movedGroup, cardIds: newCardIds }
          })
          const afterCanvas = { ...bc, cards: movedCards, groups: afterGroups }
          pushCommandRef.current({
            undo: () => setDb(prev => ({ ...prev, [cId]: bc })),
            redo: () => setDb(prev => ({ ...prev, [cId]: afterCanvas })),
          })
        }
      }

      // Card drop: recalculate group membership + push history
      if (dragging.current?.type === 'card') {
        const d = dragging.current
        const cardId = d.cardId
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
        // Push history for card move
        if (d.finalX !== undefined && (d.finalX !== d.origX || d.finalY !== d.origY) && d.canvasSnapshot) {
          const cId = d.canvasId
          const bc = d.canvasSnapshot
          const afterX = d.finalX, afterY = d.finalY
          const cx = afterX + 65, cy = afterY + 37
          const afterCards = (bc.cards || []).map(c => c.id === cardId ? { ...c, x: afterX, y: afterY } : c)
          const afterGroups = (bc.groups || []).map(g => {
            const inside = cx >= g.x && cx <= g.x + g.width && cy >= g.y && cy <= g.y + g.height
            const filtered = g.cardIds.filter(id => id !== cardId)
            return { ...g, cardIds: inside ? [...filtered, cardId] : filtered }
          })
          const afterCanvas = { ...bc, cards: afterCards, groups: afterGroups }
          pushCommandRef.current({
            undo: () => setDb(prev => ({ ...prev, [cId]: bc })),
            redo: () => setDb(prev => ({ ...prev, [cId]: afterCanvas })),
          })
        }
      }

      if (dragging.current?.type === 'pan') setIsPanning(false)
      setSnapGuides([])
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
          const cId = currentIdRef.current
          const canvas = dbRef.current[cId]
          const deletedCard = canvas?.cards.find(c => c.id === selected)
          const deletedConns = canvas?.connections.filter(c => c.from === selected || c.to === selected) || []
          const groupsWithoutCard = (canvas?.groups || []).map(g => ({ ...g, cardIds: g.cardIds.filter(id => id !== selected) }))
          setDb(prev => {
            const cv = prev[cId]
            if (!cv) return prev
            return {
              ...prev,
              [cId]: {
                ...cv,
                cards: cv.cards.filter(c => c.id !== selected),
                connections: cv.connections.filter(c => c.from !== selected && c.to !== selected),
                groups: (cv.groups||[]).map(g => ({ ...g, cardIds: g.cardIds.filter(id => id !== selected) })),
              }
            }
          })
          setSelected(null)
          setActiveNoteId(id => id === selected ? null : id)
          if (deletedCard) {
            pushCommandRef.current({
              undo: () => setDb(prev => {
                const cv = prev[cId]
                if (!cv) return prev
                return { ...prev, [cId]: { ...cv, cards: [...cv.cards, deletedCard], connections: [...cv.connections, ...deletedConns], groups: groupsWithoutCard.map((g, i) => ({ ...g, cardIds: [...g.cardIds, ...(canvas?.groups?.[i]?.cardIds?.includes(selected) ? [selected] : [])] })) } }
              }),
              redo: () => setDb(prev => {
                const cv = prev[cId]
                if (!cv) return prev
                return { ...prev, [cId]: { ...cv, cards: cv.cards.filter(c => c.id !== selected), connections: cv.connections.filter(c => c.from !== selected && c.to !== selected), groups: (cv.groups||[]).map(g => ({ ...g, cardIds: g.cardIds.filter(id => id !== selected) })) } }
              }),
            })
          }
        } else if (selectedLabel) {
          const cId = currentIdRef.current
          const canvas = dbRef.current[cId]
          const deletedLabel = canvas?.labels?.find(l => l.id === selectedLabel)
          const deletedCardLabel = canvas?.cards.find(c => c.id === selectedLabel)
          const deletedConns = canvas?.connections.filter(c => c.from === selectedLabel || c.to === selectedLabel) || []
          setDb(prev => {
            const cv = prev[cId]
            if (!cv) return prev
            return {
              ...prev,
              [cId]: {
                ...cv,
                labels: (cv.labels||[]).filter(l => l.id !== selectedLabel),
                cards: cv.cards.filter(c => c.id !== selectedLabel),
                connections: cv.connections.filter(c => c.from !== selectedLabel && c.to !== selectedLabel),
              }
            }
          })
          setSelectedLabel(null)
          if (deletedLabel || deletedCardLabel) {
            pushCommandRef.current({
              undo: () => setDb(prev => {
                const cv = prev[cId]
                if (!cv) return prev
                if (deletedLabel) {
                  return { ...prev, [cId]: { ...cv, labels: [...(cv.labels || []), deletedLabel], connections: [...cv.connections, ...deletedConns] } }
                }
                return { ...prev, [cId]: { ...cv, cards: [...cv.cards, deletedCardLabel], connections: [...cv.connections, ...deletedConns] } }
              }),
              redo: () => setDb(prev => {
                const cv = prev[cId]
                if (!cv) return prev
                return { ...prev, [cId]: { ...cv, labels: (cv.labels||[]).filter(l => l.id !== selectedLabel), cards: cv.cards.filter(c => c.id !== selectedLabel), connections: cv.connections.filter(c => c.from !== selectedLabel && c.to !== selectedLabel) } }
              }),
            })
          }
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
      const cx = e.clientX - r.left
      const cy = e.clientY - r.top
      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const s = scaleRef.current
      const o = offsetRef.current
      const next = Math.max(0.15, Math.min(4, s * factor))
      const newOffset = {
        x: cx - (cx - o.x) * (next / s),
        y: cy - (cy - o.y) * (next / s),
      }
      scaleRef.current = next
      offsetRef.current = newOffset
      setScale(next)
      setOffset(newOffset)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [view])

  // ── board event handlers ──────────────────────────────────────────────────
  function onBoardMouseDown(e) {
    if (e.target.closest('.postit')) return
    if (e.target.closest('.canvas-label')) return

    if (activeTool === 'text') {
      const r = boardRef.current.getBoundingClientRect()
      const o = offsetRef.current, s = scaleRef.current
      const wx = (e.clientX - r.left - o.x) / s
      const wy = (e.clientY - r.top  - o.y) / s
      textDrawing.current = { startWX: wx, startWY: wy }
      return
    }

    if (activeTool === 'group') {
      const r = boardRef.current.getBoundingClientRect()
      const o = offsetRef.current, s = scaleRef.current
      const wx = (e.clientX - r.left - o.x) / s
      const wy = (e.clientY - r.top  - o.y) / s
      groupDrawing.current = { startWX: wx, startWY: wy }
      return
    }

    // Middle mouse button → pan
    if (e.button === 1) {
      e.preventDefault()
      setIsPanning(true)
      dragging.current = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y }
      return
    }

    // Left click on empty canvas → lasso select (also deselects any existing selection)
    const r = boardRef.current.getBoundingClientRect()
    const o = offsetRef.current, s = scaleRef.current
    const wx = (e.clientX - r.left - o.x) / s
    const wy = (e.clientY - r.top  - o.y) / s
    setSelected(null); setSelectedLabel(null)
    setMultiSelected([])
    dragging.current = { type: 'select', startWX: wx, startWY: wy }
  }

  function onBoardDblClick(e) {
    if (activeTool === 'group') return
    if (e.target.closest('.postit')) return
    const r = boardRef.current.getBoundingClientRect()
    const wx = (e.clientX - r.left - offset.x) / scale
    const wy = (e.clientY - r.top  - offset.y) / scale
    const id = createCard(wx, wy)
    setSelected(id); setEditingCardId(id)
  }

  function onCardMouseDown(e, card) {
    e.stopPropagation()
    const r = boardRef.current.getBoundingClientRect()
    const o = offsetRef.current, s = scaleRef.current
    const wx = (e.clientX - r.left - o.x) / s
    const wy = (e.clientY - r.top  - o.y) / s
    const ms = multiSelectedRef.current
    const cId = currentIdRef.current
    if (ms.length > 0 && ms.includes(card.id)) {
      const allCards = dbRef.current[cId]?.cards || []
      const cardOrigins = ms
        .map(id => allCards.find(c => c.id === id))
        .filter(Boolean)
        .map(c => ({ id: c.id, x: c.x, y: c.y }))
      dragging.current = { type: 'multi', startWX: wx, startWY: wy, cardOrigins, canvasId: cId, canvasSnapshot: dbRef.current[cId] }
    } else {
      setSelected(card.id); setSelectedLabel(null)
      dragging.current = { type: 'card', cardId: card.id, startWX: wx, startWY: wy, origX: card.x, origY: card.y, canvasId: cId, canvasSnapshot: dbRef.current[cId] }
    }
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
    const cId = currentIdRef.current
    const cards = dbRef.current[cId]?.cards || []
    const cardOrigins = cards
      .filter(card => {
        const cx = card.x + 65, cy = card.y + 37
        return cx >= group.x && cx <= group.x + group.width &&
               cy >= group.y && cy <= group.y + group.height
      })
      .map(card => ({ id: card.id, x: card.x, y: card.y }))
    dragging.current = { type: 'group', groupId: group.id, startWX: wx, startWY: wy, origGX: group.x, origGY: group.y, cardOrigins, canvasId: cId, canvasSnapshot: dbRef.current[cId] }
  }

  function onGroupResizeHandleMouseDown(e, group, handle) {
    e.stopPropagation()
    const r = boardRef.current.getBoundingClientRect()
    const o = offsetRef.current, s = scaleRef.current
    const wx = (e.clientX - r.left - o.x) / s
    const wy = (e.clientY - r.top  - o.y) / s
    const cId = currentIdRef.current
    dragging.current = { type: 'group-resize', groupId: group.id, handle, startWX: wx, startWY: wy, origGX: group.x, origGY: group.y, origGW: group.width, origGH: group.height, canvasId: cId, canvasSnapshot: dbRef.current[cId] }
  }

  // ── image resize handler ──────────────────────────────────────────────────
  function onImageResizeMouseDown(e, card) {
    e.stopPropagation()
    const r = boardRef.current.getBoundingClientRect()
    const o = offsetRef.current, s = scaleRef.current
    const wx = (e.clientX - r.left - o.x) / s
    const wy = (e.clientY - r.top  - o.y) / s
    const cId = currentIdRef.current
    dragging.current = { type: 'image-resize', cardId: card.id, startWX: wx, startWY: wy, origW: card.width || 200, origH: card.height || 200, canvasId: cId, canvasSnapshot: dbRef.current[cId] }
  }

  // ── label event handlers ──────────────────────────────────────────────────
  function onLabelMouseDown(e, label, isCardLabel) {
    e.stopPropagation()
    setSelectedLabel(label.id); setSelected(null)
    const r = boardRef.current.getBoundingClientRect()
    const o = offsetRef.current, s = scaleRef.current
    const wx = (e.clientX - r.left - o.x) / s
    const wy = (e.clientY - r.top  - o.y) / s
    const cId = currentIdRef.current
    dragging.current = { type: 'label', labelId: label.id, startWX: wx, startWY: wy, origX: label.x, origY: label.y, isCardLabel: !!isCardLabel, canvasId: cId, canvasSnapshot: dbRef.current[cId] }
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

  // ── card creation ─────────────────────────────────────────────────────────
  function nextCardTitle() {
    const n = (parseInt(localStorage.getItem('olaboard_card_counter') || '0', 10) || 0) + 1
    localStorage.setItem('olaboard_card_counter', String(n))
    return `${t('newIdea')} #${n}`
  }

  function createCard(wx, wy) {
    const cId = currentIdRef.current
    const currentCards = db[cId]?.cards || []
    if (currentCards.filter(c => !c.isLabel).length >= maxCardsPerCanvas) {
      onLimitReached?.('cardsPerCanvas')
      return null
    }
    const card = { id: uid(), title: nextCardTitle(), body: '', x: wx, y: wy, isFolder: false }
    setDb(prev => {
      const canvas = prev[cId]
      if (!canvas) return prev
      return { ...prev, [cId]: { ...canvas, cards: [...canvas.cards, card] } }
    })
    pushCommandRef.current({
      undo: () => setDb(prev => {
        const cv = prev[cId]
        if (!cv) return prev
        return { ...prev, [cId]: { ...cv, cards: cv.cards.filter(c => c.id !== card.id) } }
      }),
      redo: () => setDb(prev => {
        const cv = prev[cId]
        if (!cv) return prev
        return { ...prev, [cId]: { ...cv, cards: [...cv.cards, card] } }
      }),
    })
    return card.id
  }

  // ── label creation & update ───────────────────────────────────────────────
  function createLabel(wx, wy, width) {
    const label = { id: uid(), x: wx, y: wy, text: '', fontSize: 16, fontFamily: 'sans', ...(width ? { width } : {}) }
    const cId = currentIdRef.current
    setDb(prev => {
      const canvas = prev[cId]
      if (!canvas) return prev
      return { ...prev, [cId]: { ...canvas, labels: [...(canvas.labels||[]), label] } }
    })
    pushCommandRef.current({
      undo: () => setDb(prev => {
        const cv = prev[cId]
        if (!cv) return prev
        return { ...prev, [cId]: { ...cv, labels: (cv.labels || []).filter(l => l.id !== label.id) } }
      }),
      redo: () => setDb(prev => {
        const cv = prev[cId]
        if (!cv) return prev
        return { ...prev, [cId]: { ...cv, labels: [...(cv.labels || []), label] } }
      }),
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

  function onLabelResizeMouseDown(e, label) {
    e.stopPropagation()
    dragging.current = { type: 'label-resize', labelId: label.id, origFontSize: label.fontSize || 16, startClientX: e.clientX, startClientY: e.clientY }
  }

  const boardCursor = isPanning ? 'grabbing' : 'crosshair'

  return {
    offset, setOffset,
    scale, setScale,
    scaleRef,
    connectLine,
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
    onImageResizeMouseDown,
    onLabelMouseDown, onLabelResizeMouseDown, zoomBy,
    createLabel, updateLabel,
    textDrawPreview,
    activeAutoCreateRef, activeToolRef, multiSelectedRef,
    snapGuides,
  }
}
