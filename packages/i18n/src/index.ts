/**
 * @fileoverview Main entry point for @cvplus/i18n module
 * Provides comprehensive internationalization support for CVPlus
 */

// Core exports
export { translationService, TranslationService } from './services/translation.service';
export { RTLService, rtlService, RTLWrapper } from './rtl';

// Types
export type {
  SupportedLanguage,
  LanguageConfig,
  LanguageConfigMap,
  TranslationKey,
  TranslationNamespace,
  TranslationOptions,
  ProfessionalTerminology,
  CVSectionTranslations,
  DateFormatOptions,
  NumberFormatOptions,
  CurrencyFormatOptions,
  PhoneFormatOptions,
  PluralizationRule,
  PluralForm,
  PluralizedTranslation,
  RTLConfig,
  RTLLayoutOptions,
  ContextualTranslation,
  GenderSpecificTranslation,
  TranslationValidation,
  TranslationValidationError,
  TranslationValidationWarning,
  TranslationServiceConfig,
  I18nHookReturn,
  LanguageSelectorProps,
  TranslatedTextProps,
  RTLWrapperProps,
  IndustryTerminology,
  RoleSpecificTranslations,
  EmailTemplateTranslation,
  EmailTemplateType,
  SEOTranslation,
  I18nError,
  I18nErrorDetails,
  I18nPerformanceMetrics,
  I18nDevTools,
  I18nAnalytics,
} from './types';

// Constants
export {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  LANGUAGE_CONFIG,
  TRANSLATION_NAMESPACES,
  DEFAULT_NAMESPACE,
  RTL_LANGUAGES,
  PLURALIZATION_RULES,
  PROFESSIONAL_DOMAINS,
  CV_SECTIONS,
  FORM_FIELD_TYPES,
  EMAIL_TEMPLATE_TYPES,
  SKILL_CATEGORIES,
  INDUSTRY_TERMS,
  STORAGE_KEYS,
  I18N_ENDPOINTS,
  CACHE_CONFIG,
  PERFORMANCE_THRESHOLDS,
  DEV_CONFIG,
} from './constants';

// Utilities
export {
  formatPhoneNumber,
  formatPhoneAsYouType,
  formatAddress,
  formatName,
  formatFileSize,
  formatDuration,
  formatList,
  formatRange,
  formatPercentile,
  formatCoordinate,
  formatTruncate,
} from './utils/formatters';

// Core functionality
export { default as i18nConfig } from './config';

/**
 * Initialize the i18n system with default configuration
 */
export async function initializeI18n(config?: Partial<TranslationServiceConfig>): Promise<void> {
  const service = TranslationService.getInstance(config);
  await service.initialize();
}

/**
 * Create a configured translation service instance
 */
export function createI18nService(config?: Partial<TranslationServiceConfig>): TranslationService {
  return TranslationService.getInstance(config);
}

/**
 * Quick translation function (for non-React contexts)
 */
export function t(key: string, options?: TranslationOptions): string {
  return translationService.translate(key, options);
}

/**
 * Quick language change function
 */
export async function changeLanguage(language: SupportedLanguage): Promise<void> {
  return translationService.changeLanguage(language);
}

/**
 * Get current language
 */
export function getCurrentLanguage(): SupportedLanguage {
  return translationService.getCurrentLanguage();
}

/**
 * Check if language is RTL
 */
export function isRTL(language?: SupportedLanguage): boolean {
  return translationService.isRTL(language);
}

/**
 * Get available languages
 */
export function getAvailableLanguages(): SupportedLanguage[] {
  return translationService.getAvailableLanguages();
}

/**
 * Validate translations for completeness
 */
export async function validateTranslations(languages?: SupportedLanguage[]): Promise<TranslationValidation> {
  return translationService.validateTranslations(languages);
}

/**
 * Preload language translations
 */
export async function preloadLanguage(language: SupportedLanguage): Promise<void> {
  return translationService.preloadLanguage(language);
}

/**
 * Clear translation cache
 */
export function clearCache(): void {
  translationService.clearCache();
}

/**
 * Professional translation utilities
 */
export const professional = {
  translateRole: (role: string, industry?: string, language?: SupportedLanguage) =>
    translationService.translateRole(role, industry, language),
  translateSkill: (skill: string, category?: string, language?: SupportedLanguage) =>
    translationService.translateSkill(skill, category, language),
  translateCVSection: (section: string, language?: SupportedLanguage) =>
    translationService.translateCVSection(section, language),
};

/**
 * Form translation utilities
 */
export const forms = {
  translateField: (fieldKey: string, type: 'label' | 'placeholder' | 'validation' | 'help', language?: SupportedLanguage) =>
    translationService.translateForm(fieldKey, type, language),
  translateError: (errorCode: string, variables?: Record<string, any>, language?: SupportedLanguage) =>
    translationService.translateError(errorCode, variables, language),
};

/**
 * Development utilities
 */
export const dev = {
  extractKeys: () => {
    console.warn('Key extraction is not implemented in production build');
    return [];
  },
  validateKeys: () => {
    console.warn('Key validation is not implemented in production build');
    return { valid: true, errors: [] };
  },
  generateTypes: () => {
    console.warn('Type generation is not implemented in production build');
  },
};

// Re-export everything from types for convenience
export * from './types';

// Default export
export default {
  translationService,
  rtlService,
  initializeI18n,
  createI18nService,
  t,
  changeLanguage,
  getCurrentLanguage,
  isRTL,
  getAvailableLanguages,
  validateTranslations,
  preloadLanguage,
  clearCache,
  professional,
  forms,
  dev,
};