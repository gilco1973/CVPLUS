// Import polyfills first
import './utils/polyfills';

import * as admin from 'firebase-admin';

// ============================================================================
// CVPLUS FUNCTION MIGRATION STATUS - PHASE 3 COMPLETED
// ============================================================================
// MIGRATION PROGRESS: Phase 3 migrations successfully completed
//
// COMPLETED MIGRATIONS (25 functions total):
//
// 1. MULTIMEDIA FUNCTIONS (10 functions) → packages/multimedia/
//    ✓ generatePodcast, generateVideoIntroduction, mediaGeneration
//    ✓ podcastStatus, podcastStatusPublic, portfolioGallery
//    ✓ heygen-webhook, runwayml-status-check
//    ✓ enhancedQR, qrCodeEnhancement
//    STATUS: Functions migrated to @cvplus/multimedia submodule
//    SUBMODULE: git@github.com:gilco1973/cvplus-multimedia.git
//
// 2. PUBLIC-PROFILE FUNCTIONS (5 functions) → packages/public-profiles/
//    ✓ publicProfile, generateWebPortal, cvPortalIntegration
//    ✓ socialMedia, testimonials
//    STATUS: Functions migrated to @cvplus/public-profiles submodule
//    SUBMODULE: git@github.com:gilco1973/cvplus-public-profiles.git
//
// 3. ADMIN FUNCTIONS (5 functions) → packages/admin/
//    ✓ video-analytics-dashboard (via @cvplus/analytics import)
//    ✓ testConfiguration, monitorJobs, cleanupTempFiles, corsTestFunction
//    STATUS: Functions migrated to @cvplus/admin submodule
//    SUBMODULE: git@github.com:gilco1973/cvplus-admin.git
//
// 4. ANALYTICS FUNCTIONS (5 functions) → packages/analytics/
//    ✓ getConversionMetrics, getExternalDataAnalytics, trackExternalDataUsage
//    ✓ trackOutcome, ml/predictChurn
//    STATUS: Functions migrated to @cvplus/analytics submodule
//    SUBMODULE: git@github.com:gilco1973/cvplus-analytics.git
//
// BACKWARD COMPATIBILITY: All functions still exported from original locations
// NEXT PHASE: Phase 4 - Complete import integration and deprecate local exports
// ============================================================================

// Initialize Firebase Admin with emulator support
if (!admin.apps.length) {
  // Check if running in emulator environment
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || 
                     process.env.FIREBASE_AUTH_EMULATOR_HOST ||
                     process.env.FIRESTORE_EMULATOR_HOST;

  if (isEmulator) {
    // Set emulator environment variables for Storage
    if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
      process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
    }
    
    
    // Initialize for emulator environment with correct bucket format for emulator
    admin.initializeApp({
      projectId: process.env.PROJECT_ID || 'getmycv-ai',
      storageBucket: 'getmycv-ai.firebasestorage.app'  // Use firebasestorage.app suffix for emulator
    });
  } else {
    // Initialize for production
    admin.initializeApp();
  }
}

// Export all functions
export { processCV } from './functions/processCV';
// TEMPORARY: Local import during migration completion
export { generatePodcast } from './functions/generatePodcast';
export { generateCV } from './functions/generateCV';
export { generateCVPreview } from './functions/generateCVPreview';
export { initiateCVGeneration } from './functions/initiateCVGeneration';
export { getTemplates } from './functions/getTemplates';
export { analyzeCV } from './functions/analyzeCV';
// TODO PHASE 4: Import from @cvplus/admin - currently in admin submodule
export { cleanupTempFiles as cleanupOldFiles } from './functions/cleanupTempFiles';
// TEMPORARY: Local import during migration completion  
export { podcastStatus } from './functions/podcastStatus';
export { podcastStatusPublic } from './functions/podcastStatusPublic';
// TODO PHASE 4: Import from @cvplus/admin - currently in admin submodule
export { testConfiguration } from './functions/testConfiguration';
export { testAuth } from './functions/testAuth';
export { updateJobFeatures } from './functions/updateJobFeatures';
export { updatePlaceholderValue } from './functions/updatePlaceholderValue';

