// Import polyfills first
import './utils/polyfills';

import * as admin from 'firebase-admin';

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
export { generatePodcast } from './functions/generatePodcast';
export { generateCV } from './functions/generateCV';
export { generateCVPreview } from './functions/generateCVPreview';
export { initiateCVGeneration } from './functions/initiateCVGeneration';
export { getTemplates } from './functions/getTemplates';
export { analyzeCV } from './functions/analyzeCV';
export { cleanupTempFiles as cleanupOldFiles } from './functions/cleanupTempFiles';
export { podcastStatus } from './functions/podcastStatus';
export { podcastStatusPublic } from './functions/podcastStatusPublic';
export { testConfiguration } from './functions/testConfiguration';
export { testAuth } from './functions/testAuth';
export { updateJobFeatures } from './functions/updateJobFeatures';
export { updatePlaceholderValue } from './functions/updatePlaceholderValue';

// Export video generation functions
export { 
  generateVideoIntroduction,
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
export { 
  createPublicProfile,
  getPublicProfile,
  updatePublicProfileSettings,
  submitContactForm,
  trackQRScan,
  testEmailConfiguration
} from './functions/publicProfile';

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
export {
  generateTestimonialsCarousel,
  addTestimonial,
  updateTestimonial,
  removeTestimonial,
  updateCarouselLayout
} from './functions/testimonials';

// Export enhanced QR code functions
export {
  generateQRCode,
  trackQRCodeScan,
  getQRCodes,
  updateQRCode,
  deleteQRCode,
  getQRAnalytics,
  getQRTemplates
} from './functions/enhancedQR';

// Export social media integration functions
export {
  generateSocialMediaIntegration,
  addSocialProfile,
  updateSocialProfile,
  removeSocialProfile,
  trackSocialClick,
  getSocialAnalytics,
  updateSocialDisplaySettings
} from './functions/socialMedia';

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

// Export CV improvement functions (modular architecture)
export { 
  getRecommendations
} from './functions/recommendations/getRecommendations';

export { 
  applyImprovements
} from './functions/recommendations/applyImprovements';

export { 
  previewImprovement
} from './functions/recommendations/previewImprovement';

export { 
  customizePlaceholders
} from './functions/recommendations/customizePlaceholders';

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
export { 
  monitorStuckJobs,
  triggerJobMonitoring,
  getJobDetails,
  getJobStats
} from './functions/monitorJobs';

// Export web portal generation function
export { generateWebPortal } from './functions/generateWebPortal';

// Export portal chat functions
export {
  portalChat,
  portalChatPublic,
  getPortalChatAnalytics
} from './functions/portalChat';

// Export CV-Portal integration functions
export {
  generatePortal,
  getPortalStatus,
  updatePortalPreferences,
  retryPortalGeneration,
  getUserPortalPreferences,
  listUserPortals,
  onCVCompletionTriggerPortal
} from './functions/cvPortalIntegration';

// Export QR Code enhancement functions
export {
  enhanceQRCodes,
  getEnhancedQRCodes,
  trackQRCodeScanEnhanced,
  getQRCodeAnalytics,
  autoEnhanceQRCodes,
  generateQRCodePreview
} from './functions/qrCodeEnhancement';

// Export CV data update function
export { updateCVData } from './functions/updateCVData';
export { sendSchedulingEmail } from './functions/sendSchedulingEmail';

// Export payment processing functions - using wrappers with Firebase config
export { createPaymentIntent } from './functions/payments-wrapper/createPaymentIntent';

// ============================================================================
// PREMIUM FUNCTION CONSOLIDATION - PHASE 1
// ============================================================================
// NOTE: Premium functions exist in both main functions/ and premium submodule.
// Using local versions for now until premium submodule dependencies are resolved.
// TODO: Complete consolidation by fixing premium submodule imports and switching to:
// export { checkFeatureAccess, handleStripeWebhook, manageSubscription } from '@cvplus/premium/backend';

// Keep original functions for now - will migrate others in follow-up phases
// Import from payments submodule
export { 
  confirmPayment,
  createCheckoutSession,
  checkFeatureAccess,
  handleStripeWebhook,
  getUserSubscription
} from '../packages/payments/src/backend/functions';

// Export video webhook functions
export {
  heygenWebhook,
  videoWebhook,
  webhookHealth
} from './functions/heygen-webhook';

// Export RunwayML status check functions
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
// ANALYTICS FUNCTION CONSOLIDATION - PHASE 3
// ============================================================================
// NOTE: Some analytics functions exist in multiple locations:
// - getRevenueMetrics, predictChurn: analytics submodule ✓
// - batchTrackingEvents, getRealtimeUsageStats: premium submodule (should be moved to analytics)
// TODO: Move analytics functions from premium to analytics submodule

// Export Phase 3: Analytics & Revenue Intelligence functions (imported from analytics submodule)
export {
  getRevenueMetrics,
  predictChurn
} from '@cvplus/analytics';

// Export premium analytics functions (temporarily - should be in analytics submodule)
export {
  batchTrackingEvents,
  getRealtimeUsageStats
} from '@cvplus/analytics';

// ============================================================================
// PREMIUM FUNCTION CONSOLIDATION - PHASE 4: ENTERPRISE FEATURES
// ============================================================================
// NOTE: Enterprise functions exist in both main functions/ and premium submodule.
// Using local versions until premium submodule dependencies are resolved.
// TODO: Complete consolidation by switching to:
// export { dynamicPricing, enterpriseManagement, advancedAnalytics } from '@cvplus/premium/backend';

// Export Phase 4: Enterprise Features & Global Optimization functions
export {
  getOptimizedPricing,
  createPricingTest,
  getPricingAnalytics,
  optimizePricingStrategy,
  getPricingTestResults,
  recordPricingConversion,
  pricingHealthCheck
} from './functions/premium/dynamicPricing';

export {
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
} from './functions/premium/enterpriseManagement';

// Export advanced analytics functions from analytics submodule
export {
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
