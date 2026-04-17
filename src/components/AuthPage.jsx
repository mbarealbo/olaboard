import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../contexts/LangContext'

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 14px', fontSize: 14,
  border: '1.5px solid #e5e7eb', borderRadius: 10,
  outline: 'none', color: '#1a1a1a',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  background: '#fff', transition: 'border-color 0.15s',
}

export default function AuthPage() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const intentPro = params.get('intent') === 'pro'

  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null) // success message

  const isIT = lang === 'it'

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) setError(error.message)
  }

  async function handleSignup(e) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError(isIT ? 'Le password non coincidono.' : 'Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError(isIT ? 'La password deve avere almeno 6 caratteri.' : 'Password must be at least 6 characters.')
      return
    }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/board` },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setDone('signup')
  }

  async function handleReset(e) {
    e.preventDefault()
    if (!email.trim()) { setError(t('emailRequired')); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/board`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setDone('reset')
  }

  function switchMode(m) {
    setMode(m); setError(null); setPassword(''); setConfirmPassword('')
  }

  // ── Success screens ──────────────────────────────────────────────────────────
  if (done) {
    const isSignup = done === 'signup'
    return (
      <Page>
        <Card>
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>{isSignup ? '🎉' : '📬'}</div>
            <div style={{ fontSize: 18, fontWeight: 750, letterSpacing: '-0.5px', marginBottom: 10 }}>
              {isSignup
                ? (isIT ? 'Account creato!' : 'Account created!')
                : (isIT ? 'Email inviata!' : 'Email sent!')}
            </div>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, margin: '0 0 20px' }}>
              {isSignup
                ? (isIT
                    ? <>Controlla la tua casella email e clicca il link di conferma per attivare l'account.<br /><br />Dopo la conferma potrai accedere.</>
                    : <>Check your inbox and click the confirmation link to activate your account.<br /><br />You can sign in after confirming.</>)
                : (isIT
                    ? <>Abbiamo inviato un link di reset a <strong>{email}</strong>.</>
                    : <>We sent a reset link to <strong>{email}</strong>.</>)}
            </p>
            <button
              onClick={() => { setDone(null); switchMode('login') }}
              style={{ background: 'none', border: 'none', color: '#378ADD', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >{t('backToLogin')}</button>
          </div>
        </Card>
      </Page>
    )
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    <Page>
      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 54, zIndex: 100, display: 'flex', alignItems: 'center', padding: '0 28px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate('/landing')} style={{ fontSize: 15, fontWeight: 750, letterSpacing: '-0.5px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#0a0a0a' }}>Olaboard</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate('/app')} style={{ fontSize: 13, color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.color = '#111'} onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >{isIT ? 'Prova la demo →' : 'Try demo →'}</button>
      </nav>

      <Card>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 6 }}>Olaboard</div>
          {mode !== 'reset' && (
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
              {intentPro
                ? (isIT ? 'Crea il tuo account, poi passa a Pro.' : 'Create your account, then upgrade to Pro.')
                : t('tagline')}
            </p>
          )}
          {mode === 'reset' && (
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>
              {isIT ? 'Inserisci la tua email per ricevere il link di reset.' : 'Enter your email to receive a reset link.'}
            </p>
          )}
        </div>

        {/* Login / Signup tabs */}
        {mode !== 'reset' && (
          <div style={{ display: 'flex', background: '#f5f5f5', borderRadius: 10, padding: 3, marginBottom: 24, gap: 0 }}>
            <TabBtn active={mode === 'login'} onClick={() => switchMode('login')}>
              {isIT ? 'Accedi' : 'Sign in'}
            </TabBtn>
            <TabBtn active={mode === 'signup'} onClick={() => switchMode('signup')}>
              {isIT ? 'Registrati' : 'Sign up'}
            </TabBtn>
          </div>
        )}

        {/* Form */}
        <form onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleReset}>
          <FieldLabel>Email</FieldLabel>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')} required style={inputStyle}
            onFocus={e => { e.target.style.borderColor = '#378ADD' }}
            onBlur={e => { e.target.style.borderColor = '#e5e7eb' }}
          />

          {mode !== 'reset' && (
            <>
              <FieldLabel style={{ marginTop: 14 }}>Password</FieldLabel>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#378ADD' }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb' }}
              />
            </>
          )}

          {mode === 'signup' && (
            <>
              <FieldLabel style={{ marginTop: 14 }}>
                {isIT ? 'Conferma password' : 'Confirm password'}
              </FieldLabel>
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••" required style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#378ADD' }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb' }}
              />
            </>
          )}

          {error && (
            <div style={{ marginTop: 10, padding: '9px 12px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{ marginTop: 18, width: '100%', padding: '12px 0', background: loading ? '#a0c4e8' : '#378ADD', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s', letterSpacing: '-0.2px' }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {loading ? '…' : mode === 'login'
              ? (isIT ? 'Accedi →' : 'Sign in →')
              : mode === 'signup'
                ? (isIT ? 'Crea account →' : 'Create account →')
                : t('sendResetLink')}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 16 }}>
          {mode !== 'reset' && (
            <button style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
              onClick={() => switchMode('reset')}
            >{t('forgotPassword')}</button>
          )}
          {mode === 'reset' && (
            <button style={{ background: 'none', border: 'none', color: '#378ADD', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
              onClick={() => switchMode('login')}
            >{t('backToLogin')}</button>
          )}
        </div>
      </Card>
    </Page>
  )
}

function Page({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', padding: '80px 16px 40px' }}>
      {children}
    </div>
  )
}

function Card({ children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 20, padding: '36px 32px', maxWidth: 400, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.07)' }}>
      {children}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 650, background: active ? '#fff' : 'transparent', color: active ? '#111' : '#888', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', transition: 'all 0.15s', fontFamily: 'inherit' }}
    >{children}</button>
  )
}

function FieldLabel({ children, style }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 650, color: '#555', marginBottom: 6, letterSpacing: '0.1px', ...style }}>
      {children}
    </label>
  )
}
