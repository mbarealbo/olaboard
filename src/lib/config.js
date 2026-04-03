const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured =
  url.startsWith('https://') &&
  key.length > 20 &&
  !url.includes('your_supabase')