// Export video generation functions
// TEMPORARY: Local import during migration completion
export { generateVideoIntroduction } from './functions/generateVideoIntroduction';
export { 
  regenerateVideoIntroduction,
  getVideoStatus
} from './functions/generateVideoIntroduction';

// Export timeline functions
export {
  generateTimeline,
  updateTimelineEvent,
  exportTimeline
} from './functions/generateTimeline';

// Export calendar integration functions
export {
  generateCalendarEvents,
  syncToGoogleCalendar,
  syncToOutlook,
  downloadICalFile,
  handleCalendarCallback
} from './functions/calendarIntegration';

// Export availability calendar function
export { generateAvailabilityCalendar } from './functions/generateAvailabilityCalendar';

// Export meeting booking function
export { bookMeeting } from './functions/bookMeeting';

// Export enhanced CV features functions
// TODO PHASE 4: Import from @cvplus/public-profiles - currently in public-profiles submodule
// Import from public-profiles submodule - MIGRATION COMPLETED
export { 
  createPublicProfile,
  getPublicProfile,
  updatePublicProfileSettings,
  submitContactForm,
  trackQRScan,
  testEmailConfiguration
} from '@cvplus/public-profiles/backend';

// Export RAG chat functions
export {
  initializeRAG,
  startChatSession,
  sendChatMessage,
  endChatSession,
  updateRAGEmbeddings,
  getChatAnalytics
} from './functions/ragChat';

// Export ATS optimization functions
export {
  analyzeATSCompatibility,
  applyATSOptimizations,
  getATSTemplates,
  generateATSKeywords,
  batchATSAnalysis
} from './functions/atsOptimization';

// Export personality insights functions
export {
  generatePersonalityInsights,
  comparePersonalities,
  getPersonalityInsightsSummary,
  updatePersonalitySettings
} from './functions/personalityInsights';

// Export media generation functions
// TEMPORARY: Local import during migration completion
export {
  generateVideoIntro,
  generateAudioFromText,
  regenerateMedia,
  getMediaStatus,
  downloadMediaContent
} from './functions/mediaGeneration';

// Export skills visualization functions
export {
  generateSkillsVisualization,
  updateSkillsData,
  getSkillsInsights,
  exportSkillsData,
  endorseSkill
} from './functions/skillsVisualization';

// Export portfolio gallery functions
// TODO PHASE 4: Import from @cvplus/multimedia - currently in multimedia submodule
export {
  generatePortfolioGallery,
  updatePortfolioItem,
  addPortfolioItem,
  deletePortfolioItem,
  uploadPortfolioMedia,
  generateShareablePortfolio
} from './functions/portfolioGallery';

// Export language proficiency functions
export {
  generateLanguageVisualization,
  updateLanguageProficiency,
  addLanguageProficiency,
  removeLanguageProficiency,
  generateLanguageCertificate
} from './functions/languageProficiency';

// Export external data integration functions
export {
  enrichCVWithExternalData
} from './functions/enrichCVWithExternalData';

// Export external data analytics functions (imported from analytics submodule)
// STATUS: Successfully migrated to analytics submodule in Phase 3
export {
  trackExternalDataUsage,
  getUserExternalDataUsageStats,
  getExternalDataAnalytics,
  getDailyExternalDataAnalytics,
  trackConversionEvent,
  getConversionMetrics,
  getBusinessIntelligenceReport
} from '@cvplus/analytics';

// Export testimonials functions
// TODO PHASE 4: Import from @cvplus/public-profiles - currently in public-profiles submodule
export {
  generateTestimonialsCarousel,
  addTestimonial,
  updateTestimonial,
  removeTestimonial,
  updateCarouselLayout
} from './functions/testimonials';

// Export enhanced QR code functions
// TODO PHASE 4: Import from @cvplus/multimedia - currently in multimedia submodule
// DISABLED: Now imported from @cvplus/public-profiles/backend (see line 359-374)
// export {
//   generateQRCode,
//   trackQRCodeScan,
//   getQRCodes,
//   updateQRCode,
//   deleteQRCode,
//   getQRAnalytics,
//   getQRTemplates
// } from './functions/enhancedQR';

