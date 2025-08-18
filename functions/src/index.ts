// Import polyfills first
import './utils/polyfills';

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export all functions
export { processCV } from './functions/processCV';
export { generatePodcast } from './functions/generatePodcast';
export { generateCV } from './functions/generateCV';
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

// Export enhanced CV features functions
export { 
  createPublicProfile,
  getPublicProfile,
  updatePublicProfileSettings,
  submitContactForm,
  trackQRScan
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
  generatePodcast as generatePodcastScript,
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
