import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'

import PostItNode from './PostItNode'
import FolderNode from './FolderNode'
import LabeledEdge from './LabeledEdge'
import {
  fetchCards, createCard, updateCard, deleteCard,
  fetchConnections, createConnection, updateConnection, deleteConnection,
  createCanvas,
} from '../lib/db'

const nodeTypes = { postit: PostItNode, folder: FolderNode }
const edgeTypes = { labeled: LabeledEdge }

function makeNode(card, { onRename, onOpenNote, onConvertToFolder, onEnterFolder }) {
  return {
    id: String(card.id),
    type: card.is_folder ? 'folder' : 'postit',
    position: { x: card.x, y: card.y },
    data: {
      title: card.title,
      body: card.body,
      onRename: (title) => onRename(card.id, title),
      onOpenNote: () => onOpenNote(card),
      onConvertToFolder: () => onConvertToFolder(card),
      onEnter: () => onEnterFolder(card),
    },
  }
}

function makeEdge(conn, onLabelChange) {
  return {
    id: String(conn.id),
    source: String(conn.from_card_id),
    target: String(conn.to_card_id),
    type: 'labeled',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#378ADD' },
    data: { label: conn.label || '', onLabelChange },
  }
}

function Inner({ canvasId, userId, canvases, onEnterFolder, onNoteOpen, onCanvasCreated, onSyncCard }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const { screenToFlowPosition } = useReactFlow()

  // ---- handlers stabili tramite useCallback ----

  const onRename = useCallback(async (cardId, title) => {
    const updated = await updateCard(cardId, { title })
    onSyncCard('update', updated)
    setNodes(prev => prev.map(n => n.id === String(cardId) ? { ...n, data: { ...n.data, title } } : n))
  }, [onSyncCard])

  const onOpenNote = useCallback((card) => {
    onNoteOpen(card)
  }, [onNoteOpen])

  const onConvertToFolder = useCallback(async (card) => {
    const canvas = await createCanvas({ name: card.title || 'Cartella', parent_id: canvasId, user_id: userId })
    const updated = await updateCard(card.id, { is_folder: true })
    onCanvasCreated(canvas)
    onSyncCard('update', updated)
    setNodes(prev => prev.map(n =>
      n.id === String(card.id)
        ? { ...n, type: 'folder', data: { ...n.data, onEnter: () => onEnterFolder(canvas.id) } }
        : n
    ))
  }, [canvasId, userId, onCanvasCreated, onSyncCard, onEnterFolder])

  const onEnterFolderCard = useCallback((card) => {
    const match = canvases.find(c => c.parent_id === canvasId && c.name === card.title)
    if (match) {
      onEnterFolder(match.id)
    } else {
      createCanvas({ name: card.title || 'Cartella', parent_id: canvasId, user_id: userId }).then(canvas => {
        onCanvasCreated(canvas)
        onEnterFolder(canvas.id)
      })
    }
  }, [canvases, canvasId, userId, onCanvasCreated, onEnterFolder])

  const onLabelChange = useCallback(async (edgeId, label) => {
    await updateConnection(edgeId, { label })
    setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, data: { ...e.data, label } } : e))
  }, [])

  // Costruisce gli handler per i nodi — stabile finché gli handler non cambiano
  const buildHandlers = useCallback(() => ({
    onRename, onOpenNote, onConvertToFolder, onEnterFolder: onEnterFolderCard,
  }), [onRename, onOpenNote, onConvertToFolder, onEnterFolderCard])

  // ---- Caricamento iniziale ----
  useEffect(() => {
    if (!canvasId) return
    setLoading(true)
    const h = buildHandlers()
    Promise.all([fetchCards(canvasId), fetchConnections(canvasId)]).then(([cards, conns]) => {
      setNodes(cards.map(c => makeNode(c, h)))
      setEdges(conns.map(c => makeEdge(c, onLabelChange)))
      setLoading(false)
    })
  }, [canvasId])

  // ---- Connessione tra nodi ----
  const onConnect = useCallback(async (params) => {
    const conn = await createConnection({
      canvas_id: canvasId,
      from_card_id: params.source,
      to_card_id: params.target,
      label: '',
    })
    setEdges(prev => addEdge(makeEdge(conn, onLabelChange), prev))
  }, [canvasId, onLabelChange])

  // ---- Doppio click sulla lavagna → nuovo post-it ----
  const onDoubleClick = useCallback(async (e) => {
    // Ignora click su nodi, controlli, minimap
    if (e.target.closest('.react-flow__node')) return
    if (e.target.closest('.react-flow__controls')) return
    if (e.target.closest('.react-flow__minimap')) return

    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const card = await createCard({
      canvas_id: canvasId,
      title: 'Nuova idea',
      body: '',
      x: pos.x - 90,
      y: pos.y - 50,
      is_folder: false,
    })
    onSyncCard('add', card)
    const h = buildHandlers()
    setNodes(prev => [...prev, makeNode(card, h)])
  }, [canvasId, screenToFlowPosition, onSyncCard, buildHandlers])

  // ---- Drag stop → salva posizione ----
  const onNodeDragStop = useCallback(async (_e, node) => {
    await updateCard(node.id, { x: node.position.x, y: node.position.y })
  }, [])

  // ---- Elimina nodi/archi selezionati ----
  const onNodesDelete = useCallback(async (deleted) => {
    for (const n of deleted) {
      await deleteCard(n.id)
      onSyncCard('remove', { id: n.id })
    }
  }, [onSyncCard])

  const onEdgesDelete = useCallback(async (deleted) => {
    for (const e of deleted) await deleteConnection(e.id)
  }, [])

  const onKeyDown = useCallback((e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    e.preventDefault()
    setNodes(prev => {
      prev.filter(n => n.selected).forEach(n => {
        deleteCard(n.id)
        onSyncCard('remove', { id: n.id })
      })
      return prev.filter(n => !n.selected)
    })
    setEdges(prev => {
      prev.filter(e => e.selected).forEach(e => deleteConnection(e.id))
      return prev.filter(e => !e.selected)
    })
  }, [onSyncCard])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <p className="text-gray-400 text-sm">Caricamento...</p>
    </div>
  )

  return (
    <div
      className="flex-1"
      style={{ height: '100%' }}
      onDoubleClick={onDoubleClick}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
        minZoom={0.1}
        maxZoom={3}
      >
        <Background color="#d1d5db" gap={24} size={1} />
        <Controls />
        <MiniMap
          nodeColor={n => n.type === 'folder' ? '#EF9F27' : '#FAC775'}
          style={{ bottom: 16, right: 16 }}
        />
      </ReactFlow>
    </div>
  )
}

export default function BoardCanvas(props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  )
}
