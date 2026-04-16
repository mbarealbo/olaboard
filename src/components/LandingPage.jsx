import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Zap, GitBranch, FileText, Layers, ChevronRight } from 'lucide-react'

// ── Fade-in on scroll ──────────────────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function FadeIn({ children, delay = 0, style = {} }) {
  const [ref, visible] = useFadeIn()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      ...style,
    }}>{children}</div>
  )
}

// ── Canvas mockup ─────────────────────────────────────────────────────────────
const MOCK_CARDS = [
  { x: 60,  y: 60,  color: '#FAC775', title: 'Landing page copy',   body: 'Hero, features, pricing...' },
  { x: 250, y: 30,  color: '#89cff0', title: 'Design system',       body: 'Colors, typography, spacing' },
  { x: 450, y: 55,  color: '#b8e986', title: 'Onboarding flow',     body: '3-step tutorial at first login' },
  { x: 130, y: 195, color: '#ffb3c6', title: 'User interviews',     body: '' },
  { x: 340, y: 185, color: '#FAC775', title: 'Pricing model',       body: 'Free / Pro / Team tiers' },
  { x: 580, y: 160, color: '#d4a8ff', title: 'Mobile app',          body: 'iOS first, Android later' },
  { x: 60,  y: 320, color: '#f5f5f5', title: 'Analytics',           body: '' },
  { x: 280, y: 330, color: '#b8e986', title: 'API docs',            body: 'REST + webhooks' },
  { x: 490, y: 310, color: '#89cff0', title: 'Roadmap Q3',          body: 'Export, collab, mobile' },
]

const MOCK_ARROWS = [
  { x1: 190, y1: 97,  x2: 250, y2: 67 },
  { x1: 380, y1: 67,  x2: 450, y2: 80 },
  { x1: 315, y1: 97,  x2: 340, y2: 185 },
  { x1: 515, y1: 92,  x2: 580, y2: 185 },
  { x1: 200, y1: 232, x2: 280, y2: 330 },
  { x1: 470, y1: 222, x2: 490, y2: 310 },
]

function CanvasMockup() {
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: '#f0f0f0',
      backgroundImage: 'radial-gradient(circle, #c0c0c0 1px, transparent 1px)',
      backgroundSize: '20px 20px',
      overflow: 'hidden',
    }}>
      {/* Toolbar strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 44,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, zIndex: 10,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111', letterSpacing: '-0.3px' }}>Olaboard</span>
        <div style={{ flex: 1 }} />
        {['#FAC775','#b8e986','#89cff0'].map(c => (
          <div key={c} style={{ width: 14, height: 14, borderRadius: '50%', background: c, border: '1.5px solid rgba(0,0,0,0.08)' }} />
        ))}
        <div style={{ width: 1, height: 16, background: '#e5e7eb', margin: '0 4px' }} />
        {['S','Q','G'].map(k => (
          <div key={k} style={{ fontSize: 10, background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 4, padding: '1px 5px', color: '#888', fontFamily: 'monospace' }}>{k}</div>
        ))}
      </div>

      {/* SVG arrows */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', top: 44 }}>
        <defs>
          <marker id="mock-ah" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0 0, 10 3.5, 0 7" fill="#378ADD" opacity="0.6" />
          </marker>
        </defs>
        {MOCK_ARROWS.map((a, i) => (
          <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
            stroke="#378ADD" strokeWidth={1.5} strokeOpacity={0.4}
            strokeDasharray="none" markerEnd="url(#mock-ah)" />
        ))}
      </svg>

      {/* Post-its */}
      {MOCK_CARDS.map((c, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: c.x, top: c.y + 44,
          width: 130, minHeight: 74,
          background: c.color,
          borderRadius: 2,
          padding: '8px 10px',
          boxShadow: '2px 3px 7px rgba(0,0,0,0.11)',
          fontSize: 10,
        }}>
          <div style={{ fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4, marginBottom: c.body ? 4 : 0 }}>{c.title}</div>
          {c.body && <div style={{ color: 'rgba(0,0,0,0.45)', lineHeight: 1.4 }}>{c.body}</div>}
        </div>
      ))}

      {/* Bottom fade */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, rgba(240,240,240,0.95))' }} />
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, body, delay }) {
  return (
    <FadeIn delay={delay} style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        padding: '28px 28px 32px',
        background: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: 16,
        height: '100%',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#e0e0e0' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#f0f0f0' }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, color: '#378ADD' }}>
          {icon}
        </div>
        <div style={{ fontSize: 15, fontWeight: 650, color: '#111', marginBottom: 8, letterSpacing: '-0.2px' }}>{title}</div>
        <div style={{ fontSize: 13.5, color: '#777', lineHeight: 1.65 }}>{body}</div>
      </div>
    </FadeIn>
  )
}

