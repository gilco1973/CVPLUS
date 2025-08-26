import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
// Import translation files directly for now
import enNavigation from './locales/en/navigation.json';
import esNavigation from './locales/es/navigation.json';
import frNavigation from './locales/fr/navigation.json';
import deNavigation from './locales/de/navigation.json';

export const supportedLanguages = {
  en: { name: 'English', flag: '🇺🇸', dir: 'ltr', locale: 'en-US' },
  es: { name: 'Español', flag: '🇪🇸', dir: 'ltr', locale: 'es-ES' },
  fr: { name: 'Français', flag: '🇫🇷', dir: 'ltr', locale: 'fr-FR' },
  de: { name: 'Deutsch', flag: '🇩🇪', dir: 'ltr', locale: 'de-DE' },
  zh: { name: '中文', flag: '🇨🇳', dir: 'ltr', locale: 'zh-CN' },
  ar: { name: 'العربية', flag: '🇸🇦', dir: 'rtl', locale: 'ar-SA' },
  pt: { name: 'Português', flag: '🇧🇷', dir: 'ltr', locale: 'pt-BR' },
  ja: { name: '日本語', flag: '🇯🇵', dir: 'ltr', locale: 'ja-JP' }
} as const;

export type SupportedLanguage = keyof typeof supportedLanguages;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    resources: {
      en: { navigation: enNavigation },
      es: { navigation: esNavigation },
      fr: { navigation: frNavigation },
      de: { navigation: deNavigation },
    },
    
    ns: ['navigation'],
    defaultNS: 'navigation',
    
    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
      lookupLocalStorage: 'cvplus-language',
      lookupCookie: 'cvplus-language',
    },
    
    react: {
      useSuspense: false, // Disable suspense for simpler testing
    },
    
    // Load translations immediately for default language
    preload: ['en'],
    
    // Allow keys to be used as fallback
    keySeparator: '.',
    nsSeparator: ':',
  });

export default i18n;