import { useState, useEffect } from 'react'
import { isSupabaseConfigured } from './lib/config'
import { DEMO_USER } from './lib/memoryDb'
import AuthPage from './pages/AuthPage'
import BoardPage from './pages/BoardPage'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(DEMO_USER)
      setLoading(false)
      return
    }

    let unsubscribe = () => {}

    import('./lib/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

      unsubscribe = () => subscription.unsubscribe()
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <p className="text-gray-400 text-sm">Caricamento...</p>
      </div>
    )
  }

  if (!user) return <AuthPage />

  return <BoardPage user={user} isDemo={!isSupabaseConfigured} />
}
