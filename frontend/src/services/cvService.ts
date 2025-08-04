import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions, auth } from '../lib/firebase';

export interface Job {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'analyzed' | 'generating' | 'completed' | 'failed';
  fileUrl?: string;
  mimeType?: string;
  isUrl?: boolean;
  userInstructions?: string;
  parsedData?: any;
  generatedCV?: {
    html: string;
    htmlUrl?: string;
    pdfUrl: string;
    docxUrl: string;
    template?: string;
    features?: string[];
  };
  piiDetection?: {
    hasPII: boolean;
    detectedTypes: string[];
    recommendations: string[];
  };
  privacyVersion?: any;
  quickCreate?: boolean;
  settings?: {
    applyAllEnhancements: boolean;
    generateAllFormats: boolean;
    enablePIIProtection: boolean;
    createPodcast: boolean;
    useRecommendedTemplate: boolean;
  };
  error?: string;
  createdAt: any;
  updatedAt: any;
}

// Create a new job
export const createJob = async (url?: string, quickCreate: boolean = false, userInstructions?: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const jobId = doc(collection(db, 'jobs')).id;
  const jobData = {
    userId: user.uid,
    status: 'pending',
    isUrl: !!url,
    fileUrl: url || null,
    quickCreate,
    userInstructions: userInstructions || null,
    settings: quickCreate ? {
      applyAllEnhancements: true,
      generateAllFormats: true,
      enablePIIProtection: true,
      createPodcast: true,
      useRecommendedTemplate: true
    } : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, 'jobs', jobId), jobData);
  return jobId;
};

// Upload CV file
export const uploadCV = async (file: File, jobId: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Create storage reference
  const storageRef = ref(storage, `users/${user.uid}/uploads/${jobId}/${file.name}`);
  
  // Upload file
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);

  // Update job with file info
  await setDoc(doc(db, 'jobs', jobId), {
    fileUrl: downloadURL,
    mimeType: file.type,
    fileName: file.name,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return downloadURL;
};

// Process CV
export const processCV = async (jobId: string, fileUrl: string, mimeType: string, isUrl: boolean = false) => {
  const processCVFunction = httpsCallable(functions, 'processCV');
  const result = await processCVFunction({
    jobId,
    fileUrl,
    mimeType,
    isUrl
  });
  return result.data;
};

// Subscribe to job updates
export const subscribeToJob = (jobId: string, callback: (job: Job | null) => void) => {
  return onSnapshot(doc(db, 'jobs', jobId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as Job);
    } else {
      callback(null);
    }
  });
};

// Get job
export const getJob = async (jobId: string): Promise<Job | null> => {
  const docSnap = await getDoc(doc(db, 'jobs', jobId));
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Job;
  }
  return null;
};

// Generate CV with template
export const generateCV = async (jobId: string, templateId: string, features: string[]) => {
  const generateCVFunction = httpsCallable(functions, 'generateCV');
  const result = await generateCVFunction({
    jobId,
    templateId,
    features
  });
  return result.data;
};

// Get templates
export const getTemplates = async (category?: string) => {
  const getTemplatesFunction = httpsCallable(functions, 'getTemplates');
  const result = await getTemplatesFunction({ category, includePublic: true });
  return result.data;
};

// Analyze CV
export const analyzeCV = async (parsedCV: any, targetRole?: string) => {
  const analyzeCVFunction = httpsCallable(functions, 'analyzeCV');
  const result = await analyzeCVFunction({
    parsedCV,
    targetRole
  });
  return result.data;
};

// Generate podcast (legacy)
export const generatePodcast = async (jobId: string, config: any) => {
  const generatePodcastFunction = httpsCallable(functions, 'generatePodcastLegacy');
  const result = await generatePodcastFunction({
    jobId,
    config
  });
  return result.data;
};

// ===== NEW ENHANCED FEATURES =====

// ATS Optimization
export const analyzeATSCompatibility = async (jobId: string, targetRole?: string, targetKeywords?: string[]) => {
  const analyzeATSFunction = httpsCallable(functions, 'analyzeATSCompatibility');
  const result = await analyzeATSFunction({
    jobId,
    targetRole,
    targetKeywords
  });
  return result.data;
};

export const applyATSOptimizations = async (jobId: string, optimizations: any) => {
  const applyATSFunction = httpsCallable(functions, 'applyATSOptimizations');
  const result = await applyATSFunction({
    jobId,
    optimizations
  });
  return result.data;
};

export const generateATSKeywords = async (jobDescription: string, industry?: string, role?: string) => {
  const generateKeywordsFunction = httpsCallable(functions, 'generateATSKeywords');
  const result = await generateKeywordsFunction({
    jobDescription,
    industry,
    role
  });
  return result.data;
};

// Personality Insights
export const generatePersonalityInsights = async (jobId: string) => {
  const personalityFunction = httpsCallable(functions, 'generatePersonalityInsights');
  const result = await personalityFunction({ jobId });
  return result.data;
};

export const comparePersonalities = async (jobIds: string[]) => {
  const compareFunction = httpsCallable(functions, 'comparePersonalities');
  const result = await compareFunction({ jobIds });
  return result.data;
};

export const getPersonalityInsightsSummary = async (jobId: string) => {
  const summaryFunction = httpsCallable(functions, 'getPersonalityInsightsSummary');
  const result = await summaryFunction({ jobId });
  return result.data;
};

// Public Profile Management
export const createPublicProfile = async (jobId: string) => {
  const createProfileFunction = httpsCallable(functions, 'createPublicProfile');
  const result = await createProfileFunction({ jobId });
  return result.data;
};

