// Import polyfills first
import './utils/polyfills';

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

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
