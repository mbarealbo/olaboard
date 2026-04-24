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

export default function AdminPage() {
  const [users, setUsers] = useState(null)
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

  if (!users) return null

  const totalStorage = users.reduce((s, u) => s + (u.storage_bytes || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8', fontFamily: 'system-ui, sans-serif', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', margin: 0 }}>Users</h1>
          <span style={{ fontSize: 13, color: '#888' }}>{users.length} accounts · {fmtMb(totalStorage)} total storage</span>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Email', 'Plan', 'Registered', 'Last login', 'Last active', 'Storage'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.6, textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const ps = PLAN_STYLE[u.plan] || PLAN_STYLE.free
                return (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={cell}>{u.email}</td>
                    <td style={cell}>
                      <span style={{ ...ps, padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{u.plan}</span>
                    </td>
                    <td style={{ ...cell, color: '#6b7280' }}>{fmt(u.created_at)}</td>
                    <td style={{ ...cell, color: '#6b7280' }}>{fmt(u.last_sign_in_at)}</td>
                    <td style={{ ...cell, color: u.last_active_at ? '#111' : '#9ca3af' }}>{fmt(u.last_active_at)}</td>
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
