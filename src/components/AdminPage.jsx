import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const fmt = d => d
  ? new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'

const fmtMb = bytes => bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '0 MB'

const PLAN_STYLE = {
  god:  { background: '#ede9fe', color: '#7c3aed' },
  pro:  { background: '#dbeafe', color: '#1d4ed8' },
  free: { background: '#f3f4f6', color: '#6b7280' },
}

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

export default function AdminPage() {
  const [users, setUsers] = useState(null)
  const [updating, setUpdating] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login', { replace: true }); return }

      supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', session.user.id).then(() => {})

      const { data, error } = await supabase.rpc('admin_get_users')
      if (error || !data?.length) { navigate('/board', { replace: true }); return }
      setUsers(data)
    })()
  }, [navigate])

  const changePlan = async (userId, newPlan) => {
    setUpdating(u => ({ ...u, [userId]: true }))
    const { error } = await supabase.rpc('admin_update_user_plan', { target_id: userId, new_plan: newPlan })
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u))
    }
    setUpdating(u => ({ ...u, [userId]: false }))
  }

  if (!users) return null

  const totalStorage = users.reduce((s, u) => s + (u.storage_bytes || 0), 0)
  const totalCards = users.reduce((s, u) => s + (u.card_count || 0), 0)
  const proCount = users.filter(u => u.plan === 'pro').length
  const godCount = users.filter(u => u.plan === 'god').length
  const active7d = users.filter(u => u.last_active_at && u.last_active_at > sevenDaysAgo).length

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8', fontFamily: 'system-ui, sans-serif', padding: '32px 32px 64px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <a href="/board" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#111', letterSpacing: '-0.5px' }}>Olaboard</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#7b2fff', color: '#fff', padding: '2px 7px', borderRadius: 5, letterSpacing: 0.5 }}>OPS</span>
          </a>
          <a href="/board" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← back to board
          </a>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total users', value: users.length },
            { label: 'Pro', value: proCount, color: '#1d4ed8' },
            { label: 'God', value: godCount, color: '#7c3aed' },
            { label: 'Active 7d', value: active7d, color: '#059669' },
            { label: 'Total cards', value: totalCards },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color || '#111', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Storage summary */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{users.length} accounts</span>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{fmtMb(totalStorage)} total storage · {totalCards} cards</span>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Email', 'Plan', 'Registered', 'Last login', 'Last active', 'Cards', 'Storage'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const ps = PLAN_STYLE[u.plan] || PLAN_STYLE.free
                const isLast = i === users.length - 1
                const isUpdating = !!updating[u.id]
                return (
                  <tr key={u.id} style={{ borderBottom: isLast ? 'none' : '1px solid #f3f4f6', opacity: isUpdating ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                    <td style={cell}>{u.email}</td>
                    <td style={cell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ ...ps, padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{u.plan}</span>
                        <select
                          disabled={isUpdating}
                          value={u.plan}
                          onChange={e => changePlan(u.id, e.target.value)}
                          style={{ fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 5, padding: '2px 4px', color: '#6b7280', background: '#f9fafb', cursor: 'pointer', outline: 'none' }}
                        >
                          <option value="free">free</option>
                          <option value="pro">pro</option>
                          <option value="god">god</option>
                        </select>
                      </div>
                    </td>
                    <td style={{ ...cell, color: '#6b7280' }}>{fmt(u.created_at)}</td>
                    <td style={{ ...cell, color: '#6b7280' }}>{fmt(u.last_sign_in_at)}</td>
                    <td style={{ ...cell, color: u.last_active_at ? '#111' : '#9ca3af' }}>{fmt(u.last_active_at)}</td>
                    <td style={{ ...cell, color: u.card_count > 0 ? '#111' : '#9ca3af' }}>{u.card_count ?? 0}</td>
                    <td style={{ ...cell, color: u.storage_bytes > 0 ? '#111' : '#9ca3af' }}>{fmtMb(u.storage_bytes)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}

const cell = { padding: '11px 16px', fontSize: 13, color: '#374151', verticalAlign: 'middle' }
