import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../contexts/LangContext'
import OlaboardLogo from './OlaboardLogo'

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

  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset' | 'newpassword'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const isIT = lang === 'it'

  useEffect(() => { document.title = 'Sign in — Olaboard' }, [])

  // Intercept PASSWORD_RECOVERY event from Supabase email link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('newpassword')
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleGoogleLogin() {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

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
      redirectTo: `${window.location.origin}/login`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setDone('reset')
  }

  async function handleNewPassword(e) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError(isIT ? 'Le password non coincidono.' : 'Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError(isIT ? 'Minimo 6 caratteri.' : 'At least 6 characters required.')
      return
    }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else setDone('newpassword')
  }

  function switchMode(m) {
    setMode(m); setError(null); setPassword(''); setConfirmPassword(''); setTermsAccepted(false)
  }

  // ── Success screens ──────────────────────────────────────────────────────────
  if (done) {
    const isSignup = done === 'signup'
    const isNewPwd = done === 'newpassword'
    return (
      <Page>
        <Card>
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>{isSignup ? '🎉' : isNewPwd ? '✅' : '📬'}</div>
            <div style={{ fontSize: 18, fontWeight: 750, letterSpacing: '-0.5px', marginBottom: 10 }}>
              {isSignup
                ? (isIT ? 'Account creato!' : 'Account created!')
                : isNewPwd
                  ? (isIT ? 'Password aggiornata!' : 'Password updated!')
                  : (isIT ? 'Email inviata!' : 'Email sent!')}
            </div>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, margin: '0 0 20px' }}>
              {isSignup
                ? (isIT
                    ? <>Controlla la tua casella email e clicca il link di conferma per attivare l'account.<br /><br />Dopo la conferma potrai accedere.</>
                    : <>Check your inbox and click the confirmation link to activate your account.<br /><br />You can sign in after confirming.</>)
                : isNewPwd
                  ? (isIT ? 'Puoi ora accedere con la nuova password.' : 'You can now sign in with your new password.')
                  : (isIT
                      ? <>Abbiamo inviato un link di reset a <strong>{email}</strong>.</>
                      : <>We sent a reset link to <strong>{email}</strong>.</>)}
            </p>
            {isNewPwd
              ? <button onClick={() => navigate('/board')} style={{ background: '#378ADD', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 8 }}>
                  {isIT ? 'Vai all\'app →' : 'Go to app →'}
                </button>
              : <button onClick={() => { setDone(null); switchMode('login') }} style={{ background: 'none', border: 'none', color: '#378ADD', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  {t('backToLogin')}
                </button>}
          </div>
        </Card>
      </Page>
    )
  }

  // ── New password form (after clicking reset link) ────────────────────────────
  if (mode === 'newpassword') {
    return (
      <Page>
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><OlaboardLogo size={24} fontSize={22} gap={9} /></div>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{isIT ? 'Imposta la nuova password.' : 'Set your new password.'}</p>
          </div>
          <form onSubmit={handleNewPassword}>
            <FieldLabel>{isIT ? 'Nuova password' : 'New password'}</FieldLabel>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#378ADD' }} onBlur={e => { e.target.style.borderColor = '#e5e7eb' }} />
            <FieldLabel style={{ marginTop: 14 }}>{isIT ? 'Conferma password' : 'Confirm password'}</FieldLabel>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#378ADD' }} onBlur={e => { e.target.style.borderColor = '#e5e7eb' }} />
            {error && <div style={{ marginTop: 10, padding: '9px 12px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ marginTop: 18, width: '100%', padding: '12px 0', background: loading ? '#a0c4e8' : '#378ADD', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? '…' : (isIT ? 'Salva password →' : 'Save password →')}
            </button>
          </form>
        </Card>
      </Page>
    )
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    <Page>
      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 54, zIndex: 100, display: 'flex', alignItems: 'center', padding: '0 28px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate('/landing')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><OlaboardLogo size={20} fontSize={15} /></button>
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

          {mode === 'signup' && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 16, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0, accentColor: '#378ADD', width: 14, height: 14 }}
              />
              <span style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                {isIT
                  ? <>Ho letto e accetto i <a href="/terms" target="_blank" style={{ color: '#378ADD' }}>Termini e Condizioni</a> e la <a href="/privacy" target="_blank" style={{ color: '#378ADD' }}>Privacy Policy</a></>
                  : <>I have read and accept the <a href="/terms" target="_blank" style={{ color: '#378ADD' }}>Terms and Conditions</a> and the <a href="/privacy" target="_blank" style={{ color: '#378ADD' }}>Privacy Policy</a></>}
              </span>
            </label>
          )}

          {error && (
            <div style={{ marginTop: 10, padding: '9px 12px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading || (mode === 'signup' && !termsAccepted)}
            style={{ marginTop: 18, width: '100%', padding: '12px 0', background: loading || (mode === 'signup' && !termsAccepted) ? '#a0c4e8' : '#378ADD', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: loading || (mode === 'signup' && !termsAccepted) ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s', letterSpacing: '-0.2px' }}
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

        {/* Google login */}
        {mode !== 'reset' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 14px' }}>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              <span style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>{isIT ? 'oppure' : 'or'}</span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || (mode === 'signup' && !termsAccepted)}
              style={{ width: '100%', padding: '11px 0', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#333', cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'border-color 0.15s' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.borderColor = '#bbb' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb' }}
            >
              <GoogleIcon />
              {isIT ? 'Continua con Google' : 'Continue with Google'}
            </button>
          </>
        )}

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
          <a href="/privacy" style={{ fontSize: 12, color: '#aaa', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = '#378ADD'}
            onMouseLeave={e => e.currentTarget.style.color = '#aaa'}
          >Privacy Policy</a>
          <a href="/terms" style={{ fontSize: 12, color: '#aaa', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = '#378ADD'}
            onMouseLeave={e => e.currentTarget.style.color = '#aaa'}
          >Termini</a>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
