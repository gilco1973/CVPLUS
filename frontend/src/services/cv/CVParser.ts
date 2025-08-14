/**
 * CV Parser Service
 * Handles CV parsing, processing, and file operations
 */

import { 
  collection, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { db, storage, functions, auth } from '../../lib/firebase';
import type { Job, JobCreateParams, FileUploadParams, CVProcessParams } from '../../types/cv';

export class CVParser {
  /**
   * Create a new job
   */
  static async createJob(params: JobCreateParams): Promise<string> {
    const { url, quickCreate = false, userInstructions } = params;
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const jobId = doc(collection(db, 'jobs')).id;
    const jobData = {
      userId: user.uid,
      status: 'pending' as const,
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
  }

  /**
   * Upload CV file to storage
   */
  static async uploadCV(params: FileUploadParams): Promise<string> {
    const { file, jobId } = params;
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
  }

  /**
   * Process CV through the backend
   */
  static async processCV(params: CVProcessParams) {
    const { jobId, fileUrl, mimeType, isUrl = false } = params;
    
    // Ensure user is authenticated before making the call
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated to process CV. Please sign in and try again.');
    }

    console.log('ProcessCV called with:', { 
      jobId, 
      fileUrl: fileUrl.substring(0, 100) + '...', 
      mimeType, 
      isUrl 
    });
    console.log('User authenticated:', currentUser.uid);
    
    const processCVFunction = httpsCallable(functions, 'processCV');
    
    try {
      const result = await processCVFunction({
        jobId,
        fileUrl,
        mimeType,
        isUrl
      });
      return result.data;
    } catch (error: any) {
      console.error('ProcessCV function error:', error);
      
      // Provide more helpful error messages
      if (error.code === 'functions/invalid-argument') {
        throw new Error('Invalid parameters sent to processCV function. Please check your file and try again.');
      } else if (error.code === 'functions/unauthenticated') {
        throw new Error('Authentication failed. Please sign in and try again.');
      } else if (error.code === 'functions/permission-denied') {
        throw new Error('Permission denied. Please check your access rights.');
      }
      
      throw error;
    }
  }

  /**
   * Generate CV with template
   */
  static async generateCV(jobId: string, templateId: string, features: string[]) {
    const generateCVFunction = httpsCallable(functions, 'generateCV');
    const result = await generateCVFunction({
      jobId,
      templateId,
      features
    });
    return result.data;
  }

  /**
   * Generate podcast (legacy)
   */
  static async generatePodcast(jobId: string, config: any) {
    const generatePodcastFunction = httpsCallable(functions, 'generatePodcastLegacy');
    const result = await generatePodcastFunction({
      jobId,
      config
    });
    return result.data;
  }
}