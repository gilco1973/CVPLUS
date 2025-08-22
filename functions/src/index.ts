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
    
    console.log('Firebase Admin: Initializing for emulator environment');
    console.log('Storage Emulator Host:', process.env.FIREBASE_STORAGE_EMULATOR_HOST);
    
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
  testCors
} from './functions/corsTestFunction';

// Export CV improvement functions
export { 
  applyImprovements, 
  getRecommendations, 
  previewImprovement 
} from './functions/applyImprovements';

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

// Export payment processing functions
export {
  createPaymentIntent,
} from './functions/payments/createPaymentIntent';
export {
  createCheckoutSession,
} from './functions/payments/createCheckoutSession';

export {
  confirmPayment,
} from './functions/payments/confirmPayment';

export {
  checkFeatureAccess,
} from './functions/payments/checkFeatureAccess';

export {
  handleStripeWebhook,
} from './functions/payments/handleStripeWebhook';

export {
  getUserSubscription,
} from './functions/payments/getUserSubscription';

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

// Export video analytics dashboard functions
export {
  videoAnalyticsDashboard
} from './functions/video-analytics-dashboard';

// Export role profile functions
export {
  detectRoleProfile,
  getRoleProfiles,
  applyRoleProfile,
  getRoleBasedRecommendations
} from './functions/role-profile.functions';
