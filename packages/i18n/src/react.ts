/**
 * @fileoverview React-specific exports for @cvplus/i18n module
 * Provides React components, hooks, and utilities for internationalization
 */

// React hooks
export { useTranslation } from './hooks/useTranslation';
export { useRTL } from './rtl';

// React components
export { LanguageSelector } from './components/LanguageSelector';
export { 
  TranslatedText,
  withTranslation,
  ConditionalTranslation,
  PluralTranslation,
  GenderAwareTranslation,
  ProfessionalTranslation,
} from './components/TranslatedText';
export { RTLWrapper } from './rtl';

// React providers
export { I18nProvider } from './providers/I18nProvider';

// React utilities
export { createI18nContext } from './providers/context';

// Re-export core functionality for React apps
export {
  translationService,
  rtlService,
  initializeI18n,
  SUPPORTED_LANGUAGES,
  LANGUAGE_CONFIG,
  TRANSLATION_NAMESPACES,
} from './index';

// Re-export types needed for React components
export type {
  SupportedLanguage,
  I18nHookReturn,
  LanguageSelectorProps,
  TranslatedTextProps,
  RTLWrapperProps,
  TranslationOptions,
  RTLLayoutOptions,
} from './types';

export default {
  useTranslation,
  useRTL,
  LanguageSelector,
  TranslatedText,
  RTLWrapper,
  I18nProvider,
  withTranslation,
  ConditionalTranslation,
  PluralTranslation,
  GenderAwareTranslation,
  ProfessionalTranslation,
};