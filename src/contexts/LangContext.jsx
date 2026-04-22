import { createContext, useContext, useState } from 'react'
import { translations } from '../i18n'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem('olaboard_lang')
    if (['it', 'en', 'es', 'de'].includes(saved)) return saved
    const nav = navigator.language?.toLowerCase() || ''
    if (nav.startsWith('it')) return 'it'
    if (nav.startsWith('es')) return 'es'
    if (nav.startsWith('de')) return 'de'
    return 'en'
  })

  function setLang(newLang) {
    localStorage.setItem('olaboard_lang', newLang)
    setLangState(newLang)
  }

  function t(key, vars) {
    const str = translations[lang]?.[key] ?? translations['en'][key] ?? key
    if (!vars) return str
    return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`))
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within a LangProvider')
  return ctx
}
