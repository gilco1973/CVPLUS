/**
 * Industry Specialization Service
 * 
 * Provides industry-specific CV optimization and predictions
 * for the 10 priority industries in Phase 2.
 */

import * as admin from 'firebase-admin';
import { IndustryModel, SkillDefinition, CareerPath, CompanyProfile } from '../types/phase2-models';
import { ParsedCV } from '../types/job';

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

export interface IndustryOptimizationRequest {
  userId: string;
  cvData: ParsedCV;
  targetIndustry: string;
  targetRole?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  region?: string;
}

export interface IndustryOptimizationResult {
  industryScore: number;
  industryFit: 'excellent' | 'good' | 'fair' | 'poor';
  missingSkills: SkillDefinition[];
  skillGaps: {
    critical: string[];
    important: string[];
    nice_to_have: string[];
  };
  recommendations: IndustryRecommendation[];
  salaryBenchmark: {
    min: number;
    max: number;
    median: number;
    percentile: number;
  };
  careerPath: CareerPath;
  marketInsights: {
    growth: number;
    demand: 'low' | 'medium' | 'high';
    competitiveness: 'low' | 'medium' | 'high';
    trends: string[];
  };
  topCompanies: CompanyProfile[];
}

export interface IndustryRecommendation {
  type: 'skill' | 'certification' | 'experience' | 'project' | 'keyword';
  priority: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  impact: number; // 0-1 score improvement potential
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  resources?: string[];
}

export class IndustrySpecializationService {
  private static instance: IndustrySpecializationService;
  private industryModels = new Map<string, IndustryModel>();
  private initialized = false;

  public static getInstance(): IndustrySpecializationService {
    if (!IndustrySpecializationService.instance) {
      IndustrySpecializationService.instance = new IndustrySpecializationService();
    }
    return IndustrySpecializationService.instance;
  }

  /**
   * Initialize industry models and knowledge bases
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadIndustryModels();
      this.initialized = true;
      console.log('Industry specialization service initialized');
    } catch (error) {
      console.error('Failed to initialize industry service:', error);
      throw error;
    }
  }

  /**
   * Optimize CV for specific industry
   */
  async optimizeForIndustry(request: IndustryOptimizationRequest): Promise<IndustryOptimizationResult> {
    await this.initialize();

    const industryModel = this.industryModels.get(request.targetIndustry.toLowerCase());
    if (!industryModel) {
      throw new Error(`Unsupported industry: ${request.targetIndustry}`);
    }

    // Calculate industry-specific score
    const industryScore = await this.calculateIndustryScore(request.cvData, industryModel);
    
    // Analyze skill gaps
    const skillGaps = await this.analyzeSkillGaps(request.cvData, industryModel);
    
    // Generate recommendations
    const recommendations = await this.generateIndustryRecommendations(
      request.cvData, 
      industryModel, 
      skillGaps,
      request.experienceLevel
    );
    
    // Get salary benchmark
    const salaryBenchmark = await this.getSalaryBenchmark(
      industryModel,
      request.experienceLevel || 'mid',
      request.region || 'US'
    );
    
    // Get career path
    const careerPath = this.getRecommendedCareerPath(request.cvData, industryModel);
    
    // Get market insights
    const marketInsights = await this.getMarketInsights(industryModel);

    return {
      industryScore: Math.round(industryScore),
      industryFit: this.calculateIndustryFit(industryScore),
      missingSkills: skillGaps.missing,
      skillGaps: {
        critical: skillGaps.critical,
        important: skillGaps.important,
        nice_to_have: skillGaps.niceToHave
      },
      recommendations,
      salaryBenchmark,
      careerPath,
      marketInsights,
      topCompanies: industryModel.knowledgeBase.companies.topEmployers.slice(0, 5)
    };
  }

  /**
   * Get supported industries
   */
  getSupportedIndustries(): string[] {
    return [
      'Technology',
      'Finance',
      'Healthcare',
      'Marketing',
      'Sales',
      'Consulting',
      'Education',
      'Engineering',
      'Legal',
      'Manufacturing'
    ];
  }

  /**
   * Load industry models from configuration
   */
  private async loadIndustryModels(): Promise<void> {
    const industries = [
      await this.createTechnologyModel(),
      await this.createFinanceModel(),
      await this.createHealthcareModel(),
      await this.createMarketingModel(),
      await this.createSalesModel(),
      await this.createConsultingModel(),
      await this.createEducationModel(),
      await this.createEngineeringModel(),
      await this.createLegalModel(),
      await this.createManufacturingModel()
    ];

    industries.forEach(model => {
      this.industryModels.set(model.industry.toLowerCase(), model);
    });
  }

