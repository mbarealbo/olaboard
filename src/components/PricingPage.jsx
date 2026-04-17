import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import OlaboardLogo from './OlaboardLogo'

const GITHUB_URL = 'https://github.com/mbarealbo/olaboard'

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return w
}

function GithubIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.026 2.747-1.026.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.338 4.695-4.566 4.944.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.579.688.481C19.138 20.2 22 16.447 22 12.021 22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

const FREE_FEATURES = [
  '3 boards',
  '150 cards per canvas',
  '30 total canvases',
  '20 MB image storage',
  'Unlimited notes',
  'Block editor',
  'Sync across devices',
]

const PRO_FEATURES = [
  'Unlimited boards',
  'Unlimited cards',
  'Unlimited canvases',
  '100 MB image storage',
  'Unlimited notes',
  'Block editor',
  'Sync across devices',
  'Priority support',
]

const SELF_FEATURES = [
  'Everything unlimited',
  'Your own Supabase',
  'Your own storage',
  'Full source code (MIT)',
  'No subscription ever',
]

export default function PricingPage() {
  useEffect(() => { document.title = 'Pricing — Olaboard' }, [])
  const navigate = useNavigate()
  const width = useWindowWidth()
  const isMobile = width < 640
  const px = isMobile ? '18px' : '40px'
  const [yearly, setYearly] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', color: '#0a0a0a', overflowX: 'hidden' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 54, zIndex: 100, display: 'flex', alignItems: 'center', padding: `0 ${px}`, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate('/landing')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><OlaboardLogo size={20} fontSize={15} /></button>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate('/landing')} style={{ fontSize: 13, fontWeight: 600, background: 'transparent', color: '#555', border: 'none', borderRadius: 8, cursor: 'pointer', padding: '8px 14px', marginRight: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = '#111'} onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >← Back</button>
        <button onClick={() => navigate('/app')} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 650, background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.82'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >Try free →</button>
      </nav>

      {/* Hero */}
      <section style={{ padding: `120px ${px} 60px`, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0f7ff', border: '1px solid #d0e6ff', borderRadius: 100, padding: '5px 14px', marginBottom: 22, fontSize: 12, fontWeight: 600, color: '#378ADD' }}>
          Simple, honest pricing
        </div>
        <h1 style={{ fontSize: isMobile ? 36 : 'clamp(40px, 5vw, 60px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 16 }}>
          Free to use.<br /><span style={{ color: '#378ADD' }}>Pro if you want more.</span>
        </h1>
        <p style={{ fontSize: 16, color: '#777', maxWidth: 420, margin: '0 auto 36px', lineHeight: 1.65 }}>
          Demo and self-hosted are always free. No credit card ever required to start.
        </p>

        {/* Monthly / yearly toggle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#f5f5f5', borderRadius: 100, padding: '4px', marginBottom: 56 }}>
          <button onClick={() => setYearly(false)} style={{ padding: '6px 18px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: !yearly ? '#fff' : 'transparent', color: !yearly ? '#111' : '#888', boxShadow: !yearly ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', transition: 'all 0.15s' }}>Monthly</button>
          <button onClick={() => setYearly(true)} style={{ padding: '6px 18px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: yearly ? '#fff' : 'transparent', color: yearly ? '#111' : '#888', boxShadow: yearly ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 7 }}>
            Yearly <span style={{ fontSize: 10, fontWeight: 700, background: '#e8f5e9', color: '#2e7d32', borderRadius: 20, padding: '1px 7px' }}>Save 37%</span>
          </button>
        </div>
      </section>

      {/* Plans */}
      <section style={{ padding: `0 ${px} 100px` }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch' }}>

          {/* Free */}
          <div style={{ flex: '1 1 260px', maxWidth: 300, border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px 26px 32px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Free</div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-2px' }}>€0</span>
              <span style={{ fontSize: 14, color: '#999', marginLeft: 4 }}>forever</span>
            </div>
            <button onClick={() => navigate('/app')} style={{ width: '100%', padding: '11px 0', borderRadius: 9, border: '1.5px solid #e0e0e0', background: '#fff', fontSize: 14, fontWeight: 650, cursor: 'pointer', marginBottom: 28, transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#bbb'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e0e0e0'}
            >Try demo →</button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {FREE_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Check size={14} style={{ color: '#378ADD', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: '#555', lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div style={{ flex: '1 1 260px', maxWidth: 300, border: '2px solid #378ADD', borderRadius: 16, padding: '28px 26px 32px', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 8px 32px rgba(55,138,221,0.12)' }}>
            <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#378ADD', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 12px', borderRadius: 20 }}>Most popular</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#378ADD', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Pro</div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-2px' }}>{yearly ? '€3.75' : '€6'}</span>
              <span style={{ fontSize: 14, color: '#999', marginLeft: 4 }}>/month</span>
              {yearly && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>billed €45/year</div>}
            </div>
            <button onClick={() => navigate('/login')} style={{ width: '100%', padding: '11px 0', borderRadius: 9, border: 'none', background: '#378ADD', color: '#fff', fontSize: 14, fontWeight: 650, cursor: 'pointer', marginBottom: 28, transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.84'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Get started <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} /></button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {PRO_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Check size={14} style={{ color: '#378ADD', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: '#555', lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Self-hosted */}
          <div style={{ flex: '1 1 260px', maxWidth: 300, border: '1px solid #e5e7eb', borderRadius: 16, padding: '28px 26px 32px', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Self-hosted</div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-2px' }}>€0</span>
              <span style={{ fontSize: 14, color: '#999', marginLeft: 4 }}>forever</span>
            </div>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ width: '100%', padding: '11px 0', borderRadius: 9, border: '1.5px solid #e0e0e0', background: '#fff', fontSize: 14, fontWeight: 650, cursor: 'pointer', marginBottom: 28, textDecoration: 'none', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'border-color 0.15s', boxSizing: 'border-box' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#bbb'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e0e0e0'}
            ><GithubIcon size={14} /> View on GitHub</a>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {SELF_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Check size={14} style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: '#555', lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ-style note */}
        <div style={{ maxWidth: 580, margin: '56px auto 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13.5, color: '#999', lineHeight: 1.7 }}>
            The <strong style={{ color: '#555' }}>demo at <code style={{ fontSize: 12 }}>/app</code></strong> is always free and unlimited — data lives in your browser, no account needed.<br />
            <strong style={{ color: '#555' }}>Self-hosting</strong> is always free: clone the repo, plug in your own Supabase, and all limits disappear. The code is MIT.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: `22px ${px}`, display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid #f0f0f0' }}>
        <OlaboardLogo size={16} fontSize={13} />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#ccc' }}>Made with ♥ by Albo — <a href="https://olab.quest" target="_blank" rel="noreferrer" style={{ color: '#ccc', textDecoration: 'none' }}>olab.quest</a></span>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#999', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#111'} onMouseLeave={e => e.currentTarget.style.color = '#999'}
        ><GithubIcon size={14} /> ★ Star on GitHub</a>
      </footer>
    </div>
  )
}
