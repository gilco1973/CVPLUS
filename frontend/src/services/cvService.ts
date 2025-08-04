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

// Generate podcast
export const generatePodcast = async (jobId: string, config: any) => {
  const generatePodcastFunction = httpsCallable(functions, 'generatePodcast');
  const result = await generatePodcastFunction({
    jobId,
    config
  });
  return result.data;
};