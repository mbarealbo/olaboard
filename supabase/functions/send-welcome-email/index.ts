import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const LOGO_B64 = 'PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+Cjx0aXRsZT5PbGFib2FyZCBsb2dvPC90aXRsZT4KPGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSIxNTAiIGZpbGw9IiNmZmZmZmYiLz4KPGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSIxNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjxwYXRoIGQ9Ik0gOTAgMjQwIEMgOTAgMTk1LCAxMTUgMTYwLCAxNTAgMTYwIEMgMTg1IDE2MCwgMjEwIDE5NSwgMjEwIDI0MCBMIDIxMCAyODAgTCA5MCAyODAgWiIgZmlsbD0iIzAwMDAwMCIvPgo8cGF0aCBkPSJNIDk1IDEzMCBDIDk1IDkwLCAxMjAgNjUsIDE1MCA2NSBDIDE4MCA2NSwgMjA1IDkwLCAyMDUgMTMwIEwgMjA1IDE5MCBDIDIwNSAyMjAsIDE4MCAyNDAsIDE1MCAyNDAgQyAxMjAgMjQwLCA5NSAyMjAsIDk1IDE5MCBaIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iNCIvPgo8cGF0aCBkPSJNIDkwIDEzMCBDIDkwIDgyLCAxMjAgNTUsIDE1MCA1NSBDIDE4MCA1NSwgMjEwIDgyLCAyMTAgMTMwIEwgMjM1IDEzNSBDIDI0MiAxMzcsIDI0NCAxNDEsIDI0NCAxNDUgTCAyNDQgMTQ5IEMgMjQ0IDE1MywgMjQwIDE1NSwgMjM1IDE1NCBMIDIxNSAxNTAgTCAyMTAgMTUwIEMgMjA1IDE1MCwgOTUgMTUwLCA5MCAxNTAgWiIgZmlsbD0iIzAwMDAwMCIvPgo8ZyB0cmFuc2Zvcm09InJvdGF0ZSgtOCAxMzUgMTI1KSI+CjxyZWN0IHg9IjExNiIgeT0iMTA3IiB3aWR0aD0iMzgiIGhlaWdodD0iMzgiIHJ4PSIyIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iNCIvPgo8bGluZSB4MT0iMTIyIiB5MT0iMTE5IiB4Mj0iMTQ2IiB5Mj0iMTE5IiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPGxpbmUgeDE9IjEyMiIgeTE9IjEyNyIgeDI9IjE0NiIgeTI9IjEyNyIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxsaW5lIHgxPSIxMjIiIHkxPSIxMzUiIHgyPSIxMzgiIHkyPSIxMzUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L2c+CjxjaXJjbGUgY3g9IjEzNSIgY3k9IjE3NSIgcj0iNSIgZmlsbD0iIzAwMDAwMCIvPgo8Y2lyY2xlIGN4PSIxNzUiIGN5PSIxNzUiIHI9IjUiIGZpbGw9IiMwMDAwMDAiLz4KPHBhdGggZD0iTSAxNzUgMTg1IEMgMTgyIDE4MCwgMTkwIDE4MywgMTkwIDE5MCBDIDE5MCAxOTUsIDE4NSAyMDAsIDE3OCAxOTgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHBhdGggZD0iTSAxNDAgMjEwIEMgMTQ1IDIxNSwgMTYwIDIxNSwgMTY1IDIxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K'

function welcomeHtml(email: string) {
  const logoImg = `<img src="data:image/svg+xml;base64,${LOGO_B64}" alt="Olaboard" width="40" height="40" style="display:block;">`
  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Benvenuto su Olaboard</title></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:system-ui,-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:40px 0;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="background:#ffffff;border-radius:12px 12px 0 0;padding:28px 40px;border-bottom:3px solid #378ADD;">
<table cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:12px;">${logoImg}</td>
<td style="vertical-align:middle;"><span style="font-size:22px;font-weight:700;color:#333333;letter-spacing:-0.5px;">Olaboard</span></td>
</tr></table></td></tr>
<tr><td style="background:#ffffff;padding:36px 40px;">
<h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#333333;letter-spacing:-0.3px;">Benvenuto su Olaboard!</h1>
<div style="font-size:15px;line-height:1.7;color:#333333;">
<p style="margin:0 0 16px;">Il tuo account è pronto. Puoi iniziare subito a organizzare le tue idee con post-it, frecce e lavagne annidate.</p>
<p style="margin:0 0 8px;font-weight:600;">Qualche cosa per cominciare:</p>
<ul style="margin:0 0 16px;padding-left:20px;">
<li style="margin-bottom:6px;">Doppio click sul canvas per creare un post-it</li>
<li style="margin-bottom:6px;">Trascina dai pallini laterali per collegare le idee</li>
<li style="margin-bottom:6px;">Usa <strong>Tab</strong> per navigare tra le lavagne</li>
</ul>
<p style="margin:0;">Buona fortuna con i tuoi progetti!</p>
</div>
<table cellpadding="0" cellspacing="0" style="margin-top:32px;"><tr>
<td style="background:#378ADD;border-radius:8px;">
<a href="https://olaboard.com" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Apri Olaboard</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#f8f8f8;border-radius:0 0 12px 12px;padding:20px 40px;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:13px;color:#888888;">Hai ricevuto questa email perché hai creato un account su <a href="https://olaboard.com" style="color:#378ADD;text-decoration:none;">olaboard.com</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`
}

Deno.serve(async (req) => {
  const payload = await req.json()

  // Database webhook payload: { type: 'INSERT', record: { id, plan, ... } }
  const userId = payload?.record?.id
  if (!userId) return new Response('No user id', { status: 400 })

  const { data: user, error } = await supabase.auth.admin.getUserById(userId)
  if (error || !user?.user?.email) {
    console.error('Could not fetch user email:', error)
    return new Response('User not found', { status: 404 })
  }

  const email = user.user.email

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Olaboard <hellolaboard@olab.quest>',
      to: email,
      subject: 'Benvenuto su Olaboard!',
      html: welcomeHtml(email),
    }),
  })

  return new Response(JSON.stringify({ sent: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
