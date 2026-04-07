import { supabase } from './supabase'

// ── BOARDS ────────────────────────────────────────────────────────────────────

export async function fetchBoards(userId) {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function createBoard({ name, userId }) {
  const { data, error } = await supabase
    .from('boards')
    .insert({ name, user_id: userId })
    .select().single()
  if (error) throw error
  return data
}

export async function updateBoard(id, updates) {
  const { data, error } = await supabase
    .from('boards')
    .update(updates)
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

export async function deleteBoard(id) {
  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── CANVASES ──────────────────────────────────────────────────────────────────

export async function fetchCanvas(id) {
  const { data, error } = await supabase
    .from('canvases')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createCanvas({ id, boardId, parentId, name, userId }) {
  const row = { board_id: boardId, parent_id: parentId || null, name, user_id: userId, groups: [], labels: [] }
  if (id) row.id = id
  const { data, error } = await supabase
    .from('canvases')
    .insert(row)
    .select().single()
  if (error) throw error
  return data
}

export async function updateCanvas(id, updates) {
  const { data, error } = await supabase
    .from('canvases')
    .update(updates)
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

// ── CARDS ─────────────────────────────────────────────────────────────────────

export async function fetchCards(canvasId) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('canvas_id', canvasId)
    .order('created_at')
  if (error) throw error
  return data
}

export async function createCard({ canvasId, title, body, x, y, isFolder, isLabel, color }) {
  const { data, error } = await supabase
    .from('cards')
    .insert({ canvas_id: canvasId, title, body: body || '', x, y, is_folder: isFolder || false, is_label: isLabel || false, color: color || 'yellow' })
    .select().single()
  if (error) throw error
  return data
}

export async function updateCard(id, updates) {
  const { data, error } = await supabase
    .from('cards')
    .update(updates)
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

export async function deleteCard(id) {
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── CONNECTIONS ───────────────────────────────────────────────────────────────

export async function fetchConnections(canvasId) {
  const { data, error } = await supabase
    .from('connections')
    .select('*')
    .eq('canvas_id', canvasId)
  if (error) throw error
  return data
}

export async function createConnection({ canvasId, fromCardId, toCardId, label, fromAnchor, toAnchor }) {
  const { data, error } = await supabase
    .from('connections')
    .insert({ canvas_id: canvasId, from_card_id: fromCardId, to_card_id: toCardId, label: label || '', from_anchor: fromAnchor || 'right', to_anchor: toAnchor || 'left' })
    .select().single()
  if (error) throw error
  return data
}

export async function updateConnection(id, updates) {
  const { data, error } = await supabase
    .from('connections')
    .update(updates)
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

export async function deleteConnection(id) {
  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── BULK SYNC ─────────────────────────────────────────────────────────────────

export async function upsertCards(cards, canvasId) {
  if (!cards.length) return
  const rows = cards.map(c => ({
    id: c.id,
    canvas_id: canvasId,
    title: c.title || '',
    body: c.body || '',
    x: c.x,
    y: c.y,
    is_folder: c.isFolder || false,
    is_label: c.isLabel || false,
    color: c.color || 'yellow',
    url: c.url || null,
    width: c.width || null,
    height: c.height || null,
  }))
  const { error } = await supabase.from('cards').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

// ── STORAGE ───────────────────────────────────────────────────────────────────

const STORAGE_BUCKET = 'images'
const STORAGE_LIMIT = 100 * 1024 * 1024 // 100 MB

export async function getUserStorageUsed(userId) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(userId, { limit: 1000 })
  if (error || !data) return 0
  return data.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
}

export async function uploadImage(file, userId) {
  const used = await getUserStorageUsed(userId)
  if (used + file.size > STORAGE_LIMIT) {
    const usedMB = Math.round(used / 1024 / 1024)
    throw new Error(`Limite storage superato (100 MB). In uso: ${usedMB} MB`)
  }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function deleteImage(path) {
  if (!path) return
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path])
  if (error) console.error('deleteImage error:', error)
}

export async function deleteCardsByIds(ids) {
  if (!ids.length) return
  const { error } = await supabase.from('cards').delete().in('id', ids)
  if (error) throw error
}

export async function upsertConnections(connections, canvasId) {
  if (!connections.length) return
  const rows = connections.map(c => ({
    id: c.id,
    canvas_id: canvasId,
    from_card_id: c.from,
    to_card_id: c.to,
    label: c.label || '',
    from_anchor: c.fromAnchor || 'right',
    to_anchor: c.toAnchor || 'left',
  }))
  const { error } = await supabase.from('connections').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteConnectionsByIds(ids) {
  if (!ids.length) return
  const { error } = await supabase.from('connections').delete().in('id', ids)
  if (error) throw error
}
