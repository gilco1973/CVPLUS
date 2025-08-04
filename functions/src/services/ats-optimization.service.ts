/**
 * ATS (Applicant Tracking System) Optimization Service
 */

import { ParsedCV, ATSOptimizationResult, ATSIssue, ATSSuggestion } from '../types/enhanced-models';
import { Configuration, OpenAIApi } from 'openai';
import { config } from '../config/environment';

export class ATSOptimizationService {
  private openai: OpenAIApi;
  
  // Common ATS-friendly formats and keywords
  private readonly atsKeywords = {
    action_verbs: [
      'achieved', 'administered', 'analyzed', 'built', 'collaborated', 'created',
      'decreased', 'delivered', 'designed', 'developed', 'directed', 'enhanced',
      'established', 'executed', 'generated', 'implemented', 'improved', 'increased',
      'launched', 'led', 'managed', 'optimized', 'organized', 'performed',
      'planned', 'produced', 'reduced', 'resolved', 'streamlined', 'supervised'
    ],
    
    sections: [
      'contact information', 'professional summary', 'work experience',
      'education', 'skills', 'certifications', 'achievements'
    ],
    
    avoid_elements: [
      'headers', 'footers', 'images', 'graphics', 'charts',
      'tables', 'columns', 'text boxes', 'special characters'
    ]
  };
  
  constructor() {
    const configuration = new Configuration({
      apiKey: config.rag.openaiApiKey,
    });
    this.openai = new OpenAIApi(configuration);
  }
  
  /**
   * Analyze CV for ATS compatibility
   */
  async analyzeCV(
    parsedCV: ParsedCV,
    targetRole?: string,
    targetKeywords?: string[]
  ): Promise<ATSOptimizationResult> {
    const issues: ATSIssue[] = [];
    const suggestions: ATSSuggestion[] = [];
    
    // 1. Check structure and formatting
    this.checkStructure(parsedCV, issues);
    
    // 2. Check contact information
    this.checkContactInfo(parsedCV, issues, suggestions);
    
    // 3. Check professional summary
    this.checkSummary(parsedCV, issues, suggestions);
    
    // 4. Check work experience
    this.checkExperience(parsedCV, issues, suggestions);
    
    // 5. Check skills section
    const skillsAnalysis = this.checkSkills(parsedCV, issues, suggestions, targetKeywords);
    
    // 6. Check for keyword optimization
    const keywordAnalysis = await this.analyzeKeywords(parsedCV, targetRole, targetKeywords);
    
    // 7. Calculate ATS score
    const score = this.calculateATSScore(issues);
    
    // 8. Generate optimized content using AI
    const optimizedContent = await this.generateOptimizedContent(
      parsedCV,
      issues,
      targetRole,
      keywordAnalysis.recommended
    );
    
    return {
      score,
      passes: score >= 75,
      issues,
      suggestions,
      optimizedContent,
      keywords: keywordAnalysis
    };
  }
  
  /**
   * Check CV structure
   */
  private checkStructure(cv: ParsedCV, issues: ATSIssue[]): void {
    // Check for required sections
    if (!cv.personalInfo) {
      issues.push({
        type: 'structure',
        severity: 'error',
        message: 'Missing contact information section',
        section: 'personalInfo',
        fix: 'Add a clear contact information section at the top of your CV'
      });
    }
    
    if (!cv.experience || cv.experience.length === 0) {
      issues.push({
        type: 'structure',
        severity: 'error',
        message: 'Missing work experience section',
        section: 'experience',
        fix: 'Add a work experience section with your professional history'
      });
    }
    
    if (!cv.education || cv.education.length === 0) {
      issues.push({
        type: 'structure',
        severity: 'warning',
        message: 'Missing education section',
        section: 'education',
        fix: 'Add an education section with your academic background'
      });
    }
    
    if (!cv.skills) {
      issues.push({
        type: 'structure',
        severity: 'warning',
        message: 'Missing skills section',
        section: 'skills',
        fix: 'Add a dedicated skills section listing your technical and soft skills'
      });
    }
  }
  
  /**
   * Check contact information
   */
  private checkContactInfo(
    cv: ParsedCV,
    issues: ATSIssue[],
    suggestions: ATSSuggestion[]
  ): void {
    if (!cv.personalInfo) return;
    
    const info = cv.personalInfo;
    
    // Check for essential contact details
    if (!info.name) {
      issues.push({
        type: 'content',
        severity: 'error',
        message: 'Missing name in contact information',
        section: 'personalInfo',
        fix: 'Add your full name at the top of your CV'
      });
    }
    
    if (!info.email) {
      issues.push({
        type: 'content',
        severity: 'error',
        message: 'Missing email address',
        section: 'personalInfo',
        fix: 'Add a professional email address'
      });
    }
    
    if (!info.phone) {
      issues.push({
        type: 'content',
        severity: 'warning',
        message: 'Missing phone number',
        section: 'personalInfo',
        fix: 'Add a contact phone number'
      });
    }
    
    // Check email format
    if (info.email && !this.isValidEmail(info.email)) {
      issues.push({
        type: 'format',
        severity: 'error',
        message: 'Invalid email format',
        section: 'personalInfo',
        fix: 'Use a standard email format (e.g., name@domain.com)'
      });
    }
  }
  
