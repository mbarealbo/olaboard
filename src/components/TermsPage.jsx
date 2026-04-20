import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../contexts/LangContext'
import OlaboardLogo from './OlaboardLogo'

const CONTACT_EMAIL = 'privacy@olab.quest'
const COMPANY = 'Olab Quest di Alberto Abate'
const VAT = '05532500872'
const LAST_UPDATED = '20 aprile 2026'
const LAST_UPDATED_EN = 'April 20, 2026'

// ─── Sub-processors (keep in sync with PrivacyPage.jsx when adding services) ──
// Supabase — auth (email+password, Google OAuth), database, storage
// Stripe   — payments and subscription management
// Netlify  — hosting
// Google   — OAuth social login
// Resend   — transactional email (welcome, payment notifications)

const content = {
  it: {
    title: 'Termini e Condizioni',
    updated: `Ultimo aggiornamento: ${LAST_UPDATED}`,
    sections: [
      {
        title: '1. Fornitore del servizio',
        body: `Olaboard è un servizio offerto da:\n\n**${COMPANY}**\nP.IVA ${VAT}\nEmail: ${CONTACT_EMAIL}\n\nUtilizzando Olaboard accetti integralmente i presenti Termini e Condizioni. Se non li accetti, ti chiediamo di non utilizzare il servizio.`,
      },
      {
        title: '2. Descrizione del servizio',
        body: `Olaboard è un'applicazione web per l'organizzazione visiva di note, canvas e immagini. Il servizio è disponibile in versione gratuita (Free) e in versione a pagamento (Pro).\n\nLe funzionalità disponibili per ciascun piano sono descritte nella pagina Prezzi e possono essere aggiornate nel tempo.`,
      },
      {
        title: '3. Registrazione e account',
        body: `Per utilizzare Olaboard è necessario creare un account tramite:\n\n• **Email e password** — registrazione diretta con conferma via email.\n• **Google OAuth** — accesso rapido tramite il tuo account Google. Raccogliamo solo nome, email e foto profilo.\n\nSei responsabile della riservatezza delle credenziali del tuo account e di tutte le attività che avvengono sotto di esso. Ci impegniamo a notificarti in caso di utilizzo non autorizzato di cui venissimo a conoscenza.`,
      },
      {
        title: '4. Piano Free',
        body: `Il piano gratuito è disponibile senza limitazioni di tempo. Può essere soggetto a limiti di utilizzo (es. numero di canvas o spazio di archiviazione) indicati nella pagina Prezzi.\n\nCi riserviamo il diritto di modificare i limiti del piano gratuito con un preavviso di almeno 30 giorni comunicato via email.`,
      },
      {
        title: '5. Piano Pro — pagamenti e abbonamenti',
        body: `Il piano Pro è disponibile tramite abbonamento a pagamento gestito da **Stripe** (Stripe Inc.).\n\n• Il pagamento viene addebitato automaticamente al rinnovo del periodo (mensile o annuale).\n• Puoi disdire l'abbonamento in qualsiasi momento dalla sezione impostazioni del tuo account. La disdetta avrà effetto al termine del periodo già pagato.\n• Non sono previsti rimborsi per periodi parziali, salvo quanto previsto dalla normativa vigente sui consumatori.\n• In caso di mancato pagamento, l'account verrà declassato al piano Free.`,
      },
      {
        title: '6. Contenuti dell\'utente',
        body: `Sei l'unico proprietario dei contenuti che crei su Olaboard (note, canvas, immagini). Non rivendichiamo alcun diritto su di essi.\n\nCi concedi una licenza limitata, non esclusiva e non trasferibile per archiviare e rendere disponibili i tuoi contenuti al solo scopo di fornire il servizio.\n\nTi impegni a non caricare contenuti illegali, diffamatori, offensivi, o che violino diritti di terzi.`,
      },
      {
        title: '7. Disponibilità del servizio',
        body: `Ci impegniamo a mantenere Olaboard disponibile e funzionante, ma non garantiamo un'uptime del 100%. Possono verificarsi interruzioni per manutenzione programmata, guasti tecnici o cause di forza maggiore.\n\nNon siamo responsabili per eventuali perdite di dati derivanti da interruzioni del servizio. Ti consigliamo di esportare periodicamente i tuoi contenuti importanti.`,
      },
      {
        title: '8. Limitazione di responsabilità',
        body: `Olaboard è fornito "così com'è" (as-is). Nella misura massima consentita dalla legge, ${COMPANY} non è responsabile per danni indiretti, incidentali o consequenziali derivanti dall'uso o dall'impossibilità di usare il servizio.\n\nLa nostra responsabilità complessiva nei tuoi confronti non supererà l'importo pagato negli ultimi 12 mesi per il servizio, o €10 se non hai effettuato pagamenti.`,
      },
      {
        title: '9. Gestione e cancellazione account',
        body: `**Downgrade e cancellazione abbonamento**: dal pannello impostazioni puoi in qualsiasi momento:\n• Passare dal piano Pro al piano Free.\n• Cancellare l'abbonamento Stripe attivo.\n\n**Eliminazione account**: puoi eliminare definitivamente il tuo account dalla sezione impostazioni dell'app. La cancellazione è immediata e irreversibile: tutti i canvas, note, immagini e dati personali vengono eliminati istantaneamente. L'abbonamento Stripe attivo viene annullato automaticamente.\n\nCi riserviamo il diritto di sospendere o cancellare account che violino i presenti Termini, con comunicazione preventiva salvo nei casi di violazioni gravi.`,
      },
      {
        title: '10. Modifiche al servizio e ai Termini',
        body: `Possiamo modificare questi Termini in qualsiasi momento. In caso di modifiche sostanziali ti notificheremo via email almeno 15 giorni prima dell'entrata in vigore. L'uso continuato del servizio dopo tale data costituisce accettazione delle modifiche.`,
      },
      {
        title: '11. Legge applicabile e foro competente',
        body: `I presenti Termini sono regolati dalla legge italiana. Per qualsiasi controversia relativa al servizio sarà competente in via esclusiva il Tribunale di Catania, salvo diversa disposizione inderogabile a favore del consumatore.`,
      },
      {
        title: '12. Contatti',
        body: `Per qualsiasi domanda o comunicazione relativa a questi Termini:\n\n**${CONTACT_EMAIL}**`,
      },
    ],
  },
  en: {
    title: 'Terms and Conditions',
    updated: `Last updated: ${LAST_UPDATED_EN}`,
    sections: [
      {
        title: '1. Service Provider',
        body: `Olaboard is a service offered by:\n\n**${COMPANY}**\nVAT: ${VAT}\nEmail: ${CONTACT_EMAIL}\n\nBy using Olaboard you fully accept these Terms and Conditions. If you do not agree, please do not use the service.`,
      },
      {
        title: '2. Service Description',
        body: `Olaboard is a web application for visually organizing notes, canvases and images. The service is available in a free tier (Free) and a paid tier (Pro).\n\nFeatures available per plan are described on the Pricing page and may be updated over time.`,
      },
      {
        title: '3. Registration and Account',
        body: `To use Olaboard you must create an account via:\n\n• **Email and password** — direct registration with email confirmation.\n• **Google OAuth** — quick access via your Google account. We only collect your name, email and profile picture.\n\nYou are responsible for keeping your account credentials confidential and for all activities that occur under your account. We will notify you of any unauthorized use we become aware of.`,
      },
      {
        title: '4. Free Plan',
        body: `The free plan is available without time limits. It may be subject to usage limits (e.g. number of canvases or storage space) as indicated on the Pricing page.\n\nWe reserve the right to modify free plan limits with at least 30 days' notice communicated by email.`,
      },
      {
        title: '5. Pro Plan — Payments and Subscriptions',
        body: `The Pro plan is available via a paid subscription managed by **Stripe** (Stripe Inc.).\n\n• Payment is automatically charged at each renewal (monthly or annual).\n• You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the already-paid period.\n• No refunds are provided for partial periods, except as required by applicable consumer law.\n• In case of failed payment, the account will be downgraded to the Free plan.`,
      },
      {
        title: '6. User Content',
        body: `You are the sole owner of the content you create on Olaboard (notes, canvases, images). We claim no rights over them.\n\nYou grant us a limited, non-exclusive, non-transferable licence to store and make your content available solely for the purpose of providing the service.\n\nYou agree not to upload illegal, defamatory, offensive content, or content that violates third-party rights.`,
      },
      {
        title: '7. Service Availability',
        body: `We aim to keep Olaboard available and functioning, but we do not guarantee 100% uptime. Interruptions may occur due to scheduled maintenance, technical failures or force majeure.\n\nWe are not liable for data loss resulting from service interruptions. We recommend periodically exporting your important content.`,
      },
      {
        title: '8. Limitation of Liability',
        body: `Olaboard is provided "as-is". To the maximum extent permitted by law, ${COMPANY} is not liable for indirect, incidental or consequential damages arising from the use or inability to use the service.\n\nOur total liability to you shall not exceed the amount paid in the last 12 months for the service, or €10 if you have made no payments.`,
      },
      {
        title: '9. Account Management and Deletion',
        body: `**Downgrade and subscription cancellation**: from the settings panel you can at any time:\n• Switch from the Pro plan to the Free plan.\n• Cancel your active Stripe subscription.\n\n**Account deletion**: you can permanently delete your account from the app's settings section. Deletion is immediate and irreversible: all canvases, notes, images and personal data are deleted instantly. Any active Stripe subscription is automatically cancelled.\n\nWe reserve the right to suspend or delete accounts that violate these Terms, with prior notice except in cases of serious violations.`,
      },
      {
        title: '10. Changes to Service and Terms',
        body: `We may modify these Terms at any time. For material changes we will notify you by email at least 15 days before they take effect. Continued use of the service after that date constitutes acceptance of the changes.`,
      },
      {
        title: '11. Governing Law and Jurisdiction',
        body: `These Terms are governed by Italian law. Any dispute relating to the service shall be subject to the exclusive jurisdiction of the Court of Catania, unless otherwise provided by mandatory consumer protection law.`,
      },
      {
        title: '12. Contact',
        body: `For any questions or communications regarding these Terms:\n\n**${CONTACT_EMAIL}**`,
      },
    ],
  },
}

function renderBody(text) {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <br key={i} />
    const parts = line.split(/\*\*(.+?)\*\*/)
    return (
      <p key={i} style={{ margin: '4px 0' }}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
      </p>
    )
  })
}

export default function TermsPage() {
  const navigate = useNavigate()
  const { lang, setLang } = useLang()
  const c = content[lang] ?? content.it

  useEffect(() => { document.title = 'Termini e Condizioni — Olaboard' }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', color: '#1a1a1a' }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, height: 54, display: 'flex', alignItems: 'center', padding: '0 28px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate('/landing')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <OlaboardLogo size={20} fontSize={15} />
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setLang(lang === 'it' ? 'en' : 'it')}
          style={{ fontSize: 12, color: '#888', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
        >{lang === 'it' ? 'EN' : 'IT'}</button>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>{c.title}</h1>
        <p style={{ fontSize: 13, color: '#aaa', marginBottom: 48 }}>{c.updated}</p>

        {c.sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.3px' }}>{s.title}</h2>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: '#444' }}>
              {renderBody(s.body)}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #f0f0f0', padding: '20px 28px', textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: '#ccc' }}>© 2026 Olaboard — {COMPANY}</span>
      </footer>
    </div>
  )
}
