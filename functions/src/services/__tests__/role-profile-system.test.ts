/**
 * Role Profile System Tests
 * 
 * Comprehensive tests for the role profile system integration
 */

import { ParsedCV } from '../../types/job';
import { RoleDetectionService } from '../role-detection.service';
import { RoleProfileService } from '../role-profile.service';
import { CVTransformationService } from '../cv-transformation.service';
import { RoleCategory, ExperienceLevel } from '../../types/role-profile.types';

// Mock CV data for testing
const mockSoftwareEngineerCV: ParsedCV = {
  personalInfo: {
    name: 'John Doe',
    title: 'Software Developer',
    email: 'john.doe@example.com',
    phone: '+1234567890'
  },
  summary: 'Experienced developer with 5 years in web development',
  experience: [
    {
      company: 'Tech Corp',
      position: 'Senior Software Engineer',
      duration: '3 years',
      startDate: '2021-01-01',
      endDate: '2024-01-01',
      description: 'Developed web applications using React and Node.js. Led team of 3 developers.',
      technologies: ['React', 'Node.js', 'PostgreSQL', 'AWS']
    },
    {
      company: 'StartupXYZ',
      position: 'Full Stack Developer',
      duration: '2 years',
      startDate: '2019-01-01',
      endDate: '2021-01-01',
      description: 'Built full-stack applications using JavaScript technologies.',
      technologies: ['JavaScript', 'MongoDB', 'Express']
    }
  ],
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Git'],
  education: [
    {
      institution: 'University of Technology',
      degree: 'Bachelor of Science in Computer Science',
      field: 'Computer Science',
      graduationDate: '2019',
      gpa: '3.8'
    }
  ],
  achievements: [
    'Led successful migration to microservices architecture',
    'Reduced application load time by 40%'
  ]
};

const mockDataScientistCV: ParsedCV = {
  personalInfo: {
    name: 'Jane Smith',
    title: 'Data Analyst',
    email: 'jane.smith@example.com'
  },
  summary: 'Data professional with expertise in machine learning and statistical analysis',
  experience: [
    {
      company: 'Analytics Corp',
      position: 'Data Scientist',
      duration: '3 years',
      startDate: '2021-01-01',
      description: 'Developed machine learning models using Python and TensorFlow. Analyzed large datasets.',
      technologies: ['Python', 'TensorFlow', 'Pandas', 'SQL', 'Tableau']
    }
  ],
  skills: ['Python', 'R', 'SQL', 'Machine Learning', 'TensorFlow', 'Pandas', 'NumPy', 'Statistics'],
  education: [
    {
      institution: 'Data Science University',
      degree: 'Master of Science in Data Science',
      field: 'Data Science',
      graduationDate: '2021'
    }
  ],
  projects: [
    {
      name: 'Customer Churn Prediction Model',
      description: 'Built ML model to predict customer churn with 85% accuracy',
      technologies: ['Python', 'Scikit-learn', 'Pandas'],
      url: 'https://github.com/janesmith/churn-model'
    }
  ]
};

