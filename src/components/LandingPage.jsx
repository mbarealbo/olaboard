import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Zap, GitBranch, FileText, Layers, ChevronRight } from 'lucide-react'
import OlaboardLogo from './OlaboardLogo'

function GithubIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.026 2.747-1.026.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.338 4.695-4.566 4.944.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.579.688.481C19.138 20.2 22 16.447 22 12.021 22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

const GITHUB_URL = 'https://github.com/mbarealbo/olaboard'

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return w
}

function FadeIn({ children, delay = 0, style = {} }) {
  const [ref, visible] = useFadeIn()
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`, ...style }}>
      {children}
    </div>
  )
}

// ── Scaled mockup container ───────────────────────────────────────────────────
function ScaledMockup({ children, naturalW, naturalH, radius = 16, shadow = true }) {
  const ref = useRef(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new ResizeObserver(([e]) => setScale(e.contentRect.width / naturalW))
    obs.observe(el)
    return () => obs.disconnect()
  }, [naturalW])
  return (
    <div ref={ref} style={{
      width: '100%', height: naturalH * scale,
      borderRadius: radius, overflow: 'hidden',
      border: '1px solid #e5e7eb',
      boxShadow: shadow ? '0 2px 0 #e5e7eb, 0 20px 60px rgba(0,0,0,0.10)' : 'none',
    }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: naturalW, height: naturalH }}>
        {children}
      </div>
    </div>
  )
}

// ── Curved arrow ──────────────────────────────────────────────────────────────
function CurvedArrow({ x1, y1, x2, y2, bend = 32, markerId = 'mock-ah', opacity = 0.38 }) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const cpx = mx + (-dy / len) * bend, cpy = my + (dx / len) * bend
  return <path d={`M${x1},${y1} Q${cpx},${cpy} ${x2},${y2}`} fill="none" stroke="#378ADD" strokeWidth={1.6} strokeOpacity={opacity} markerEnd={`url(#${markerId})`} />
}

function ArrowDefs({ id = 'mock-ah' }) {
  return (
    <defs>
      <marker id={id} markerWidth="9" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="userSpaceOnUse">
        <polygon points="0 0, 9 3.5, 0 7" fill="#378ADD" opacity="0.55" />
      </marker>
    </defs>
  )
}

// ── Post-it helper ────────────────────────────────────────────────────────────
function MockCard({ x, y, w = 130, color, title, body, rotate = 0, selected = false, isFolder = false, showActions = false }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w,
      background: color, borderRadius: 2,
      padding: isFolder ? '18px 10px 8px' : '8px 10px 26px',
      boxShadow: selected
        ? `0 0 0 2px #378ADD, 3px 4px 10px rgba(0,0,0,0.15)`
        : '2px 3px 8px rgba(0,0,0,0.13)',
      transform: rotate ? `rotate(${rotate}deg)` : undefined,
      fontSize: 10, lineHeight: 1.4,
    }}>
      {isFolder && <div style={{ position: 'absolute', top: -9, left: 12, width: 38, height: 9, background: color, borderRadius: '3px 3px 0 0' }} />}
      {/* connection aura when showActions */}
      {showActions && (
        <div style={{ position: 'absolute', inset: -8, borderRadius: 6, border: '1.5px dashed rgba(55,138,221,0.35)', pointerEvents: 'none' }} />
      )}
      <div style={{ fontWeight: 650, color: '#1a1a1a', marginBottom: body ? 3 : 0, fontSize: 10.5 }}>{title}</div>
      {body && <div style={{ color: 'rgba(0,0,0,0.42)', fontSize: 9.5 }}>{body}</div>}
      {isFolder && <div style={{ fontSize: 8.5, color: 'rgba(0,0,0,0.35)', marginTop: 3 }}>📁 tap to open</div>}
      {showActions && (
        <div style={{ position: 'absolute', bottom: 5, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
          {['📝','📁','T'].map((icon, i) => (
            <div key={i} style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', border: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === 2 ? 9 : 10 }}>{icon}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Hero canvas mockup ────────────────────────────────────────────────────────
function HeroMockup() {
  return (
    <div style={{ width: 920, height: 460, background: '#f0f0f0', backgroundImage: 'radial-gradient(circle, #bbb 1px, transparent 1px)', backgroundSize: '20px 20px', position: 'relative', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44, background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8, zIndex: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 750, letterSpacing: '-0.4px' }}>Olaboard</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {['#FAC775','#b8e986','#89cff0','#ffb3c6'].map(c => <div key={c} style={{ width: 13, height: 13, borderRadius: '50%', background: c, border: '1.5px solid rgba(0,0,0,0.07)' }} />)}
        </div>
        <div style={{ width: 1, height: 14, background: '#e5e7eb', margin: '0 4px' }} />
        {['S','Q','G','T'].map(k => <div key={k} style={{ fontSize: 9, background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 3, padding: '1px 5px', color: '#888', fontFamily: 'monospace' }}>{k}</div>)}
      </div>

      {/* Arrows */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', top: 44 }}>
        <ArrowDefs id="ha" />
        <CurvedArrow x1={168} y1={90}  x2={218} y2={68}  bend={22}  markerId="ha" />
        <CurvedArrow x1={368} y1={74}  x2={422} y2={84}  bend={-18} markerId="ha" />
        <CurvedArrow x1={290} y1={100} x2={292} y2={170} bend={28}  markerId="ha" />
        <CurvedArrow x1={542} y1={94}  x2={548} y2={162} bend={-22} markerId="ha" />
        <CurvedArrow x1={152} y1={222} x2={205} y2={298} bend={30}  markerId="ha" />
        <CurvedArrow x1={425} y1={214} x2={455} y2={294} bend={-26} markerId="ha" />
        <CurvedArrow x1={658} y1={196} x2={642} y2={290} bend={24}  markerId="ha" />
      </svg>

      {/* Cards — mostly aligned, only 2-3 with slight tilt */}
      <div style={{ position: 'absolute', inset: 0, top: 44 }}>
        <MockCard x={38}  y={50}  w={130} color="#FAC775" title="Market research"    body="Competitive analysis"    rotate={0}    />
        <MockCard x={218} y={30}  w={148} color="#89cff0" title="User personas"      body="4 segments identified"  rotate={-1}   />
        <MockCard x={422} y={46}  w={120} color="#b8e986" title="Core features"      body="MVP scope locked"       rotate={0}    selected />
        <MockCard x={598} y={34}  w={118} color="#d4a8ff" title="Tech stack"         body="React · Node · Postgres" rotate={1}   />
        <MockCard x={50}  y={172} w={140} color="#ffb3c6" title="Pricing strategy"   body="3 tiers + freemium"     rotate={0}    />
        <MockCard x={258} y={162} w={130} color="#FAC775" title="Launch plan"        body="3 phases · Q3"          rotate={0}    />
        <MockCard x={460} y={158} w={142} color="#b8e986" title="Growth channels"    body="SEO, Product Hunt, cold" rotate={0}   />
        <MockCard x={658} y={150} w={118} color="#89cff0" title="Waitlist"           body="1.2k signups"           rotate={1.2}  />
        <MockCard x={58}  y={300} w={125} color="#f5f5f5" title="Analytics setup"    body="Mixpanel + PostHog"     rotate={0}    />
        <MockCard x={262} y={292} w={148} color="#d4a8ff" title="API & docs"         body="REST · webhooks · SDK"  rotate={0}    />
        <MockCard x={488} y={286} w={122} color="#FAC775" title="Mobile app"         body="iOS first · v2.0"       rotate={0}    />
        <MockCard x={678} y={280} w={112} color="#ffb3c6" title="Roadmap Q4"         body="Next 3 quarters"        rotate={-1}   />
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, rgba(240,240,240,0.96))' }} />
    </div>
  )
}

// ── Note mockup ───────────────────────────────────────────────────────────────
function NoteMockup() {
  return (
    <div style={{ width: 680, height: 430, display: 'flex', background: '#fff', borderRadius: 0 }}>
      {/* Mini canvas side */}
      <div style={{ width: 200, background: '#f0f0f0', backgroundImage: 'radial-gradient(circle, #bbb 1px, transparent 1px)', backgroundSize: '20px 20px', position: 'relative', overflow: 'hidden', borderRight: '1px solid #e5e7eb', flexShrink: 0 }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          <ArrowDefs id="na" />
          <CurvedArrow x1={100} y1={104} x2={55}  y2={200} bend={-28} markerId="na" />
          <CurvedArrow x1={110} y1={104} x2={130} y2={195} bend={26}  markerId="na" />
        </svg>
        <MockCard x={18} y={44}  w={130} color="#FAC775" title="Landing page copy" body="Hero, features, pricing" rotate={0} selected showActions />
        <MockCard x={14} y={195} w={115} color="#89cff0" title="Design system"     body="Tokens & components"     rotate={-1.5} />
        <MockCard x={58} y={310} w={120} color="#b8e986" title="Onboarding"        body="3-step flow"             rotate={1}   />
      </div>

      {/* Note panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#fff' }}>
        <div style={{ height: 40, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#ccc', letterSpacing: 1, textTransform: 'uppercase' }}>Notes</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: '#ddd' }}>⤢  ×</span>
        </div>
        <div style={{ padding: '14px 20px 8px', borderBottom: '2px solid #378ADD' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: '-0.3px' }}>Landing page copy</div>
        </div>
        <div style={{ padding: '8px 20px', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 9.5, color: '#bbb', fontWeight: 600, marginRight: 2 }}>Color</span>
          {['#FAC775','#EF9F27','#b8e986','#89cff0','#ffb3c6','#d4a8ff','#f5f5f5','#ff8a80'].map((c, i) => (
            <div key={i} style={{ width: 13, height: 13, borderRadius: '50%', background: c, border: i === 0 ? '2px solid #378ADD' : '1px solid rgba(0,0,0,0.08)', flexShrink: 0, cursor: 'pointer' }} />
          ))}
        </div>
        <div style={{ flex: 1, padding: '14px 20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#111', letterSpacing: '-0.5px', lineHeight: 1.2 }}>Hero section</div>
          <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7 }}>Lead with the <span style={{ background: '#fff8e1', borderRadius: 2, padding: '0 3px' }}>emotional benefit</span>, not the feature list. Bold, immediate, unmissable.</div>
          <div style={{ fontSize: 15, fontWeight: 650, color: '#222', letterSpacing: '-0.3px' }}>CTA copy ideas</div>
          {['Try it free — no signup required', 'Start thinking visually →', 'Open a blank board'].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: '#e03e3e', fontWeight: 700, fontSize: 13, lineHeight: 1.6, flexShrink: 0 }}>•</span>
              <span style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>{item}</span>
            </div>
          ))}
          <div style={{ borderLeft: '3px solid #e5e7eb', paddingLeft: 12, marginTop: 2 }}>
            <span style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>"Simplicity is the ultimate sophistication."</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 2 }}>
            <div style={{ width: 2, height: 15, background: '#378ADD', borderRadius: 1 }} />
            <span style={{ fontSize: 11.5, color: '#ccc' }}>Type something, or '/' for commands…</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Folder mockup ─────────────────────────────────────────────────────────────
function FolderMockup() {
  return (
    <div style={{ width: 520, height: 300, background: '#f0f0f0', backgroundImage: 'radial-gradient(circle, #bbb 1px, transparent 1px)', backgroundSize: '20px 20px', position: 'relative', overflow: 'hidden' }}>
      {/* Breadcrumb */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(6px)', borderRadius: 20, padding: '4px 12px', fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 5 }}>
        <span style={{ color: '#378ADD', fontWeight: 500 }}>My board</span>
        <span style={{ color: '#ccc' }}>›</span>
        <span style={{ fontWeight: 600, color: '#333' }}>Design system</span>
      </div>

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
        <ArrowDefs id="fa" />
        <CurvedArrow x1={165} y1={84}  x2={215} y2={66}  bend={-18} markerId="fa" />
        <CurvedArrow x1={355} y1={72}  x2={378} y2={152} bend={22}  markerId="fa" />
        <CurvedArrow x1={165} y1={188} x2={232} y2={206} bend={-16} markerId="fa" />
      </svg>

      <MockCard x={25}  y={28}  w={140} color="#EF9F27" title="Design system"   body="Tokens, components..." isFolder rotate={0}   />
      <MockCard x={215} y={20}  w={135} color="#89cff0" title="Typography"      body="Scale · weights"       rotate={0}    />
      <MockCard x={390} y={26}  w={110} color="#b8e986" title="Color tokens"    body="Light & dark"          rotate={1}    />
      <MockCard x={32}  y={156} w={130} color="#ffb3c6" title="Components"      body="Buttons, inputs..."    rotate={0}    />
      <MockCard x={230} y={146} w={140} color="#FAC775" title="Spacing system"  body="4 / 8 / 16 / 32px"    rotate={0}    />
      <MockCard x={400} y={152} w={105} color="#d4a8ff" title="Icons"           body="Lucide + custom"       rotate={-1}   />

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, background: 'linear-gradient(transparent, rgba(240,240,240,0.96))' }} />
    </div>
  )
}

// ── Nested canvas mockup ──────────────────────────────────────────────────────
function NestedCanvasMockup() {
  const dotBg = { background: '#f0f0f0', backgroundImage: 'radial-gradient(circle, #bbb 1px, transparent 1px)', backgroundSize: '20px 20px' }
  const panelStyle = (opacity = 1) => ({
    flex: 1, height: '100%', position: 'relative', overflow: 'hidden',
    borderRadius: 10, border: '1px solid #e0e0e0',
    boxShadow: `0 4px 20px rgba(0,0,0,${0.07 * opacity})`,
    opacity,
    ...dotBg,
  })
  const breadcrumb = (parts) => (
    <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(6px)', borderRadius: 16, padding: '3px 10px', fontSize: 9.5, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', zIndex: 5 }}>
      {parts.map((p, i) => [
        i > 0 && <span key={`sep-${i}`} style={{ color: '#ccc', margin: '0 1px' }}>›</span>,
        <span key={p} style={{ fontWeight: i === parts.length - 1 ? 700 : 500, color: i === parts.length - 1 ? '#111' : '#378ADD' }}>{p}</span>
      ])}
    </div>
  )
  return (
    <div style={{ width: 820, height: 300, display: 'flex', alignItems: 'center', gap: 0 }}>
      {/* Level 1 */}
      <div style={panelStyle()}>
        {breadcrumb(['My workspace'])}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <ArrowDefs id="na1" />
          <CurvedArrow x1={105} y1={108} x2={108} y2={192} bend={22}  markerId="na1" />
          <CurvedArrow x1={230} y1={104} x2={228} y2={188} bend={-18} markerId="na1" />
        </svg>
        <MockCard x={18}  y={50}  w={115} color="#EF9F27" title="Product"     body="Features, roadmap"   isFolder rotate={0} />
        <MockCard x={148} y={44}  w={105} color="#EF9F27" title="Marketing"   body="Campaigns, copy"    isFolder rotate={0} />
        <MockCard x={18}  y={176} w={110} color="#b8e986" title="Sprint 12"   body="6 tasks in progress" rotate={0} />
        <MockCard x={148} y={170} w={110} color="#89cff0" title="Team retro"  body="Bi-weekly notes"    rotate={0} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(transparent, rgba(240,240,240,0.9))' }} />
      </div>

      {/* Arrow between panels */}
      <div style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="36" height="20" style={{ overflow: 'visible' }}>
          <defs><marker id="pa1" markerWidth="7" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,7 3,0 6" fill="#378ADD" opacity="0.55" /></marker></defs>
          <line x1="4" y1="10" x2="28" y2="10" stroke="#378ADD" strokeWidth="1.5" strokeOpacity="0.45" markerEnd="url(#pa1)" strokeDasharray="4,3" />
        </svg>
      </div>

      {/* Level 2 */}
      <div style={panelStyle(0.92)}>
        {breadcrumb(['My workspace', 'Product'])}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <ArrowDefs id="na2" />
          <CurvedArrow x1={100} y1={108} x2={102} y2={186} bend={20}  markerId="na2" />
          <CurvedArrow x1={220} y1={100} x2={218} y2={182} bend={-18} markerId="na2" />
        </svg>
        <MockCard x={16}  y={48}  w={110} color="#EF9F27" title="Design"      body="UI, UX, assets"     isFolder rotate={0} />
        <MockCard x={140} y={42}  w={110} color="#EF9F27" title="Engineering" body="Infra, backend"     isFolder rotate={0} />
        <MockCard x={16}  y={170} w={106} color="#FAC775" title="Q3 goals"    body="3 OKRs defined"     rotate={0} />
        <MockCard x={140} y={164} w={108} color="#ffb3c6" title="User stories" body="14 open"           rotate={0} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(transparent, rgba(240,240,240,0.9))' }} />
      </div>

      {/* Arrow between panels */}
      <div style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="36" height="20" style={{ overflow: 'visible' }}>
          <defs><marker id="pa2" markerWidth="7" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0,7 3,0 6" fill="#378ADD" opacity="0.55" /></marker></defs>
          <line x1="4" y1="10" x2="28" y2="10" stroke="#378ADD" strokeWidth="1.5" strokeOpacity="0.45" markerEnd="url(#pa2)" strokeDasharray="4,3" />
        </svg>
      </div>

      {/* Level 3 */}
      <div style={panelStyle(0.82)}>
        {breadcrumb(['…', 'Product', 'Design'])}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <ArrowDefs id="na3" />
          <CurvedArrow x1={96}  y1={104} x2={98}  y2={178} bend={18}  markerId="na3" />
          <CurvedArrow x1={210} y1={98}  x2={208} y2={172} bend={-16} markerId="na3" />
        </svg>
        <MockCard x={14}  y={44}  w={105} color="#89cff0" title="Components"  body="Atoms, molecules"   rotate={0} selected />
        <MockCard x={132} y={38}  w={108} color="#b8e986" title="Tokens"      body="Colors, spacing"    rotate={0} />
        <MockCard x={14}  y={160} w={102} color="#d4a8ff" title="Prototypes"  body="Figma links"        rotate={0} />
        <MockCard x={130} y={154} w={106} color="#FAC775" title="Guidelines"  body="Docs + examples"    rotate={0} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(transparent, rgba(240,240,240,0.9))' }} />
      </div>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, body, delay, isMobile }) {
  return (
    <FadeIn delay={delay} style={{ flex: isMobile ? '1 1 100%' : '1 1 calc(50% - 8px)', minWidth: 0 }}>
      <div
        style={{ padding: '26px 26px 30px', background: '#fff', border: '1px solid #f0f0f0', borderRadius: 14, height: '100%', transition: 'box-shadow 0.2s, border-color 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.07)'; e.currentTarget.style.borderColor = '#e0e0e0' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#f0f0f0' }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 9, background: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: '#378ADD' }}>{icon}</div>
        <div style={{ fontSize: 14.5, fontWeight: 650, color: '#111', marginBottom: 7, letterSpacing: '-0.2px' }}>{title}</div>
        <div style={{ fontSize: 13, color: '#777', lineHeight: 1.65 }}>{body}</div>
      </div>
    </FadeIn>
  )
}

// ── Step ──────────────────────────────────────────────────────────────────────
function Step({ n, title, body, delay }) {
  return (
    <FadeIn delay={delay} style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#0a0a0a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{n}</div>
      <div>
        <div style={{ fontSize: 14.5, fontWeight: 650, color: '#111', marginBottom: 5, letterSpacing: '-0.2px' }}>{title}</div>
        <div style={{ fontSize: 13, color: '#777', lineHeight: 1.65 }}>{body}</div>
      </div>
    </FadeIn>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  useEffect(() => { document.title = 'Olaboard — Visual Thinking on an Infinite Canvas' }, [])
  const navigate = useNavigate()
  const width = useWindowWidth()
  const isMobile = width < 640
  const isTablet = width < 900

  const px = isMobile ? '18px' : isTablet ? '28px' : '40px'

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', color: '#0a0a0a', overflowX: 'hidden' }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 54, zIndex: 100, display: 'flex', alignItems: 'center', padding: `0 ${px}`, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <OlaboardLogo size={20} fontSize={15} />
        <div style={{ flex: 1 }} />
        {!isMobile && (
          <button onClick={() => navigate('/pricing')} style={{ fontSize: 13, fontWeight: 600, background: 'transparent', color: '#555', border: 'none', borderRadius: 8, cursor: 'pointer', padding: '8px 14px', marginRight: 2, transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#111'} onMouseLeave={e => e.currentTarget.style.color = '#555'}
          >Pricing</button>
        )}
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', fontSize: 13, fontWeight: 600, color: '#555', textDecoration: 'none', borderRadius: 8, border: '1px solid #e5e7eb', marginRight: 6, transition: 'color 0.15s, border-color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#111'; e.currentTarget.style.borderColor = '#bbb' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#e5e7eb' }}
        ><GithubIcon size={14} />{!isMobile && <span>★ Star on GitHub</span>}</a>
        {!isMobile && (
          <button onClick={() => navigate('/login')} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, background: 'transparent', color: '#555', border: 'none', borderRadius: 8, cursor: 'pointer', marginRight: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = '#111'}
            onMouseLeave={e => e.currentTarget.style.color = '#555'}
          >Sign in</button>
        )}
        <button onClick={() => navigate('/app')} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 650, background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'opacity 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.82'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >Try free →</button>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? '110px' : '130px'} ${px} ${isMobile ? '48px' : '64px'}`, textAlign: 'center' }}>
        <FadeIn>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0f7ff', border: '1px solid #d0e6ff', borderRadius: 100, padding: '5px 14px', marginBottom: 24, fontSize: 12, fontWeight: 600, color: '#378ADD' }}>
            <Zap size={11} /> Visual thinking, without the noise
          </div>
        </FadeIn>
        <FadeIn delay={80}>
          <h1 style={{ fontSize: isMobile ? 42 : 'clamp(48px, 6.5vw, 82px)', fontWeight: 800, lineHeight: 1.04, letterSpacing: isMobile ? '-1.5px' : 'clamp(-2px, -0.04em, -3px)', margin: '0 auto 20px', maxWidth: 740 }}>
            Your ideas deserve<br /><span style={{ color: '#378ADD' }}>a better canvas.</span>
          </h1>
        </FadeIn>
        <FadeIn delay={160}>
          <p style={{ fontSize: isMobile ? 15 : 17, color: '#666', maxWidth: 440, margin: '0 auto 32px', lineHeight: 1.65 }}>
            Olaboard is a minimalist whiteboard for thinking — post-its, arrows, notes, and nothing else.
          </p>
        </FadeIn>
        <FadeIn delay={240}>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/app')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 26px', fontSize: 14, fontWeight: 650, background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.84'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >Try demo <ArrowRight size={14} /></button>
            <button onClick={() => navigate('/login')} style={{ padding: '12px 22px', fontSize: 14, fontWeight: 600, background: '#fff', color: '#333', border: '1.5px solid #e0e0e0', borderRadius: 10, cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#bbb'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e0e0e0'}
            >Sign in</button>
          </div>
        </FadeIn>
      </section>

      {/* ── Hero mockup ─────────────────────────────────────────────────── */}
      <FadeIn delay={100} style={{ padding: `0 ${isMobile ? '12px' : px} ${isMobile ? '72px' : '100px'}` }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <ScaledMockup naturalW={920} naturalH={460}>
            <HeroMockup />
          </ScaledMockup>
        </div>
      </FadeIn>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? '64px' : '80px'} ${px}`, background: '#fafafa', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#378ADD', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>Features</div>
              <h2 style={{ fontSize: isMobile ? 28 : 'clamp(28px, 3.5vw, 40px)', fontWeight: 750, letterSpacing: '-1.2px', lineHeight: 1.1 }}>Everything you need.<br />Nothing you don't.</h2>
            </div>
          </FadeIn>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <FeatureCard delay={0}   isMobile={isMobile} icon={<Zap size={17} />}       title="Capture in seconds"    body="Double-click anywhere on the canvas to create a post-it. Ideas land before they slip away." />
            <FeatureCard delay={80}  isMobile={isMobile} icon={<GitBranch size={17} />}  title="Connect your thoughts" body="Draw arrows between cards to map relationships, flows, and dependencies visually." />
            <FeatureCard delay={160} isMobile={isMobile} icon={<FileText size={17} />}   title="Notes inside every card" body="Each post-it hides a full markdown editor. Write as much or as little as you need." />
            <FeatureCard delay={240} isMobile={isMobile} icon={<Layers size={17} />}     title="Group & nest infinitely" body="Convert cards to folders and navigate inside them. Each folder is its own canvas." />
          </div>
        </div>
      </section>

      {/* ── Notes section ───────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? '72px' : '100px'} ${px}` }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: isTablet ? 40 : 72, alignItems: 'center', flexDirection: isTablet ? 'column' : 'row' }}>
            <div style={{ flex: '0 0 auto', width: isTablet ? '100%' : 300 }}>
              <FadeIn>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#378ADD', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 }}>Notes</div>
                <h2 style={{ fontSize: isMobile ? 28 : 'clamp(26px, 3vw, 40px)', fontWeight: 750, letterSpacing: '-1.3px', lineHeight: 1.1, marginBottom: 18 }}>
                  Every post-it<br />is a note.
                </h2>
                <p style={{ fontSize: 13.5, color: '#777', lineHeight: 1.7, marginBottom: 26 }}>
                  Tap the note icon on any card to open a full markdown editor — write structured thoughts, lists, quotes and code right next to your idea.
                </p>
              </FadeIn>
              <FadeIn delay={80}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  {[
                    ['📝', 'Rich blocks — H1, lists, quotes, code'],
                    ['🎨', 'Color-code cards to signal priority'],
                    ['📁', 'Convert any card to a folder, click to navigate inside'],
                  ].map(([icon, text], i) => (
                    <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 14, lineHeight: 1, marginTop: 1 }}>{icon}</span>
                      <span style={{ fontSize: 13, color: '#555', lineHeight: 1.55 }}>{text}</span>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
            <FadeIn delay={100} style={{ flex: 1, minWidth: 0 }}>
              <ScaledMockup naturalW={680} naturalH={430}>
                <NoteMockup />
              </ScaledMockup>
            </FadeIn>
          </div>

          {/* Folder row */}
          <div style={{ marginTop: isMobile ? 56 : 80, display: 'flex', gap: isTablet ? 40 : 64, alignItems: 'center', flexDirection: isTablet ? 'column-reverse' : 'row' }}>
            <FadeIn delay={0} style={{ flex: 1, minWidth: 0 }}>
              <ScaledMockup naturalW={520} naturalH={300}>
                <FolderMockup />
              </ScaledMockup>
            </FadeIn>
            <div style={{ flex: '0 0 auto', width: isTablet ? '100%' : 280 }}>
              <FadeIn delay={80}>
                <h3 style={{ fontSize: isMobile ? 22 : 'clamp(20px, 2.5vw, 30px)', fontWeight: 750, letterSpacing: '-0.8px', lineHeight: 1.2, marginBottom: 14 }}>
                  Folders all the way down.
                </h3>
                <p style={{ fontSize: 13.5, color: '#777', lineHeight: 1.7 }}>
                  Convert any post-it into a folder with one click. Double-click to step inside — each folder is its own canvas. Nest your thinking as deep as you need.
                </p>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ── Infinite canvases ───────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? '72px' : '100px'} ${px}`, background: '#fafafa', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: isMobile ? 40 : 56 }}>
            <FadeIn>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#378ADD', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>Infinite depth</div>
              <h2 style={{ fontSize: isMobile ? 28 : 'clamp(28px, 3.5vw, 42px)', fontWeight: 750, letterSpacing: '-1.3px', lineHeight: 1.1, marginBottom: 16 }}>
                Boards inside boards<br />inside boards.
              </h2>
              <p style={{ fontSize: isMobile ? 14 : 15.5, color: '#777', maxWidth: 500, margin: '0 auto', lineHeight: 1.65 }}>
                Convert any post-it into a folder with one click. Each folder is its own canvas — navigate deep into your thinking without ever losing context.
              </p>
            </FadeIn>
          </div>
          <FadeIn delay={100}>
            <ScaledMockup naturalW={820} naturalH={300} radius={12}>
              <NestedCanvasMockup />
            </ScaledMockup>
          </FadeIn>
          <FadeIn delay={160}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? 28 : 48, marginTop: 40, flexWrap: 'wrap' }}>
              {[
                ['📁', 'One click to nest', 'Any card becomes a folder — tap the folder icon or use the action bar.'],
                ['🧭', 'Never get lost', 'The breadcrumb always shows where you are. One click to jump back up.'],
                ['∞', 'Unlimited depth', 'Nest as many levels as your project needs. No artificial limits.'],
              ].map(([icon, label, desc]) => (
                <div key={label} style={{ textAlign: 'center', maxWidth: 200 }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 650, color: '#111', marginBottom: 5 }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#888', lineHeight: 1.55 }}>{desc}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? '72px' : '100px'} ${px}`, background: '#fafafa', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ maxWidth: 840, margin: '0 auto', display: 'flex', gap: isTablet ? 40 : 80, alignItems: isTablet ? 'flex-start' : 'center', flexDirection: isTablet ? 'column' : 'row' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FadeIn>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#378ADD', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14 }}>How it works</div>
              <h2 style={{ fontSize: isMobile ? 26 : 'clamp(24px, 3vw, 36px)', fontWeight: 750, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: 36 }}>
                From blank canvas<br />to structured thinking.
              </h2>
            </FadeIn>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
              <Step n="1" delay={0}   title="Open a board"       body="Create a new board in one click. No templates, no friction — just a blank canvas." />
              <Step n="2" delay={100} title="Drop your ideas"    body="Double-click to add post-its. Drag, connect, and color-code as you think." />
              <Step n="3" delay={200} title="Build the structure" body="Group related cards, draw arrows, and open notes to add depth to any idea." />
            </div>
          </div>
          {!isMobile && (
            <FadeIn delay={100} style={{ flex: 1, minWidth: 0 }}>
              <ScaledMockup naturalW={420} naturalH={340} shadow={false}>
                <div style={{ width: 420, height: 340, background: '#f0f0f0', backgroundImage: 'radial-gradient(circle, #bbb 1px, transparent 1px)', backgroundSize: '20px 20px', position: 'relative' }}>
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                    <ArrowDefs id="wa" />
                    <CurvedArrow x1={135} y1={74}  x2={175} y2={148} bend={32}  markerId="wa" />
                    <CurvedArrow x1={245} y1={60}  x2={240} y2={148} bend={-28} markerId="wa" />
                    <CurvedArrow x1={190} y1={218} x2={190} y2={275} bend={28}  markerId="wa" />
                  </svg>
                  <MockCard x={28}  y={24}  w={110} color="#FAC775" title="Research"   body="User interviews"   rotate={0}    />
                  <MockCard x={168} y={20}  w={125} color="#89cff0" title="Wireframes" body="Lo-fi sketches"    rotate={0}    />
                  <MockCard x={300} y={24}  w={105} color="#b8e986" title="Prototype"  body="Figma flows"       rotate={1}    />
                  <MockCard x={50}  y={148} w={130} color="#ffb3c6" title="User test"  body="5 sessions done"   rotate={0}    />
                  <MockCard x={225} y={144} w={120} color="#FAC775" title="Iterate"    body="Feedback loops"    rotate={0}    />
                  <MockCard x={130} y={268} w={140} color="#d4a8ff" title="Launch 🚀"  body="Product Hunt · Q3" rotate={0}    />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(transparent, rgba(240,240,240,0.96))' }} />
                </div>
              </ScaledMockup>
            </FadeIn>
          )}
        </div>
      </section>

      {/* ── Video ───────────────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? '72px' : '100px'} ${px}` }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? 32 : 48 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#378ADD', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 }}>See it in action</div>
              <h2 style={{ fontSize: isMobile ? 26 : 'clamp(26px, 3vw, 38px)', fontWeight: 750, letterSpacing: '-1px', lineHeight: 1.1 }}>From idea to structure<br />in seconds.</h2>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 2px 0 #e5e7eb, 0 20px 60px rgba(0,0,0,0.10)' }}>
              <video src="/guide1.mp4" controls autoPlay muted loop playsInline style={{ width: '100%', display: 'block' }} />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: `${isMobile ? '72px' : '90px'} ${px}`, background: '#0a0a0a' }}>
        <FadeIn>
          <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: isMobile ? 30 : 'clamp(28px, 4vw, 50px)', fontWeight: 800, letterSpacing: '-1.8px', lineHeight: 1.08, color: '#fff', marginBottom: 18 }}>Start thinking visually.</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 32, lineHeight: 1.6 }}>No sign-up required. Open a board and start in seconds.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/app')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 26px', fontSize: 14, fontWeight: 650, background: '#378ADD', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.84'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >Open demo <ChevronRight size={14} /></button>
              <button onClick={() => navigate('/login')} style={{ padding: '12px 22px', fontSize: 14, fontWeight: 600, background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1.5px solid rgba(255,255,255,0.14)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.34)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              >Create account</button>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ padding: `22px ${px}`, display: 'flex', alignItems: 'center', gap: 16, borderTop: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 750, letterSpacing: '-0.3px' }}>Olaboard</span>
        <a href="/privacy" style={{ fontSize: 12, color: '#bbb', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#111'} onMouseLeave={e => e.currentTarget.style.color = '#bbb'}
        >Privacy Policy</a>
        <a href="/terms" style={{ fontSize: 12, color: '#bbb', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#111'} onMouseLeave={e => e.currentTarget.style.color = '#bbb'}
        >Termini e Condizioni</a>
        <button onClick={() => window.revisitCkyConsent?.()} style={{ fontSize: 12, color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#111'} onMouseLeave={e => e.currentTarget.style.color = '#bbb'}
        >Cookie Preferences</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#ccc' }}>Made with ♥ by Albo — <a href="https://olab.quest" target="_blank" rel="noreferrer" style={{ color: '#ccc', textDecoration: 'none', transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = '#111'} onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>olab.quest</a></span>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#999', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#111'}
          onMouseLeave={e => e.currentTarget.style.color = '#999'}
        ><GithubIcon size={14} /> ★ Star on GitHub</a>
      </footer>
    </div>
  )
}
