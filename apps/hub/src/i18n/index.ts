import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon          from './locales/en/common.json'
import esCommon          from './locales/es/common.json'
import ukCommon          from './locales/uk/common.json'

import enAnalyzeMeRoadmap  from './locales/en/analyze-me/roadmap.json'
import esAnalyzeMeRoadmap  from './locales/es/analyze-me/roadmap.json'
import ukAnalyzeMeRoadmap  from './locales/uk/analyze-me/roadmap.json'

import enAnalyzeMeStack  from './locales/en/analyze-me/stack.json'
import esAnalyzeMeStack  from './locales/es/analyze-me/stack.json'
import ukAnalyzeMeStack  from './locales/uk/analyze-me/stack.json'

import enAnalyzeMeFooter from './locales/en/analyze-me/footer.json'
import esAnalyzeMeFooter from './locales/es/analyze-me/footer.json'
import ukAnalyzeMeFooter from './locales/uk/analyze-me/footer.json'

import enAnalyzeMeWork     from './locales/en/analyze-me/work.json'
import esAnalyzeMeWork     from './locales/es/analyze-me/work.json'
import ukAnalyzeMeWork     from './locales/uk/analyze-me/work.json'

import enAnalyzeMeSecurity from './locales/en/analyze-me/security.json'
import esAnalyzeMeSecurity from './locales/es/analyze-me/security.json'
import ukAnalyzeMeSecurity from './locales/uk/analyze-me/security.json'

import enForgeMeGenerate  from './locales/en/forge-me/generate.json'
import esForgeMeGenerate  from './locales/es/forge-me/generate.json'
import ukForgeMeGenerate  from './locales/uk/forge-me/generate.json'

import enForgeMeStack    from './locales/en/forge-me/stack.json'
import esForgeMeStack    from './locales/es/forge-me/stack.json'
import ukForgeMeStack    from './locales/uk/forge-me/stack.json'

import enForgeMeFooter   from './locales/en/forge-me/footer.json'
import esForgeMeFooter   from './locales/es/forge-me/footer.json'
import ukForgeMeFooter   from './locales/uk/forge-me/footer.json'

import enForgeMeRoadmap  from './locales/en/forge-me/roadmap.json'
import esForgeMeRoadmap  from './locales/es/forge-me/roadmap.json'
import ukForgeMeRoadmap  from './locales/uk/forge-me/roadmap.json'

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
          ...enAnalyzeMeRoadmap,
          ...enAnalyzeMeStack,
          ...enAnalyzeMeFooter,
          ...enAnalyzeMeWork,
          ...enAnalyzeMeSecurity,
        },
        'forge-me': {
          ...enForgeMeGenerate,
          ...enForgeMeStack,
          ...enForgeMeFooter,
          ...enForgeMeRoadmap,
        },
        'market-me': {
          ...enMarketMeManifest,
        },
      },
      es: {
        common:      esCommon,
        'analyze-me': {
          ...esAnalyzeMeRoadmap,
          ...esAnalyzeMeStack,
          ...esAnalyzeMeFooter,
          ...esAnalyzeMeWork,
          ...esAnalyzeMeSecurity,
        },
        'forge-me': {
          ...esForgeMeGenerate,
          ...esForgeMeStack,
          ...esForgeMeFooter,
          ...esForgeMeRoadmap,
        },
        'market-me': {
          ...esMarketMeManifest,
        },
      },
      uk: {
        common:      ukCommon,
        'analyze-me': {
          ...ukAnalyzeMeRoadmap,
          ...ukAnalyzeMeStack,
          ...ukAnalyzeMeFooter,
          ...ukAnalyzeMeWork,
          ...ukAnalyzeMeSecurity,
        },
        'forge-me': {
          ...ukForgeMeGenerate,
          ...ukForgeMeStack,
          ...ukForgeMeFooter,
          ...ukForgeMeRoadmap,
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