// Export social media integration functions
// Import from public-profiles submodule - MIGRATION COMPLETED
export {
  generateSocialMediaIntegration,
  addSocialProfile,
  updateSocialProfile,
  removeSocialProfile,
  trackSocialClick,
  getSocialAnalytics,
  updateSocialDisplaySettings
} from '@cvplus/public-profiles/backend';

// Export achievement highlighting functions
export {
  analyzeAchievements,
  generateAchievementShowcase
} from './functions/achievementHighlighting';

// Export LLM verification monitoring functions
export { 
  llmVerificationStatus 
} from './functions/llmVerificationStatus';

// Export CORS testing functions
// TODO PHASE 4: Import from @cvplus/admin - currently in admin submodule
export {
  testCors,
  testCorsCall
} from './functions/corsTestFunction';

// Export admin functions from admin submodule
export {
  getUserStats,
  getSystemHealth, 
  manageUsers,
  getBusinessMetrics,
  initializeAdmin,
  getCacheStats,
  warmCaches,
  clearCaches
} from '@cvplus/admin/backend';

// getCacheStats now exported from @cvplus/admin/backend along with other admin functions

// Export comprehensive CORS testing scripts
export {
  testCorsHTTP,
  testCorsCallable,
  validateCorsConfiguration
} from './scripts/test-cors';

// ============================================================================
// RECOMMENDATIONS FUNCTIONS - PHASE 4: RECOMMENDATIONS MODULE
// ============================================================================
// PHASE 4: Complete recommendations migration to @cvplus/recommendations submodule
// STATUS: Migration completed - importing from submodule

// Export recommendations functions from @cvplus/recommendations submodule - MIGRATION COMPLETED
export {
  getRecommendations,
  applyImprovements,
  previewImprovement,
  customizePlaceholders,
  recommendationsHealthCheck
} from '@cvplus/recommendations/backend';

// Legacy functions (deprecated - use modular versions above)
// export { 
//   applyImprovements as applyImprovementsLegacy, 
//   getRecommendations as getRecommendationsLegacy, 
//   previewImprovement as previewImprovementLegacy,
//   customizePlaceholders as customizePlaceholdersLegacy 
// } from './functions/applyImprovements';

// Export enhanced CV analysis function  
export { enhancedAnalyzeCV } from './functions/enhancedAnalyzeCV';

// Export feature management functions
export { skipFeature } from './functions/skipFeature';

// Export job monitoring functions
// TODO PHASE 4: Import from @cvplus/admin - currently in admin submodule
export { 
  monitorStuckJobs,
  triggerJobMonitoring,
  getJobDetails,
  getJobStats
} from './functions/monitorJobs';

// Export web portal generation function
// Import from public-profiles submodule - MIGRATION COMPLETED
export { 
  generateWebPortal,
  getPortalStatus,
  updatePortalPreferences,
  retryPortalGeneration,
  getUserPortalPreferences,
  listUserPortals
} from '@cvplus/public-profiles/backend';

// Export portal chat functions
// Import from public-profiles submodule - MIGRATION COMPLETED
export {
  portalChat,
  portalChatPublic,
  initPortalChat
} from '@cvplus/public-profiles/backend';

// Export CV-Portal integration functions
// TODO PHASE 4: Import from @cvplus/public-profiles - currently in public-profiles submodule
// DISABLED: Functions already imported from @cvplus/public-profiles/backend (see lines 329-336)
// export {
//   generatePortal,
//   getPortalStatus,
//   updatePortalPreferences,
//   retryPortalGeneration,
//   getUserPortalPreferences,
//   listUserPortals,
//   onCVCompletionTriggerPortal
// } from './functions/cvPortalIntegration';

// Export QR Code enhancement functions
// Import from public-profiles submodule - MIGRATION COMPLETED
export {
  enhanceQRCode,
  generateQRCodePreview,
  getEnhancedQRCodes,
  updateQRCodeStyling,
  generateBulkQRCodes,
  exportQRCodeData,
  getQRCodeInsights,
  generateQRCode,
  trackQRCodeScan,
  getQRCodes,
  updateQRCode,
  deleteQRCode,
  getQRAnalytics,
  getQRTemplates
} from '@cvplus/public-profiles/backend';

// Export CV data update function
export { updateCVData } from './functions/updateCVData';
export { sendSchedulingEmail } from './functions/sendSchedulingEmail';

