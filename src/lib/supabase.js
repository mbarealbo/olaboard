import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from './config'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

// createClient è chiamato solo se le variabili sono reali.
// In demo mode questo modulo viene importato ma mai usato davvero.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
