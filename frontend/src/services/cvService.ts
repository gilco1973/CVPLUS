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
export const generateVideoIntroduction = async (jobId: string, duration?: 'short' | 'medium' | 'long', style?: string) => {
  const videoIntroFunction = httpsCallable(functions, 'generateVideoIntroduction');
  const result = await videoIntroFunction({
    jobId,
    duration: duration || 'medium',
    style: style || 'professional',
    avatarStyle: 'realistic',
    background: 'office',
    includeSubtitles: true,
    includeNameCard: true
  });
  return result.data;
};

export const regenerateVideoIntroduction = async (jobId: string, customScript?: string, options?: any) => {
  const regenerateVideoFunction = httpsCallable(functions, 'regenerateVideoIntroduction');
  const result = await regenerateVideoFunction({
    jobId,
    customScript,
    ...options
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

// Timeline visualization
export const generateTimeline = async (jobId: string) => {
  const timelineFunction = httpsCallable(functions, 'generateTimeline');
  const result = await timelineFunction({ jobId });
  return result.data;
};

export const updateTimelineEvent = async (jobId: string, eventId: string, updates: any) => {
  const updateFunction = httpsCallable(functions, 'updateTimelineEvent');
  const result = await updateFunction({
    jobId,
    eventId,
    updates
  });
  return result.data;
};

export const exportTimeline = async (jobId: string, format: 'json' | 'csv' | 'html' = 'json') => {
  const exportFunction = httpsCallable(functions, 'exportTimeline');
  const result = await exportFunction({
    jobId,
    format
  });
  return result.data;
};

// Calendar integration
export const generateCalendarEvents = async (jobId: string) => {
  const calendarFunction = httpsCallable(functions, 'generateCalendarEvents');
  const result = await calendarFunction({ jobId });
  return result.data;
};

export const syncToGoogleCalendar = async (jobId: string, accessToken?: string) => {
  const syncFunction = httpsCallable(functions, 'syncToGoogleCalendar');
  const result = await syncFunction({ jobId, accessToken });
  return result.data;
};

export const syncToOutlook = async (jobId: string, accessToken?: string) => {
  const syncFunction = httpsCallable(functions, 'syncToOutlook');
  const result = await syncFunction({ jobId, accessToken });
  return result.data;
};

export const downloadICalFile = async (jobId: string) => {
  const downloadFunction = httpsCallable(functions, 'downloadICalFile');
  const result = await downloadFunction({ jobId });
  return result.data;
};

export const handleCalendarCallback = async (provider: 'google' | 'outlook', code: string, state: string) => {
  const callbackFunction = httpsCallable(functions, 'handleCalendarCallback');
  const result = await callbackFunction({ provider, code, state });
  return result.data;
};

// Portfolio Gallery
export const generatePortfolioGallery = async (jobId: string) => {
  const generateFunction = httpsCallable(functions, 'generatePortfolioGallery');
  const result = await generateFunction({ jobId });
  return result.data;
};

export const updatePortfolioItem = async (jobId: string, itemId: string, updates: any) => {
  const updateFunction = httpsCallable(functions, 'updatePortfolioItem');
  const result = await updateFunction({ jobId, itemId, updates });
  return result.data;
};

export const addPortfolioItem = async (jobId: string, item: any) => {
  const addFunction = httpsCallable(functions, 'addPortfolioItem');
  const result = await addFunction({ jobId, item });
  return result.data;
};

export const deletePortfolioItem = async (jobId: string, itemId: string) => {
  const deleteFunction = httpsCallable(functions, 'deletePortfolioItem');
  const result = await deleteFunction({ jobId, itemId });
  return result.data;
};

export const uploadPortfolioMedia = async (jobId: string, itemId: string, file: File) => {
  // Convert file to base64
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]); // Remove data:image/jpeg;base64, prefix
    };
    reader.onerror = reject;
  });
  reader.readAsDataURL(file);
  
  const mediaData = await base64Promise;
  
  const uploadFunction = httpsCallable(functions, 'uploadPortfolioMedia');
  const result = await uploadFunction({
    jobId,
    itemId,
    mediaData,
    mediaType: file.type,
    fileName: file.name
  });
  return result.data;
};

export const generateShareablePortfolio = async (jobId: string, customDomain?: string) => {
  const shareFunction = httpsCallable(functions, 'generateShareablePortfolio');
  const result = await shareFunction({ jobId, customDomain });
  return result.data;
};

// Language Proficiency
export const generateLanguageVisualization = async (jobId: string) => {
  const generateFunction = httpsCallable(functions, 'generateLanguageVisualization');
  const result = await generateFunction({ jobId });
  return result.data;
};

export const updateLanguageProficiency = async (jobId: string, languageId: string, updates: any) => {
  const updateFunction = httpsCallable(functions, 'updateLanguageProficiency');
  const result = await updateFunction({ jobId, languageId, updates });
  return result.data;
};

