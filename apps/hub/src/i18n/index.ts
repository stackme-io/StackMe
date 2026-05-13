import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon    from './locales/en/common.json'
import esCommon    from './locales/es/common.json'
import ukCommon    from './locales/uk/common.json'

import enAnalyzeMe from './locales/en/analyze-me.json'
import esAnalyzeMe from './locales/es/analyze-me.json'
import ukAnalyzeMe from './locales/uk/analyze-me.json'

import enForgeMe   from './locales/en/forge-me.json'
import esForgeMe   from './locales/es/forge-me.json'
import ukForgeMe   from './locales/uk/forge-me.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'uk'],
    defaultNS: 'common',
    resources: {
      en: {
        common:      enCommon,
        'analyze-me': enAnalyzeMe,
        'forge-me':   enForgeMe,
      },
      es: {
        common:      esCommon,
        'analyze-me': esAnalyzeMe,
        'forge-me':   esForgeMe,
      },
      uk: {
        common:      ukCommon,
        'analyze-me': ukAnalyzeMe,
        'forge-me':   ukForgeMe,
      },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n