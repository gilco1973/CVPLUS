// Import polyfills first
import './utils/polyfills';

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export all functions
export { processCV } from './functions/processCV';
export { generatePodcast as generatePodcastLegacy } from './functions/generatePodcast';
export { generateCV } from './functions/generateCV';
export { getTemplates } from './functions/getTemplates';
export { analyzeCV } from './functions/analyzeCV';
export { cleanupTempFiles as cleanupOldFiles } from './functions/cleanupTempFiles';

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
  generatePodcast,
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