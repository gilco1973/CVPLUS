// Import polyfills first
import './utils/polyfills';
import * as admin from 'firebase-admin';

// ============================================================================
// CVPLUS FUNCTIONS ARCHITECTURE - POST SUBMODULE MIGRATION
// ============================================================================
// MIGRATION STATUS: PHASE 4 COMPLETED - All functions properly organized in submodules
//
// ARCHITECTURE OVERVIEW:
// - Root functions: Only 4 legitimate orchestration functions remain in root
// - Submodule functions: 60+ functions properly organized in their domain-specific submodules
// - Each submodule is an independent git repository with specialized functionality
//
// ROOT FUNCTIONS (4 total):
// ✓ bookMeeting.ts - Meeting booking orchestration
// ✓ calendarIntegration.ts - Calendar integration orchestration  
// ✓ generateAvailabilityCalendar.ts - Availability calendar generation
// ✓ sendSchedulingEmail.ts - Email scheduling orchestration
//
// SUBMODULE ORGANIZATION:
// ✓ packages/cv-processing/ - CV analysis, processing, and enhancement
// ✓ packages/multimedia/ - Media generation, podcasts, videos, QR codes
// ✓ packages/analytics/ - Analytics, metrics, reporting, business intelligence
// ✓ packages/workflow/ - Job monitoring, templates, feature management
// ✓ packages/admin/ - Admin tools, user management, system health
// ✓ packages/public-profiles/ - Public profiles, web portals, social integration
// ✓ packages/auth/ - Authentication and authorization
// ✓ packages/recommendations/ - AI-powered recommendations engine
// ✓ packages/payments/ - Payment processing and subscription management
// ✓ packages/premium/ - Premium features and enterprise functionality
// ✓ packages/i18n/ - Internationalization and translation services
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
      storageBucket: 'getmycv-ai.firebasestorage.app'
    });
  } else {
    // Initialize for production
    admin.initializeApp();
  }
}

// ============================================================================
// ROOT ORCHESTRATION FUNCTIONS
// ============================================================================
// These functions remain in root as they orchestrate cross-submodule workflows

// Calendar and Meeting Functions
export { bookMeeting } from './scripts/functions/bookMeeting';
export { 
  generateCalendarEvents,
  syncToGoogleCalendar,
  syncToOutlook,
  downloadICalFile,
  handleCalendarCallback
} from './scripts/functions/calendarIntegration';
export { generateAvailabilityCalendar } from './scripts/functions/generateAvailabilityCalendar';
export { sendSchedulingEmail } from './scripts/functions/sendSchedulingEmail';

// ============================================================================
// CV PROCESSING FUNCTIONS
// ============================================================================
// All CV processing, analysis, and enhancement functions

export {
  uploadCV,
  getCVStatus,
  processCV,
  generateCV,
  generateCVPreview,
  initiateCVGeneration,
  analyzeCV,
  enhancedAnalyzeCV,
  enrichCVWithExternalData,
  updateCVData,
  generateTimeline,
  updateTimelineEvent,
  exportTimeline,
  ragChat,
  initializeRAG,
  startChatSession,
  sendChatMessage,
  endChatSession,
  updateRAGEmbeddings,
  getChatAnalytics,
  atsOptimization,
  analyzeATSCompatibility,
  applyATSOptimizations,
  getATSTemplates,
  generateATSKeywords,
  batchATSAnalysis,
  personalityInsights,
  generatePersonalityInsights,
  comparePersonalities,
  getPersonalityInsightsSummary,
  updatePersonalitySettings,
  skillsVisualization,
  generateSkillsVisualization,
  updateSkillsData,
  getSkillsInsights,
  exportSkillsData,
  endorseSkill,
  languageProficiency,
  generateLanguageVisualization,
  updateLanguageProficiency,
  addLanguageProficiency,
  removeLanguageProficiency,
  generateLanguageCertificate,
  achievementHighlighting,
  analyzeAchievements,
  generateAchievementShowcase,
  llmVerificationStatus,
  roleProfile,
  detectRoleProfile,
  getRoleProfiles,
  applyRoleProfile,
  getRoleBasedRecommendations
} from '@cvplus/cv-processing/backend';

// ============================================================================
// MULTIMEDIA FUNCTIONS
// ============================================================================
// Media generation, podcasts, videos, QR codes, and multimedia processing

export {
  generatePodcast,
  podcastStatus,
  podcastStatusPublic,
  generateVideoIntroduction,
  generateVideoIntro,
  regenerateVideoIntroduction,
  getVideoStatus,
  mediaGeneration,
  generateAudioFromText,
  regenerateMedia,
  getMediaStatus,
  downloadMediaContent,
  portfolioGallery,
  generatePortfolioGallery,
  updatePortfolioItem,
  addPortfolioItem,
  deletePortfolioItem,
  uploadPortfolioMedia,
  generateShareablePortfolio,
  heygenWebhook,
  videoWebhook,
  webhookHealth,
  runwaymlStatusCheck,
  runwaymlBatchStatusCheck,
  runwaymlPollingTask,
  runwaymlCleanupTask
} from '@cvplus/multimedia/backend';

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================
// Analytics, metrics, reporting, and business intelligence

