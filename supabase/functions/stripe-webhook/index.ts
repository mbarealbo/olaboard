import Stripe from 'npm:stripe@17'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const LOGO_IMG = `<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+Cjx0aXRsZT5PbGFib2FyZCBsb2dvPC90aXRsZT4KPGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSIxNTAiIGZpbGw9IiNmZmZmZmYiLz4KPGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSIxNDgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjxwYXRoIGQ9Ik0gOTAgMjQwIEMgOTAgMTk1LCAxMTUgMTYwLCAxNTAgMTYwIEMgMTg1IDE2MCwgMjEwIDE5NSwgMjEwIDI0MCBMIDIxMCAyODAgTCA5MCAyODAgWiIgZmlsbD0iIzAwMDAwMCIvPgo8cGF0aCBkPSJNIDk1IDEzMCBDIDk1IDkwLCAxMjAgNjUsIDE1MCA2NSBDIDE4MCA2NSwgMjA1IDkwLCAyMDUgMTMwIEwgMjA1IDE5MCBDIDIwNSAyMjAsIDE4MCAyNDAsIDE1MCAyNDAgQyAxMjAgMjQwLCA5NSAyMjAsIDk1IDE5MCBaIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iNCIvPgo8cGF0aCBkPSJNIDkwIDEzMCBDIDkwIDgyLCAxMjAgNTUsIDE1MCA1NSBDIDE4MCA1NSwgMjEwIDgyLCAyMTAgMTMwIEwgMjM1IDEzNSBDIDI0MiAxMzcsIDI0NCAxNDEsIDI0NCAxNDUgTCAyNDQgMTQ5IEMgMjQ0IDE1MywgMjQwIDE1NSwgMjM1IDE1NCBMIDIxNSAxNTAgTCAyMTAgMTUwIEMgMjA1IDE1MCwgOTUgMTUwLCA5MCAxNTAgWiIgZmlsbD0iIzAwMDAwMCIvPgo8ZyB0cmFuc2Zvcm09InJvdGF0ZSgtOCAxMzUgMTI1KSI+CjxyZWN0IHg9IjExNiIgeT0iMTA3IiB3aWR0aD0iMzgiIGhlaWdodD0iMzgiIHJ4PSIyIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iNCIvPgo8bGluZSB4MT0iMTIyIiB5MT0iMTE5IiB4Mj0iMTQ2IiB5Mj0iMTE5IiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPGxpbmUgeDE9IjEyMiIgeTE9IjEyNyIgeDI9IjE0NiIgeTI9IjEyNyIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxsaW5lIHgxPSIxMjIiIHkxPSIxMzUiIHgyPSIxMzgiIHkyPSIxMzUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L2c+CjxjaXJjbGUgY3g9IjEzNSIgY3k9IjE3NSIgcj0iNSIgZmlsbD0iIzAwMDAwMCIvPgo8Y2lyY2xlIGN4PSIxNzUiIGN5PSIxNzUiIHI9IjUiIGZpbGw9IiMwMDAwMDAiLz4KPHBhdGggZD0iTSAxNzUgMTg1IEMgMTgyIDE4MCwgMTkwIDE4MywgMTkwIDE5MCBDIDE5MCAxOTUsIDE4NSAyMDAsIDE3OCAxOTgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHBhdGggZD0iTSAxNDAgMjEwIEMgMTQ1IDIxNSwgMTYwIDIxNSwgMTY1IDIxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K" alt="Olaboard" width="40" height="40" style="display:block;">`

