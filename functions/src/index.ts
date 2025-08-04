// Import polyfills first
import './utils/polyfills';

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export all functions
export { processCV } from './functions/processCV';
export { generatePodcast } from './functions/generatePodcast';
export { generateCV } from './functions/generateCV';
export { getTemplates } from './functions/getTemplates';
export { analyzeCV } from './functions/analyzeCV';
export { cleanupTempFiles as cleanupOldFiles } from './functions/cleanupTempFiles';

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