describe('Role Profile System Integration', () => {
  let roleDetectionService: RoleDetectionService;
  let roleProfileService: RoleProfileService;
  let cvTransformationService: CVTransformationService;

  beforeEach(() => {
    // Initialize services (in real tests, you'd mock external dependencies)
    roleDetectionService = new RoleDetectionService();
    roleProfileService = new RoleProfileService();
    cvTransformationService = new CVTransformationService();
  });

  describe('RoleProfileService', () => {
    it('should initialize with default profiles', async () => {
      const profiles = await roleProfileService.getAllProfiles();
      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles.some(p => p.name === 'Software Engineer')).toBe(true);
      expect(profiles.some(p => p.name === 'Data Scientist')).toBe(true);
    });

    it('should get profile by category', async () => {
      const engineeringProfiles = await roleProfileService.getProfilesByCategory(RoleCategory.ENGINEERING);
      expect(engineeringProfiles.length).toBeGreaterThan(0);
      expect(engineeringProfiles.every(p => p.category === RoleCategory.ENGINEERING)).toBe(true);
    });

    it('should validate profile structure', () => {
      const validProfile = {
        name: 'Test Role',
        category: RoleCategory.ENGINEERING,
        description: 'A test role for validation purposes with sufficient length',
        keywords: ['test', 'validation', 'role'],
        requiredSkills: ['Skill1', 'Skill2'],
        preferredSkills: ['Skill3'],
        experienceLevel: ExperienceLevel.MID,
        industryFocus: ['Technology'],
        matchingCriteria: {
          titleKeywords: ['test', 'role'],
          skillKeywords: ['skill1', 'skill2', 'skill3'],
          industryKeywords: ['tech'],
          experienceKeywords: ['developed']
        },
        enhancementTemplates: {
          professionalSummary: 'Test summary template',
          skillsStructure: {
            categories: [{ name: 'Test', skills: ['skill1'], priority: 1 }],
            displayFormat: 'categorized' as const,
            maxSkillsPerCategory: 5
          },
          experienceEnhancements: [],
          achievementTemplates: [],
          keywordOptimization: []
        },
        validationRules: {
          requiredSections: [],
          optionalSections: [],
          criticalSkills: ['Skill1']
        },
        version: '1.0.0',
        isActive: true
      };

      const validation = roleProfileService.validateProfile(validProfile);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });

  describe('RoleDetectionService', () => {
    it('should detect Software Engineer role from CV', async () => {
      const analysis = await roleDetectionService.detectRoles(mockSoftwareEngineerCV);
      
      expect(analysis.primaryRole).toBeDefined();
      expect(analysis.primaryRole.roleName.toLowerCase()).toContain('software');
      expect(analysis.primaryRole.confidence).toBeGreaterThan(0.5);
      expect(analysis.enhancementSuggestions.immediate.length).toBeGreaterThan(0);
    });

    it('should detect Data Scientist role from CV', async () => {
      const analysis = await roleDetectionService.detectRoles(mockDataScientistCV);
      
      expect(analysis.primaryRole).toBeDefined();
      expect(analysis.primaryRole.roleName.toLowerCase()).toContain('data');
      expect(analysis.primaryRole.confidence).toBeGreaterThan(0.5);
    });

    it('should return multiple role alternatives', async () => {
      const analysis = await roleDetectionService.detectRoles(mockSoftwareEngineerCV);
      
      expect(analysis.alternativeRoles).toBeDefined();
      expect(Array.isArray(analysis.alternativeRoles)).toBe(true);
    });

    it('should provide gap analysis', async () => {
      const analysis = await roleDetectionService.detectRoles(mockSoftwareEngineerCV);
      
      expect(analysis.gapAnalysis).toBeDefined();
      expect(analysis.gapAnalysis.missingSkills).toBeDefined();
      expect(analysis.gapAnalysis.strengthAreas).toBeDefined();
      expect(analysis.gapAnalysis.weakAreas).toBeDefined();
    });
  });

  describe('Enhanced CV Transformation', () => {
    it('should generate role-enhanced recommendations', async () => {
      const recommendations = await cvTransformationService.generateRoleEnhancedRecommendations(
        mockSoftwareEngineerCV,
        true
      );
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.roleBasedRecommendation)).toBe(true);
      expect(recommendations.some(rec => rec.enhancementTemplate)).toBe(true);
    });

    it('should apply role-enhanced recommendations', async () => {
      const recommendations = await cvTransformationService.generateRoleEnhancedRecommendations(
        mockSoftwareEngineerCV,
        true
      );
      
      const topRecommendations = recommendations.slice(0, 3);
      const result = await cvTransformationService.applyRoleEnhancedRecommendations(
        mockSoftwareEngineerCV,
        topRecommendations,
        true
      );
      
      expect(result.roleAnalysis).toBeDefined();
      expect(result.detectedRole).toBeDefined();
      expect(result.roleEnhancedRecommendations).toBeDefined();
      expect(result.improvedCV).toBeDefined();
      expect(result.appliedRecommendations.length).toBeGreaterThan(0);
    });

    it('should get role enhancement templates', async () => {
      const templates = await cvTransformationService.getRoleEnhancementTemplates(mockSoftwareEngineerCV);
      
      expect(templates.detectedRole).toBeDefined();
      expect(templates.templates).toBeDefined();
      
      if (templates.detectedRole && templates.detectedRole.confidence > 0.5) {
        expect(templates.templates.professionalSummary).toBeDefined();
        expect(templates.templates.experienceEnhancements).toBeDefined();
        expect(templates.templates.skillsOptimization).toBeDefined();
        expect(templates.templates.achievementTemplates).toBeDefined();
      }
    });

    it('should handle fallback when role detection fails', async () => {
      const emptyCV: ParsedCV = {
        personalInfo: { name: 'Test User' }
      };
      
      const recommendations = await cvTransformationService.generateRoleEnhancedRecommendations(
        emptyCV,
        true
      );
      
      // Should still return recommendations even if role detection fails
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Service Integration', () => {
    it('should maintain service status and metrics', async () => {
      const roleProfileStatus = roleProfileService.getStatus();
      const roleDetectionStats = roleDetectionService.getStats();
      
      expect(roleProfileStatus.service).toBe('RoleProfileService');
      expect(roleProfileStatus.config).toBeDefined();
      expect(roleProfileStatus.cacheStatus).toBeDefined();
      
      expect(roleDetectionStats.service).toBe('RoleDetectionService');
      expect(roleDetectionStats.config).toBeDefined();
    });

    it('should handle configuration updates', () => {
      const newConfig = { confidenceThreshold: 0.8 };
      roleDetectionService.updateConfig(newConfig);
      
      const stats = roleDetectionService.getStats();
      expect(stats.config.confidenceThreshold).toBe(0.8);
    });
  });
});

// Helper functions for testing
export const createMockCV = (role: 'software-engineer' | 'data-scientist' | 'manager'): ParsedCV => {
  switch (role) {
    case 'software-engineer':
      return mockSoftwareEngineerCV;
    case 'data-scientist':
      return mockDataScientistCV;
    default:
      return mockSoftwareEngineerCV;
  }
};

export const assertRoleDetectionQuality = (analysis: any, expectedRole: string, minConfidence: number = 0.6) => {
  expect(analysis.primaryRole.roleName.toLowerCase()).toContain(expectedRole.toLowerCase());
  expect(analysis.primaryRole.confidence).toBeGreaterThan(minConfidence);
  expect(analysis.enhancementSuggestions.immediate.length).toBeGreaterThan(0);
};