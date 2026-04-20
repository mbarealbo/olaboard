import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../contexts/LangContext'
import OlaboardLogo from './OlaboardLogo'

const CONTACT_EMAIL = 'privacy@olab.quest'
const COMPANY = 'Olab Quest di Alberto Abate'
const VAT = '05532500872'
const LAST_UPDATED = '20 aprile 2026'
const LAST_UPDATED_EN = 'April 20, 2026'

const content = {
  it: {
    title: 'Privacy Policy',
    updated: `Ultimo aggiornamento: ${LAST_UPDATED}`,
    sections: [
      {
        title: '1. Titolare del trattamento',
        body: `Il titolare del trattamento dei dati personali è:\n\n**${COMPANY}**\nP.IVA ${VAT}\nEmail: ${CONTACT_EMAIL}\n\nOlaboard è un'applicazione web per l'organizzazione visiva di note e canvas.`,
      },
      {
        title: '2. Dati raccolti',
        body: `Raccogliamo i seguenti dati personali:\n\n• **Account email**: fornita in fase di registrazione o tramite login con Google.\n• **Dati Google OAuth**: nome, email e foto profilo, se scegli di accedere con Google. Non accediamo ad altri dati del tuo account Google.\n• **Contenuti**: le note, canvas e immagini che crei all'interno dell'applicazione.\n• **Dati di pagamento**: gestiti direttamente da Stripe. Non conserviamo i dati della tua carta di credito.\n• **Dati tecnici**: indirizzo IP, browser e sistema operativo, raccolti automaticamente per finalità di sicurezza e diagnostica.`,
      },
      {
        title: '3. Finalità del trattamento',
        body: `I tuoi dati sono trattati per:\n\n• Creare e gestire il tuo account.\n• Fornire il servizio Olaboard (salvataggio e sincronizzazione dei tuoi canvas).\n• Gestire abbonamenti e pagamenti tramite Stripe.\n• Inviarti email transazionali (conferma account, notifiche di pagamento).\n• Garantire la sicurezza e il corretto funzionamento del servizio.`,
      },
      {
        title: '4. Base giuridica',
        body: `Il trattamento è basato su:\n\n• **Esecuzione del contratto**: per fornire il servizio che hai richiesto.\n• **Consenso**: per funzionalità opzionali come il login con Google.\n• **Legittimo interesse**: per la sicurezza e il miglioramento del servizio.`,
      },
      {
        title: '5. Responsabili del trattamento (sub-processor)',
        body: `Utilizziamo i seguenti servizi di terze parti, ciascuno con la propria privacy policy:\n\n• **Supabase** (Supabase Inc.) — database, autenticazione e storage. [supabase.com/privacy](https://supabase.com/privacy)\n• **Stripe** (Stripe Inc.) — gestione pagamenti. [stripe.com/privacy](https://stripe.com/privacy)\n• **Netlify** (Netlify Inc.) — hosting dell'applicazione. [netlify.com/privacy](https://www.netlify.com/privacy/)\n• **Google** (Google LLC) — login OAuth e servizi correlati. [policies.google.com/privacy](https://policies.google.com/privacy)\n• **Resend** (Resend Inc.) — invio email transazionali. [resend.com/privacy](https://resend.com/privacy)`,
      },
      {
        title: '6. Conservazione dei dati',
        body: `I tuoi dati sono conservati per tutta la durata del tuo account.\n\nPuoi eliminare il tuo account direttamente dall'app (Impostazioni → Elimina account): la cancellazione è immediata e rimuove istantaneamente tutti i dati personali, canvas, note e immagini. In alternativa puoi scrivere a ${CONTACT_EMAIL}.\n\nAlcuni dati di fatturazione possono essere conservati da Stripe per obblighi di legge anche dopo la cancellazione dell'account.`,
      },
      {
        title: '7. I tuoi diritti (GDPR)',
        body: `Ai sensi del Regolamento UE 679/2016 (GDPR) hai diritto a:\n\n• **Accesso**: ottenere copia dei tuoi dati personali.\n• **Rettifica**: correggere dati inesatti.\n• **Cancellazione**: richiedere la rimozione dei tuoi dati ("diritto all'oblio").\n• **Portabilità**: ricevere i tuoi dati in formato strutturato.\n• **Opposizione**: opporti al trattamento in determinate circostanze.\n• **Reclamo**: presentare reclamo all'autorità di controllo (Garante Privacy italiano).\n\nPer esercitare i tuoi diritti scrivi a: ${CONTACT_EMAIL}`,
      },
      {
        title: '8. Cookie',
        body: `Olaboard utilizza esclusivamente cookie tecnici necessari al funzionamento del servizio (gestione sessione, preferenze lingua). Non utilizziamo cookie di profilazione o di tracciamento di terze parti.`,
      },
      {
        title: '9. Modifiche alla privacy policy',
        body: `Potremmo aggiornare questa policy periodicamente. In caso di modifiche sostanziali ti notificheremo via email o tramite avviso nell'applicazione. La data dell'ultimo aggiornamento è indicata in cima a questa pagina.`,
      },
      {
        title: '10. Contatti',
        body: `Per qualsiasi domanda relativa al trattamento dei tuoi dati personali, scrivi a:\n\n**${CONTACT_EMAIL}**`,
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    updated: `Last updated: ${LAST_UPDATED_EN}`,
    sections: [
      {
        title: '1. Data Controller',
        body: `The data controller is:\n\n**${COMPANY}**\nVAT: ${VAT}\nEmail: ${CONTACT_EMAIL}\n\nOlaboard is a web application for visual note-taking and canvas organization.`,
      },
      {
        title: '2. Data We Collect',
        body: `We collect the following personal data:\n\n• **Account email**: provided during sign-up or via Google login.\n• **Google OAuth data**: name, email and profile picture, if you choose to sign in with Google. We do not access any other Google account data.\n• **Content**: the notes, canvases and images you create inside the application.\n• **Payment data**: handled directly by Stripe. We do not store your credit card details.\n• **Technical data**: IP address, browser and operating system, collected automatically for security and diagnostic purposes.`,
      },
      {
        title: '3. Purpose of Processing',
        body: `Your data is processed to:\n\n• Create and manage your account.\n• Provide the Olaboard service (saving and syncing your canvases).\n• Manage subscriptions and payments via Stripe.\n• Send transactional emails (account confirmation, payment notifications).\n• Ensure the security and proper functioning of the service.`,
      },
      {
        title: '4. Legal Basis',
        body: `Processing is based on:\n\n• **Contract performance**: to provide the service you requested.\n• **Consent**: for optional features such as Google login.\n• **Legitimate interest**: for security and service improvement.`,
      },
      {
        title: '5. Sub-processors',
        body: `We use the following third-party services, each with its own privacy policy:\n\n• **Supabase** (Supabase Inc.) — database, authentication and storage. [supabase.com/privacy](https://supabase.com/privacy)\n• **Stripe** (Stripe Inc.) — payment processing. [stripe.com/privacy](https://stripe.com/privacy)\n• **Netlify** (Netlify Inc.) — application hosting. [netlify.com/privacy](https://www.netlify.com/privacy/)\n• **Google** (Google LLC) — OAuth login and related services. [policies.google.com/privacy](https://policies.google.com/privacy)\n• **Resend** (Resend Inc.) — transactional email delivery. [resend.com/privacy](https://resend.com/privacy)`,
      },
      {
        title: '6. Data Retention',
        body: `Your data is retained for the duration of your account.\n\nYou can delete your account directly from the app (Settings → Delete account): deletion is immediate and instantly removes all personal data, canvases, notes and images. Alternatively, write to ${CONTACT_EMAIL}.\n\nSome billing data may be retained by Stripe for legal compliance even after account deletion.`,
      },
      {
        title: '7. Your Rights (GDPR)',
        body: `Under EU Regulation 679/2016 (GDPR) you have the right to:\n\n• **Access**: obtain a copy of your personal data.\n• **Rectification**: correct inaccurate data.\n• **Erasure**: request removal of your data ("right to be forgotten").\n• **Portability**: receive your data in a structured format.\n• **Objection**: object to processing in certain circumstances.\n• **Complaint**: lodge a complaint with the supervisory authority (Italian Garante Privacy).\n\nTo exercise your rights, write to: ${CONTACT_EMAIL}`,
      },
      {
        title: '8. Cookies',
        body: `Olaboard uses only technical cookies necessary for the service to function (session management, language preferences). We do not use profiling or third-party tracking cookies.`,
      },
      {
        title: '9. Changes to this Policy',
        body: `We may update this policy periodically. For material changes, we will notify you by email or via an in-app notice. The date of the last update is shown at the top of this page.`,
      },
      {
        title: '10. Contact',
        body: `For any questions regarding the processing of your personal data, write to:\n\n**${CONTACT_EMAIL}**`,
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

export default function PrivacyPage() {
  const navigate = useNavigate()
  const { lang, setLang } = useLang()
  const c = content[lang] ?? content.it

  useEffect(() => { document.title = 'Privacy Policy — Olaboard' }, [])

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
        <span style={{ fontSize: 12, color: '#ccc' }}>© 2026 Olaboard</span>
      </footer>
    </div>
  )
}
