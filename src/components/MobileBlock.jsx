import { useState } from 'react'
import { useLang } from '../contexts/LangContext'

export default function MobileBlock({ onDismiss }) {
  const { t } = useLang()
  const [hover, setHover] = useState(false)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 32px', textAlign: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)', marginBottom: 32 }}>
        Olaboard
      </div>
      <div style={{ fontSize: 20, fontWeight: 650, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1.25, marginBottom: 14, maxWidth: 280 }}>
        {t('mobileBlockTitle')}
      </div>
      <div style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 260, marginBottom: 48 }}>
        {t('mobileBlockBody')}
      </div>
      <button
        onClick={onDismiss}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 14, color: hover ? 'var(--text)' : 'var(--text-muted)',
          transition: 'color 0.15s', padding: 0,
          textDecoration: hover ? 'underline' : 'none',
        }}
      >
        {t('mobileBlockContinue')}
      </button>
    </div>
  )
}
