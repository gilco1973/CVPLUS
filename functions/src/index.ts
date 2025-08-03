import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export all functions
export { processCV } from './functions/processCV';
export { generatePodcast } from './functions/generatePodcast';
export { generateCV } from './functions/generateCV';
export { getTemplates } from './functions/getTemplates';
export { analyzeCV } from './functions/analyzeCV';
export { cleanupTempFiles } from './functions/cleanupTempFiles';