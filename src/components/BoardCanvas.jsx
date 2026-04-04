import { useCallback, useEffect, useRef, useState } from 'react'
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
import TextNode from './TextNode'
import LabeledEdge from './LabeledEdge'
import {
  fetchCards, createCard, updateCard, deleteCard,
  fetchConnections, createConnection, updateConnection, deleteConnection,
  createCanvas,
} from '../lib/db'

const nodeTypes = { postit: PostItNode, folder: FolderNode, text: TextNode }
const edgeTypes = { labeled: LabeledEdge }

function getNodeType(card) {
  if (card.node_type) return card.node_type
  return card.is_folder ? 'folder' : 'postit'
}

function makeNode(card, handlers) {
  const type = getNodeType(card)
  return {
    id: String(card.id),
    type,
    position: { x: card.x, y: card.y },
    data: {
      title: card.title,
      body: card.body,
      onRename: (title) => handlers.onRename(card.id, title),
      onOpenNote: () => handlers.onOpenNote(card),
      onConvertToFolder: () => handlers.onConvertToFolder(card),
      onConvertToPostIt: () => handlers.onConvertToPostIt(card),
      onConvertToText: () => handlers.onConvertToText(card),
      onEnter: () => handlers.onEnterFolder(card),
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

  const handlersRef = useRef(null)

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
    await updateCard(card.id, { is_folder: true, node_type: 'folder' })
    onCanvasCreated(canvas)
    onSyncCard('update', { ...card, is_folder: true, node_type: 'folder' })
    const h = handlersRef.current
    setNodes(prev => prev.map(n =>
      n.id === String(card.id)
        ? makeNode({ ...card, is_folder: true, node_type: 'folder' }, { ...h, onEnterFolder: () => onEnterFolder(canvas.id) })
        : n
    ))
  }, [canvasId, userId, onCanvasCreated, onSyncCard, onEnterFolder])

  const onConvertToPostIt = useCallback(async (card) => {
    await updateCard(card.id, { is_folder: false, node_type: 'postit' })
    onSyncCard('update', { ...card, is_folder: false, node_type: 'postit' })
    const h = handlersRef.current
    setNodes(prev => prev.map(n =>
      n.id === String(card.id)
        ? makeNode({ ...card, is_folder: false, node_type: 'postit' }, h)
        : n
    ))
  }, [onSyncCard])

  const onConvertToText = useCallback(async (card) => {
    await updateCard(card.id, { is_folder: false, node_type: 'text' })
    onSyncCard('update', { ...card, is_folder: false, node_type: 'text' })
    const h = handlersRef.current
    setNodes(prev => prev.map(n =>
      n.id === String(card.id)
        ? makeNode({ ...card, is_folder: false, node_type: 'text' }, h)
        : n
    ))
  }, [onSyncCard])

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

  handlersRef.current = {
    onRename, onOpenNote, onConvertToFolder, onConvertToPostIt, onConvertToText, onEnterFolder: onEnterFolderCard,
  }

  useEffect(() => {
    if (!canvasId) return
    setLoading(true)
    Promise.all([fetchCards(canvasId), fetchConnections(canvasId)]).then(([cards, conns]) => {
      setNodes(cards.map(c => makeNode(c, handlersRef.current)))
      setEdges(conns.map(c => makeEdge(c, onLabelChange)))
      setLoading(false)
    })
  }, [canvasId])

  const onConnect = useCallback(async (params) => {
    const conn = await createConnection({
      canvas_id: canvasId,
      from_card_id: params.source,
      to_card_id: params.target,
      label: '',
    })
    setEdges(prev => addEdge(makeEdge(conn, onLabelChange), prev))
  }, [canvasId, onLabelChange])

  const onDoubleClick = useCallback(async (e) => {
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
      node_type: 'postit',
    })
    onSyncCard('add', card)
    setNodes(prev => [...prev, makeNode(card, handlersRef.current)])
  }, [canvasId, screenToFlowPosition, onSyncCard])

  const onNodeDragStop = useCallback(async (_e, node) => {
    await updateCard(node.id, { x: node.position.x, y: node.position.y })
  }, [])

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
          nodeColor={n => n.type === 'folder' ? '#EF9F27' : n.type === 'text' ? '#e5e7eb' : '#FAC775'}
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
