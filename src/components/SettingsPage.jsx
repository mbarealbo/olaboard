import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { IS_SELF_HOSTED } from '../lib/env'

const SECTIONS = [
  { id: 'account',     label: 'Account' },
  ...(!IS_SELF_HOSTED ? [{ id: 'utilizzo', label: 'Piano & Utilizzo' }] : []),
  { id: 'preferenze', label: 'Preferenze' },
  { id: 'privacy',    label: 'Privacy' },
]

const fmtMb = b => b != null ? `${(b / 1024 / 1024).toFixed(1)} MB` : '…'

function UsageBar({ label, used, limit, unit = '' }) {
  const isUnlimited = limit === Infinity
  const pct = isUnlimited ? 0 : Math.min(100, (used / limit) * 100)
  const near = pct >= 80
  const full = pct >= 100
  const barColor = full ? '#e53935' : near ? '#f59e0b' : '#378ADD'

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: full ? '#e53935' : near ? '#b45309' : '#6b7280' }}>
          {isUnlimited
            ? <span style={{ color: '#059669', fontWeight: 600 }}>illimitato</span>
            : `${used} / ${limit}${unit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div style={{ height: 5, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 3, background: barColor, width: `${pct}%`, transition: 'width 0.4s ease' }} />
        </div>
      )}
    </div>
  )
}

export default function SettingsPage({
  userEmail, plan, limits,
  boardCount, totalCanvasCount, currentCardCount, currentConnectionCount,
  storageUsed,
  lang, setLang,
  userId, onClose,
  onUpgrade, onManagePlan, onDeleteAccount, onAdmin,
}) {
  const [active, setActive] = useState('account')

  const initials = (userEmail || '?').slice(0, 2).toUpperCase()
  const planLabel = plan === 'god' ? '⚡ God' : plan === 'pro' ? '★ Pro' : 'Free'
  const planStyle = plan === 'god'
    ? { background: '#ede9fe', color: '#7c3aed' }
    : plan === 'pro'
    ? { background: '#dbeafe', color: '#1d4ed8' }
    : { background: '#f3f4f6', color: '#6b7280' }

  const storagePct = limits.storageMB !== Infinity && storageUsed != null
    ? Math.min(100, (storageUsed / (limits.storageMB * 1024 * 1024)) * 100)
    : 0
  const storageNear = storagePct >= 80
  const storageFull = storagePct >= 100

  const sections = plan === 'god'
    ? [...SECTIONS, { id: 'admin', label: 'Admin' }]
    : SECTIONS

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: '#fff', display: 'flex', flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    }}>
      {/* Top bar */}
      <div style={{ height: 52, borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: '-0.3px' }}>Olaboard</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 22, lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}
          onMouseEnter={e => e.currentTarget.style.color = '#111'}
          onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
        >×</button>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 220, borderRight: '1px solid #e5e7eb', padding: '24px 12px', flexShrink: 0, background: '#fafafa' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.8, textTransform: 'uppercase', padding: '0 10px', marginBottom: 8 }}>Impostazioni</div>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', borderRadius: 7, border: 'none',
                fontSize: 14, fontWeight: active === s.id ? 600 : 400,
                background: active === s.id ? '#f3f4f6' : 'transparent',
                color: active === s.id ? '#111' : '#374151',
                cursor: 'pointer', marginBottom: 2,
                ...(s.id === 'admin' ? { color: '#7c3aed', fontWeight: 600 } : {}),
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px', maxWidth: 680 }}>

          {/* ── Account ── */}
          {active === 'account' && (
            <div>
              <h2 style={sectionTitle}>Account</h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, padding: '20px 24px', borderRadius: 12, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#378ADD', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 4 }}>{userEmail}</div>
                  <span style={{ ...planStyle, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10 }}>{planLabel}</span>
                </div>
              </div>

              <button
                onClick={() => supabase.auth.signOut()}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#e53935', background: 'none', border: '1px solid #fca5a5', borderRadius: 8, padding: '9px 16px', cursor: 'pointer' }}
              >Esci dall'account</button>
            </div>
          )}

          {/* ── Piano & Utilizzo ── */}
          {!IS_SELF_HOSTED && active === 'utilizzo' && (
            <div>
              <h2 style={sectionTitle}>Piano & Utilizzo</h2>

              {/* Plan card */}
              <div style={{ padding: '20px 24px', borderRadius: 12, border: `2px solid ${plan === 'pro' ? '#93c5fd' : plan === 'god' ? '#c4b5fd' : '#e5e7eb'}`, marginBottom: 32, background: plan === 'free' ? '#fff' : plan === 'pro' ? '#eff6ff' : '#f5f3ff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span style={{ ...planStyle, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 10 }}>{planLabel}</span>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
                      {plan === 'free' && 'Piano gratuito — aggiorna per sbloccare tutto.'}
                      {plan === 'pro' && 'Piano Pro attivo — tutto illimitato.'}
                      {plan === 'god' && 'God mode — accesso totale.'}
                    </div>
                  </div>
                  {plan === 'free' && userId !== 'local' && (
                    <button onClick={onUpgrade} style={{ fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#378ADD', color: '#fff', cursor: 'pointer' }}>
                      Passa a Pro →
                    </button>
                  )}
                  {plan === 'pro' && userId !== 'local' && (
                    <button onClick={onManagePlan} style={{ fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid #93c5fd', background: 'transparent', color: '#1d4ed8', cursor: 'pointer' }}>
                      Gestisci abbonamento
                    </button>
                  )}
                </div>
              </div>

              {/* Global usage */}
              <div style={subsectionTitle}>Utilizzo globale</div>
              <UsageBar label="Lavagne" used={boardCount} limit={limits.boards} />
              <UsageBar label="Canvas totali" used={totalCanvasCount} limit={limits.totalCanvases} />
              <div style={{ height: 1, background: '#f3f4f6', margin: '20px 0' }} />

              {/* Current canvas */}
              <div style={subsectionTitle}>Canvas corrente</div>
              <UsageBar label="Carte" used={currentCardCount} limit={limits.cardsPerCanvas} />
              <UsageBar label="Connessioni" used={currentConnectionCount} limit={limits.connectionsPerCanvas} />
              <div style={{ height: 1, background: '#f3f4f6', margin: '20px 0' }} />

              {/* Storage */}
              <div style={subsectionTitle}>Storage immagini</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Spazio usato</span>
                  <span style={{ fontSize: 12, color: storageFull ? '#e53935' : storageNear ? '#b45309' : '#6b7280' }}>
                    {limits.storageMB === Infinity
                      ? <span style={{ color: '#059669', fontWeight: 600 }}>illimitato</span>
                      : `${fmtMb(storageUsed)} / ${limits.storageMB} MB`}
                  </span>
                </div>
                {limits.storageMB !== Infinity && (
                  <div style={{ height: 5, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: storageFull ? '#e53935' : storageNear ? '#f59e0b' : '#378ADD', width: `${storagePct}%`, transition: 'width 0.4s ease' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Preferenze ── */}
          {active === 'preferenze' && (
            <div>
              <h2 style={sectionTitle}>Preferenze</h2>

              <div style={card}>
                <div style={cardLabel}>Lingua</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[['it','Italiano'],['en','English'],['es','Español'],['de','Deutsch']].map(([code, label]) => (
                    <button
                      key={code}
                      onClick={() => setLang(code)}
                      style={{ fontSize: 13, padding: '7px 16px', borderRadius: 8, border: `1px solid ${lang === code ? '#378ADD' : '#e5e7eb'}`, background: lang === code ? '#378ADD' : '#fff', color: lang === code ? '#fff' : '#374151', cursor: 'pointer', fontWeight: lang === code ? 600 : 400, fontFamily: 'inherit' }}
                    >{label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Privacy ── */}
          {active === 'privacy' && (
            <div>
              <h2 style={sectionTitle}>Privacy & Sicurezza</h2>

              <div style={{ ...card, border: '1px solid #fca5a5' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 6 }}>Elimina account</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
                  Questa azione è irreversibile. Tutti i tuoi dati, lavagne e immagini verranno eliminati definitivamente.
                </div>
                <button
                  onClick={onDeleteAccount}
                  style={{ fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#e53935', color: '#fff', cursor: 'pointer' }}
                >
                  Elimina il mio account
                </button>
              </div>
            </div>
          )}

          {/* ── Admin ── */}
          {active === 'admin' && plan === 'god' && (
            <div>
              <h2 style={sectionTitle}>Admin</h2>
              <div style={card}>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Accedi al pannello admin per gestire utenti e piani.</div>
                <button
                  onClick={onAdmin}
                  style={{ fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#7b2fff', color: '#fff', cursor: 'pointer' }}
                >
                  Apri Admin →
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

const sectionTitle = { fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 24, letterSpacing: '-0.3px', marginTop: 0 }
const subsectionTitle = { fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }
const card = { padding: '20px 24px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fafafa', marginBottom: 16 }
const cardLabel = { fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }
