import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── Styles ────────────────────────────────────────────────────────────────────
const ACCENT = '#378ADD'
const DARK = '#0f0f0f'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'
const FONT = "'Inter', system-ui, -apple-system, sans-serif"

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '12px 28px', fontSize: 15, fontWeight: 600,
  background: DARK, color: '#fff', border: 'none',
  borderRadius: 10, cursor: 'pointer', fontFamily: FONT,
  transition: 'opacity 0.15s',
}
const btnGhost = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '12px 28px', fontSize: 15, fontWeight: 600,
  background: 'transparent', color: DARK,
  border: `1.5px solid ${BORDER}`, borderRadius: 10,
  cursor: 'pointer', fontFamily: FONT,
  transition: 'border-color 0.15s',
}
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 14px', fontSize: 14, fontFamily: FONT,
  border: `1.5px solid ${BORDER}`, borderRadius: 8,
  outline: 'none', color: DARK, background: '#fff',
}

// ── Placeholder image ─────────────────────────────────────────────────────────
function PlaceholderImg({ width = '100%', height = 340, label = 'Screenshot' }) {
  return (
    <div style={{
      width, height, borderRadius: 12,
      background: '#f3f4f6',
      border: `1.5px dashed ${BORDER}`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 8, color: '#9ca3af', fontFamily: FONT,
    }}>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${BORDER}`,
      borderRadius: 12, padding: '28px 24px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: DARK, fontFamily: FONT }}>{title}</div>
      <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, fontFamily: FONT }}>{description}</div>
    </div>
  )
}

// ── Login form (inline) ───────────────────────────────────────────────────────
function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/board')
  }

  async function handleReset(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Inserisci prima la tua email'); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/board`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setResetSent(true)
  }

  if (resetSent) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
        <p style={{ fontSize: 14, color: DARK, margin: 0, fontFamily: FONT }}>Controlla la tua email</p>
        <p style={{ fontSize: 13, color: MUTED, marginTop: 8, fontFamily: FONT }}>
          Link di reset inviato a <strong>{email}</strong>
        </p>
        <button style={{ ...btnGhost, marginTop: 16, padding: '8px 20px', fontSize: 13 }}
          onClick={() => { setResetSent(false); setShowReset(false) }}>
          Torna al login
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={showReset ? handleReset : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 5, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="la@tua.email" required style={inputStyle}
          onFocus={e => { e.target.style.borderColor = ACCENT }} onBlur={e => { e.target.style.borderColor = BORDER }} />
      </div>

      {!showReset && (
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 5, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle}
            onFocus={e => { e.target.style.borderColor = ACCENT }} onBlur={e => { e.target.style.borderColor = BORDER }} />
        </div>
      )}

      {error && <p style={{ margin: 0, fontSize: 13, color: '#e03e3e', fontFamily: FONT }}>{error}</p>}

      <button type="submit" disabled={loading} style={{ ...btnPrimary, justifyContent: 'center', opacity: loading ? 0.6 : 1 }}>
        {loading ? '…' : showReset ? 'Invia link reset' : 'Accedi'}
      </button>

      <button type="button" style={{ background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', fontSize: 13, fontFamily: FONT, padding: 0, textAlign: 'left' }}
        onClick={() => { setShowReset(v => !v); setError(null) }}>
        {showReset ? '← Torna al login' : 'Password dimenticata?'}
      </button>
    </form>
  )
}

// ── Main LandingPage ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: FONT, color: DARK, background: '#fff', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${BORDER}`,
        padding: '0 40px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box',
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>Olaboard</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...btnGhost, padding: '7px 18px', fontSize: 13 }} onClick={() => navigate('/app')}>Try demo</button>
          <a href="#login" style={{ ...btnPrimary, padding: '7px 18px', fontSize: 13, textDecoration: 'none' }}>Sign in</a>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px' }}>

        {/* ── Hero ── */}
        <section style={{ padding: '100px 0 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: ACCENT, background: '#EBF4FF', borderRadius: 20, padding: '4px 12px', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Visual thinking tool
            </div>
            <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', margin: '0 0 20px' }}>
              Pensa per immagini.<br />
              <span style={{ color: ACCENT }}>Connetti le idee.</span>
            </h1>
            <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.7, margin: '0 0 36px', maxWidth: 420 }}>
              Olaboard è la lavagna infinita che mancava tra Miro e Notion. Post-it, frecce, cartelle annidate, note ricche — tutto in un'interfaccia veloce e senza distrazioni.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button style={btnPrimary} onClick={() => navigate('/app')}>
                Prova gratis — nessun account
              </button>
              <a href="#login" style={{ ...btnGhost, textDecoration: 'none' }}>Sign in →</a>
            </div>
          </div>
          <div>
            <PlaceholderImg height={400} label="Hero screenshot — canvas con post-it e frecce" />
          </div>
        </section>

        {/* ── Social proof / quick stats ── */}
        <section style={{ padding: '40px 0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { value: '∞', label: 'Canvas infiniti' },
            { value: '100 MB', label: 'Storage incluso' },
            { value: '0', label: 'Abbonamenti' },
            { value: '< 1s', label: 'Tempo di caricamento' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </section>

        {/* ── Feature: Canvas ── */}
        <section style={{ padding: '100px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <PlaceholderImg height={360} label="Screenshot — lavagna con post-it colorati, gruppi e frecce" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Canvas</div>
            <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', margin: '0 0 16px' }}>Una lavagna che non finisce mai</h2>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, margin: '0 0 24px' }}>
              Pan, zoom, drag — tutto fluido. Crea post-it colorati, collegali con frecce intelligenti, raggruppali in aree. La struttura emerge mentre pensi, non prima.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Post-it con 8 colori personalizzabili', 'Frecce con routing bezier e label', 'Gruppi ridimensionabili', 'Quick connect — trascina una freccia nel vuoto per creare una card', 'Multi-select con lasso o lista'].map(f => (
                <li key={f} style={{ fontSize: 14, color: MUTED, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: ACCENT, fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Feature: Notes ── */}
        <section style={{ padding: '0 0 100px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Note</div>
            <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', margin: '0 0 16px' }}>Dietro ogni idea, un documento</h2>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, margin: '0 0 24px' }}>
              Ogni post-it ha una nota completa con editor a blocchi ispirato a Notion. Scrivi con slash commands, formatta, inserisci immagini. Si salva automaticamente mentre scrivi.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Titoli H1/H2/H3, liste, citazioni, codice', 'Slash commands (/lista, /titolo…)', 'Immagini inline', 'Auto-save — nessun bottone Salva', 'Data creazione e ultima modifica'].map(f => (
                <li key={f} style={{ fontSize: 14, color: MUTED, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: ACCENT, fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
          <PlaceholderImg height={360} label="Screenshot — nota aperta con block editor" />
        </section>

        {/* ── Feature: Organization ── */}
        <section style={{ padding: '0 0 100px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <PlaceholderImg height={360} label="Screenshot — sidebar con folder tree e navigazione" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Organizzazione</div>
            <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', margin: '0 0 16px' }}>Struttura che si adatta a te</h2>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, margin: '0 0 24px' }}>
              Le cartelle sono canvas annidati — ci puoi entrare con un doppio click e ritrovare il percorso con il breadcrumb. Organizza in board, sotto-cartelle, etichette.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Cartelle annidate a profondità infinita', 'Sidebar ad albero collassabile', 'Etichette testuali sul canvas', 'Vista lista con ordinamento e bulk delete', 'Export in Markdown'].map(f => (
                <li key={f} style={{ fontSize: 14, color: MUTED, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: ACCENT, fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Feature grid ── */}
        <section style={{ padding: '0 0 100px' }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', margin: '0 0 12px', textAlign: 'center' }}>Tutto quello che ti serve, niente di più</h2>
          <p style={{ fontSize: 15, color: MUTED, textAlign: 'center', margin: '0 0 48px' }}>Senza abbonamenti, senza feature inutili.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            <FeatureCard icon="🖼" title="Immagini sul canvas" description="Trascina un'immagine direttamente sulla lavagna. Ridimensiona mantenendo le proporzioni, collega con frecce." />
            <FeatureCard icon="↩" title="Undo / Redo" description="Cronologia completa delle azioni con Cmd+Z / Cmd+Shift+Z. Copre spostamenti, creazioni, cancellazioni, connessioni." />
            <FeatureCard icon="🌗" title="Temi" description="Light, Dark e High Contrast (palette Commodore 64). Si adatta anche ai colori dei post-it." />
            <FeatureCard icon="⌨️" title="Keyboard first" description="S per selezionare, Q per quick connect, G per gruppi, T per testo libero. Naviga la sidebar solo con tastiera." />
            <FeatureCard icon="☁️" title="Sync cloud" description="Tutto salvato su Supabase in tempo reale. Apri da qualsiasi dispositivo, ritrovi esattamente dove hai lasciato." />
            <FeatureCard icon="🔒" title="Solo tuo" description="Nessuna collaborazione, nessun workspace aziendale. Un account, una mente, uno spazio." />
          </div>
        </section>

        {/* ── Keyboard shortcuts teaser ── */}
        <section style={{ padding: '0 0 100px' }}>
          <div style={{ background: DARK, borderRadius: 16, padding: '56px 64px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', color: '#fff', margin: '0 0 16px' }}>Costruito per la tastiera</h2>
              <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.7, margin: 0 }}>
                Ogni azione ha una scorciatoia. Dal canvas alla sidebar alla nota, puoi fare tutto senza toccare il mouse.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['S', 'Seleziona'],
                ['Q', 'Quick connect'],
                ['G', 'Gruppo'],
                ['T', 'Testo libero'],
                ['Cmd+Z', 'Undo'],
                ['Enter', 'Apri nota'],
                ['Tab', 'Board successiva'],
                ['Delete', 'Elimina'],
              ].map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <kbd style={{ background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{key}</kbd>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Login CTA ── */}
        <section id="login" style={{ padding: '0 0 120px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
          <div>
            <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', margin: '0 0 16px' }}>Inizia adesso</h2>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, margin: '0 0 32px' }}>
              Crea un account e inizia a usare Olaboard in meno di un minuto. O prova la versione demo senza registrazione — i dati restano nel tuo browser.
            </p>
            <button style={{ ...btnGhost, gap: 8 }} onClick={() => navigate('/app')}>
              ↗ Prova il demo — nessun account
            </button>
          </div>
          <div style={{ background: '#f9fafb', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 20px' }}>Accedi</p>
            <LoginForm />
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Olaboard</span>
        <span style={{ fontSize: 13, color: MUTED }}>
          Made by <a href="https://olab.quest" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, textDecoration: 'none' }}>olab.quest</a>
        </span>
        <span style={{ fontSize: 12, color: MUTED }}>v0.7.0</span>
      </footer>
    </div>
  )
}
