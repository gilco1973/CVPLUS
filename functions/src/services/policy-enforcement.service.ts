import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
const FieldValue = admin.firestore.FieldValue;
import { CVHashService, DuplicateCheckResult, CVMetadata } from './cv-hash.service';
import { 
  NameVerificationService, 
  NameExtractionResult, 
  NameVerificationResult, 
  AccountNameData 
} from './name-verification.service';
import { getUserSubscriptionInternal } from '../functions/payments/getUserSubscription';

export interface PolicyCheckRequest {
  userId: string;
  cvContent: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  requestInfo?: {
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface PolicyCheckResult {
  allowed: boolean;
  violations: PolicyViolation[];
  warnings: PolicyWarning[];
  actions: PolicyAction[];
  metadata: {
    cvHash: string;
    extractedNames: string[];
    usageStats: UsageStats;
  };
}

export interface PolicyViolation {
  type: 'duplicate_cv' | 'name_mismatch' | 'usage_limit_exceeded' | 'account_sharing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  requiresAction: boolean;
  suggestedActions: string[];
}

export interface PolicyWarning {
  type: 'approaching_limit' | 'name_similarity' | 'unusual_activity';
  message: string;
  details: any;
}

export interface PolicyAction {
  type: 'block_upload' | 'require_verification' | 'flag_account' | 'send_notification';
  priority: 'immediate' | 'high' | 'medium' | 'low';
  payload: any;
}

export interface UsageStats {
  currentMonthUploads: number;
  uniqueCVsThisMonth: number;
  remainingUploads: number;
  subscriptionStatus: 'free' | 'premium';
  lifetimeAccess: boolean;
}

export class PolicyEnforcementService {
  private readonly db = admin.firestore();
  private readonly cvHashService = new CVHashService();
  private readonly nameVerificationService = new NameVerificationService();

  private readonly FREE_PLAN_LIMITS = {
    monthlyUploads: 3,
    uniqueCVs: 1
  };

  private readonly PREMIUM_PLAN_LIMITS = {
    monthlyUploads: Infinity,
    uniqueCVs: 3
  };

  /**
   * Comprehensive policy check for CV upload
   */
  async checkUploadPolicy(request: PolicyCheckRequest): Promise<PolicyCheckResult> {
    try {
      logger.info('Starting policy check', { 
        userId: request.userId, 
        fileName: request.fileName,
        fileSize: request.fileSize 
      });

      const violations: PolicyViolation[] = [];
      const warnings: PolicyWarning[] = [];
      const actions: PolicyAction[] = [];

      // Step 1: Get user account and subscription info
      const [userAccount, subscriptionData] = await Promise.all([
        this.getUserAccountInfo(request.userId),
        getUserSubscriptionInternal(request.userId)
      ]);

      // Step 2: Check usage limits
      const usageStats = await this.checkUsageLimits(request.userId, subscriptionData);
      if (usageStats.remainingUploads <= 0) {
        violations.push({
          type: 'usage_limit_exceeded',
          severity: 'high',
          message: 'Monthly upload limit exceeded',
          details: { usageStats },
          requiresAction: true,
          suggestedActions: ['upgrade_to_premium', 'wait_for_next_month']
        });

        actions.push({
          type: 'block_upload',
          priority: 'immediate',
          payload: { reason: 'usage_limit_exceeded', usageStats }
        });
      } else if (usageStats.remainingUploads <= 1) {
        warnings.push({
          type: 'approaching_limit',
          message: 'Approaching monthly upload limit',
          details: { usageStats }
        });
      }

      // Step 3: Generate CV hash and check for duplicates
      const cvHash = await this.cvHashService.generateCVHash(request.cvContent);
      const duplicateCheck = await this.cvHashService.checkForDuplicates(cvHash, request.userId);

      if (duplicateCheck.shouldFlag) {
        violations.push({
          type: 'duplicate_cv',
          severity: duplicateCheck.violationType === 'exact_duplicate' ? 'critical' : 'high',
          message: 'Duplicate CV detected',
          details: {
            violationType: duplicateCheck.violationType,
            confidence: duplicateCheck.confidence,
            originalUserId: duplicateCheck.originalUserId,
            originalUploadDate: duplicateCheck.originalUploadDate
          },
          requiresAction: true,
          suggestedActions: ['verify_ownership', 'use_original_cv', 'contact_support']
        });

        actions.push({
          type: 'require_verification',
          priority: 'high',
          payload: { verificationType: 'cv_ownership', duplicateCheck }
        });
      }

      // Step 4: Extract and verify name
      const nameExtraction = await this.nameVerificationService.extractNameFromCV(request.cvContent);
      let nameVerification: NameVerificationResult | null = null;

      if (nameExtraction.extractedNames.length > 0) {
        nameVerification = await this.nameVerificationService.verifyNameMatch(
          nameExtraction,
          userAccount
        );

        if (nameVerification.shouldFlag) {
          violations.push({
            type: 'name_mismatch',
            severity: nameVerification.confidence < 0.3 ? 'critical' : 'high',
            message: 'Name in CV does not match account name',
            details: {
              extractedName: nameVerification.extractedName,
              accountName: nameVerification.accountName,
              confidence: nameVerification.confidence,
              matchType: nameVerification.matchType,
              suggestions: nameVerification.suggestions
            },
            requiresAction: true,
            suggestedActions: ['verify_name', 'update_account_name', 'explain_difference']
          });

          actions.push({
            type: 'require_verification',
            priority: 'high',
            payload: { verificationType: 'name_mismatch', nameVerification }
          });
        } else if (nameVerification.matchType === 'fuzzy') {
          warnings.push({
            type: 'name_similarity',
            message: 'CV name is similar but not exact match to account name',
            details: {
              extractedName: nameVerification.extractedName,
              accountName: nameVerification.accountName,
              confidence: nameVerification.confidence
            }
          });
        }
      }

      // Step 5: Check for account sharing patterns
      const accountSharingCheck = await this.checkAccountSharingPatterns(
        request.userId,
        request.requestInfo
      );

      if (accountSharingCheck.suspicious) {
        violations.push({
          type: 'account_sharing',
          severity: 'medium',
          message: 'Suspicious account sharing activity detected',
          details: accountSharingCheck.evidence,
          requiresAction: true,
          suggestedActions: ['verify_account_ownership', 'review_activity']
        });

        actions.push({
          type: 'flag_account',
          priority: 'medium',
          payload: { reason: 'suspected_sharing', evidence: accountSharingCheck.evidence }
        });
      }

      // Step 6: Record the check results
      await this.recordPolicyCheck(request.userId, {
        violations,
        warnings,
        cvHash,
        nameExtraction,
        nameVerification,
        usageStats,
        requestInfo: request.requestInfo
      });

      // Step 7: If no blocking violations, record the CV upload
      if (violations.every(v => !v.requiresAction)) {
        const cvMetadata: CVMetadata = {
          extractedName: nameExtraction.extractedNames[0] || 'Unknown',
          fileSize: request.fileSize,
          fileType: request.fileType,
          wordCount: this.estimateWordCount(request.cvContent),
          contentPreview: request.cvContent.substring(0, 500)
        };

        await this.cvHashService.recordCVUpload(
          cvHash,
          request.userId,
          cvMetadata,
          request.requestInfo
        );
      }

      const result: PolicyCheckResult = {
        allowed: violations.every(v => !v.requiresAction),
        violations,
        warnings,
        actions,
        metadata: {
          cvHash,
          extractedNames: nameExtraction.extractedNames,
          usageStats
        }
      };

      logger.info('Policy check completed', {
        userId: request.userId,
        allowed: result.allowed,
        violationsCount: violations.length,
        warningsCount: warnings.length,
        actionsCount: actions.length
      });

      return result;

    } catch (error) {
      logger.error('Error during policy check', { error, userId: request.userId });
      throw new Error('Policy check failed');
    }
  }

  /**
   * Check user's monthly usage limits
   */
  private async checkUsageLimits(userId: string, subscriptionData: any): Promise<UsageStats> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get user's uploads this month
      const uploadsQuery = await this.db
        .collection('userPolicyRecords')
        .doc(userId)
        .collection('uploadHistory')
        .where('uploadDate', '>=', startOfMonth)
        .get();

      const currentMonthUploads = uploadsQuery.size;
      const uniqueCVHashes = new Set(
        uploadsQuery.docs.map(doc => doc.data().cvHash)
      ).size;

      const isLifetimeAccess = subscriptionData.lifetimeAccess === true;
      const isPremium = subscriptionData.subscriptionStatus === 'premium' || isLifetimeAccess;

      const limits = isPremium ? this.PREMIUM_PLAN_LIMITS : this.FREE_PLAN_LIMITS;

      return {
        currentMonthUploads,
        uniqueCVsThisMonth: uniqueCVHashes,
        remainingUploads: Math.max(0, limits.monthlyUploads - currentMonthUploads),
        subscriptionStatus: isPremium ? 'premium' : 'free',
        lifetimeAccess: isLifetimeAccess
      };

    } catch (error) {
      logger.error('Error checking usage limits', { error, userId });
      throw new Error('Failed to check usage limits');
    }
  }