  /**
   * Check professional summary
   */
  private checkSummary(
    cv: ParsedCV,
    issues: ATSIssue[],
    suggestions: ATSSuggestion[]
  ): void {
    if (!cv.personalInfo?.summary) {
      issues.push({
        type: 'content',
        severity: 'warning',
        message: 'Missing professional summary',
        section: 'personalInfo',
        fix: 'Add a 2-3 sentence professional summary highlighting your key qualifications'
      });
      return;
    }
    
    const summary = cv.personalInfo.summary;
    
    // Check length
    const wordCount = summary.split(/\s+/).length;
    if (wordCount < 20) {
      suggestions.push({
        section: 'summary',
        original: summary,
        suggested: `${summary} [Add more detail about your experience and key skills]`,
        reason: 'Summary is too brief. Aim for 50-150 words.',
        impact: 'medium'
      });
    } else if (wordCount > 200) {
      suggestions.push({
        section: 'summary',
        original: summary,
        suggested: summary.split('.').slice(0, 3).join('.') + '.',
        reason: 'Summary is too long. Keep it concise (50-150 words).',
        impact: 'medium'
      });
    }
    
    // Check for action verbs
    const hasActionVerbs = this.atsKeywords.action_verbs.some(verb => 
      summary.toLowerCase().includes(verb)
    );
    
    if (!hasActionVerbs) {
      issues.push({
        type: 'keyword',
        severity: 'info',
        message: 'Summary lacks strong action verbs',
        section: 'summary',
        fix: 'Start with action verbs like "Experienced", "Skilled", or "Accomplished"'
      });
    }
  }
  
  /**
   * Check work experience
   */
  private checkExperience(
    cv: ParsedCV,
    issues: ATSIssue[],
    suggestions: ATSSuggestion[]
  ): void {
    if (!cv.experience || cv.experience.length === 0) return;
    
    cv.experience.forEach((exp, index) => {
      // Check for required fields
      if (!exp.company) {
        issues.push({
          type: 'content',
          severity: 'error',
          message: `Missing company name in experience #${index + 1}`,
          section: 'experience',
          fix: 'Add the company name for each position'
        });
      }
      
      if (!exp.position) {
        issues.push({
          type: 'content',
          severity: 'error',
          message: `Missing job title in experience #${index + 1}`,
          section: 'experience',
          fix: 'Add your job title for each position'
        });
      }
      
      if (!exp.startDate) {
        issues.push({
          type: 'content',
          severity: 'warning',
          message: `Missing dates in experience #${index + 1}`,
          section: 'experience',
          fix: 'Add start and end dates (MM/YYYY format)'
        });
      }
      
      // Check achievements format
      if (!exp.achievements || exp.achievements.length === 0) {
        suggestions.push({
          section: 'experience',
          original: exp.description || '',
          suggested: 'Add 2-4 bullet points highlighting key achievements and quantifiable results',
          reason: 'Bullet points are easier for ATS to parse than paragraphs',
          impact: 'high'
        });
      } else {
        // Check if achievements start with action verbs
        exp.achievements.forEach((achievement, achIndex) => {
          const firstWord = achievement.split(' ')[0].toLowerCase();
          const hasActionVerb = this.atsKeywords.action_verbs.includes(firstWord);
          
          if (!hasActionVerb) {
            suggestions.push({
              section: 'experience',
              original: achievement,
              suggested: `${this.suggestActionVerb(achievement)} ${achievement}`,
              reason: 'Start each bullet point with a strong action verb',
              impact: 'medium'
            });
          }
        });
      }
    });
  }
  
  /**
   * Check skills section
   */
  private checkSkills(
    cv: ParsedCV,
    issues: ATSIssue[],
    suggestions: ATSSuggestion[],
    targetKeywords?: string[]
  ): { found: string[]; missing: string[] } {
    const foundSkills: string[] = [];
    const allSkills: string[] = [];
    
    if (cv.skills) {
      allSkills.push(...(cv.skills.technical || []));
      allSkills.push(...(cv.skills.soft || []));
      allSkills.push(...(cv.skills.tools || []));
    }
    
    if (allSkills.length === 0) {
      issues.push({
        type: 'content',
        severity: 'error',
        message: 'No skills listed',
        section: 'skills',
        fix: 'Add relevant technical and soft skills'
      });
    }
    
    // Check against target keywords
    if (targetKeywords && targetKeywords.length > 0) {
      targetKeywords.forEach(keyword => {
        if (allSkills.some(skill => 
          skill.toLowerCase().includes(keyword.toLowerCase())
        )) {
          foundSkills.push(keyword);
        }
      });
      
      const missingKeywords = targetKeywords.filter(k => !foundSkills.includes(k));
      
      if (missingKeywords.length > 0) {
        suggestions.push({
          section: 'skills',
          original: allSkills.join(', '),
          suggested: [...allSkills, ...missingKeywords].join(', '),
          reason: `Add missing relevant skills: ${missingKeywords.join(', ')}`,
          impact: 'high'
        });
      }
    }
    
    return {
      found: foundSkills,
      missing: targetKeywords ? targetKeywords.filter(k => !foundSkills.includes(k)) : []
    };
  }
  