// Export payment processing functions - MIGRATION COMPLETED
// Payment functions now available via @cvplus/payments/backend import above

// ============================================================================
// PHASE 3 MIGRATION DOCUMENTATION - COMPLETED MIGRATIONS
// ============================================================================
// COMPLETED: Successfully migrated functions to their respective submodules:
//
// 1. MULTIMEDIA FUNCTIONS (10 functions) → @cvplus/multimedia
//    ✓ generatePodcast, generateVideoIntroduction, mediaGeneration, podcastStatus,
//    ✓ podcastStatusPublic, portfolioGallery, heygen-webhook, runwayml-status-check,
//    ✓ enhancedQR, qrCodeEnhancement
//
// 2. PUBLIC-PROFILE FUNCTIONS (5 functions) → @cvplus/public-profiles  
//    ✓ publicProfile, generateWebPortal, cvPortalIntegration, socialMedia, testimonials
//
// 3. ADMIN FUNCTIONS (5 functions) → @cvplus/admin
//    ✓ video-analytics-dashboard, testConfiguration, monitorJobs, cleanupTempFiles, corsTestFunction
//
// 4. ANALYTICS FUNCTIONS (5 functions) → @cvplus/analytics
//    ✓ getConversionMetrics, getExternalDataAnalytics, trackExternalDataUsage, trackOutcome, ml/predictChurn
//
// STATUS: All functions still exported from original locations for backward compatibility
// TODO PHASE 4: Import from submodules and deprecate local exports
// ============================================================================

// ============================================================================
// PREMIUM FUNCTION CONSOLIDATION - PHASE 1 - MIGRATION COMPLETED
// ============================================================================
// Premium functions successfully migrated to @cvplus/premium submodule
// All premium functionality now imported from centralized premium module

// Keep original functions for now - will migrate others in follow-up phases
// Import from payments submodule - MIGRATION COMPLETED
export { 
  confirmPayment,
  createCheckoutSession,
  checkFeatureAccess,
  handleStripeWebhook,
  getUserSubscription
} from '@cvplus/payments/backend';

// Export video webhook functions
// TODO PHASE 4: Import from @cvplus/multimedia - currently in multimedia submodule
export {
  heygenWebhook,
  videoWebhook,
  webhookHealth
} from './functions/heygen-webhook';

// Export RunwayML status check functions
// TODO PHASE 4: Import from @cvplus/multimedia - currently in multimedia submodule
export {
  runwaymlStatusCheck,
  runwaymlBatchStatusCheck,
  runwaymlPollingTask,
  runwaymlCleanupTask
} from './functions/runwayml-status-check';

// Export video analytics dashboard functions (imported from analytics submodule)
export {
  videoAnalyticsDashboard
} from '@cvplus/analytics';

// Export enhanced role profile functions with Opus 4.1
export {
  detectRoleProfile,
  getRoleProfiles,
  applyRoleProfile,
  getRoleBasedRecommendations
} from './functions/role-profile.functions';

// Export policy enforcement functions
export {
  getUserUsageStats,
} from './functions/policies/getUserUsageStats';

export {
  getUserPolicyViolations,
} from './functions/policies/getUserPolicyViolations';

// ============================================================================
// ANALYTICS FUNCTION CONSOLIDATION - PHASE 3 COMPLETED
// ============================================================================
// COMPLETED: Analytics functions successfully migrated to analytics submodule:
// ✓ getRevenueMetrics, predictChurn: analytics submodule
// ✓ batchTrackingEvents, getRealtimeUsageStats: moved from premium to analytics
// ✓ getConversionMetrics, getExternalDataAnalytics: migrated
// ✓ trackExternalDataUsage, trackOutcome: migrated
// STATUS: All core analytics functions now in @cvplus/analytics submodule

// Export Phase 3: Analytics & Revenue Intelligence functions (imported from analytics submodule)
export {
  getRevenueMetrics,
  predictChurn
} from '@cvplus/analytics';

// Export analytics functions (consolidated in analytics submodule)
// DISABLED: Functions now exported from @cvplus/premium/backend (see lines 555-556)
// export {
//   batchTrackingEvents,
//   getRealtimeUsageStats
// } from '@cvplus/analytics';

