/**
 * Role Profile Service
 * 
 * Comprehensive service for managing role profiles including CRUD operations,
 * caching, and integration with Firebase Firestore
 */

import { 
  RoleProfile,
  RoleProfileId,
  RoleProfileServiceConfig,
  RoleDetectionMetrics,
  RoleCategory,
  ExperienceLevel,
  CVSection
} from '../types/role-profile.types';
import * as admin from 'firebase-admin';
import { roleProfilesData } from '../data/role-profiles.data';

export class RoleProfileService {
  private db: FirebaseFirestore.Firestore;
  private cache: Map<string, RoleProfile>;
  private cacheTimeout: number;
  private config: RoleProfileServiceConfig;
  private lastCacheUpdate: number;
  private metrics: RoleDetectionMetrics;

  constructor(config?: Partial<RoleProfileServiceConfig>) {
    this.db = admin.firestore();
    this.cache = new Map();
    this.lastCacheUpdate = 0;
    
    this.config = {
      enableCaching: true,
      cacheTimeout: 3600000, // 1 hour
      enableAnalytics: true,
      defaultDetectionConfig: {
        confidenceThreshold: 0.6,
        maxResults: 5,
        enableMultiRoleDetection: true,
        weightingFactors: {
          title: 0.3,
          skills: 0.35,
          experience: 0.25,
          industry: 0.08,
          education: 0.02
        }
      },
      ...config
    };

    this.metrics = {
      totalDetections: 0,
      successfulMatches: 0,
      averageConfidence: 0,
      popularRoles: [],
      performance: {
        averageProcessingTime: 0,
        cacheHitRate: 0
      }
    };

    console.log('[ROLE-PROFILE] Service initialized with config:', this.config);
    this.initializeDefaultProfiles();
  }

  /**
   * Gets all available role profiles
   */
  async getAllProfiles(): Promise<RoleProfile[]> {
    console.log('[ROLE-PROFILE] Getting all profiles');
    
    try {
      // Check cache first if enabled
      if (this.config.enableCaching && this.isCacheValid()) {
        console.log('[ROLE-PROFILE] Returning cached profiles');
        return Array.from(this.cache.values());
      }

      // Fetch from Firestore
      const snapshot = await this.db
        .collection('roleProfiles')
        .where('isActive', '==', true)
        .orderBy('name')
        .get();

      const profiles: RoleProfile[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        profiles.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as RoleProfile);
      });

      // Update cache
      if (this.config.enableCaching) {
        this.updateCache(profiles);
      }

      // If no profiles in Firestore, use default data
      if (profiles.length === 0) {
        console.log('[ROLE-PROFILE] No profiles in Firestore, using default data');
        return this.getDefaultProfiles();
      }

