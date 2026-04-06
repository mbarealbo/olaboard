import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f0f0f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#ffffff', borderRadius: 12, padding: 40,
        maxWidth: 400, width: '100%', margin: '0 16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#1a1a1a' }}>Olaboard</h1>
        <p style={{ margin: '8px 0 32px', fontSize: 14, color: '#888' }}>Il tuo spazio per pensare</p>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
            <p style={{ fontSize: 15, color: '#333', margin: 0 }}>Controlla la tua email</p>
            <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
              Ti abbiamo inviato un link magico a <strong>{email}</strong>
            </p>
            <button
              style={{ marginTop: 20, background: 'none', border: 'none', color: '#378ADD', cursor: 'pointer', fontSize: 13 }}
              onClick={() => { setSent(false); setEmail('') }}
            >Usa un'altra email</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="la@tua.email"
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px', fontSize: 14,
                border: '1px solid #e5e7eb', borderRadius: 8,
                outline: 'none', color: '#1a1a1a',
                fontFamily: 'inherit',
              }}
              onFocus={e => { e.target.style.borderColor = '#378ADD' }}
              onBlur={e => { e.target.style.borderColor = '#e5e7eb' }}
            />
            {error && (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#e03e3e' }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 16, width: '100%', padding: '11px 0',
                background: loading ? '#a0c4e8' : '#378ADD',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
                fontFamily: 'inherit', transition: 'background 0.15s',
              }}
            >
              {loading ? 'Invio in corso…' : 'Invia magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