  /**
   * Calculate industry-specific score
   */
  private async calculateIndustryScore(cv: ParsedCV, model: IndustryModel): Promise<number> {
    let score = 0;

    // Skills analysis (40% weight)
    const skillsScore = this.calculateSkillsScore(cv, model);
    score += skillsScore * model.modelConfig.successFactorWeights.skills;

    // Experience analysis (30% weight)
    const experienceScore = this.calculateExperienceScore(cv, model);
    score += experienceScore * model.modelConfig.successFactorWeights.experience;

    // Education analysis (20% weight)
    const educationScore = this.calculateEducationScore(cv, model);
    score += educationScore * model.modelConfig.successFactorWeights.education;

    // Certifications analysis (10% weight)
    const certificationScore = this.calculateCertificationScore(cv, model);
    score += certificationScore * model.modelConfig.successFactorWeights.certifications;

    return score * 100; // Convert to 0-100 scale
  }

  private getSkillsArray(skills: string[] | { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; } | undefined): string[] {
    if (!skills) return [];
    return Array.isArray(skills) ? skills : [
      ...(skills.technical || []),
      ...(skills.soft || []),
      ...(skills.languages || []),
      ...(skills.tools || [])
    ];
  }

  private calculateSkillsScore(cv: ParsedCV, model: IndustryModel): number {
    const userSkills = this.getSkillsArray(cv.skills);
    const coreSkills = model.knowledgeBase.skills.core;
    const preferredSkills = model.knowledgeBase.skills.preferred;

    let score = 0;
    let totalWeight = 0;

    // Check core skills (weight: 1.0)
    coreSkills.forEach(skill => {
      totalWeight += 1.0;
      if (this.hasSkill(userSkills, skill)) {
        score += skill.importance;
      }
    });

    // Check preferred skills (weight: 0.6)
    preferredSkills.forEach(skill => {
      totalWeight += 0.6;
      if (this.hasSkill(userSkills, skill)) {
        score += skill.importance * 0.6;
      }
    });

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private calculateExperienceScore(cv: ParsedCV, model: IndustryModel): number {
    const experience = cv.experience || [];
    if (experience.length === 0) return 0;

    let relevanceScore = 0;
    let totalYears = 0;

    experience.forEach(exp => {
      const years = this.calculateExperienceYears(exp);
      totalYears += years;

      // Calculate relevance to industry
      const relevance = this.calculateExperienceRelevance(exp, model);
      relevanceScore += relevance * years;
    });

    const avgRelevance = totalYears > 0 ? relevanceScore / totalYears : 0;
    const yearsFactor = Math.min(1, totalYears / 5); // Cap at 5 years for full score

    return avgRelevance * yearsFactor;
  }

  private calculateEducationScore(cv: ParsedCV, model: IndustryModel): number {
    const education = cv.education || [];
    if (education.length === 0) return 0.3; // Base score for work experience only

    let maxScore = 0;

    education.forEach(edu => {
      const degreeRelevance = this.calculateEducationRelevance(edu, model);
      const prestige = this.calculateInstitutionPrestige(edu.institution);
      const score = (degreeRelevance * 0.8) + (prestige * 0.2);
      maxScore = Math.max(maxScore, score);
    });

    return maxScore;
  }

  private calculateCertificationScore(cv: ParsedCV, model: IndustryModel): number {
    const certifications = cv.certifications || [];
    if (certifications.length === 0) return 0;

    let score = 0;
    let count = 0;

    certifications.forEach(cert => {
      const relevance = this.calculateCertificationRelevance(cert, model);
      if (relevance > 0.3) { // Only count relevant certifications
        score += relevance;
        count++;
      }
    });

    return count > 0 ? Math.min(1, score / count) : 0;
  }

  /**
   * Analyze skill gaps for industry
   */
  private async analyzeSkillGaps(cv: ParsedCV, model: IndustryModel): Promise<{
    missing: SkillDefinition[];
    critical: string[];
    important: string[];
    niceToHave: string[];
  }> {
    const userSkills = this.getSkillsArray(cv.skills);
    const coreSkills = model.knowledgeBase.skills.core;
    const preferredSkills = model.knowledgeBase.skills.preferred;

    const missing: SkillDefinition[] = [];
    const critical: string[] = [];
    const important: string[] = [];
    const niceToHave: string[] = [];

    // Check core skills
    coreSkills.forEach(skill => {
      if (!this.hasSkill(userSkills, skill)) {
        missing.push(skill);
        if (skill.importance > 0.8) {
          critical.push(skill.name);
        } else if (skill.importance > 0.6) {
          important.push(skill.name);
        } else {
          niceToHave.push(skill.name);
        }
      }
    });

    // Check preferred skills
    preferredSkills.forEach(skill => {
      if (!this.hasSkill(userSkills, skill)) {
        missing.push(skill);
        if (skill.importance > 0.7) {
          important.push(skill.name);
        } else {
          niceToHave.push(skill.name);
        }
      }
    });

    return {
      missing,
      critical,
      important,
      niceToHave
    };
  }

  private hasSkill(userSkills: string[], targetSkill: SkillDefinition): boolean {
    const userSkillsLower = userSkills.map(s => s.toLowerCase());
    
    // Check exact match
    if (userSkillsLower.includes(targetSkill.name.toLowerCase())) {
      return true;
    }

    // Check alternative names
    return targetSkill.alternativeNames.some(alt => 
      userSkillsLower.includes(alt.toLowerCase())
    );
  }

  private calculateIndustryFit(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  // Industry model factories
  private async createTechnologyModel(): Promise<IndustryModel> {
    return {
      industry: 'Technology',
      subIndustries: ['Software Development', 'Data Science', 'Cybersecurity', 'DevOps', 'AI/ML'],
      priority: 1,
      modelConfig: {
        successFactorWeights: {
          skills: 0.45,
          experience: 0.30,
          education: 0.15,
          certifications: 0.05,
          projects: 0.05,
          achievements: 0.00
        },
        featureImportance: {
          'technical_skills': 0.3,
          'programming_languages': 0.25,
          'frameworks': 0.2,
          'years_experience': 0.15,
          'education_level': 0.1
        }
      },
      knowledgeBase: {
        skills: {
          core: [
            { name: 'Python', category: 'technical', importance: 0.9, demandTrend: 'rising', alternativeNames: ['Python3'], relatedSkills: ['Django', 'Flask'], learningResources: ['python.org'], certifications: ['PCAP'] },
            { name: 'JavaScript', category: 'technical', importance: 0.85, demandTrend: 'stable', alternativeNames: ['JS'], relatedSkills: ['React', 'Node.js'], learningResources: ['javascript.info'], certifications: [] },
            { name: 'Git', category: 'tool', importance: 0.8, demandTrend: 'stable', alternativeNames: ['Version Control'], relatedSkills: ['GitHub', 'GitLab'], learningResources: ['git-scm.com'], certifications: [] },
            { name: 'Agile', category: 'soft', importance: 0.75, demandTrend: 'stable', alternativeNames: ['Scrum'], relatedSkills: ['Sprint Planning'], learningResources: ['agilealliance.org'], certifications: ['CSM'] }
          ],
          preferred: [
            { name: 'React', category: 'technical', importance: 0.8, demandTrend: 'rising', alternativeNames: ['ReactJS'], relatedSkills: ['Redux', 'JSX'], learningResources: ['reactjs.org'], certifications: [] },
            { name: 'AWS', category: 'technical', importance: 0.75, demandTrend: 'rising', alternativeNames: ['Amazon Web Services'], relatedSkills: ['EC2', 'S3'], learningResources: ['aws.amazon.com'], certifications: ['AWS Solutions Architect'] },
            { name: 'Docker', category: 'tool', importance: 0.7, demandTrend: 'rising', alternativeNames: ['Containerization'], relatedSkills: ['Kubernetes'], learningResources: ['docker.com'], certifications: [] }
          ],
          emerging: [
            { name: 'Machine Learning', category: 'technical', importance: 0.85, demandTrend: 'rising', alternativeNames: ['ML', 'AI'], relatedSkills: ['TensorFlow', 'PyTorch'], learningResources: ['coursera.org'], certifications: [] },
            { name: 'Kubernetes', category: 'tool', importance: 0.75, demandTrend: 'rising', alternativeNames: ['k8s'], relatedSkills: ['Docker'], learningResources: ['kubernetes.io'], certifications: ['CKA'] }
          ],
          deprecated: [
            { name: 'Internet Explorer Support', category: 'technical', importance: 0.1, demandTrend: 'declining', alternativeNames: ['IE'], relatedSkills: [], learningResources: [], certifications: [] }
          ]
        },
        careerPaths: [
          {
            pathId: 'software_engineer',
            name: 'Software Engineer Track',
            levels: [
              {
                levelId: 'junior',
                title: 'Junior Software Engineer',
                alternativeTitles: ['Software Developer I', 'Associate Developer'],
                yearsExperience: { min: 0, max: 2, typical: 1 },
                requiredSkills: ['Programming', 'Version Control', 'Basic Algorithms'],
                preferredSkills: ['Framework Knowledge', 'Testing'],
                responsibilities: ['Code implementation', 'Bug fixes', 'Unit testing'],
                salaryRange: { min: 60000, max: 90000, median: 75000 }
              }
            ],
            averageProgression: 2,
            commonTransitions: [
              {
                from: 'Junior Software Engineer',
                to: 'Software Engineer',
                frequency: 0.8,
                requiredSkills: ['System Design', 'Mentoring']
              }
            ]
          }
        ],
        salaryBenchmarks: {
          currency: 'USD',
          levels: {
            'entry': { min: 60000, max: 90000, median: 75000, percentile25: 65000, percentile75: 85000 },
            'mid': { min: 90000, max: 140000, median: 115000, percentile25: 100000, percentile75: 130000 },
            'senior': { min: 130000, max: 200000, median: 165000, percentile25: 145000, percentile75: 185000 }
          },
          locationAdjustments: {
            'San Francisco': 1.4,
            'New York': 1.3,
            'Seattle': 1.25,
            'Austin': 1.1,
            'Remote': 1.0
          }
        },
        companies: {
          topEmployers: [
            {
              name: 'Google',
              industry: 'Technology',
              size: 'enterprise',
              culture: ['Innovation', 'Data-driven', 'Collaboration'],
              techStack: ['Python', 'Go', 'Kubernetes'],
              benefits: ['Stock options', 'Free food', 'Learning budget'],
              hiringPatterns: {
                averageTimeToHire: 45,
                commonInterviewStages: ['Phone screen', 'Technical', 'Onsite', 'Team match'],
                successFactors: ['System design', 'Coding', 'Culture fit']
              }
            }
          ],
          startups: [],
          remote: []
        }
      },
      atsPreferences: {
        keywordDensity: 0.08,
        preferredSections: ['Technical Skills', 'Experience', 'Projects'],
        sectionOrder: ['Summary', 'Technical Skills', 'Experience', 'Education', 'Projects'],
        commonRejectionReasons: ['Lack of relevant technical skills', 'Poor code quality in samples'],
        successPatterns: ['Strong GitHub profile', 'Open source contributions', 'Side projects']
      },
      marketIntelligence: {
        growthRate: 0.15,
        jobDemand: 'high',
        competitionLevel: 'high',
        automation_risk: 0.2,
        remote_friendliness: 0.9,
        trends: {
          emerging: ['AI/ML', 'Cloud Native', 'DevSecOps'],
          declining: ['Legacy systems', 'Waterfall'],
          stable: ['Web development', 'Mobile development']
        }
      }
    };
  }

  private async createFinanceModel(): Promise<IndustryModel> {
    return {
      industry: 'Finance',
      subIndustries: ['Investment Banking', 'Trading', 'Risk Management', 'Financial Analysis', 'FinTech'],
      priority: 1,
      modelConfig: {
        successFactorWeights: {
          skills: 0.35,
          experience: 0.35,
          education: 0.25,
          certifications: 0.15,
          projects: 0.05,
          achievements: 0.10
        },
        featureImportance: {
          'quantitative_skills': 0.3,
          'financial_modeling': 0.25,
          'regulatory_knowledge': 0.2,
          'years_experience': 0.15,
          'education_prestige': 0.1
        }
      },
      knowledgeBase: {
        skills: {
          core: [
            { name: 'Financial Modeling', category: 'technical', importance: 0.95, demandTrend: 'stable', alternativeNames: ['Excel Modeling'], relatedSkills: ['DCF', 'LBO'], learningResources: ['wharton.upenn.edu'], certifications: ['CFA'] },
            { name: 'Excel', category: 'tool', importance: 0.9, demandTrend: 'stable', alternativeNames: ['Microsoft Excel'], relatedSkills: ['VBA', 'Pivot Tables'], learningResources: ['microsoft.com'], certifications: ['MOS'] },
            { name: 'Risk Analysis', category: 'technical', importance: 0.85, demandTrend: 'rising', alternativeNames: ['Risk Management'], relatedSkills: ['VaR', 'Stress Testing'], learningResources: [], certifications: ['FRM'] }
          ],
          preferred: [
            { name: 'Python', category: 'technical', importance: 0.8, demandTrend: 'rising', alternativeNames: ['Python3'], relatedSkills: ['Pandas', 'NumPy'], learningResources: ['python.org'], certifications: [] },
            { name: 'SQL', category: 'technical', importance: 0.75, demandTrend: 'stable', alternativeNames: ['Database'], relatedSkills: ['PostgreSQL', 'MySQL'], learningResources: [], certifications: [] }
          ],
          emerging: [
            { name: 'Blockchain', category: 'technical', importance: 0.7, demandTrend: 'rising', alternativeNames: ['Cryptocurrency'], relatedSkills: ['Smart Contracts'], learningResources: [], certifications: [] }
          ],
          deprecated: []
        },
        careerPaths: [],
        salaryBenchmarks: {
          currency: 'USD',
          levels: {
            'entry': { min: 70000, max: 100000, median: 85000, percentile25: 75000, percentile75: 95000 },
            'mid': { min: 100000, max: 160000, median: 130000, percentile25: 115000, percentile75: 145000 },
            'senior': { min: 150000, max: 300000, median: 200000, percentile25: 170000, percentile75: 250000 }
          },
          locationAdjustments: {
            'New York': 1.3,
            'London': 1.2,
            'Singapore': 1.15
          }
        },
        companies: {
          topEmployers: [],
          startups: [],
          remote: []
        }
      },
      atsPreferences: {
        keywordDensity: 0.06,
        preferredSections: ['Experience', 'Education', 'Certifications'],
        sectionOrder: ['Summary', 'Experience', 'Education', 'Skills', 'Certifications'],
        commonRejectionReasons: ['Lack of quantitative skills', 'No relevant certifications'],
        successPatterns: ['Ivy League education', 'Big 4 experience', 'CFA certification']
      },
      marketIntelligence: {
        growthRate: 0.06,
        jobDemand: 'medium',
        competitionLevel: 'high',
        automation_risk: 0.4,
        remote_friendliness: 0.6,
        trends: {
          emerging: ['FinTech', 'RegTech', 'ESG'],
          declining: ['Traditional banking'],
          stable: ['Investment management', 'Risk management']
        }
      }
    };
  }

  // Additional industry models would be implemented similarly...
  private async createHealthcareModel(): Promise<IndustryModel> {
    // Implementation for Healthcare industry
    return this.createGenericIndustryModel('Healthcare');
  }

  private async createMarketingModel(): Promise<IndustryModel> {
    return this.createGenericIndustryModel('Marketing');
  }

  private async createSalesModel(): Promise<IndustryModel> {
    return this.createGenericIndustryModel('Sales');
  }

  private async createConsultingModel(): Promise<IndustryModel> {
    return this.createGenericIndustryModel('Consulting');
  }

  private async createEducationModel(): Promise<IndustryModel> {
    return this.createGenericIndustryModel('Education');
  }

  private async createEngineeringModel(): Promise<IndustryModel> {
    return this.createGenericIndustryModel('Engineering');
  }

  private async createLegalModel(): Promise<IndustryModel> {
    return this.createGenericIndustryModel('Legal');
  }

  private async createManufacturingModel(): Promise<IndustryModel> {
    return this.createGenericIndustryModel('Manufacturing');
  }

  private createGenericIndustryModel(industryName: string): IndustryModel {
    // Simplified generic model for demonstration
    return {
      industry: industryName,
      subIndustries: [],
      priority: 3,
      modelConfig: {
        successFactorWeights: {
          skills: 0.4,
          experience: 0.3,
          education: 0.2,
          certifications: 0.1,
          projects: 0.05,
          achievements: 0.05
        },
        featureImportance: {}
      },
      knowledgeBase: {
        skills: {
          core: [],
          preferred: [],
          emerging: [],
          deprecated: []
        },
        careerPaths: [],
        salaryBenchmarks: {
          currency: 'USD',
          levels: {},
          locationAdjustments: {}
        },
        companies: {
          topEmployers: [],
          startups: [],
          remote: []
        }
      },
      atsPreferences: {
        keywordDensity: 0.05,
        preferredSections: ['Experience', 'Skills', 'Education'],
        sectionOrder: ['Summary', 'Experience', 'Skills', 'Education'],
        commonRejectionReasons: [],
        successPatterns: []
      },
      marketIntelligence: {
        growthRate: 0.05,
        jobDemand: 'medium',
        competitionLevel: 'medium',
        automation_risk: 0.3,
        remote_friendliness: 0.5,
        trends: {
          emerging: [],
          declining: [],
          stable: []
        }
      }
    };
  }

  // Helper methods
  private calculateExperienceYears(experience: any): number {
    if (!experience.startDate) return 1;
    
    const start = new Date(experience.startDate);
    const end = experience.endDate === 'Present' ? new Date() : new Date(experience.endDate);
    
    return Math.max(0, (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  private calculateExperienceRelevance(experience: any, model: IndustryModel): number {
    // Simple keyword matching for relevance
    const expText = (experience.title + ' ' + experience.description + ' ' + experience.company).toLowerCase();
    const industryKeywords = model.industry.toLowerCase().split(' ');
    
    let matches = 0;
    industryKeywords.forEach(keyword => {
      if (expText.includes(keyword)) matches++;
    });
    
    return Math.min(1, matches / industryKeywords.length);
  }

  private calculateEducationRelevance(education: any, model: IndustryModel): number {
    const field = (education.field || '').toLowerCase();
    
    // Industry-specific education relevance logic
    if (model.industry === 'Technology') {
      if (field.includes('computer') || field.includes('software') || field.includes('engineering')) {
        return 1.0;
      }
      if (field.includes('math') || field.includes('physics')) {
        return 0.8;
      }
    }
    
    return 0.5; // Default relevance
  }

  private calculateInstitutionPrestige(institution: string): number {
    const prestigiousInstitutions = [
      'mit', 'stanford', 'harvard', 'caltech', 'berkeley', 'carnegie mellon',
      'princeton', 'yale', 'columbia', 'cornell', 'upenn', 'dartmouth'
    ];
    
    const instLower = institution.toLowerCase();
    return prestigiousInstitutions.some(prestige => instLower.includes(prestige)) ? 1.0 : 0.7;
  }

  private calculateCertificationRelevance(certification: any, model: IndustryModel): number {
    const certName = certification.name.toLowerCase();
    
    // Check against industry-specific certifications
    const allSkills = [
      ...model.knowledgeBase.skills.core,
      ...model.knowledgeBase.skills.preferred
    ];
    
    return allSkills.some(skill => 
      skill.certifications?.some(cert => certName.includes(cert.toLowerCase()))
    ) ? 1.0 : 0.3;
  }

  private async generateIndustryRecommendations(
    cv: ParsedCV,
    model: IndustryModel,
    skillGaps: any,
    experienceLevel?: string
  ): Promise<IndustryRecommendation[]> {
    const recommendations: IndustryRecommendation[] = [];

    // Critical skills recommendations
    skillGaps.critical.slice(0, 3).forEach((skill: string, index: number) => {
      recommendations.push({
        type: 'skill',
        priority: (index + 1) as 1 | 2 | 3,
        title: `Add ${skill} to your skillset`,
        description: `${skill} is a critical requirement in ${model.industry} roles.`,
        impact: 0.2,
        effort: 'medium',
        timeframe: '2-4 weeks',
        resources: [`Learn ${skill} online`, 'Practice through projects']
      });
    });

    return recommendations;
  }

  private async getSalaryBenchmark(
    model: IndustryModel,
    experienceLevel: string,
    region: string
  ): Promise<any> {
    const baseBenchmark = model.knowledgeBase.salaryBenchmarks.levels[experienceLevel];
    if (!baseBenchmark) {
      return { min: 50000, max: 80000, median: 65000, percentile: 50 };
    }

    const adjustment = model.knowledgeBase.salaryBenchmarks.locationAdjustments[region] || 1.0;
    
    return {
      min: Math.round(baseBenchmark.min * adjustment),
      max: Math.round(baseBenchmark.max * adjustment),
      median: Math.round(baseBenchmark.median * adjustment),
      percentile: 65 // Would be calculated based on user profile
    };
  }

  private getRecommendedCareerPath(cv: ParsedCV, model: IndustryModel): CareerPath {
    // Return first available career path or create generic one
    return model.knowledgeBase.careerPaths[0] || {
      pathId: 'generic',
      name: `${model.industry} Career Path`,
      levels: [],
      averageProgression: 2,
      commonTransitions: []
    };
  }

  private async getMarketInsights(model: IndustryModel): Promise<any> {
    return {
      growth: model.marketIntelligence.growthRate,
      demand: model.marketIntelligence.jobDemand,
      competitiveness: model.marketIntelligence.competitionLevel,
      trends: model.marketIntelligence.trends.emerging
    };
  }
}