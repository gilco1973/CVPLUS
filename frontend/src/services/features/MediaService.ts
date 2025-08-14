/**
 * Media Service
 * Handles video, audio, and podcast generation
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

export class MediaService {
  /**
   * Generate video introduction
   */
  static async generateVideoIntroduction(
    jobId: string, 
    duration?: 'short' | 'medium' | 'long', 
    style?: string
  ) {
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
  }

  /**
   * Regenerate video introduction with custom options
   */
  static async regenerateVideoIntroduction(jobId: string, customScript?: string, options?: any) {
    const regenerateVideoFunction = httpsCallable(functions, 'regenerateVideoIntroduction');
    const result = await regenerateVideoFunction({
      jobId,
      customScript,
      ...options
    });
    return result.data;
  }

  /**
   * Generate enhanced podcast
   */
  static async generateEnhancedPodcast(
    jobId: string, 
    style?: 'professional' | 'conversational' | 'storytelling'
  ) {
    const podcastFunction = httpsCallable(functions, 'generatePodcast');
    const result = await podcastFunction({
      jobId,
      format: style || 'professional',
      duration: 300
    });
    return result.data;
  }

  /**
   * Regenerate podcast with new style
   */
  static async regeneratePodcast(
    jobId: string, 
    style?: 'professional' | 'conversational' | 'storytelling'
  ) {
    const regeneratePodcastFunction = httpsCallable(functions, 'regeneratePodcast');
    const result = await regeneratePodcastFunction({
      jobId,
      style: style || 'professional'
    });
    return result.data;
  }

  /**
   * Get podcast processing status
   */
  static async getPodcastStatus(jobId: string) {
    const statusFunction = httpsCallable(functions, 'podcastStatus');
    const result = await statusFunction({ jobId });
    return result.data;
  }

  /**
   * Generate audio from text
   */
  static async generateAudioFromText(
    jobId: string, 
    text: string, 
    type: string, 
    voice?: string, 
    speed?: number
  ) {
    const audioFunction = httpsCallable(functions, 'generateAudioFromText');
    const result = await audioFunction({
      jobId,
      text,
      type,
      voice: voice || 'male',
      speed: speed || 1.0
    });
    return result.data;
  }

  /**
   * Get media processing status
   */
  static async getMediaStatus(jobId: string) {
    const statusFunction = httpsCallable(functions, 'getMediaStatus');
    const result = await statusFunction({ jobId });
    return result.data;
  }

  /**
   * Download media content
   */
  static async downloadMediaContent(jobId: string, mediaType: string, contentType: string) {
    const downloadFunction = httpsCallable(functions, 'downloadMediaContent');
    const result = await downloadFunction({
      jobId,
      mediaType,
      contentType
    });
    return result.data;
  }
}