export const addLanguageProficiency = async (jobId: string, language: any) => {
  const addFunction = httpsCallable(functions, 'addLanguageProficiency');
  const result = await addFunction({ jobId, language });
  return result.data;
};

export const removeLanguageProficiency = async (jobId: string, languageId: string) => {
  const removeFunction = httpsCallable(functions, 'removeLanguageProficiency');
  const result = await removeFunction({ jobId, languageId });
  return result.data;
};

export const generateLanguageCertificate = async (jobId: string, languageId: string) => {
  const certFunction = httpsCallable(functions, 'generateLanguageCertificate');
  const result = await certFunction({ jobId, languageId });
  return result.data;
};

// Testimonials functions
export const generateTestimonialsCarousel = async (jobId: string) => {
  const generateFunction = httpsCallable(functions, 'generateTestimonialsCarousel');
  const result = await generateFunction({ jobId });
  return result.data;
};

export const addTestimonial = async (jobId: string, testimonial: any) => {
  const addFunction = httpsCallable(functions, 'addTestimonial');
  const result = await addFunction({ jobId, testimonial });
  return result.data;
};

export const updateTestimonial = async (jobId: string, testimonialId: string, updates: any) => {
  const updateFunction = httpsCallable(functions, 'updateTestimonial');
  const result = await updateFunction({ jobId, testimonialId, updates });
  return result.data;
};

export const removeTestimonial = async (jobId: string, testimonialId: string) => {
  const removeFunction = httpsCallable(functions, 'removeTestimonial');
  const result = await removeFunction({ jobId, testimonialId });
  return result.data;
};

export const updateCarouselLayout = async (jobId: string, layoutOptions: any) => {
  const updateFunction = httpsCallable(functions, 'updateCarouselLayout');
  const result = await updateFunction({ jobId, layoutOptions });
  return result.data;
};

// Enhanced QR Code functions
export const generateQRCode = async (jobId: string, config: any) => {
  const generateFunction = httpsCallable(functions, 'generateQRCode');
  const result = await generateFunction({ jobId, config });
  return result.data;
};

export const trackQRCodeScan = async (qrCodeId: string, scanData: any) => {
  const trackFunction = httpsCallable(functions, 'trackQRCodeScan');
  const result = await trackFunction({ qrCodeId, scanData });
  return result.data;
};

export const getQRCodes = async (jobId: string) => {
  const getFunction = httpsCallable(functions, 'getQRCodes');
  const result = await getFunction({ jobId });
  return result.data;
};

export const updateQRCode = async (jobId: string, qrCodeId: string, updates: any) => {
  const updateFunction = httpsCallable(functions, 'updateQRCode');
  const result = await updateFunction({ jobId, qrCodeId, updates });
  return result.data;
};

export const deleteQRCode = async (jobId: string, qrCodeId: string) => {
  const deleteFunction = httpsCallable(functions, 'deleteQRCode');
  const result = await deleteFunction({ jobId, qrCodeId });
  return result.data;
};

export const getQRAnalytics = async (jobId: string, qrCodeId?: string) => {
  const analyticsFunction = httpsCallable(functions, 'getQRAnalytics');
  const result = await analyticsFunction({ jobId, qrCodeId });
  return result.data;
};

export const getQRTemplates = async () => {
  const templatesFunction = httpsCallable(functions, 'getQRTemplates');
  const result = await templatesFunction({});
  return result.data;
};

// Social Media Integration functions
export const generateSocialMediaIntegration = async (jobId: string) => {
  const generateFunction = httpsCallable(functions, 'generateSocialMediaIntegration');
  const result = await generateFunction({ jobId });
  return result.data;
};

export const addSocialProfile = async (jobId: string, profile: any) => {
  const addFunction = httpsCallable(functions, 'addSocialProfile');
  const result = await addFunction({ jobId, profile });
  return result.data;
};

export const updateSocialProfile = async (jobId: string, profileId: string, updates: any) => {
  const updateFunction = httpsCallable(functions, 'updateSocialProfile');
  const result = await updateFunction({ jobId, profileId, updates });
  return result.data;
};

export const removeSocialProfile = async (jobId: string, profileId: string) => {
  const removeFunction = httpsCallable(functions, 'removeSocialProfile');
  const result = await removeFunction({ jobId, profileId });
  return result.data;
};

export const trackSocialClick = async (jobId: string, platform: string, metadata?: any) => {
  const trackFunction = httpsCallable(functions, 'trackSocialClick');
  const result = await trackFunction({ jobId, platform, metadata });
  return result.data;
};

export const getSocialAnalytics = async (jobId: string) => {
  const analyticsFunction = httpsCallable(functions, 'getSocialAnalytics');
  const result = await analyticsFunction({ jobId });
  return result.data;
};

export const updateSocialDisplaySettings = async (jobId: string, displaySettings: any) => {
  const updateFunction = httpsCallable(functions, 'updateSocialDisplaySettings');
  const result = await updateFunction({ jobId, displaySettings });
  return result.data;
};