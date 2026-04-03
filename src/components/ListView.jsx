import { useState } from 'react'

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Nome A→Z' },
  { value: 'name_desc', label: 'Nome Z→A' },
  { value: 'created_asc', label: 'Prima creati' },
  { value: 'created_desc', label: 'Ultimi creati' },
]

function sortCards(cards, sort) {
  const sorted = [...cards]
  switch (sort) {
    case 'name_asc': return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'name_desc': return sorted.sort((a, b) => b.title.localeCompare(a.title))
    case 'created_asc': return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    case 'created_desc': return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    default: return sorted
  }
}

export default function ListView({ cards, onOpenNote, onAddCard, onOpenFolder }) {
  const [sort, setSort] = useState('created_desc')

  const sortedCards = sortCards(cards, sort)

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onAddCard}
          className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + Nuova idea
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sortedCards.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <p className="text-gray-400 text-sm">Nessuna idea ancora</p>
            <p className="text-gray-300 text-xs mt-1">Doppio click sulla lavagna per aggiungere</p>
          </div>
        )}
        {sortedCards.map(card => (
          <div
            key={card.id}
            className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-all group"
            onClick={() => card.is_folder ? onOpenFolder?.(card) : onOpenNote?.(card)}
          >
            <span className="text-xl mt-0.5">{card.is_folder ? '📁' : '📝'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{card.title || 'Senza titolo'}</p>
              {card.body && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{card.body}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
