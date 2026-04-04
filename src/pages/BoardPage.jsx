import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Breadcrumb from '../components/Breadcrumb'
import BoardCanvas from '../components/BoardCanvas'
import NotePanel from '../components/NotePanel'
import ListView from '../components/ListView'
import {
  fetchCanvases, createCanvas, updateCanvas,
  fetchCards, createCard, updateCard,
  fetchConnections,
} from '../lib/db'

function exportMd(canvasName, cards, connections) {
  let md = `# ${canvasName}\n\n`
  cards.filter(c => !c.is_folder).forEach(c => {
    md += `### ${c.title || 'Senza titolo'}\n\n`
    if (c.body) md += `${c.body}\n\n`
  })
  if (connections.length) {
    md += `## Connessioni\n\n`
    connections.forEach(conn => {
      const from = cards.find(c => c.id === conn.from_card_id)
      const to = cards.find(c => c.id === conn.to_card_id)
      md += `- **${from?.title || '?'}** → **${to?.title || '?'}**${conn.label ? ` _(${conn.label})_` : ''}\n`
    })
  }
  return md
}

export default function BoardPage({ user, isDemo }) {
  const [canvases, setCanvases] = useState([])
  const [currentCanvasId, setCurrentCanvasId] = useState(null)
  const [cards, setCards] = useState([])
  const [activeNote, setActiveNote] = useState(null)
  const [view, setView] = useState('canvas')
  const [loading, setLoading] = useState(true)
  const [editingCanvasName, setEditingCanvasName] = useState(false)
  const [canvasNameDraft, setCanvasNameDraft] = useState('')
  const [hoveringCanvasName, setHoveringCanvasName] = useState(false)

  // Carica tutti i canvas e crea quello di default se mancante
  useEffect(() => {
    fetchCanvases(user.id).then(async data => {
      if (data.length === 0) {
        const canvas = await createCanvas({ name: 'La mia lavagna', parent_id: null, user_id: user.id })
        setCanvases([canvas])
        setCurrentCanvasId(canvas.id)
      } else {
        setCanvases(data)
        setCurrentCanvasId(data[0].id)
      }
      setLoading(false)
    })
  }, [])

  // Aggiorna le card quando cambia il canvas corrente
  useEffect(() => {
    if (!currentCanvasId) return
    fetchCards(currentCanvasId).then(setCards)
  }, [currentCanvasId])

  // Aggiorna activeNote se il titolo/body cambiano
  useEffect(() => {
    if (!activeNote) return
    const found = cards.find(c => c.id === activeNote.id)
    if (found) setActiveNote(found)
  }, [cards])

  function navigate(id) {
    setCurrentCanvasId(id)
    setActiveNote(null)
    setView('canvas')
  }

  async function handleNewCanvas() {
    const name = prompt('Nome nuova lavagna:')
    if (!name) return
    const canvas = await createCanvas({ name, parent_id: null, user_id: user.id })
    setCanvases(prev => [...prev, canvas])
    navigate(canvas.id)
  }

  function handleGoUp() {
    const current = canvases.find(c => c.id === currentCanvasId)
    if (current?.parent_id) navigate(current.parent_id)
  }

  function startEditingCanvasName() {
    const current = canvases.find(c => c.id === currentCanvasId)
    if (!current) return
    setCanvasNameDraft(current.name)
    setEditingCanvasName(true)
  }

  async function commitCanvasName() {
    setEditingCanvasName(false)
    const trimmed = canvasNameDraft.trim()
    if (!trimmed || trimmed === canvases.find(c => c.id === currentCanvasId)?.name) return
    const updated = await updateCanvas(currentCanvasId, { name: trimmed })
    setCanvases(prev => prev.map(c => c.id === currentCanvasId ? { ...c, name: updated.name } : c))
  }

  function handleCanvasNameKeyDown(e) {
    if (e.key === 'Enter') e.target.blur()
    if (e.key === 'Escape') { setEditingCanvasName(false) }
  }

  // Chiamato da BoardCanvas ogni volta che aggiunge/modifica/rimuove una card
  const syncCard = useCallback((action, card) => {
    setCards(prev => {
      if (action === 'add') return [...prev, card]
      if (action === 'update') return prev.map(c => c.id === card.id ? card : c)
      if (action === 'remove') return prev.filter(c => c.id !== card.id)
      return prev
    })
  }, [])

  const handleCanvasCreated = useCallback((canvas) => {
    setCanvases(prev => prev.find(c => c.id === canvas.id) ? prev : [...prev, canvas])
  }, [])

  async function handleNoteSave({ title, body }) {
    if (!activeNote) return
    const updated = await updateCard(activeNote.id, { title, body })
    setCards(prev => prev.map(c => c.id === activeNote.id ? { ...c, title, body } : c))
    setActiveNote(prev => ({ ...prev, title, body }))
  }

  async function handleAddFromList() {
    if (!currentCanvasId) return
    const card = await createCard({
      canvas_id: currentCanvasId,
      title: 'Nuova idea', body: '',
      x: 100 + Math.random() * 300,
      y: 100 + Math.random() * 200,
      is_folder: false,
    })
    setCards(prev => [...prev, card])
    setActiveNote(card)
  }

  async function handleExportMd() {
    const canvas = canvases.find(c => c.id === currentCanvasId)
    const connections = await fetchConnections(currentCanvasId)
    const md = exportMd(canvas?.name || 'Canvas', cards, connections)
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([md], { type: 'text/markdown' })),
      download: `${canvas?.name || 'canvas'}.md`,
    })
    a.click()
  }

  async function handleSignOut() {
    const { supabase } = await import('../lib/supabase')
    supabase.auth.signOut()
  }

  const currentCanvas = canvases.find(c => c.id === currentCanvasId)
  const hasParent = !!currentCanvas?.parent_id

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <p className="text-gray-400">Caricamento...</p>
    </div>
  )

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        canvases={canvases}
        currentCanvasId={currentCanvasId}
        onNavigate={navigate}
        onNewCanvas={handleNewCanvas}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 h-11 shrink-0">
          {hasParent && (
            <button onClick={handleGoUp} className="text-gray-500 hover:text-gray-800 px-1">←</button>
          )}

          <Breadcrumb canvases={canvases} currentCanvasId={currentCanvasId} onNavigate={navigate} />

          <div
            className="flex items-center gap-1"
            onMouseEnter={() => setHoveringCanvasName(true)}
            onMouseLeave={() => setHoveringCanvasName(false)}
          >
            {editingCanvasName ? (
              <input
                autoFocus
                value={canvasNameDraft}
                onChange={e => setCanvasNameDraft(e.target.value)}
                onBlur={commitCanvasName}
                onKeyDown={handleCanvasNameKeyDown}
                className="text-sm font-semibold text-gray-800 bg-white border border-blue-400 rounded px-2 py-0.5 outline-none"
                style={{ minWidth: 80, maxWidth: 260 }}
              />
            ) : (
              <>
                <span className="text-sm font-semibold text-gray-800">{currentCanvas?.name}</span>
                <button
                  onClick={startEditingCanvasName}
                  style={{ opacity: hoveringCanvasName ? 1 : 0, transition: 'opacity 0.15s' }}
                  className="text-gray-400 hover:text-gray-700 p-0.5 rounded"
                  title="Rinomina"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </>
            )}
          </div>

          <div className="flex-1" />

          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('canvas')}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${view === 'canvas' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500'}`}
            >Canvas</button>
            <button
              onClick={() => setView('list')}
              className={`text-xs px-3 py-1 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow text-gray-800 font-medium' : 'text-gray-500'}`}
            >Elenco</button>
          </div>

          <button onClick={handleExportMd} className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50">↓ MD</button>

          {isDemo ? (
            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded font-medium">Demo</span>
          ) : (
            <button onClick={handleSignOut} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">Esci</button>
          )}
        </div>

        {/* Canvas / List + Note panel */}
        <div className="flex flex-1 overflow-hidden">
          {view === 'canvas' ? (
            <BoardCanvas
              key={currentCanvasId}
              canvasId={currentCanvasId}
              userId={user.id}
              canvases={canvases}
              onEnterFolder={navigate}
              onNoteOpen={setActiveNote}
              onCanvasCreated={handleCanvasCreated}
              onSyncCard={syncCard}
            />
          ) : (
            <ListView
              cards={cards}
              onOpenNote={card => { setActiveNote(card); }}
              onAddCard={handleAddFromList}
              onOpenFolder={card => {
                const canvas = canvases.find(c => c.parent_id === currentCanvasId && c.name === card.title)
                if (canvas) navigate(canvas.id)
              }}
            />
          )}

          {activeNote && (
            <NotePanel
              card={activeNote}
              onClose={() => setActiveNote(null)}
              onSave={handleNoteSave}
            />
          )}
        </div>
      </div>
    </div>
  )
}