function emailTemplate(opts: {
  title: string
  headerColor: string
  body: string
  ctaText?: string
  ctaUrl?: string
}) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#ffffff;border-radius:12px 12px 0 0;padding:28px 40px;border-bottom:3px solid ${opts.headerColor};">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    ${LOGO_IMG}
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:700;color:#333333;letter-spacing:-0.5px;">Olaboard</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 40px;">
              <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#333333;letter-spacing:-0.3px;">${opts.title}</h1>
              <div style="font-size:15px;line-height:1.7;color:#333333;">
                ${opts.body}
              </div>
              ${opts.ctaText && opts.ctaUrl ? `
              <table cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td style="background:${opts.headerColor};border-radius:8px;">
                    <a href="${opts.ctaUrl}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${opts.ctaText}</a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f8f8;border-radius:0 0 12px 12px;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;color:#888888;">
                Hai ricevuto questa email perché hai un account su <a href="https://olaboard.com" style="color:#378ADD;text-decoration:none;">olaboard.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function upgradeHtml() {
  return emailTemplate({
    title: 'Benvenuto nel piano Pro!',
    headerColor: '#378ADD',
    body: `<p style="margin:0 0 12px;">Ottimo, il tuo upgrade è andato a buon fine.</p>
           <p style="margin:0 0 12px;">Da ora hai accesso a:</p>
           <ul style="margin:0 0 16px;padding-left:20px;">
             <li style="margin-bottom:6px;">Lavagne illimitate</li>
             <li style="margin-bottom:6px;">Nessun limite di post-it e connessioni</li>
             <li style="margin-bottom:6px;">Tutte le funzionalità avanzate</li>
           </ul>
           <p style="margin:0;">Buon lavoro!</p>`,
    ctaText: 'Apri Olaboard',
    ctaUrl: 'https://olaboard.com',
  })
}

function downgradeHtml() {
  return emailTemplate({
    title: 'Il tuo piano Pro è terminato',
    headerColor: '#EF9F27',
    body: `<p style="margin:0 0 12px;">Il tuo abbonamento <strong>Olaboard Pro</strong> è stato cancellato.</p>
           <p style="margin:0 0 12px;">Il tuo account è tornato al piano gratuito. Le tue lavagne esistenti sono ancora tutte al sicuro.</p>
           <p style="margin:0;">Puoi riattivarti in qualsiasi momento.</p>`,
    ctaText: 'Riattiva Pro',
    ctaUrl: 'https://olaboard.com',
  })
}

function paymentIssueHtml(status: string) {
  return emailTemplate({
    title: 'Problema con il tuo abbonamento',
    headerColor: '#e05c5c',
    body: `<p style="margin:0 0 12px;">C'è un problema con il pagamento del tuo abbonamento <strong>Olaboard Pro</strong>.</p>
           <p style="margin:0 0 16px;">Stato attuale: <strong>${status}</strong></p>
           <p style="margin:0;">Aggiorna il metodo di pagamento per evitare l'interruzione del servizio.</p>`,
    ctaText: 'Aggiorna pagamento',
    ctaUrl: 'https://olaboard.com',
  })
}

async function sendEmail(to: string, subject: string, html: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Olaboard <hellolaboard@olab.quest>',
      to,
      subject,
      html,
    }),
  })
}

async function getEmailByCustomerId(customerId: string): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) return null
  return (customer as Stripe.Customer).email
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('No signature', { status: 400 })

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    console.error('Webhook signature error:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const customerId = session.customer as string
        if (userId) {
          await supabase
            .from('profiles')
            .update({ plan: 'pro', stripe_customer_id: customerId })
            .eq('id', userId)
        }
        const email = session.customer_details?.email
        if (email) {
          await sendEmail(email, 'Benvenuto nel piano Pro! 🎉', upgradeHtml())
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        await supabase
          .from('profiles')
          .update({ plan: 'free' })
          .eq('stripe_customer_id', customerId)
        const email = await getEmailByCustomerId(customerId)
        if (email) {
          await sendEmail(email, 'Il tuo piano Pro è terminato', downgradeHtml())
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const active = sub.status === 'active' || sub.status === 'trialing'
        await supabase
          .from('profiles')
          .update({ plan: active ? 'pro' : 'free' })
          .eq('stripe_customer_id', customerId)
        if (!active) {
          const email = await getEmailByCustomerId(customerId)
          if (email) {
            await sendEmail(email, 'Problema con il tuo abbonamento Olaboard', paymentIssueHtml(sub.status))
          }
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
