function GithubIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.026 2.747-1.026.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.338 4.695-4.566 4.944.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.579.688.481C19.138 20.2 22 16.447 22 12.021 22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

export default function MobileBlock() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 32px', textAlign: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)', marginBottom: 40 }}>
        Olaboard
      </div>

      <div style={{ maxWidth: 300 }}>
        <div style={{ fontSize: 19, fontWeight: 650, color: 'var(--text)', letterSpacing: '-0.4px', lineHeight: 1.25, marginBottom: 10 }}>
          Olaboard is designed for larger screens.
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 28 }}>
          We're working on mobile &amp; touch support — follow along on GitHub.
        </div>

        <div style={{ width: '100%', height: 1, background: 'var(--border)', marginBottom: 28 }} />

        <div style={{ fontSize: 17, fontWeight: 650, color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1.25, marginBottom: 10 }}>
          Olaboard è pensato per schermi grandi.
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: 32 }}>
          Stiamo lavorando al supporto mobile e touch — seguici su GitHub per gli aggiornamenti.
        </div>
      </div>

      <a
        href="https://github.com/mbarealbo/olaboard"
        target="_blank"
        rel="noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '10px 18px', borderRadius: 8,
          border: '1px solid var(--border)',
          fontSize: 13, fontWeight: 600, color: 'var(--text)',
          textDecoration: 'none',
          background: 'var(--btn-bg)',
        }}
      >
        <GithubIcon size={15} /> Follow on GitHub
      </a>
    </div>
  )
}