// ── Note mockup ───────────────────────────────────────────────────────────────
function NoteMockup() {
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 0 #e5e7eb, 0 20px 60px rgba(0,0,0,0.10)',
      display: 'flex', height: 420,
      background: '#fff',
    }}>
      {/* Left: canvas with one open post-it */}
      <div style={{
        width: 220, flexShrink: 0,
        background: '#f0f0f0',
        backgroundImage: 'radial-gradient(circle, #c0c0c0 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        position: 'relative', overflow: 'hidden',
        borderRight: '1px solid #e5e7eb',
      }}>
        {/* Selected post-it */}
        <div style={{
          position: 'absolute', left: 28, top: 48,
          width: 130, background: '#FAC775',
          borderRadius: 2, padding: '8px 10px 28px',
          boxShadow: '0 0 0 2px #378ADD, 2px 3px 7px rgba(0,0,0,0.13)',
          fontSize: 10,
        }}>
          <div style={{ fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4, marginBottom: 3 }}>Landing page copy</div>
          <div style={{ color: 'rgba(0,0,0,0.45)', lineHeight: 1.4, fontSize: 9 }}>Hero, features, pricing...</div>
          {/* action bar */}
          <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
            {['📄','📁','T'].map((ic, i) => (
              <div key={i} style={{
                width: 18, height: 18, borderRadius: '50%',
                background: i === 0 ? '#378ADD' : 'rgba(255,255,255,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, color: i === 0 ? '#fff' : '#633806',
                border: '0.5px solid rgba(0,0,0,0.08)',
              }}>{ic}</div>
            ))}
          </div>
        </div>
        {/* Other cards in bg */}
        {[
          { x: 28, y: 200, color: '#89cff0',  title: 'Design system' },
          { x: 28, y: 298, color: '#b8e986', title: 'Onboarding' },
        ].map((c, i) => (
          <div key={i} style={{ position: 'absolute', left: c.x, top: c.y, width: 130, background: c.color, borderRadius: 2, padding: '8px 10px', boxShadow: '2px 3px 7px rgba(0,0,0,0.10)', fontSize: 10, fontWeight: 600, color: '#1a1a1a', opacity: 0.7 }}>{c.title}</div>
        ))}
      </div>

      {/* Right: note panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Panel header */}
        <div style={{ height: 40, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#bbb', letterSpacing: 1, textTransform: 'uppercase' }}>Notes</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 14, color: '#ccc', cursor: 'default' }}>⤢</span>
          <span style={{ fontSize: 16, color: '#ccc', cursor: 'default' }}>×</span>
        </div>
        {/* Title */}
        <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid #f5f5f5' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: '-0.3px' }}>Landing page copy</div>
        </div>
        {/* Color chips */}
        <div style={{ padding: '8px 20px 10px', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: 6 }}>
          {['#FAC775','#EF9F27','#b8e986','#89cff0','#ffb3c6','#d4a8ff','#f5f5f5','#ff8a80'].map((c, i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: c, border: i === 0 ? '2px solid #378ADD' : '1.5px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
          ))}
        </div>
        {/* Content */}
        <div style={{ flex: 1, padding: '14px 20px', overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* H1 block */}
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: '-0.5px', lineHeight: 1.2 }}>Hero section</div>
          {/* Paragraph */}
          <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7 }}>
            The headline needs to be bold and immediately clear. Focus on the <span style={{ background: '#fffbe6', borderRadius: 2, padding: '0 2px' }}>emotional benefit</span>, not the feature list.
          </div>
          {/* H2 */}
          <div style={{ fontSize: 15, fontWeight: 650, color: '#222', letterSpacing: '-0.3px', marginTop: 4 }}>CTA ideas</div>
          {/* List */}
          {['Try it free — no signup', 'Start thinking visually', 'Open a blank board →'].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: '#e03e3e', fontWeight: 700, fontSize: 13, lineHeight: 1.6, flexShrink: 0 }}>•</span>
              <span style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{item}</span>
            </div>
          ))}
          {/* Quote block */}
          <div style={{ borderLeft: '3px solid #e0e0e0', paddingLeft: 12, marginTop: 4 }}>
            <div style={{ fontSize: 12.5, color: '#999', fontStyle: 'italic', lineHeight: 1.6 }}>
              "Simplicity is the ultimate sophistication."
            </div>
          </div>
          {/* Cursor blink hint */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <div style={{ width: 1.5, height: 16, background: '#378ADD', animation: 'none', opacity: 0.8 }} />
            <span style={{ fontSize: 12, color: '#ccc' }}>Type something, or '/' for commands…</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Folder mockup ─────────────────────────────────────────────────────────────
function FolderMockup() {
  const cards = [
    { x: 20,  y: 24,  color: '#EF9F27', title: 'Design system',  isFolder: true },
    { x: 190, y: 16,  color: '#FAC775', title: 'Components' },
    { x: 20,  y: 136, color: '#89cff0', title: 'User research' },
    { x: 190, y: 128, color: '#b8e986', title: 'Interviews' },
  ]
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid #e5e7eb',
      boxShadow: '0 2px 0 #e5e7eb, 0 20px 60px rgba(0,0,0,0.08)',
      height: 260,
      background: '#f0f0f0',
      backgroundImage: 'radial-gradient(circle, #c0c0c0 1px, transparent 1px)',
      backgroundSize: '20px 20px',
      position: 'relative',
    }}>
      {cards.map((c, i) => (
        <div key={i} style={{ position: 'absolute', left: c.x, top: c.y, width: 130, background: c.color, borderRadius: 2, padding: c.isFolder ? '18px 10px 8px' : '8px 10px', boxShadow: '2px 3px 7px rgba(0,0,0,0.11)', fontSize: 10, fontWeight: 600, color: '#1a1a1a', position: 'absolute' }}>
          {c.isFolder && (
            <div style={{ position: 'absolute', top: -10, left: 12, width: 40, height: 10, background: c.color, borderRadius: '4px 4px 0 0' }} />
          )}
          <span style={{ left: c.x, top: c.y }}>{c.title}</span>
          {c.isFolder && <div style={{ fontSize: 8, color: 'rgba(0,0,0,0.35)', marginTop: 2 }}>📁 folder</div>}
        </div>
      ))}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <marker id="ah3" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0 0, 8 3, 0 6" fill="#378ADD" opacity="0.5" />
          </marker>
        </defs>
        <line x1="150" y1="61" x2="190" y2="53" stroke="#378ADD" strokeWidth={1.5} strokeOpacity={0.4} markerEnd="url(#ah3)" />
        <line x1="150" y1="173" x2="190" y2="165" stroke="#378ADD" strokeWidth={1.5} strokeOpacity={0.4} markerEnd="url(#ah3)" />
      </svg>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(transparent, rgba(240,240,240,0.95))' }} />
    </div>
  )
}

