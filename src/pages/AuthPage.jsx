import { useState } from 'react'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { supabase } = await import('../lib/supabase')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-800 mb-1">Olaboard</h1>
        <p className="text-gray-500 text-sm mb-8">Cattura e connetti le tue idee</p>

        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📬</div>
            <p className="text-gray-700 font-medium">Controlla la tua email</p>
            <p className="text-gray-500 text-sm mt-2">
              Ti abbiamo inviato un link magico a <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@esempio.it"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-gray-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Invio...' : 'Invia magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