      console.log(`[ROLE-PROFILE] Retrieved ${profiles.length} profiles`);
      return profiles;

    } catch (error) {
      console.error('[ROLE-PROFILE] Error getting all profiles:', error);
      // Fallback to default profiles
      return this.getDefaultProfiles();
    }
  }

  /**
   * Gets a specific role profile by ID
   */
  async getProfileById(id: string): Promise<RoleProfile | null> {
    console.log(`[ROLE-PROFILE] Getting profile by ID: ${id}`);
    
    try {
      // Check cache first
      if (this.config.enableCaching && this.cache.has(id)) {
        console.log('[ROLE-PROFILE] Profile found in cache');
        return this.cache.get(id) || null;
      }

      // Fetch from Firestore
      const doc = await this.db.collection('roleProfiles').doc(id).get();
      
      if (!doc.exists) {
        console.warn(`[ROLE-PROFILE] Profile not found: ${id}`);
        return null;
      }

      const data = doc.data()!;
      const profile: RoleProfile = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as RoleProfile;

      // Update cache
      if (this.config.enableCaching) {
        this.cache.set(id, profile);
      }

      return profile;

    } catch (error) {
      console.error('[ROLE-PROFILE] Error getting profile by ID:', error);
      return null;
    }
  }

  /**
   * Gets profiles by category
   */
  async getProfilesByCategory(category: RoleCategory): Promise<RoleProfile[]> {
    console.log(`[ROLE-PROFILE] Getting profiles by category: ${category}`);
    
    try {
      const snapshot = await this.db
        .collection('roleProfiles')
        .where('category', '==', category)
        .where('isActive', '==', true)
        .orderBy('name')
        .get();

      const profiles: RoleProfile[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        profiles.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as RoleProfile);
      });

      console.log(`[ROLE-PROFILE] Found ${profiles.length} profiles for category ${category}`);
      return profiles;

    } catch (error) {
      console.error('[ROLE-PROFILE] Error getting profiles by category:', error);
      return [];
    }
  }

  /**
   * Creates a new role profile
   */
  async createProfile(profileData: Omit<RoleProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    console.log('[ROLE-PROFILE] Creating new profile:', profileData.name);
    
    try {
      const now = admin.firestore.Timestamp.now();
      const docRef = await this.db.collection('roleProfiles').add({
        ...profileData,
        createdAt: now,
        updatedAt: now
      });

      // Invalidate cache
      if (this.config.enableCaching) {
        this.invalidateCache();
      }

      console.log(`[ROLE-PROFILE] Created profile with ID: ${docRef.id}`);
      return docRef.id;

    } catch (error) {
      console.error('[ROLE-PROFILE] Error creating profile:', error);
      throw new Error(`Failed to create role profile: ${error}`);
    }
  }

  /**
   * Updates an existing role profile
   */
  async updateProfile(id: string, updates: Partial<RoleProfile>): Promise<void> {
    console.log(`[ROLE-PROFILE] Updating profile: ${id}`);
    
    try {
      const updateData = {
        ...updates,
        updatedAt: admin.firestore.Timestamp.now()
      };

      // Remove fields that shouldn't be updated
      delete (updateData as any).id;
      delete (updateData as any).createdAt;

      await this.db.collection('roleProfiles').doc(id).update(updateData);

      // Invalidate cache
      if (this.config.enableCaching) {
        this.cache.delete(id);
      }

      console.log(`[ROLE-PROFILE] Updated profile: ${id}`);

    } catch (error) {
      console.error('[ROLE-PROFILE] Error updating profile:', error);
      throw new Error(`Failed to update role profile: ${error}`);
    }
  }

  /**
   * Deactivates a role profile (soft delete)
   */
  async deactivateProfile(id: string): Promise<void> {
    console.log(`[ROLE-PROFILE] Deactivating profile: ${id}`);
    
    try {
      await this.db.collection('roleProfiles').doc(id).update({
        isActive: false,
        updatedAt: admin.firestore.Timestamp.now()
      });

      // Remove from cache
      if (this.config.enableCaching) {
        this.cache.delete(id);
      }

      console.log(`[ROLE-PROFILE] Deactivated profile: ${id}`);

    } catch (error) {
      console.error('[ROLE-PROFILE] Error deactivating profile:', error);
      throw new Error(`Failed to deactivate role profile: ${error}`);
    }
  }

  /**
   * Searches profiles by keywords
   */
  async searchProfiles(query: string, limit: number = 10): Promise<RoleProfile[]> {
    console.log(`[ROLE-PROFILE] Searching profiles with query: ${query}`);
    
    try {
      const queryLower = query.toLowerCase();
      
      // For Firestore, we'll need to get all profiles and filter client-side
      // In production, consider using Algolia or similar search service
      const allProfiles = await this.getAllProfiles();
      
      const matchingProfiles = allProfiles.filter(profile => 
        profile.name.toLowerCase().includes(queryLower) ||
        profile.description.toLowerCase().includes(queryLower) ||
        profile.keywords.some(keyword => keyword.toLowerCase().includes(queryLower)) ||
        profile.requiredSkills.some(skill => skill.toLowerCase().includes(queryLower))
      );

      const results = matchingProfiles.slice(0, limit);
      console.log(`[ROLE-PROFILE] Found ${results.length} matching profiles`);
      
      return results;

    } catch (error) {
      console.error('[ROLE-PROFILE] Error searching profiles:', error);
      return [];
    }
  }

  /**
   * Gets profile statistics and metrics
   */
  async getMetrics(): Promise<RoleDetectionMetrics> {
    console.log('[ROLE-PROFILE] Getting service metrics');
    
    try {
      // In production, these metrics would be tracked and stored
      // For now, return basic metrics
      const profiles = await this.getAllProfiles();
      
      this.metrics.popularRoles = profiles.slice(0, 5).map(profile => ({
        roleId: profile.id,
        roleName: profile.name,
        matchCount: Math.floor(Math.random() * 100) // Placeholder
      }));

      const metrics: RoleDetectionMetrics = {
        ...this.metrics
      };
      
      if (this.config.enableCaching) {
        (metrics as any).cacheHitRate = this.calculateCacheHitRate();
      }
      
      return metrics;

    } catch (error) {
      console.error('[ROLE-PROFILE] Error getting metrics:', error);
      return this.metrics;
    }
  }

  /**
   * Validates a role profile structure
   */
  validateProfile(profile: Partial<RoleProfile>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!profile.name || profile.name.trim().length < 3) {
      errors.push('Profile name must be at least 3 characters');
    }

    if (!profile.category || !Object.values(RoleCategory).includes(profile.category)) {
      errors.push('Valid category is required');
    }

    if (!profile.description || profile.description.trim().length < 20) {
      errors.push('Description must be at least 20 characters');
    }

    if (!profile.keywords || profile.keywords.length < 3) {
      errors.push('At least 3 keywords are required');
    }

    if (!profile.requiredSkills || profile.requiredSkills.length < 2) {
      errors.push('At least 2 required skills must be specified');
    }

    if (!profile.matchingCriteria) {
      errors.push('Matching criteria is required');
    } else {
      if (!profile.matchingCriteria.skillKeywords || profile.matchingCriteria.skillKeywords.length < 3) {
        errors.push('At least 3 skill keywords required for matching');
      }
      if (!profile.matchingCriteria.titleKeywords || profile.matchingCriteria.titleKeywords.length < 2) {
        errors.push('At least 2 title keywords required for matching');
      }
    }

    if (!profile.enhancementTemplates) {
      errors.push('Enhancement templates are required');
    }

    if (!profile.validationRules) {
      errors.push('Validation rules are required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Initialize default profiles from static data
   */
  private async initializeDefaultProfiles(): Promise<void> {
    console.log('[ROLE-PROFILE] Initializing default profiles');
    
    try {
      // Check if profiles already exist
      const snapshot = await this.db.collection('roleProfiles').limit(1).get();
      
      if (!snapshot.empty) {
        console.log('[ROLE-PROFILE] Profiles already exist, skipping initialization');
        return;
      }

      // Add default profiles
      const defaultProfiles = roleProfilesData;
      const batch = this.db.batch();

      defaultProfiles.forEach(profile => {
        const docRef = this.db.collection('roleProfiles').doc();
        batch.set(docRef, {
          ...profile,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        });
      });

      await batch.commit();
      console.log(`[ROLE-PROFILE] Initialized ${defaultProfiles.length} default profiles`);

    } catch (error) {
      console.error('[ROLE-PROFILE] Error initializing default profiles:', error);
    }
  }

  /**
   * Gets default profiles (fallback when Firestore is unavailable)
   */
  private getDefaultProfiles(): RoleProfile[] {
    console.log('[ROLE-PROFILE] Using default profile data');
    return roleProfilesData.map((profile, index) => ({
      id: `default_${index}`,
      ...profile,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
  }

  /**
   * Updates the in-memory cache
   */
  private updateCache(profiles: RoleProfile[]): void {
    this.cache.clear();
    profiles.forEach(profile => {
      this.cache.set(profile.id, profile);
    });
    this.lastCacheUpdate = Date.now();
    console.log(`[ROLE-PROFILE] Cache updated with ${profiles.length} profiles`);
  }

  /**
   * Checks if the cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.config.enableCaching || this.cache.size === 0) {
      return false;
    }
    return (Date.now() - this.lastCacheUpdate) < this.config.cacheTimeout;
  }

  /**
   * Invalidates the cache
   */
  private invalidateCache(): void {
    this.cache.clear();
    this.lastCacheUpdate = 0;
    console.log('[ROLE-PROFILE] Cache invalidated');
  }

  /**
   * Calculates cache hit rate for metrics
   */
  private calculateCacheHitRate(): number {
    // This would be calculated based on actual cache hits vs misses
    // For now, return a placeholder value
    return 0.75;
  }

  /**
   * Updates service configuration
   */
  updateConfig(newConfig: Partial<RoleProfileServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[ROLE-PROFILE] Configuration updated:', newConfig);
  }

  /**
   * Gets current service configuration and status
   */
  getStatus(): {
    service: string;
    config: RoleProfileServiceConfig;
    cacheStatus: {
      enabled: boolean;
      size: number;
      lastUpdate: number;
      isValid: boolean;
    };
    profileCount: number;
  } {
    return {
      service: 'RoleProfileService',
      config: this.config,
      cacheStatus: {
        enabled: this.config.enableCaching,
        size: this.cache.size,
        lastUpdate: this.lastCacheUpdate,
        isValid: this.isCacheValid()
      },
      profileCount: this.cache.size
    };
  }
}