// ── Step ──────────────────────────────────────────────────────────────────────
function Step({ n, title, body, delay }) {
  return (
    <FadeIn delay={delay} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{n}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 650, color: '#111', marginBottom: 5, letterSpacing: '-0.2px' }}>{title}</div>
        <div style={{ fontSize: 13.5, color: '#777', lineHeight: 1.65 }}>{body}</div>
      </div>
    </FadeIn>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()

  const navBtn = (onClick, children, primary) => (
    <button onClick={onClick} style={{
      padding: primary ? '9px 20px' : '9px 16px',
      fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer',
      background: primary ? '#0a0a0a' : 'transparent',
      color: primary ? '#fff' : '#555',
      transition: 'opacity 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >{children}</button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', color: '#0a0a0a', overflowX: 'hidden' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 58, zIndex: 100,
        display: 'flex', alignItems: 'center', padding: '0 40px',
        background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <span style={{ fontSize: 15, fontWeight: 750, letterSpacing: '-0.5px', color: '#0a0a0a' }}>Olaboard</span>
        <div style={{ flex: 1 }} />
        {navBtn(() => navigate('/login'), 'Sign in', false)}
        {navBtn(() => navigate('/app'), 'Try free →', true)}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 130, paddingBottom: 60, textAlign: 'center', padding: '130px 24px 60px' }}>
        <FadeIn>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#f0f7ff', border: '1px solid #d0e6ff',
            borderRadius: 100, padding: '5px 14px', marginBottom: 28,
            fontSize: 12, fontWeight: 600, color: '#378ADD',
          }}>
            <Zap size={11} />
            Visual thinking, without the noise
          </div>
        </FadeIn>
        <FadeIn delay={80}>
          <h1 style={{
            fontSize: 'clamp(42px, 6.5vw, 82px)',
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: 'clamp(-2px, -0.04em, -3px)',
            color: '#0a0a0a',
            margin: '0 auto 22px',
            maxWidth: 760,
          }}>
            Your ideas deserve<br />
            <span style={{ color: '#378ADD' }}>a better canvas.</span>
          </h1>
        </FadeIn>
        <FadeIn delay={160}>
          <p style={{ fontSize: 17, color: '#666', maxWidth: 460, margin: '0 auto 36px', lineHeight: 1.65 }}>
            Olaboard is a minimalist whiteboard for thinking —
            post-its, arrows, notes, and nothing else.
          </p>
        </FadeIn>
        <FadeIn delay={240}>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/app')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '13px 28px', fontSize: 14, fontWeight: 650, background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Try demo <ArrowRight size={14} /></button>
            <button
              onClick={() => navigate('/login')}
              style={{ padding: '13px 24px', fontSize: 14, fontWeight: 600, background: '#fff', color: '#333', border: '1.5px solid #e0e0e0', borderRadius: 10, cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#bbb'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#e0e0e0'}
            >Sign in</button>
          </div>
        </FadeIn>
      </section>

      {/* ── Canvas preview ───────────────────────────────────────────────── */}
      <FadeIn delay={120} style={{ padding: '0 24px 100px' }}>
        <div style={{
          maxWidth: 960, margin: '0 auto',
          borderRadius: 20, overflow: 'hidden',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 0 #e5e7eb, 0 24px 60px rgba(0,0,0,0.10), 0 48px 100px rgba(0,0,0,0.06)',
          height: 460,
          position: 'relative',
        }}>
          <CanvasMockup />
        </div>
      </FadeIn>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px 100px', background: '#fafafa', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#378ADD', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Features</div>
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', fontWeight: 750, letterSpacing: '-1.5px', lineHeight: 1.1 }}>Everything you need.<br />Nothing you don't.</h2>
            </div>
          </FadeIn>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <FeatureCard delay={0} icon={<Zap size={18} />} title="Capture in seconds" body="Double-click anywhere to create a post-it. Your ideas land on the canvas before they slip away." />
            <FeatureCard delay={80} icon={<GitBranch size={18} />} title="Connect your thoughts" body="Draw arrows between ideas to map relationships, flows, and dependencies visually." />
            <FeatureCard delay={160} icon={<FileText size={18} />} title="Go deeper with notes" body="Each card has a full markdown editor behind it — write as much or as little as you need." />
            <FeatureCard delay={240} icon={<Layers size={18} />} title="Group & organize" body="Draw groups around related cards. Navigate into folders to nest your thinking infinitely deep." />
          </div>
        </div>
      </section>

      {/* ── Notes section ───────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 72, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Text */}
            <div style={{ flex: '0 0 320px', minWidth: 240 }}>
              <FadeIn>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#378ADD', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Notes</div>
                <h2 style={{ fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 750, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 20 }}>
                  Every post-it<br />is a note.
                </h2>
                <p style={{ fontSize: 14, color: '#777', lineHeight: 1.7, marginBottom: 28 }}>
                  Tap the note icon on any card to open a full markdown editor — write structured thoughts, lists, quotes, and code right next to your idea on the canvas.
                </p>
              </FadeIn>
              <FadeIn delay={80}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    ['📝', 'Rich text blocks — H1, lists, quotes, code'],
                    ['🎨', 'Color your card to signal priority or type'],
                    ['📁', 'Convert any card to a folder — click in to navigate'],
                  ].map(([icon, text], i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 15, lineHeight: 1, marginTop: 1 }}>{icon}</span>
                      <span style={{ fontSize: 13.5, color: '#555', lineHeight: 1.55 }}>{text}</span>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>

            {/* Note mockup */}
            <FadeIn delay={100} style={{ flex: 1, minWidth: 300 }}>
              <NoteMockup />
            </FadeIn>
          </div>

          {/* Folder row */}
          <div style={{ marginTop: 64, display: 'flex', gap: 56, alignItems: 'center', flexWrap: 'wrap' }}>
            <FadeIn delay={0} style={{ flex: 1, minWidth: 260 }}>
              <FolderMockup />
            </FadeIn>
            <div style={{ flex: '0 0 300px', minWidth: 220 }}>
              <FadeIn delay={80}>
                <h3 style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 750, letterSpacing: '-0.8px', lineHeight: 1.2, marginBottom: 14 }}>
                  Folders all the way down.
                </h3>
                <p style={{ fontSize: 14, color: '#777', lineHeight: 1.7 }}>
                  Convert any post-it into a folder with one click. Double-click to step inside — each folder is its own canvas. Nest your thinking as deep as you need.
                </p>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', gap: 80, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <FadeIn>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#378ADD', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>How it works</div>
              <h2 style={{ fontSize: 'clamp(26px, 3vw, 38px)', fontWeight: 750, letterSpacing: '-1.2px', lineHeight: 1.15, marginBottom: 40 }}>From blank canvas<br />to structured thinking.</h2>
            </FadeIn>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <Step n="1" delay={0}   title="Open a board" body="Create a new board in one click. No templates, no friction — just a blank canvas." />
              <Step n="2" delay={100} title="Drop your ideas" body="Double-click to add post-its. Drag, connect, and color-code as you think." />
              <Step n="3" delay={200} title="Build the structure" body="Group related cards, draw arrows, and open notes to add depth to any idea." />
            </div>
          </div>

          {/* Mini mockup 2 */}
          <FadeIn delay={100} style={{ flex: 1, minWidth: 260 }}>
            <div style={{
              borderRadius: 16, overflow: 'hidden',
              border: '1px solid #e5e7eb',
              boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
              height: 340,
              position: 'relative',
              background: '#f0f0f0',
              backgroundImage: 'radial-gradient(circle, #c0c0c0 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}>
              {[
                { x: 28,  y: 30,  color: '#FAC775', title: 'Research',  w: 110 },
                { x: 170, y: 20,  color: '#89cff0', title: 'Wireframes', w: 120 },
                { x: 50,  y: 150, color: '#b8e986', title: 'Prototype', w: 110 },
                { x: 190, y: 145, color: '#ffb3c6', title: 'User test',  w: 110 },
                { x: 100, y: 265, color: '#d4a8ff', title: 'Launch 🚀',  w: 140 },
              ].map((c, i) => (
                <div key={i} style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, background: c.color, borderRadius: 2, padding: '8px 10px', boxShadow: '2px 3px 7px rgba(0,0,0,0.10)', fontSize: 11, fontWeight: 600, color: '#1a1a1a' }}>{c.title}</div>
              ))}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                <defs>
                  <marker id="ah2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <polygon points="0 0, 8 3, 0 6" fill="#378ADD" opacity="0.5" />
                  </marker>
                </defs>
                {[[83, 96, 170, 57],[135, 57, 50, 150],[225, 57, 190, 145],[100, 187, 100, 265],[245, 182, 170, 265]].map(([x1,y1,x2,y2], i) => (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#378ADD" strokeWidth={1.5} strokeOpacity={0.35} markerEnd="url(#ah2)" />
                ))}
              </svg>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(transparent, rgba(240,240,240,0.95))' }} />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px 100px', background: '#0a0a0a' }}>
        <FadeIn>
          <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.08, color: '#fff', marginBottom: 20 }}>
              Start thinking visually.
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 36, lineHeight: 1.6 }}>
              No sign-up required. Open a board and start in seconds.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/app')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '13px 28px', fontSize: 14, fontWeight: 650, background: '#378ADD', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >Open demo <ChevronRight size={14} /></button>
              <button
                onClick={() => navigate('/login')}
                style={{ padding: '13px 24px', fontSize: 14, fontWeight: 600, background: 'transparent', color: 'rgba(255,255,255,0.65)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 10, cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
              >Create account</button>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ padding: '28px 40px', display: 'flex', alignItems: 'center', borderTop: '1px solid #f0f0f0' }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.3px', color: '#0a0a0a' }}>Olaboard</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#bbb' }}>Made with ♥ by Albo</span>
      </footer>
    </div>
  )
}
