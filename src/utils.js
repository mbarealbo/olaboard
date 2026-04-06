export const STORAGE_KEY = 'olaboard_data'
export const CARD_W = 130
export const CARD_H_HALF = 37

export function uid() {
  return crypto.randomUUID()
}

export function defaultDb() {
  return { root: { id: 'root', name: 'La mia lavagna', cards: [], connections: [], groups: [], labels: [] } }
}

export function normalizeCanvas(c) {
  return { ...c, groups: c.groups || [], labels: c.labels || [] }
}

export function loadDb() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!raw) return defaultDb()
    const out = {}
    for (const [k, v] of Object.entries(raw)) out[k] = normalizeCanvas(v)
    return out
  } catch { return defaultDb() }
}

// Build the stack path from 'root' to targetId via BFS through db folder graph
export function buildPath(db, targetId) {
  function search(id, path) {
    if (id === targetId) return [...path, id]
    const canvas = db[id]
    if (!canvas) return null
    for (const c of canvas.cards) {
      if (c.isFolder) {
        const r = search(c.id, [...path, id])
        if (r) return r
      }
    }
    return null
  }
  return search('root', []) || ['root']
}

export function anchorPoint(card, anchor) {
  switch (anchor) {
    case 'top':    return [card.x + CARD_W / 2, card.y]
    case 'bottom': return [card.x + CARD_W / 2, card.y + CARD_H_HALF * 2]
    case 'left':   return [card.x,              card.y + CARD_H_HALF]
    case 'right':
    default:       return [card.x + CARD_W,     card.y + CARD_H_HALF]
  }
}
