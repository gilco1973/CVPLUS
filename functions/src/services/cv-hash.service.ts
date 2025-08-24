import { createHash } from 'crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export interface CVHashRecord {
  hashId: string;
  originalUserId: string;
  uploadTimestamp: Date;
  duplicateUploads: {
    userId: string;
    uploadTime: Date;
    violationFlags: string[];
    ipAddress?: string;
    userAgent?: string;
  }[];
  cvMetadata: {
    extractedName: string;
    fileSize: number;
    fileType: string;
    wordCount: number;
    contentPreview: string;
  };
  policyStatus: 'clean' | 'flagged' | 'violation';
  lastViolationCheck: Date;
  similarityScore?: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  originalUserId?: string;
  originalUploadDate?: Date;
  violationType?: 'exact_duplicate' | 'similar_content';
  confidence: number;
  existingHashId?: string;
  shouldFlag: boolean;
}

export interface CVMetadata {
  extractedName: string;
  fileSize: number;
  fileType: string;
  wordCount: number;
  contentPreview: string;
}

export class CVHashService {
  private readonly db = getFirestore();
  private readonly SIMILARITY_THRESHOLD = 0.95;
  private readonly VIOLATION_THRESHOLD = 0.90;

  /**
   * Generate normalized hash for CV content
   * Removes formatting, dates, and personal info to detect content similarity
   */
  async generateCVHash(cvContent: string): Promise<string> {
    try {
      const normalizedContent = this.normalizeContent(cvContent);
      
      // Generate SHA-256 hash
      const hash = createHash('sha256');
      hash.update(normalizedContent);
      const hashString = hash.digest('hex');
      
      logger.info('CV hash generated', {
        contentLength: cvContent.length,
        normalizedLength: normalizedContent.length,
        hashId: hashString.substring(0, 8)
      });
      
      return hashString;
    } catch (error) {
      logger.error('Error generating CV hash', { error });
      throw new Error('Failed to generate CV hash');
    }
  }

  /**
   * Check for duplicate CV uploads across all users
   */
  async checkForDuplicates(hash: string, userId: string): Promise<DuplicateCheckResult> {
    try {
      // First check for exact hash match
      const hashDoc = await this.db.collection('cvHashRecords').doc(hash).get();
      
      if (hashDoc.exists) {
        const hashData = hashDoc.data() as CVHashRecord;
        
        // If same user, not a violation (re-upload of own CV)
        if (hashData.originalUserId === userId) {
          return {
            isDuplicate: true,
            originalUserId: userId,
            originalUploadDate: hashData.uploadTimestamp,
            violationType: 'exact_duplicate',
            confidence: 1.0,
            existingHashId: hash,
            shouldFlag: false
          };
        }
        
        // Different user uploading same CV - policy violation
        return {
          isDuplicate: true,
          originalUserId: hashData.originalUserId,
          originalUploadDate: hashData.uploadTimestamp,
          violationType: 'exact_duplicate',
          confidence: 1.0,
          existingHashId: hash,
          shouldFlag: true
        };
      }
      
      // Check for similar content (fuzzy matching)
      const similarHashes = await this.findSimilarHashes(hash, userId);
      if (similarHashes.length > 0) {
        const bestMatch = similarHashes[0];
        return {
          isDuplicate: true,
          originalUserId: bestMatch.originalUserId,
          originalUploadDate: bestMatch.uploadTimestamp,
          violationType: 'similar_content',
          confidence: bestMatch.similarityScore || 0,
          existingHashId: bestMatch.hashId,
          shouldFlag: bestMatch.similarityScore! >= this.VIOLATION_THRESHOLD
        };
      }
      
      // No duplicates found
      return {
        isDuplicate: false,
        confidence: 0,
        shouldFlag: false
      };
      
    } catch (error) {
      logger.error('Error checking for duplicates', { error, hash, userId });
      throw new Error('Failed to check for duplicate CVs');
    }
  }

  /**
   * Record a new CV upload or add to existing duplicate list
   */
  async recordCVUpload(
    hash: string, 
    userId: string, 
    metadata: CVMetadata,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    try {
      const hashDocRef = this.db.collection('cvHashRecords').doc(hash);
      const hashDoc = await hashDocRef.get();
      
      const uploadRecord = {
        userId,
        uploadTime: new Date(),
        violationFlags: [] as string[],
        ipAddress: requestInfo?.ipAddress,
        userAgent: requestInfo?.userAgent
      };
      
      if (hashDoc.exists) {
        // Add to duplicate uploads list
        await hashDocRef.update({
          duplicateUploads: [...(hashDoc.data()!.duplicateUploads || []), uploadRecord],
          lastViolationCheck: new Date()
        });
        
        logger.info('Added duplicate upload record', { hash, userId });
      } else {
        // Create new hash record
        const newHashRecord: CVHashRecord = {
          hashId: hash,
          originalUserId: userId,
          uploadTimestamp: new Date(),
          duplicateUploads: [],
          cvMetadata: metadata,
          policyStatus: 'clean',
          lastViolationCheck: new Date()
        };
        
        await hashDocRef.set(newHashRecord);
        logger.info('Created new CV hash record', { hash, userId });
      }
    } catch (error) {
      logger.error('Error recording CV upload', { error, hash, userId });
      throw new Error('Failed to record CV upload');
    }
  }

