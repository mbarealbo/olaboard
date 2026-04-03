// Auto-switches between Supabase (production) and localStorage (demo).
// When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are properly set,
// all functions below use Supabase. Otherwise they use the in-memory store.

import { isSupabaseConfigured } from './config'
import * as mem from './memoryDb'

// Lazy-loaded Supabase functions to avoid crashing when env vars are missing
async function supa() {
  const { supabase } = await import('./supabase')
  return supabase
}

// Canvases
export async function fetchCanvases(userId) {
  if (!isSupabaseConfigured) return mem.fetchCanvases(userId)
  const db = await supa()
  const { data, error } = await db.from('canvases').select('*').eq('user_id', userId).order('name')
  if (error) throw error
  return data
}

export async function createCanvas({ name, parent_id, user_id }) {
  if (!isSupabaseConfigured) return mem.createCanvas({ name, parent_id, user_id })
  const db = await supa()
  const { data, error } = await db.from('canvases').insert({ name, parent_id, user_id }).select().single()
  if (error) throw error
  return data
}

export async function updateCanvas(id, updates) {
  if (!isSupabaseConfigured) return mem.updateCanvas(id, updates)
  const db = await supa()
  const { data, error } = await db.from('canvases').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCanvas(id) {
  if (!isSupabaseConfigured) return mem.deleteCanvas(id)
  const db = await supa()
  const { error } = await db.from('canvases').delete().eq('id', id)
  if (error) throw error
}

// Cards
export async function fetchCards(canvasId) {
  if (!isSupabaseConfigured) return mem.fetchCards(canvasId)
  const db = await supa()
  const { data, error } = await db.from('cards').select('*').eq('canvas_id', canvasId).order('created_at')
  if (error) throw error
  return data
}

export async function createCard({ canvas_id, title, body, x, y, is_folder }) {
  if (!isSupabaseConfigured) return mem.createCard({ canvas_id, title, body, x, y, is_folder })
  const db = await supa()
  const { data, error } = await db.from('cards').insert({ canvas_id, title, body: body || '', x, y, is_folder: is_folder || false }).select().single()
  if (error) throw error
  return data
}

export async function updateCard(id, updates) {
  if (!isSupabaseConfigured) return mem.updateCard(id, updates)
  const db = await supa()
  const { data, error } = await db.from('cards').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCard(id) {
  if (!isSupabaseConfigured) return mem.deleteCard(id)
  const db = await supa()
  const { error } = await db.from('cards').delete().eq('id', id)
  if (error) throw error
}

// Connections
export async function fetchConnections(canvasId) {
  if (!isSupabaseConfigured) return mem.fetchConnections(canvasId)
  const db = await supa()
  const { data, error } = await db.from('connections').select('*').eq('canvas_id', canvasId)
  if (error) throw error
  return data
}

export async function createConnection({ canvas_id, from_card_id, to_card_id, label }) {
  if (!isSupabaseConfigured) return mem.createConnection({ canvas_id, from_card_id, to_card_id, label })
  const db = await supa()
  const { data, error } = await db.from('connections').insert({ canvas_id, from_card_id, to_card_id, label: label || '' }).select().single()
  if (error) throw error
  return data
}

export async function updateConnection(id, updates) {
  if (!isSupabaseConfigured) return mem.updateConnection(id, updates)
  const db = await supa()
  const { data, error } = await db.from('connections').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteConnection(id) {
  if (!isSupabaseConfigured) return mem.deleteConnection(id)
  const db = await supa()
  const { error } = await db.from('connections').delete().eq('id', id)
  if (error) throw error
}