export {
  trackExternalDataUsage,
  getUserExternalDataUsageStats,
  getExternalDataAnalytics,
  getDailyExternalDataAnalytics,
  trackConversionEvent,
  getConversionMetrics,
  getBusinessIntelligenceReport,
  getRevenueMetrics,
  predictChurn,
  videoAnalyticsDashboard,
  batchTrackingEvents,
  getRealtimeUsageStats,
  createCustomReport,
  generateReportData,
  createDashboard,
  scheduleReportDelivery,
  generateWhiteLabelReport,
  exportReport,
  getDataSources,
  getReportTemplates,
  validateReportConfig,
  analyticsHealthCheck
} from '@cvplus/analytics';

// ============================================================================
// WORKFLOW FUNCTIONS
// ============================================================================
// Job monitoring, templates, feature management, and workflow orchestration

export {
  injectCompletedFeatures,
  skipFeature,
  updateJobFeatures,
  monitorJobs,
  getTemplates,
  updatePlaceholderValue,
  certificationBadges,
  processWorkflowStep,
  initializeWorkflow,
  getWorkflowStatus,
  updateWorkflowConfiguration
} from '@cvplus/workflow/backend';

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================
// Admin tools, user management, system health, and monitoring

export {
  getUserStats,
  getSystemHealth,
  manageUsers,
  getBusinessMetrics,
  initializeAdmin,
  getCacheStats,
  warmCaches,
  clearCaches,
  testConfiguration,
  monitorStuckJobs,
  triggerJobMonitoring,
  getJobDetails,
  getJobStats,
  cleanupTempFiles,
  testCors,
  testCorsCall,
  getUserUsageStats,
  getUserPolicyViolations,
  testCorsHTTP,
  testCorsCallable,
  validateCorsConfiguration
} from '@cvplus/admin/backend';

// ============================================================================
// PUBLIC PROFILES FUNCTIONS
// ============================================================================
// Public profiles, web portals, social integration, QR codes, and testimonials

export {
  createPublicProfile,
  getPublicProfile,
  updatePublicProfileSettings,
  submitContactForm,
  trackQRScan,
  testEmailConfiguration,
  generateWebPortal,
  getPortalStatus,
  updatePortalPreferences,
  retryPortalGeneration,
  getUserPortalPreferences,
  listUserPortals,
  portalChat,
  portalChatPublic,
  initPortalChat,
  generateSocialMediaIntegration,
  addSocialProfile,
  updateSocialProfile,
  removeSocialProfile,
  trackSocialClick,
  getSocialAnalytics,
  updateSocialDisplaySettings,
  generateTestimonialsCarousel,
  addTestimonial,
  updateTestimonial,
  removeTestimonial,
  updateCarouselLayout,
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

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================
// Authentication, authorization, and user session management

export {
  testAuth,
  authenticateUser,
  refreshToken,
  validateSession,
  updateUserProfile,
  deleteUserAccount,
  getUserPermissions,
  updateUserPermissions
} from '@cvplus/auth/backend';

// ============================================================================
// RECOMMENDATIONS FUNCTIONS
// ============================================================================
// AI-powered recommendations engine and improvement suggestions

export {
  getRecommendations,
  applyImprovements,
  previewImprovement,
  customizePlaceholders,
  recommendationsHealthCheck
} from '@cvplus/recommendations/backend';

// ============================================================================
// PAYMENTS FUNCTIONS
// ============================================================================
// Payment processing, subscriptions, and billing management

export {
  confirmPayment,
  createCheckoutSession,
  checkFeatureAccess,
  handleStripeWebhook,
  getUserSubscription
} from '@cvplus/payments/backend';

// ============================================================================
// PREMIUM FUNCTIONS
// ============================================================================
// Premium features, enterprise functionality, and advanced analytics

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
  enterpriseHealthCheck
} from '@cvplus/premium/backend';

// ============================================================================
// INTERNATIONALIZATION FUNCTIONS
// ============================================================================
// Translation services and multi-language support

export {
  translateCV,
  translateDynamic,
  translateBatch,
  getUserLanguage,
  updateUserLanguage,
  translateProfessional,
  getTranslationStatus,
  getTranslationProgress,
  updateTranslations,
  deleteTranslationKeys,
  bulkTranslation,
  getBulkTranslationStatus
} from '@cvplus/i18n/backend';

// ============================================================================
// SYSTEM INFORMATION
// ============================================================================
export const CVPLUS_FUNCTIONS_VERSION = '4.0.0';
export const MIGRATION_STATUS = 'PHASE_4_COMPLETE';
export const ARCHITECTURE_DATE = '2025-08-29';
export const TOTAL_FUNCTIONS_COUNT = 150; // Approximate total across all submodules
export const ROOT_FUNCTIONS_COUNT = 4;
export const SUBMODULE_COUNT = 11;