import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

export default function NotePanel({ card, onClose, onSave }) {
  const [title, setTitle] = useState(card?.title || '')
  const [body, setBody] = useState(card?.body || '')
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (card) {
      setTitle(card.title || '')
      setBody(card.body || '')
    }
  }, [card?.id])

  if (!card) return null

  async function handleSave() {
    setSaving(true)
    await onSave({ title, body })
    setSaving(false)
  }

  return (
    <div
      className="flex flex-col bg-white border-l border-gray-200 shadow-xl"
      style={{ width: 340, height: '100%' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">Note</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(p => !p)}
            className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
          >
            {preview ? 'Modifica' : 'Anteprima'}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden p-4 gap-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titolo..."
          className="text-base font-semibold text-gray-800 border-none outline-none bg-transparent border-b border-gray-200 pb-2 focus:border-blue-400"
        />

        {preview ? (
          <div className="flex-1 overflow-y-auto prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown>{body || '*Nessun contenuto*'}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Scrivi qui le tue note... (Markdown supportato)"
            className="flex-1 resize-none border-none outline-none text-sm text-gray-700 leading-relaxed bg-transparent"
          />
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gray-900 text-white text-sm py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