  /**
   * Flag a policy violation for a specific hash/user combination
   */
  async flagPolicyViolation(
    hash: string, 
    userId: string, 
    violationType: string,
    evidence?: any
  ): Promise<void> {
    try {
      const hashDocRef = this.db.collection('cvHashRecords').doc(hash);
      const hashDoc = await hashDocRef.get();
      
      if (!hashDoc.exists) {
        logger.warn('Attempted to flag violation for non-existent hash', { hash, userId });
        return;
      }
      
      const hashData = hashDoc.data() as CVHashRecord;
      
      // Update duplicate uploads with violation flag
      const updatedDuplicates = hashData.duplicateUploads.map(upload => {
        if (upload.userId === userId) {
          return {
            ...upload,
            violationFlags: [...upload.violationFlags, violationType]
          };
        }
        return upload;
      });
      
      // Update policy status
      const newPolicyStatus = violationType === 'severe' ? 'violation' : 'flagged';
      
      await hashDocRef.update({
        duplicateUploads: updatedDuplicates,
        policyStatus: newPolicyStatus,
        lastViolationCheck: new Date()
      });
      
      logger.warn('Policy violation flagged', { 
        hash, 
        userId, 
        violationType, 
        evidence: evidence ? JSON.stringify(evidence).substring(0, 200) : undefined 
      });
      
    } catch (error) {
      logger.error('Error flagging policy violation', { error, hash, userId, violationType });
      throw new Error('Failed to flag policy violation');
    }
  }

  /**
   * Get duplicate upload statistics for monitoring
   */
  async getDuplicateStats(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalDuplicates: number;
    uniqueViolators: number;
    topViolatingHashes: string[];
    timeRangeStart: Date;
  }> {
    try {
      const now = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      const hashRecords = await this.db
        .collection('cvHashRecords')
        .where('lastViolationCheck', '>=', startDate)
        .where('policyStatus', 'in', ['flagged', 'violation'])
        .get();
      
      let totalDuplicates = 0;
      const uniqueViolators = new Set<string>();
      const hashViolationCounts: Record<string, number> = {};
      
      hashRecords.forEach(doc => {
        const data = doc.data() as CVHashRecord;
        const duplicatesInRange = data.duplicateUploads.filter(
          upload => upload.uploadTime >= startDate && upload.violationFlags.length > 0
        );
        
        totalDuplicates += duplicatesInRange.length;
        duplicatesInRange.forEach(upload => uniqueViolators.add(upload.userId));
        
        if (duplicatesInRange.length > 0) {
          hashViolationCounts[doc.id] = duplicatesInRange.length;
        }
      });
      
      const topViolatingHashes = Object.entries(hashViolationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([hash]) => hash);
      
      return {
        totalDuplicates,
        uniqueViolators: uniqueViolators.size,
        topViolatingHashes,
        timeRangeStart: startDate
      };
    } catch (error) {
      logger.error('Error getting duplicate stats', { error, timeRange });
      throw new Error('Failed to get duplicate statistics');
    }
  }

  /**
   * Normalize CV content for consistent hashing
   */
  private normalizeContent(content: string): string {
    return content
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove dates in various formats
      .replace(/\d{4}-\d{2}-\d{2}/g, '')
      .replace(/\d{1,2}\/\d{1,2}\/\d{4}/g, '')
      .replace(/\d{1,2}-\d{1,2}-\d{4}/g, '')
      // Remove phone numbers
      .replace(/[\d\-\(\)\+\s]{10,}/g, '')
      // Remove email addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/g, '')
      // Remove addresses (basic pattern)
      .replace(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)/gi, '')
      // Remove common CV formatting markers
      .replace(/•|\*|-|\d+\./g, '')
      // Remove extra punctuation
      .replace(/[^\w\s]/g, ' ')
      // Normalize to lowercase
      .toLowerCase()
      // Final cleanup
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Find similar hashes using fuzzy matching (basic implementation)
   * In production, this could use more sophisticated algorithms
   */
  private async findSimilarHashes(hash: string, userId: string): Promise<CVHashRecord[]> {
    try {
      // For now, implement basic string similarity check
      // In production, consider using vector similarity or more advanced algorithms
      
      const allHashes = await this.db
        .collection('cvHashRecords')
        .where('originalUserId', '!=', userId)
        .limit(100) // Limit for performance
        .get();
      
      const similarHashes: CVHashRecord[] = [];
      
      allHashes.forEach(doc => {
        const data = doc.data() as CVHashRecord;
        const similarity = this.calculateStringSimilarity(hash, data.hashId);
        
        if (similarity >= this.SIMILARITY_THRESHOLD) {
          similarHashes.push({
            ...data,
            similarityScore: similarity
          });
        }
      });
      
      return similarHashes.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
      
    } catch (error) {
      logger.error('Error finding similar hashes', { error, hash, userId });
      return [];
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}