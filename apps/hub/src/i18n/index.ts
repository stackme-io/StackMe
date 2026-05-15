import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon          from './locales/en/common.json'
import esCommon          from './locales/es/common.json'
import ukCommon          from './locales/uk/common.json'

import enAnalyzeMeAbout  from './locales/en/analyze-me/about.json'
import esAnalyzeMeAbout  from './locales/es/analyze-me/about.json'
import ukAnalyzeMeAbout  from './locales/uk/analyze-me/about.json'

import enAnalyzeMeStack  from './locales/en/analyze-me/stack.json'
import esAnalyzeMeStack  from './locales/es/analyze-me/stack.json'
import ukAnalyzeMeStack  from './locales/uk/analyze-me/stack.json'

import enAnalyzeMeFooter from './locales/en/analyze-me/footer.json'
import esAnalyzeMeFooter from './locales/es/analyze-me/footer.json'
import ukAnalyzeMeFooter from './locales/uk/analyze-me/footer.json'

import enAnalyzeMeWork   from './locales/en/analyze-me/work.json'
import esAnalyzeMeWork   from './locales/es/analyze-me/work.json'
import ukAnalyzeMeWork   from './locales/uk/analyze-me/work.json'

import enForgeMeAbout    from './locales/en/forge-me/about.json'
import esForgeMeAbout    from './locales/es/forge-me/about.json'
import ukForgeMeAbout    from './locales/uk/forge-me/about.json'

import enForgeMeStack    from './locales/en/forge-me/stack.json'
import esForgeMeStack    from './locales/es/forge-me/stack.json'
import ukForgeMeStack    from './locales/uk/forge-me/stack.json'

import enForgeMeFooter   from './locales/en/forge-me/footer.json'
import esForgeMeFooter   from './locales/es/forge-me/footer.json'
import ukForgeMeFooter   from './locales/uk/forge-me/footer.json'

import enForgeMeWork     from './locales/en/forge-me/work.json'
import esForgeMeWork     from './locales/es/forge-me/work.json'
import ukForgeMeWork     from './locales/uk/forge-me/work.json'

import enMarketMeManifest from './locales/en/market-me/manifest.json'
import esMarketMeManifest from './locales/es/market-me/manifest.json'
import ukMarketMeManifest from './locales/uk/market-me/manifest.json'

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
        'analyze-me': {
          ...enAnalyzeMeAbout,
          ...enAnalyzeMeStack,
          ...enAnalyzeMeFooter,
          ...enAnalyzeMeWork,
        },
        'forge-me': {
          ...enForgeMeAbout,
          ...enForgeMeStack,
          ...enForgeMeFooter,
          ...enForgeMeWork,
        },
        'market-me': {
          ...enMarketMeManifest,
        },
      },
      es: {
        common:      esCommon,
        'analyze-me': {
          ...esAnalyzeMeAbout,
          ...esAnalyzeMeStack,
          ...esAnalyzeMeFooter,
          ...esAnalyzeMeWork,
        },
        'forge-me': {
          ...esForgeMeAbout,
          ...esForgeMeStack,
          ...esForgeMeFooter,
          ...esForgeMeWork,
        },
        'market-me': {
          ...esMarketMeManifest,
        },
      },
      uk: {
        common:      ukCommon,
        'analyze-me': {
          ...ukAnalyzeMeAbout,
          ...ukAnalyzeMeStack,
          ...ukAnalyzeMeFooter,
          ...ukAnalyzeMeWork,
        },
        'forge-me': {
          ...ukForgeMeAbout,
          ...ukForgeMeStack,
          ...ukForgeMeFooter,
          ...ukForgeMeWork,
        },
        'market-me': {
          ...ukMarketMeManifest,
        },
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