  /**
   * Get user account information
   */
  private async getUserAccountInfo(userId: string): Promise<AccountNameData> {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new Error('User account not found');
      }

      const userData = userDoc.data()!;
      
      return {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        fullName: userData.displayName || userData.fullName || `${userData.firstName} ${userData.lastName}`.trim(),
        displayName: userData.displayName,
        email: userData.email
      };

    } catch (error) {
      logger.error('Error getting user account info', { error, userId });
      throw new Error('Failed to get user account information');
    }
  }

  /**
   * Check for account sharing patterns
   */
  private async checkAccountSharingPatterns(
    userId: string,
    requestInfo?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ suspicious: boolean; evidence: any }> {
    try {
      if (!requestInfo?.ipAddress) {
        return { suspicious: false, evidence: {} };
      }

      // Check for multiple users from same IP in short time period
      const recentUploads = await this.db
        .collection('policyViolations')
        .where('metadata.ipAddress', '==', requestInfo.ipAddress)
        .where('createdAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        .get();

      const uniqueUsers = new Set(
        recentUploads.docs.map(doc => doc.data().userId)
      );

      const suspicious = uniqueUsers.size > 3; // More than 3 users from same IP

      return {
        suspicious,
        evidence: {
          uniqueUsersCount: uniqueUsers.size,
          ipAddress: requestInfo.ipAddress,
          recentUploadsCount: recentUploads.size
        }
      };

    } catch (error) {
      logger.error('Error checking account sharing patterns', { error, userId });
      return { suspicious: false, evidence: { error: error.message } };
    }
  }

  /**
   * Record policy check results
   */
  private async recordPolicyCheck(userId: string, checkData: any): Promise<void> {
    try {
      const policyRecordRef = this.db.collection('userPolicyRecords').doc(userId);
      const checkRecord = {
        userId,
        timestamp: new Date(),
        violations: checkData.violations,
        warnings: checkData.warnings,
        cvHash: checkData.cvHash,
        nameExtraction: checkData.nameExtraction,
        nameVerification: checkData.nameVerification,
        usageStats: checkData.usageStats,
        requestInfo: checkData.requestInfo
      };

      // Update user's policy record
      await policyRecordRef.set({
        userId,
        lastCheckDate: new Date(),
        totalChecks: FieldValue.increment(1),
        totalViolations: FieldValue.increment(checkData.violations.length),
        totalWarnings: FieldValue.increment(checkData.warnings.length)
      }, { merge: true });

      // Add to check history
      await policyRecordRef.collection('checkHistory').add(checkRecord);

      // Record violations separately for monitoring
      if (checkData.violations.length > 0) {
        await this.db.collection('policyViolations').add({
          userId,
          violations: checkData.violations,
          cvHash: checkData.cvHash,
          createdAt: new Date(),
          metadata: {
            ipAddress: checkData.requestInfo?.ipAddress,
            userAgent: checkData.requestInfo?.userAgent
          }
        });
      }

    } catch (error) {
      logger.error('Error recording policy check', { error, userId });
      // Don't throw here - policy check should succeed even if logging fails
    }
  }

  /**
   * Estimate word count in content
   */
  private estimateWordCount(content: string): number {
    return content.trim().split(/\s+/).length;
  }

  /**
   * Flag a policy violation after manual review
   */
  async flagViolation(
    userId: string,
    cvHash: string,
    violationType: string,
    reviewerNotes: string
  ): Promise<void> {
    try {
      await this.cvHashService.flagPolicyViolation(cvHash, userId, violationType, {
        reviewerNotes,
        reviewDate: new Date()
      });

      await this.db.collection('policyViolations').add({
        userId,
        cvHash,
        violationType,
        status: 'confirmed',
        reviewerNotes,
        createdAt: new Date()
      });

      logger.info('Policy violation flagged', { userId, cvHash, violationType });

    } catch (error) {
      logger.error('Error flagging violation', { error, userId, cvHash, violationType });
      throw new Error('Failed to flag policy violation');
    }
  }

  /**
   * Get policy compliance statistics
   */
  async getPolicyStats(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<{
    totalChecks: number;
    totalViolations: number;
    violationsByType: Record<string, number>;
    topViolatingUsers: string[];
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

      const violationsQuery = await this.db
        .collection('policyViolations')
        .where('createdAt', '>=', startDate)
        .get();

      const violationsByType: Record<string, number> = {};
      const userViolationCounts: Record<string, number> = {};

      violationsQuery.forEach(doc => {
        const data = doc.data();
        data.violations.forEach((violation: any) => {
          violationsByType[violation.type] = (violationsByType[violation.type] || 0) + 1;
        });
        userViolationCounts[data.userId] = (userViolationCounts[data.userId] || 0) + 1;
      });

      const topViolatingUsers = Object.entries(userViolationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([userId]) => userId);

      return {
        totalChecks: 0, // Would need separate tracking
        totalViolations: violationsQuery.size,
        violationsByType,
        topViolatingUsers
      };

    } catch (error) {
      logger.error('Error getting policy stats', { error, timeRange });
      throw new Error('Failed to get policy statistics');
    }
  }
}