export const getPublicProfile = async (slug: string) => {
  const getProfileFunction = httpsCallable(functions, 'getPublicProfile');
  const result = await getProfileFunction({ slug });
  return result.data;
};

export const updatePublicProfileSettings = async (jobId: string, settings: any) => {
  const updateSettingsFunction = httpsCallable(functions, 'updatePublicProfileSettings');
  const result = await updateSettingsFunction({
    jobId,
    settings
  });
  return result.data;
};

export const submitContactForm = async (
  jobId: string, 
  senderName: string, 
  senderEmail: string, 
  message: string,
  senderPhone?: string,
  company?: string
) => {
  const submitFormFunction = httpsCallable(functions, 'submitContactForm');
  const result = await submitFormFunction({
    jobId,
    senderName,
    senderEmail,
    message,
    senderPhone,
    company
  });
  return result.data;
};

export const trackQRScan = async (jobId: string, metadata?: any) => {
  const trackScanFunction = httpsCallable(functions, 'trackQRScan');
  const result = await trackScanFunction({
    jobId,
    metadata
  });
  return result.data;
};

// RAG Chat
export const initializeRAG = async (jobId: string, systemPrompt?: string, personality?: string) => {
  const initRAGFunction = httpsCallable(functions, 'initializeRAG');
  const result = await initRAGFunction({
    jobId,
    systemPrompt,
    personality
  });
  return result.data;
};

export const startChatSession = async (jobId: string, visitorId?: string, metadata?: any) => {
  const startChatFunction = httpsCallable(functions, 'startChatSession');
  const result = await startChatFunction({
    jobId,
    visitorId,
    metadata
  });
  return result.data;
};

export const sendChatMessage = async (sessionId: string, message: string) => {
  const sendMessageFunction = httpsCallable(functions, 'sendChatMessage');
  const result = await sendMessageFunction({
    sessionId,
    message
  });
  return result.data;
};

export const endChatSession = async (sessionId: string, rating?: number, feedback?: string) => {
  const endChatFunction = httpsCallable(functions, 'endChatSession');
  const result = await endChatFunction({
    sessionId,
    rating,
    feedback
  });
  return result.data;
};

export const getChatAnalytics = async (jobId: string) => {
  const analyticsFunction = httpsCallable(functions, 'getChatAnalytics');
  const result = await analyticsFunction({ jobId });
  return result.data;
};

// Skills Visualization
export const generateSkillsVisualization = async (jobId: string) => {
  const skillsVizFunction = httpsCallable(functions, 'generateSkillsVisualization');
  const result = await skillsVizFunction({ jobId });
  return result.data;
};

export const updateSkillsData = async (jobId: string, skillsUpdate: any) => {
  const updateSkillsFunction = httpsCallable(functions, 'updateSkillsData');
  const result = await updateSkillsFunction({
    jobId,
    skillsUpdate
  });
  return result.data;
};

export const getSkillsInsights = async (jobId: string, targetRole?: string, industry?: string) => {
  const insightsFunction = httpsCallable(functions, 'getSkillsInsights');
  const result = await insightsFunction({
    jobId,
    targetRole,
    industry
  });
  return result.data;
};

export const endorseSkill = async (jobId: string, skillName: string, endorserInfo?: any) => {
  const endorseFunction = httpsCallable(functions, 'endorseSkill');
  const result = await endorseFunction({
    jobId,
    skillName,
    endorserInfo
  });
  return result.data;
};

// Media Generation
export const generateVideoIntroduction = async (jobId: string, duration?: number, style?: string) => {
  const videoIntroFunction = httpsCallable(functions, 'generateVideoIntro');
  const result = await videoIntroFunction({
    jobId,
    duration: duration || 60,
    style: style || 'professional'
  });
  return result.data;
};

export const regenerateVideoIntroduction = async (jobId: string, customScript?: string) => {
  const regenerateVideoFunction = httpsCallable(functions, 'regenerateVideoIntro');
  const result = await regenerateVideoFunction({
    jobId,
    customScript
  });
  return result.data;
};

export const generateEnhancedPodcast = async (jobId: string, style?: 'professional' | 'conversational' | 'storytelling') => {
  const podcastFunction = httpsCallable(functions, 'generatePodcast');
  const result = await podcastFunction({
    jobId,
    format: style || 'professional',
    duration: 300
  });
  return result.data;
};

export const regeneratePodcast = async (jobId: string, style?: 'professional' | 'conversational' | 'storytelling') => {
  const regeneratePodcastFunction = httpsCallable(functions, 'regeneratePodcast');
  const result = await regeneratePodcastFunction({
    jobId,
    style: style || 'professional'
  });
  return result.data;
};

export const generateAudioFromText = async (jobId: string, text: string, type: string, voice?: string, speed?: number) => {
  const audioFunction = httpsCallable(functions, 'generateAudioFromText');
  const result = await audioFunction({
    jobId,
    text,
    type,
    voice: voice || 'male',
    speed: speed || 1.0
  });
  return result.data;
};

export const getMediaStatus = async (jobId: string) => {
  const statusFunction = httpsCallable(functions, 'getMediaStatus');
  const result = await statusFunction({ jobId });
  return result.data;
};

export const downloadMediaContent = async (jobId: string, mediaType: string, contentType: string) => {
  const downloadFunction = httpsCallable(functions, 'downloadMediaContent');
  const result = await downloadFunction({
    jobId,
    mediaType,
    contentType
  });
  return result.data;
};