  /**
   * Analyze keywords using AI
   */
  private async analyzeKeywords(
    cv: ParsedCV,
    targetRole?: string,
    targetKeywords?: string[]
  ): Promise<{ found: string[]; missing: string[]; recommended: string[] }> {
    const cvText = this.cvToText(cv);
    const found: string[] = [];
    const missing: string[] = [];
    let recommended: string[] = [];
    
    // Check for target keywords in CV
    if (targetKeywords) {
      targetKeywords.forEach(keyword => {
        if (cvText.toLowerCase().includes(keyword.toLowerCase())) {
          found.push(keyword);
        } else {
          missing.push(keyword);
        }
      });
    }
    
    // Use AI to recommend keywords if target role is specified
    if (targetRole) {
      try {
        const prompt = `Given this CV content and target role "${targetRole}", suggest 10 relevant keywords that should be included for ATS optimization. Return only the keywords as a comma-separated list.

CV Summary: ${cvText.substring(0, 1000)}...`;

        const response = await this.openai.createCompletion({
          model: 'text-davinci-003',
          prompt,
          max_tokens: 100,
          temperature: 0.3
        });
        
        const suggestedKeywords = response.data.choices[0].text
          ?.trim()
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0) || [];
          
        recommended = suggestedKeywords;
      } catch (error) {
        console.error('Error generating keyword recommendations:', error);
      }
    }
    
    return { found, missing, recommended };
  }
  
  /**
   * Generate optimized content using AI
   */
  private async generateOptimizedContent(
    cv: ParsedCV,
    issues: ATSIssue[],
    targetRole?: string,
    keywords?: string[]
  ): Promise<Partial<ParsedCV>> {
    const optimized: Partial<ParsedCV> = {};
    
    // Generate optimized summary if needed
    if (issues.some(i => i.section === 'personalInfo' && i.message.includes('summary'))) {
      try {
        const prompt = `Create an ATS-optimized professional summary for a ${targetRole || 'professional'} with the following background. Include these keywords naturally: ${keywords?.join(', ') || 'relevant skills'}.

Experience: ${cv.experience?.map(e => `${e.position} at ${e.company}`).join(', ')}
Skills: ${cv.skills ? [...(cv.skills.technical || []), ...(cv.skills.soft || [])].join(', ') : 'Various'}

Write a 2-3 sentence summary starting with an action verb:`;

        const response = await this.openai.createCompletion({
          model: 'text-davinci-003',
          prompt,
          max_tokens: 150,
          temperature: 0.7
        });
        
        const optimizedSummary = response.data.choices[0].text?.trim();
        if (optimizedSummary) {
          optimized.personalInfo = {
            ...cv.personalInfo,
            summary: optimizedSummary
          };
        }
      } catch (error) {
        console.error('Error generating optimized summary:', error);
      }
    }
    
    return optimized;
  }
  
  /**
   * Calculate ATS compatibility score
   */
  private calculateATSScore(issues: ATSIssue[]): number {
    let score = 100;
    
    // Deduct points based on issue severity
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'error':
          score -= 15;
          break;
        case 'warning':
          score -= 10;
          break;
        case 'info':
          score -= 5;
          break;
      }
    });
    
    return Math.max(0, score);
  }
  
  /**
   * Helper: Convert CV to text
   */
  private cvToText(cv: ParsedCV): string {
    const parts: string[] = [];
    
    if (cv.personalInfo) {
      parts.push(cv.personalInfo.name || '');
      parts.push(cv.personalInfo.summary || '');
    }
    
    if (cv.experience) {
      cv.experience.forEach(exp => {
        parts.push(`${exp.position} at ${exp.company}`);
        parts.push(exp.description || '');
        parts.push(...(exp.achievements || []));
      });
    }
    
    if (cv.skills) {
      parts.push(...(cv.skills.technical || []));
      parts.push(...(cv.skills.soft || []));
    }
    
    return parts.join(' ');
  }
  
  /**
   * Helper: Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Helper: Suggest action verb
   */
  private suggestActionVerb(text: string): string {
    const context = text.toLowerCase();
    
    if (context.includes('manage') || context.includes('team')) {
      return 'Led';
    } else if (context.includes('create') || context.includes('develop')) {
      return 'Developed';
    } else if (context.includes('improve') || context.includes('enhance')) {
      return 'Enhanced';
    } else if (context.includes('analyze') || context.includes('data')) {
      return 'Analyzed';
    } else {
      return 'Achieved';
    }
  }
}

export const atsOptimizationService = new ATSOptimizationService();