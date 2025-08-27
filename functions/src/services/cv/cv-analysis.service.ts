/**
 * CV Analysis Service
 * 
 * Handles CV content analysis, parsing, and data extraction functionality.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

import { BaseService } from '../shared/base-service';
import { ServiceResult } from '../shared/service-types';

export interface CVAnalysisResult {
  quality: {
    score: number; // 0-100
    category: 'poor' | 'fair' | 'good' | 'excellent';
    strengths: string[];
    weaknesses: string[];
  };
  completeness: {
    score: number; // 0-100
    missingFields: string[];
    recommendations: string[];
  };
  atsCompatibility: {
    score: number; // 0-100
    issues: string[];
    suggestions: string[];
  };
  keywords: {
    extracted: string[];
    suggested: string[];
    industry: string[];
  };
  insights: {
    experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
    industryFocus: string[];
    skillCategories: Record<string, string[]>;
    careerProgression: string;
  };
}

export interface CVParsingResult {
  personalInfo: any;
  experience: any[];
  education: any[];
  skills: any[];
  languages: any[];
  certifications: any[];
  projects: any[];
  achievements: any[];
  metadata: {
    parsedAt: Date;
    confidence: number;
    sections: string[];
  };
}

export class CVAnalysisService extends BaseService {
  constructor() {
    super({
      name: 'cv-analysis',
      version: '1.0.0'
    });
  }

  protected async onInitialize(): Promise<void> {
    this.logger.info('CV Analysis Service initialized');
  }

  protected async onCleanup(): Promise<void> {
    this.logger.info('CV Analysis Service cleaned up');
  }

  protected async onHealthCheck(): Promise<{ metrics: any }> {
    return {
      metrics: {
        analysesPerformed: 0,
        averageAnalysisTime: 0,
        errorRate: 0
      }
    };
  }

  /**
   * Perform comprehensive CV analysis
   */
  async analyzeCV(cvData: any, options?: { 
    includeKeywords?: boolean;
    includeATS?: boolean;
    targetIndustry?: string;
  }): Promise<ServiceResult<CVAnalysisResult>> {
    try {
      this.logger.info('Starting CV analysis', { 
        includeKeywords: options?.includeKeywords,
        includeATS: options?.includeATS,
        targetIndustry: options?.targetIndustry 
      });

      const startTime = Date.now();

      // Analyze CV quality
      const quality = await this.analyzeQuality(cvData);
      
      // Analyze completeness
      const completeness = await this.analyzeCompleteness(cvData);
      
      // Analyze ATS compatibility if requested
      const atsCompatibility = options?.includeATS 
        ? await this.analyzeATSCompatibility(cvData)
        : { score: 0, issues: [], suggestions: [] };

      // Extract and suggest keywords if requested
      const keywords = options?.includeKeywords
        ? await this.analyzeKeywords(cvData, options.targetIndustry)
        : { extracted: [], suggested: [], industry: [] };

      // Generate insights
      const insights = await this.generateInsights(cvData);

      const analysisTime = Date.now() - startTime;

      const result: CVAnalysisResult = {
        quality,
        completeness,
        atsCompatibility,
        keywords,
        insights
      };

      this.logger.info('CV analysis completed', { 
        analysisTime,
        qualityScore: quality.score,
        completenessScore: completeness.score 
      });

      return { success: true, data: result };

    } catch (error) {
      this.logger.error('CV analysis failed', { error });

      return {
        success: false,
        error: {
          name: 'CVAnalysisError',
          message: error instanceof Error ? error.message : 'CV analysis failed',
          code: 'CV_ANALYSIS_FAILED'
        }
      };
    }
  }

  /**
   * Parse raw CV data into structured format
   */
  async parseCV(rawCVData: any): Promise<ServiceResult<CVParsingResult>> {
    try {
      this.logger.info('Parsing CV data');

      const parseStart = Date.now();

      // Extract personal information
      const personalInfo = this.extractPersonalInfo(rawCVData);
      
      // Extract experience
      const experience = this.extractExperience(rawCVData);
      
      // Extract education
      const education = this.extractEducation(rawCVData);
      
      // Extract skills
      const skills = this.extractSkills(rawCVData);
      
      // Extract languages
      const languages = this.extractLanguages(rawCVData);
      
      // Extract certifications
      const certifications = this.extractCertifications(rawCVData);
      
      // Extract projects
      const projects = this.extractProjects(rawCVData);
      
      // Extract achievements
      const achievements = this.extractAchievements(rawCVData);

      // Calculate parsing confidence
      const parsingData = {
        personalInfo,
        experience,
        education,
        skills,
        languages,
        certifications,
        projects,
        achievements,
        metadata: {
          parsedAt: new Date(),
          confidence: 0,
          sections: []
        }
      };
      const confidence = this.calculateParsingConfidence(parsingData);

      const sections = this.identifySections(rawCVData);
      const parseTime = Date.now() - parseStart;

      const result: CVParsingResult = {
        personalInfo,
        experience,
        education,
        skills,
        languages,
        certifications,
        projects,
        achievements,
        metadata: {
          parsedAt: new Date(),
          confidence,
          sections
        }
      };

      this.logger.info('CV parsing completed', { 
        parseTime,
        confidence,
        sectionsFound: sections.length 
      });

      return { success: true, data: result };

    } catch (error) {
      this.logger.error('CV parsing failed', { error });

      return {
        success: false,
        error: {
          name: 'CVParsingError',
          message: error instanceof Error ? error.message : 'CV parsing failed',
          code: 'CV_PARSING_FAILED'
        }
      };
    }
  }

  private async analyzeQuality(cvData: any): Promise<CVAnalysisResult['quality']> {
    let score = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Personal info quality (20 points)
    if (cvData.personalInfo) {
      if (cvData.personalInfo.name) score += 5;
      if (cvData.personalInfo.email) score += 3;
      if (cvData.personalInfo.phone) score += 2;
      if (cvData.personalInfo.location) score += 2;
      if (cvData.personalInfo.summary || cvData.personalInfo.objective) {
        score += 8;
        strengths.push('Has professional summary');
      } else {
        weaknesses.push('Missing professional summary');
      }
    }

    // Experience quality (40 points)
    if (cvData.experience && Array.isArray(cvData.experience)) {
      if (cvData.experience.length > 0) {
        score += 10;
        
        // Quality of experience descriptions
        let descriptionQuality = 0;
        cvData.experience.forEach((exp: any) => {
          if (exp.description && exp.description.length > 100) {
            descriptionQuality += 2;
          }
          if (exp.achievements && Array.isArray(exp.achievements) && exp.achievements.length > 0) {
            descriptionQuality += 3;
          }
        });
        
        score += Math.min(30, descriptionQuality);
        
        if (descriptionQuality > 15) {
          strengths.push('Detailed experience descriptions');
        } else {
          weaknesses.push('Experience descriptions need more detail');
        }
      } else {
        weaknesses.push('No work experience listed');
      }
    }

    // Skills quality (20 points)
    if (cvData.skills && Array.isArray(cvData.skills)) {
      if (cvData.skills.length >= 5) {
        score += 15;
        strengths.push('Good variety of skills');
      } else if (cvData.skills.length > 0) {
        score += 10;
        weaknesses.push('Limited skills listed');
      } else {
        weaknesses.push('No skills listed');
      }
      
      // Check for skill levels/proficiency
      const skillsWithLevels = cvData.skills.filter((skill: any) => 
        skill.level || skill.proficiency || skill.rating
      );
      
      if (skillsWithLevels.length > 0) {
        score += 5;
        strengths.push('Skills include proficiency levels');
      }
    }

    // Education quality (10 points)
    if (cvData.education && Array.isArray(cvData.education) && cvData.education.length > 0) {
      score += 10;
    }

    // Additional quality factors (10 points)
    if (cvData.languages && Array.isArray(cvData.languages) && cvData.languages.length > 0) {
      score += 3;
      strengths.push('Multilingual capabilities');
    }
    
    if (cvData.certifications && Array.isArray(cvData.certifications) && cvData.certifications.length > 0) {
      score += 4;
      strengths.push('Professional certifications');
    }
    
    if (cvData.projects && Array.isArray(cvData.projects) && cvData.projects.length > 0) {
      score += 3;
      strengths.push('Relevant projects included');
    }

    // Determine category based on score
    let category: 'poor' | 'fair' | 'good' | 'excellent';
    if (score >= 85) category = 'excellent';
    else if (score >= 70) category = 'good';
    else if (score >= 50) category = 'fair';
    else category = 'poor';

    return { score, category, strengths, weaknesses };
  }

  private async analyzeCompleteness(cvData: any): Promise<CVAnalysisResult['completeness']> {
    let score = 0;
    const missingFields: string[] = [];
    const recommendations: string[] = [];

    const requiredFields = [
      { field: 'personalInfo.name', weight: 20, label: 'Full name' },
      { field: 'personalInfo.email', weight: 10, label: 'Email address' },
      { field: 'personalInfo.phone', weight: 10, label: 'Phone number' },
      { field: 'experience', weight: 30, label: 'Work experience' },
      { field: 'education', weight: 15, label: 'Education' },
      { field: 'skills', weight: 15, label: 'Skills' }
    ];

    for (const { field, weight, label } of requiredFields) {
      if (this.hasField(cvData, field)) {
        score += weight;
      } else {
        missingFields.push(label);
        recommendations.push(`Add ${label.toLowerCase()} information`);
      }
    }

    // Optional but recommended fields
    const optionalFields = [
      { field: 'personalInfo.summary', label: 'Professional summary' },
      { field: 'languages', label: 'Language skills' },
      { field: 'certifications', label: 'Certifications' },
      { field: 'projects', label: 'Relevant projects' }
    ];

    for (const { field, label } of optionalFields) {
      if (!this.hasField(cvData, field)) {
        recommendations.push(`Consider adding ${label.toLowerCase()}`);
      }
    }

    return { score, missingFields, recommendations };
  }

  private async analyzeATSCompatibility(cvData: any): Promise<CVAnalysisResult['atsCompatibility']> {
    let score = 100;
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for common ATS issues
    if (cvData.personalInfo?.name && cvData.personalInfo.name.includes('|')) {
      score -= 10;
      issues.push('Name contains special characters that may confuse ATS');
      suggestions.push('Use standard name format without special characters');
    }

    // Check date formats
    if (cvData.experience && Array.isArray(cvData.experience)) {
      cvData.experience.forEach((exp: any, index: number) => {
        if (exp.startDate && !this.isStandardDateFormat(exp.startDate)) {
          score -= 5;
          issues.push(`Non-standard date format in experience ${index + 1}`);
          suggestions.push('Use MM/YYYY or Month YYYY date format');
        }
      });
    }

    // Check for keyword optimization
    const keywordDensity = this.calculateKeywordDensity(cvData);
    if (keywordDensity < 0.02) {
      score -= 15;
      issues.push('Low keyword density may reduce ATS ranking');
      suggestions.push('Include more industry-relevant keywords naturally in your descriptions');
    }

    // Check section headers
    const standardSections = ['experience', 'education', 'skills'];
    const missingSections = standardSections.filter(section => !cvData[section]);
    
    score -= missingSections.length * 10;
    if (missingSections.length > 0) {
      issues.push('Missing standard CV sections');
      suggestions.push('Include all standard sections: Experience, Education, Skills');
    }

    return { score: Math.max(0, score), issues, suggestions };
  }

  private async analyzeKeywords(cvData: any, targetIndustry?: string): Promise<CVAnalysisResult['keywords']> {
    const extracted = this.extractKeywords(cvData);
    const suggested = this.suggestKeywords(cvData, targetIndustry);
    const industry = targetIndustry ? this.getIndustryKeywords(targetIndustry) : [];

    return { extracted, suggested, industry };
  }

  private async generateInsights(cvData: any): Promise<CVAnalysisResult['insights']> {
    const experienceLevel = this.determineExperienceLevel(cvData);
    const industryFocus = this.identifyIndustryFocus(cvData);
    const skillCategories = this.categorizeSkills(cvData);
    const careerProgression = this.analyzeCareerProgression(cvData);

    return { experienceLevel, industryFocus, skillCategories, careerProgression };
  }

  // Helper methods for extraction
  private extractPersonalInfo(rawData: any): any {
    return rawData.personalInfo || {};
  }

  private extractExperience(rawData: any): any[] {
    return rawData.experience || [];
  }

  private extractEducation(rawData: any): any[] {
    return rawData.education || [];
  }

  private extractSkills(rawData: any): any[] {
    return rawData.skills || [];
  }

  private extractLanguages(rawData: any): any[] {
    return rawData.languages || [];
  }

  private extractCertifications(rawData: any): any[] {
    return rawData.certifications || [];
  }

  private extractProjects(rawData: any): any[] {
    return rawData.projects || [];
  }

  private extractAchievements(rawData: any): any[] {
    return rawData.achievements || [];
  }

  private calculateParsingConfidence(parsedData: CVParsingResult): number {
    let confidence = 0;
    const maxConfidence = 100;

    if (parsedData.personalInfo.name) confidence += 20;
    if (parsedData.experience.length > 0) confidence += 30;
    if (parsedData.education.length > 0) confidence += 20;
    if (parsedData.skills.length > 0) confidence += 20;
    if (parsedData.languages.length > 0) confidence += 5;
    if (parsedData.certifications.length > 0) confidence += 5;

    return Math.min(maxConfidence, confidence);
  }

  private identifySections(rawData: any): string[] {
    const sections: string[] = [];
    const possibleSections = [
      'personalInfo', 'experience', 'education', 'skills', 
      'languages', 'certifications', 'projects', 'achievements'
    ];

    for (const section of possibleSections) {
      if (rawData[section]) {
        sections.push(section);
      }
    }

    return sections;
  }

  private hasField(data: any, fieldPath: string): boolean {
    const fields = fieldPath.split('.');
    let current = data;

    for (const field of fields) {
      if (!current || !current[field]) {
        return false;
      }
      current = current[field];
    }

    return current && (Array.isArray(current) ? current.length > 0 : true);
  }

  private isStandardDateFormat(dateString: string): boolean {
    const standardFormats = [
      /^\d{2}\/\d{4}$/,        // MM/YYYY
      /^\d{1,2}\/\d{4}$/,      // M/YYYY
      /^[A-Za-z]+ \d{4}$/,     // Month YYYY
      /^\d{4}$/                // YYYY
    ];

    return standardFormats.some(format => format.test(dateString));
  }

  private calculateKeywordDensity(cvData: any): number {
    // Simple keyword density calculation
    const allText = JSON.stringify(cvData).toLowerCase();
    const industryKeywords = ['experience', 'skills', 'management', 'development', 'analysis'];
    
    const keywordCount = industryKeywords.reduce((count, keyword) => {
      const regex = new RegExp(keyword, 'g');
      const matches = allText.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);

    return keywordCount / allText.length;
  }

  private extractKeywords(cvData: any): string[] {
    const keywords: string[] = [];
    const text = JSON.stringify(cvData).toLowerCase();
    
    // Common industry keywords
    const commonKeywords = [
      'management', 'leadership', 'development', 'analysis', 'strategy',
      'communication', 'collaboration', 'innovation', 'optimization'
    ];

    return commonKeywords.filter(keyword => text.includes(keyword));
  }

  private suggestKeywords(cvData: any, targetIndustry?: string): string[] {
    // Based on existing data, suggest additional keywords
    const suggestions = ['teamwork', 'problem-solving', 'results-driven', 'analytical'];
    
    if (targetIndustry) {
      suggestions.push(...this.getIndustryKeywords(targetIndustry));
    }

    return suggestions;
  }

  private getIndustryKeywords(industry: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'technology': ['agile', 'software', 'programming', 'architecture', 'cloud'],
      'finance': ['financial', 'investment', 'compliance', 'risk', 'analysis'],
      'healthcare': ['patient', 'clinical', 'medical', 'healthcare', 'treatment'],
      'marketing': ['campaign', 'digital', 'branding', 'social media', 'analytics']
    };

    return keywordMap[industry] || [];
  }

  private determineExperienceLevel(cvData: any): 'entry' | 'mid' | 'senior' | 'executive' {
    if (!cvData.experience || !Array.isArray(cvData.experience)) {
      return 'entry';
    }

    const totalYears = cvData.experience.reduce((total: number, exp: any) => {
      const duration = this.calculateExperienceDuration(exp);
      return total + duration;
    }, 0);

    if (totalYears >= 15) return 'executive';
    if (totalYears >= 8) return 'senior';
    if (totalYears >= 3) return 'mid';
    return 'entry';
  }

  private identifyIndustryFocus(cvData: any): string[] {
    const industries: string[] = [];
    
    if (cvData.experience && Array.isArray(cvData.experience)) {
      cvData.experience.forEach((exp: any) => {
        if (exp.industry) {
          industries.push(exp.industry);
        }
      });
    }

    return [...new Set(industries)];
  }

  private categorizeSkills(cvData: any): Record<string, string[]> {
    const categories: Record<string, string[]> = {};
    
    if (cvData.skills && Array.isArray(cvData.skills)) {
      cvData.skills.forEach((skill: any) => {
        const category = skill.category || 'general';
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(skill.name || skill);
      });
    }

    return categories;
  }

  private analyzeCareerProgression(cvData: any): string {
    if (!cvData.experience || !Array.isArray(cvData.experience) || cvData.experience.length === 0) {
      return 'No experience data available';
    }

    const sortedExperience = cvData.experience.sort((a: any, b: any) => {
      return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
    });

    if (sortedExperience.length === 1) {
      return 'Single position experience';
    }

    // Analyze progression patterns
    const positions = sortedExperience.map((exp: any) => exp.position?.toLowerCase() || '');
    const hasProgression = positions.some(pos => 
      pos.includes('senior') || pos.includes('lead') || pos.includes('manager')
    );

    return hasProgression ? 'Shows career progression' : 'Consistent experience level';
  }

  private calculateExperienceDuration(experience: any): number {
    if (!experience.startDate) return 0;

    const startDate = new Date(experience.startDate);
    const endDate = experience.endDate ? new Date(experience.endDate) : new Date();
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    
    return Math.max(0, diffYears);
  }
}