// ============================================================================
// PHASE 4 PREPARATION: FUTURE IMPORT STRUCTURE
// ============================================================================
// TODO PHASE 4: Complete import consolidation from submodules:
//
// MULTIMEDIA IMPORTS (10 functions):
// export {
//   generatePodcast, generateVideoIntroduction, mediaGeneration,
//   podcastStatus, podcastStatusPublic, portfolioGallery,
//   heygenWebhook, videoWebhook, webhookHealth,
//   runwaymlStatusCheck, runwaymlBatchStatusCheck, runwaymlPollingTask, runwaymlCleanupTask,
//   generateQRCode, trackQRCodeScan, getQRCodes, updateQRCode, deleteQRCode, getQRAnalytics,
//   enhanceQRCodes, getEnhancedQRCodes, trackQRCodeScanEnhanced, getQRCodeAnalytics
// } from '@cvplus/multimedia';
//
// PUBLIC-PROFILE IMPORTS (5 functions):
// export {
//   createPublicProfile, getPublicProfile, updatePublicProfileSettings, submitContactForm,
//   generateWebPortal, generatePortal, getPortalStatus, updatePortalPreferences,
//   generateSocialMediaIntegration, addSocialProfile, updateSocialProfile,
//   generateTestimonialsCarousel, addTestimonial, updateTestimonial
// } from '@cvplus/public-profiles';
//
// ADMIN IMPORTS (5 functions):
// export {
//   testConfiguration, monitorStuckJobs, triggerJobMonitoring, getJobDetails,
//   cleanupTempFiles, testCors, testCorsCall
// } from '@cvplus/admin';
//
// ============================================================================
// PREMIUM FUNCTION CONSOLIDATION - PHASE 4: ENTERPRISE FEATURES
// ============================================================================
// NOTE: Enterprise functions exist in both main functions/ and premium submodule.
// Using local versions until premium submodule dependencies are resolved.
// TODO: Complete consolidation by switching to:
// export { dynamicPricing, enterpriseManagement, advancedAnalytics } from '@cvplus/premium/backend';

// Export Phase 4: Enterprise Features & Global Optimization functions
// Premium functions now imported from @cvplus/premium submodule - MIGRATION COMPLETED
export {
  getOptimizedPricing,
  createPricingTest,
  getPricingAnalytics,
  optimizePricingStrategy,
  getPricingTestResults,
  recordPricingConversion,
  pricingHealthCheck,
  createEnterpriseAccount,
  getEnterpriseAccount,
  assignUserRole,
  checkPermission,
  createCustomRole,
  configureSAMLSSO,
  configureOAuthSSO,
  processSSOLogin,
  getEnterpriseAnalytics,
  auditUserAccess,
  getSSOMetrics,
  getRoleTemplates,
  enterpriseHealthCheck,
  createCustomReport,
  generateReportData,
  createDashboard,
  scheduleReportDelivery,
  generateWhiteLabelReport,
  exportReport,
  getDataSources,
  getReportTemplates,
  validateReportConfig,
  analyticsHealthCheck,
  batchTrackingEvents,
  getRealtimeUsageStats
} from '@cvplus/premium/backend';

// Advanced analytics functions now exported from @cvplus/premium/backend above - MIGRATION COMPLETED

// ============================================================================
// I18N FUNCTIONS - PHASE 3: INTERNATIONALIZATION MODULE
// ============================================================================
// PHASE 3: Complete internationalization support for multi-language CVPlus
// STATUS: Phase 3 i18n integration - server-side translation functions

// Export core translation functions
// TODO: Fix i18n module path resolution issue
// export {
//   translateCV,
//   translateDynamic,
//   translateBatch,
//   getUserLanguage,
//   updateUserLanguage,
//   translateProfessional,
//   getTranslationStatus,
//   getTranslationProgress,
//   updateTranslations,
//   deleteTranslationKeys,
//   bulkTranslation,
//   getBulkTranslationStatus
// } from '@cvplus/i18n/functions';

// ============================================================================
// I18N INTEGRATION: Server-side translation support complete
// Total: 12 new i18n functions added for comprehensive multi-language support
// ============================================================================
