import { getFunctions, httpsCallable } from 'firebase/functions';
import type {
  RoleProfile,
  DetectedRole,
  RoleProfileAnalysis,
  RoleBasedRecommendation,
  RoleDetectionResponse,
  RoleProfilesResponse,
  RoleBasedRecommendationsResponse,
  RoleApplicationResult,
  FirebaseFunctionResponse
} from '../types/role-profiles';
import { logError } from '../utils/errorHandling';

/**
 * Role Profile Service
 * Handles all role profile related operations with Firebase Functions
 */
export class RoleProfileService {
  private functions = getFunctions();
  private detectRoleProfile = httpsCallable(this.functions, 'detectRoleProfile');
  private getRoleProfiles = httpsCallable(this.functions, 'getRoleProfiles');
  private applyRoleProfile = httpsCallable(this.functions, 'applyRoleProfile');
  private getRoleBasedRecommendations = httpsCallable(this.functions, 'getRoleBasedRecommendations');

  /**
   * Detect role profile for a CV/job
   */
  async detectRole(
    jobId: string,
    forceRegenerate = false
  ): Promise<RoleDetectionResponse> {
    try {
      console.log('[RoleProfileService] Detecting role for job:', jobId);
      
      const result = await this.detectRoleProfile({
        jobId,
        forceRegenerate
      }) as FirebaseFunctionResponse<RoleDetectionResponse['data']>;

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Role detection failed');
      }

      return {
        success: true,
        data: result.data.data!
      };
    } catch (error: any) {
      console.error('[RoleProfileService] Detection error:', error);
      logError('detectRole', error);
      throw new Error(`Role detection failed: ${error.message}`);
    }
  }

  /**
   * Get all available role profiles
   */
  async getAllRoleProfiles(): Promise<RoleProfile[]> {
    try {
      console.log('[RoleProfileService] Fetching all role profiles');
      
      const result = await this.getRoleProfiles({}) as FirebaseFunctionResponse<RoleProfilesResponse['data']>;

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to fetch role profiles');
      }

      return result.data.data!.profiles;
    } catch (error: any) {
      console.error('[RoleProfileService] Fetch error:', error);
      logError('getAllRoleProfiles', error);
      throw new Error(`Failed to fetch role profiles: ${error.message}`);
    }
  }

  /**
   * Get role profiles by category
   */
  async getRoleProfilesByCategory(category: string): Promise<RoleProfile[]> {
    try {
      console.log('[RoleProfileService] Fetching role profiles for category:', category);
      
      const result = await this.getRoleProfiles({
        category
      }) as FirebaseFunctionResponse<RoleProfilesResponse['data']>;

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to fetch role profiles');
      }

      return result.data.data!.profiles;
    } catch (error: any) {
      console.error('[RoleProfileService] Fetch by category error:', error);
      logError('getRoleProfilesByCategory', error);
      throw new Error(`Failed to fetch role profiles for category: ${error.message}`);
    }
  }

  /**
   * Search role profiles
   */
  async searchRoleProfiles(
    searchQuery: string,
    limit = 20
  ): Promise<RoleProfile[]> {
    try {
      console.log('[RoleProfileService] Searching role profiles:', searchQuery);
      
      const result = await this.getRoleProfiles({
        searchQuery,
        limit
      }) as FirebaseFunctionResponse<RoleProfilesResponse['data']>;

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to search role profiles');
      }

      return result.data.data!.profiles;
    } catch (error: any) {
      console.error('[RoleProfileService] Search error:', error);
      logError('searchRoleProfiles', error);
      throw new Error(`Failed to search role profiles: ${error.message}`);
    }
  }

  /**
   * Apply a role profile to a job/CV
   */
  async applyRole(
    jobId: string,
    roleProfileId: string,
    customizationOptions?: any
  ): Promise<RoleApplicationResult> {
    try {
      console.log('[RoleProfileService] Applying role profile:', { jobId, roleProfileId });
      
      const result = await this.applyRoleProfile({
        jobId,
        roleProfileId,
        customizationOptions
      }) as FirebaseFunctionResponse<RoleApplicationResult>;

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to apply role profile');
      }

      return result.data.data!;
    } catch (error: any) {
      console.error('[RoleProfileService] Apply role error:', error);
      logError('applyRole', error);
      throw new Error(`Failed to apply role profile: ${error.message}`);
    }
  }

  /**
   * Get role-based recommendations
   */
  async getRoleRecommendations(
    jobId: string,
    roleProfileId?: string,
    targetRole?: string,
    industryKeywords?: string[],
    forceRegenerate = false
  ): Promise<RoleBasedRecommendation[]> {
    try {
      console.log('[RoleProfileService] Getting role-based recommendations:', {
        jobId,
        roleProfileId,
        targetRole
      });
      
      const requestData: any = {
        jobId,
        forceRegenerate
      };

      if (roleProfileId) {
        requestData.roleProfileId = roleProfileId;
      }
      if (targetRole) {
        requestData.targetRole = targetRole;
      }
      if (industryKeywords) {
        requestData.industryKeywords = industryKeywords;
      }

      const result = await this.getRoleBasedRecommendations(
        requestData
      ) as FirebaseFunctionResponse<RoleBasedRecommendationsResponse['data']>;

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to get role-based recommendations');
      }

      return result.data.data!.recommendations;
    } catch (error: any) {
      console.error('[RoleProfileService] Get recommendations error:', error);
      logError('getRoleRecommendations', error);
      throw new Error(`Failed to get role-based recommendations: ${error.message}`);
    }
  }

  /**
   * Auto-detect and apply role in one operation
   */
  async autoDetectAndApply(
    jobId: string,
    customizationOptions?: any
  ): Promise<{
    detection: RoleDetectionResponse;
    application: RoleApplicationResult;
  }> {
    try {
      console.log('[RoleProfileService] Auto-detecting and applying role for job:', jobId);
      
      // First, detect the role
      const detection = await this.detectRole(jobId);
      
      if (!detection.data.detectedRole) {
        throw new Error('No suitable role detected');
      }

      // Apply the detected role
      const application = await this.applyRole(
        jobId,
        detection.data.detectedRole.roleId,
        customizationOptions
      );

      return {
        detection,
        application
      };
    } catch (error: any) {
      console.error('[RoleProfileService] Auto-detect and apply error:', error);
      logError('autoDetectAndApply', error);
      throw new Error(`Auto-detect and apply failed: ${error.message}`);
    }
  }

  /**
   * Get enhanced recommendations combining role detection with recommendations
   */
  async getEnhancedRecommendations(
    jobId: string,
    forceRoleDetection = false
  ): Promise<{
    role: DetectedRole | null;
    analysis: RoleProfileAnalysis | null;
    recommendations: RoleBasedRecommendation[];
  }> {
    try {
      console.log('[RoleProfileService] Getting enhanced recommendations for job:', jobId);
      
      let role: DetectedRole | null = null;
      let analysis: RoleProfileAnalysis | null = null;

      // Detect role if needed
      try {
        const detection = await this.detectRole(jobId, forceRoleDetection);
        role = detection.data.detectedRole;
        analysis = detection.data.analysis;
      } catch (detectionError) {
        console.warn('[RoleProfileService] Role detection failed, proceeding without role context:', detectionError);
      }

      // Get recommendations with or without role context
      const recommendations = await this.getRoleRecommendations(
        jobId,
        role?.roleId,
        role?.roleName
      );

      return {
        role,
        analysis,
        recommendations
      };
    } catch (error: any) {
      console.error('[RoleProfileService] Enhanced recommendations error:', error);
      logError('getEnhancedRecommendations', error);
      throw new Error(`Failed to get enhanced recommendations: ${error.message}`);
    }
  }

  /**
   * Validate role profile compatibility with CV
   */
  async validateRoleCompatibility(
    jobId: string,
    roleProfileId: string
  ): Promise<{
    compatible: boolean;
    confidence: number;
    missingSkills: string[];
    recommendations: string[];
  }> {
    try {
      console.log('[RoleProfileService] Validating role compatibility:', { jobId, roleProfileId });
      
      // Get role detection to check compatibility
      const detection = await this.detectRole(jobId);
      
      const targetMatch = detection.data.analysis.alternativeRoles.find(
        role => role.roleId === roleProfileId
      ) || (detection.data.detectedRole.roleId === roleProfileId ? detection.data.detectedRole : null);

      if (!targetMatch) {
        return {
          compatible: false,
          confidence: 0,
          missingSkills: [],
          recommendations: ['Consider a different role profile or add relevant experience']
        };
      }

      return {
        compatible: targetMatch.confidence > 0.5,
        confidence: targetMatch.confidence,
        missingSkills: [], // Would be populated from detailed analysis
        recommendations: targetMatch.recommendations || []
      };
    } catch (error: any) {
      console.error('[RoleProfileService] Compatibility validation error:', error);
      logError('validateRoleCompatibility', error);
      throw new Error(`Failed to validate role compatibility: ${error.message}`);
    }
  }
}

// Export singleton instance
export const roleProfileService = new RoleProfileService();
export default roleProfileService;