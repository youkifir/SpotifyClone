import { createContext, useContext, useState, type ReactNode } from 'react'
import { translations, type Language, type TranslationKey } from '../i18n/translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const getInitialLanguage = (): Language => {
  const saved = localStorage.getItem('language')
  if (saved === 'uk' || saved === 'ru' || saved === 'en') return saved
  return 'uk'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  const setLanguage = (lang: Language) => {
    localStorage.setItem('language', lang)
    setLanguageState(lang)
  }

  const t = (key: TranslationKey): string => {
    return translations[language][key] ?? translations.uk[key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage має використовуватись всередині <LanguageProvider>')
  return ctx
}
