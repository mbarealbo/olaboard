// localStorage-backed store for demo mode.
// Mirrors the same API as db.js (Supabase-backed).

const DEMO_USER_ID = 'demo-user'

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function uuid() {
  return crypto.randomUUID()
}

function getAll(table) {
  return load(`ola_${table}`) || []
}

function setAll(table, rows) {
  save(`ola_${table}`, rows)
}

// Canvases
export async function fetchCanvases(userId) {
  return getAll('canvases').filter(c => c.user_id === userId)
}

export async function createCanvas({ name, parent_id, user_id }) {
  const row = { id: uuid(), name, parent_id: parent_id || null, user_id, created_at: new Date().toISOString() }
  setAll('canvases', [...getAll('canvases'), row])
  return row
}

export async function updateCanvas(id, updates) {
  const rows = getAll('canvases').map(c => c.id === id ? { ...c, ...updates } : c)
  setAll('canvases', rows)
  return rows.find(c => c.id === id)
}

export async function deleteCanvas(id) {
  setAll('canvases', getAll('canvases').filter(c => c.id !== id))
}

// Cards
export async function fetchCards(canvasId) {
  return getAll('cards').filter(c => c.canvas_id === canvasId)
}

export async function createCard({ canvas_id, title, body, x, y, is_folder, node_type }) {
  const row = {
    id: uuid(),
    canvas_id,
    title: title || 'Nuova idea',
    body: body || '',
    x: x || 0,
    y: y || 0,
    is_folder: is_folder || false,
    node_type: node_type || (is_folder ? 'folder' : 'postit'),
    created_at: new Date().toISOString(),
  }
  setAll('cards', [...getAll('cards'), row])
  return row
}

export async function updateCard(id, updates) {
  const rows = getAll('cards').map(c => c.id === id ? { ...c, ...updates } : c)
  setAll('cards', rows)
  return rows.find(c => c.id === id)
}

export async function deleteCard(id) {
  setAll('cards', getAll('cards').filter(c => c.id !== id))
  // cascade: delete connections referencing this card
  setAll('connections', getAll('connections').filter(
    c => c.from_card_id !== id && c.to_card_id !== id
  ))
}

// Connections
export async function fetchConnections(canvasId) {
  return getAll('connections').filter(c => c.canvas_id === canvasId)
}

export async function createConnection({ canvas_id, from_card_id, to_card_id, label }) {
  const row = { id: uuid(), canvas_id, from_card_id, to_card_id, label: label || '', created_at: new Date().toISOString() }
  setAll('connections', [...getAll('connections'), row])
  return row
}

export async function updateConnection(id, updates) {
  const rows = getAll('connections').map(c => c.id === id ? { ...c, ...updates } : c)
  setAll('connections', rows)
  return rows.find(c => c.id === id)
}

export async function deleteConnection(id) {
  setAll('connections', getAll('connections').filter(c => c.id !== id))
}

// Demo user
export const DEMO_USER = { id: DEMO_USER_ID, email: 'demo@olaboard.app' }
