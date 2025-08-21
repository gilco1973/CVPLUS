/**
 * Timeline Generation Service
 * Creates interactive timeline visualization from CV data
 */

import { ParsedCV } from '../types/enhanced-models';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface TimelineEvent {
  id: string;
  type: 'work' | 'education' | 'achievement' | 'certification';
  title: string;
  organization: string;
  startDate: Date;
  endDate?: Date;
  current?: boolean;
  description?: string;
  achievements?: string[];
  skills?: string[];
  location?: string;
  logo?: string;
  impact?: {
    metric: string;
    value: string;
  }[];
}

interface TimelineData {
  events: TimelineEvent[];
  summary: {
    totalYearsExperience: number;
    companiesWorked: number;
    degreesEarned: number;
    certificationsEarned: number;
    careerHighlights: string[];
  };
  insights: {
    careerProgression: string;
    industryFocus: string[];
    skillEvolution: string;
    nextSteps: string[];
  };
}

export class TimelineGenerationService {
  
  /**
   * Helper function to safely extract skills array from various skill formats
   */
  /**
   * Helper function to safely extract technical skills from various skill formats
   */
  private getTechnicalSkills(skills: string[] | { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; } | undefined): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills; // Assume all are technical if it's an array
    return skills.technical || [];
  }
  
  /**
   * Generate timeline data from parsed CV
   */
  async generateTimeline(parsedCV: ParsedCV, jobId: string): Promise<TimelineData> {
    const events: TimelineEvent[] = [];
    
    // Process work experience
    if (parsedCV.experience) {
      for (const exp of parsedCV.experience) {
        const workEvent: TimelineEvent = {
          id: `work-${events.length}`,
          type: 'work',
          title: exp.position,
          organization: exp.company,
          startDate: this.parseDate(exp.startDate),
          endDate: exp.endDate ? this.parseDate(exp.endDate) : undefined,
          current: (exp as any).current || (!exp.endDate && this.isRecent(exp.startDate)),
          description: exp.description,
          achievements: exp.achievements,
          skills: exp.technologies || [],
          location: (exp as any).location,
          impact: this.extractImpactMetrics(exp.achievements || [])
        };
        events.push(workEvent);
      }
    }
    
    // Process education
    if (parsedCV.education) {
      for (const edu of parsedCV.education) {
        const eduEvent: TimelineEvent = {
          id: `edu-${events.length}`,
          type: 'education',
          title: `${edu.degree} in ${edu.field}`,
          organization: edu.institution,
          startDate: (edu as any).startDate ? this.parseDate((edu as any).startDate) : this.estimateEducationStartDate(edu),
          endDate: (edu as any).endDate ? this.parseDate((edu as any).endDate) : undefined,
          location: (edu as any).location,
          achievements: (edu as any).achievements || [],
          description: edu.gpa ? `GPA: ${edu.gpa}` : undefined
        };
        events.push(eduEvent);
      }
    }
    
    // Process certifications
    if (parsedCV.certifications) {
      for (const cert of parsedCV.certifications) {
        const certEvent: TimelineEvent = {
          id: `cert-${events.length}`,
          type: 'certification',
          title: cert.name,
          organization: cert.issuer,
          startDate: cert.date ? this.parseDate(cert.date) : new Date(),
          endDate: (cert as any).expiryDate ? this.parseDate((cert as any).expiryDate) : undefined,
          description: cert.credentialId ? `Credential ID: ${cert.credentialId}` : undefined
        };
        events.push(certEvent);
      }
    }
    
    // Process achievements as separate events if they have dates
    if (parsedCV.achievements && Array.isArray(parsedCV.achievements)) {
      for (const achievement of parsedCV.achievements) {
        // Ensure achievement is a valid string before processing
        if (!achievement || typeof achievement !== 'string' || achievement.trim().length === 0) {
          console.warn('[Timeline Service] Skipping invalid achievement:', achievement);
          continue;
        }
        
        try {
          // Try to extract date from achievement text
          const dateMatch = achievement.match(/\b(19|20)\d{2}\b/);
          if (dateMatch) {
            const achievementEvent: TimelineEvent = {
              id: `achievement-${events.length}`,
              type: 'achievement',
              title: this.extractAchievementTitle(achievement),
              organization: this.extractAchievementOrg(achievement, parsedCV),
              startDate: new Date(parseInt(dateMatch[0]), 0, 1),
              description: achievement
            };
            events.push(achievementEvent);
          }
        } catch (error) {
          console.error('[Timeline Service] Error processing achievement:', error, 'Achievement:', achievement);
          continue;
        }
      }
    }
    
    // Sort events by start date
    events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    // Generate summary
    const summary = this.generateSummary(events, parsedCV);
    
    // Generate insights
    const insights = await this.generateInsights(events, parsedCV);
    
    // Store timeline data
    await this.storeTimelineData(jobId, { events, summary, insights });
    
    return { events, summary, insights };
  }
  
  /**
   * Parse date string to Date object with comprehensive error handling
   * Supports multiple date formats and provides safe fallback behavior
   */
  private parseDate(dateStr: string): Date {
    try {
      // Input validation and sanitization
      if (!dateStr || typeof dateStr !== 'string') {
        console.warn('[Timeline Service] Invalid date input received:', dateStr);
        return new Date(); // Safe fallback
      }
      
      const sanitizedInput = dateStr.trim();
      if (sanitizedInput.length === 0) {
        console.warn('[Timeline Service] Empty date string provided');
        return new Date(); // Safe fallback
      }
      
      console.log(`[Timeline Service] Parsing date: "${sanitizedInput}"`);
      
      // Strategy 1: Direct Date constructor parsing
      try {
        const directDate = new Date(sanitizedInput);
        if (!isNaN(directDate.getTime()) && this.isValidDateRange(directDate)) {
          console.log(`[Timeline Service] Successfully parsed date using direct parsing: ${directDate.toISOString()}`);
          return directDate;
        }
      } catch (error) {
        console.warn('[Timeline Service] Direct date parsing failed:', error);
      }
      
      // Strategy 2: Parse "Month Year" format (e.g., "January 2023", "Jan 2023")
      try {
        const monthYearPattern = /^\s*(\w+)\s+(\d{4})\s*$/i;
        const monthYearMatch = sanitizedInput.match(monthYearPattern);
        if (monthYearMatch) {
          const monthMap: Record<string, number> = {
            'january': 0, 'jan': 0,
            'february': 1, 'feb': 1,
            'march': 2, 'mar': 2,
            'april': 3, 'apr': 3,
            'may': 4,
            'june': 5, 'jun': 5,
            'july': 6, 'jul': 6,
            'august': 7, 'aug': 7,
            'september': 8, 'sep': 8, 'sept': 8,
            'october': 9, 'oct': 9,
            'november': 10, 'nov': 10,
            'december': 11, 'dec': 11
          };
          
          const monthStr = monthYearMatch[1].toLowerCase();
          const yearStr = monthYearMatch[2];
          const month = monthMap[monthStr];
          const year = parseInt(yearStr, 10);
          
          if (month !== undefined && !isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 10) {
            const parsedDate = new Date(year, month, 1);
            if (this.isValidDateRange(parsedDate)) {
              console.log(`[Timeline Service] Successfully parsed Month-Year format: ${parsedDate.toISOString()}`);
              return parsedDate;
            }
          }
        }
      } catch (error) {
        console.warn('[Timeline Service] Month-Year parsing failed:', error);
      }
      
      // Strategy 3: Parse year-only format (e.g., "2023", "1995")
      try {
        const yearOnlyPattern = /^\s*(\d{4})\s*$/;
        const yearOnlyMatch = sanitizedInput.match(yearOnlyPattern);
        if (yearOnlyMatch) {
          const year = parseInt(yearOnlyMatch[1], 10);
          if (year >= 1900 && year <= new Date().getFullYear() + 10) {
            const parsedDate = new Date(year, 0, 1);
            console.log(`[Timeline Service] Successfully parsed year-only format: ${parsedDate.toISOString()}`);
            return parsedDate;
          }
        }
      } catch (error) {
        console.warn('[Timeline Service] Year-only parsing failed:', error);
      }
      
      // Strategy 4: Extract year from anywhere in the string (e.g., "Graduated in 2020")
      try {
        const yearExtractPattern = /\b(19|20)\d{2}\b/;
        const yearExtractMatch = sanitizedInput.match(yearExtractPattern);
        if (yearExtractMatch) {
          const year = parseInt(yearExtractMatch[0], 10);
          if (year >= 1900 && year <= new Date().getFullYear() + 10) {
            const parsedDate = new Date(year, 0, 1);
            console.log(`[Timeline Service] Successfully extracted year from text: ${parsedDate.toISOString()}`);
            return parsedDate;
          }
        }
      } catch (error) {
        console.warn('[Timeline Service] Year extraction parsing failed:', error);
      }
      
      // Strategy 5: Handle common date separators (e.g., "01/2023", "2023-01", "01-2023")
      try {
        const separatorPatterns = [
          /^\s*(\d{1,2})\/(\d{4})\s*$/, // MM/YYYY
          /^\s*(\d{4})-(\d{1,2})\s*$/, // YYYY-MM  
          /^\s*(\d{1,2})-(\d{4})\s*$/  // MM-YYYY
        ];
        
        for (const pattern of separatorPatterns) {
          const match = sanitizedInput.match(pattern);
          if (match) {
            let month: number, year: number;
            
            if (pattern === separatorPatterns[1]) { // YYYY-MM format
              year = parseInt(match[1], 10);
              month = parseInt(match[2], 10) - 1; // Convert to 0-based month
            } else { // MM/YYYY or MM-YYYY format
              month = parseInt(match[1], 10) - 1; // Convert to 0-based month
              year = parseInt(match[2], 10);
            }
            
            if (month >= 0 && month <= 11 && year >= 1900 && year <= new Date().getFullYear() + 10) {
              const parsedDate = new Date(year, month, 1);
              if (this.isValidDateRange(parsedDate)) {
                console.log(`[Timeline Service] Successfully parsed separator format: ${parsedDate.toISOString()}`);
                return parsedDate;
              }
            }
          }
        }
      } catch (error) {
        console.warn('[Timeline Service] Separator format parsing failed:', error);
      }
      
      // All parsing strategies failed - log comprehensive error and return safe default
      console.error(`[Timeline Service] All date parsing strategies failed for input: "${sanitizedInput}"`);
      console.error('[Timeline Service] Falling back to current date as safe default');
      
      return new Date(); // Safe fallback
      
    } catch (error) {
      // Catastrophic failure - should never reach here but provides ultimate safety
      console.error('[Timeline Service] Catastrophic error in parseDate method:', error);
      console.error('[Timeline Service] Input that caused failure:', dateStr);
      console.error('[Timeline Service] Stack trace:', error instanceof Error ? error.stack : 'No stack available');
      
      // Return current date as the safest possible fallback
      return new Date();
    }
  }
  
  /**
   * Validate that a parsed date falls within reasonable range for CV data
   * Prevents obviously invalid dates from being accepted
   */
  private isValidDateRange(date: Date): boolean {
    try {
      const now = new Date();
      const minDate = new Date(1900, 0, 1); // No CV dates before 1900
      const maxDate = new Date(now.getFullYear() + 10, 11, 31); // Allow up to 10 years in future
      
      return date >= minDate && date <= maxDate && !isNaN(date.getTime());
    } catch (error) {
      console.error('[Timeline Service] Error validating date range:', error);
      return false;
    }
  }
  
  /**
   * Check if date string represents recent/current position
   */
  private isRecent(dateStr: string): boolean {
    if (!dateStr || typeof dateStr !== 'string') {
      return false;
    }
    const keywords = ['present', 'current', 'now', 'ongoing'];
    return keywords.some(keyword => dateStr.toLowerCase().includes(keyword));
  }
  
  /**
   * Estimate education start date based on end date and degree type
   * Enhanced with comprehensive error handling
   */
  private estimateEducationStartDate(edu: any): Date {
    try {
      if (!edu || !edu.endDate) {
        console.warn('[Timeline Service] No end date provided for education estimation, using current date');
        return new Date();
      }
      
      const endDate = this.parseDate(edu.endDate);
      if (!endDate || !this.isValidDateRange(endDate)) {
        console.warn('[Timeline Service] Invalid end date parsed, using current date');
        return new Date();
      }
      
      const degreeYears: Record<string, number> = {
        'bachelor': 4,
        'master': 2,
        'phd': 5,
        'associate': 2,
        'diploma': 1,
        'certificate': 1
      };
      
      let years = 4; // Default to 4 years
      
      if (edu.degree && typeof edu.degree === 'string') {
        const degreeLower = edu.degree.toLowerCase();
        for (const [key, value] of Object.entries(degreeYears)) {
          if (degreeLower.includes(key)) {
            years = value;
            break;
          }
        }
      } else {
        console.warn('[Timeline Service] No valid degree field found, using default duration');
      }
      
      const estimatedStartDate = new Date(endDate.getFullYear() - years, endDate.getMonth(), 1);
      
      // Validate the estimated start date is reasonable
      if (!this.isValidDateRange(estimatedStartDate)) {
        console.warn('[Timeline Service] Estimated education start date is out of valid range, using current date');
        return new Date();
      }
      
      console.log(`[Timeline Service] Estimated education start date: ${estimatedStartDate.toISOString()} (${years} years before end date)`);
      return estimatedStartDate;
      
    } catch (error) {
      console.error('[Timeline Service] Error estimating education start date:', error);
      return new Date(); // Safe fallback
    }
  }
  
  /**
   * Extract impact metrics from achievements
   */
  private extractImpactMetrics(achievements: string[]): { metric: string; value: string }[] {
    const metrics: { metric: string; value: string }[] = [];
    const patterns = [
      /(\d+%)\s+(.+)/,
      /(\$[\d,]+(?:\.\d+)?[KMB]?)\s+(.+)/,
      /([\d,]+)\s+(users|customers|clients|projects|team members)/i,
      /increased\s+(.+)\s+by\s+(\d+%)/i,
      /reduced\s+(.+)\s+by\s+(\d+%)/i,
      /saved\s+(\$[\d,]+(?:\.\d+)?[KMB]?)/i
    ];
    
    for (const achievement of achievements) {
      for (const pattern of patterns) {
        const match = achievement.match(pattern);
        if (match) {
          if (match[1].includes('%') || match[1].includes('$')) {
            metrics.push({ metric: match[2] || 'Impact', value: match[1] });
          } else {
            metrics.push({ metric: match[2] || 'Impact', value: match[1] });
          }
          break;
        }
      }
    }
    
    return metrics;
  }
  
  /**
   * Extract achievement title with null safety
   */
  private extractAchievementTitle(achievement: string): string {
    // Input validation
    if (!achievement || typeof achievement !== 'string') {
      console.warn('[Timeline Service] Invalid achievement input for title extraction:', achievement);
      return 'Achievement';
    }
    
    const cleanAchievement = achievement.trim();
    if (cleanAchievement.length === 0) {
      return 'Achievement';
    }
    
    try {
      // Try to extract the main action or award
      const patterns = [
        /^(Awarded|Received|Won|Achieved|Earned)\s+(.+?)(?:\s+for|\s+in|\s+at|$)/i,
        /^(.+?)\s+(Award|Prize|Recognition|Certificate)/i,
        /^(.{20,50})/
      ];
      
      for (const pattern of patterns) {
        const match = cleanAchievement.match(pattern);
        if (match && (match[2] || match[1])) {
          const title = (match[2] || match[1]).trim();
          return title || 'Achievement';
        }
      }
      
      // Default: return first 50 characters
      return cleanAchievement.substring(0, 50) + (cleanAchievement.length > 50 ? '...' : '');
    } catch (error) {
      console.error('[Timeline Service] Error extracting achievement title:', error);
      return 'Achievement';
    }
  }
  
  /**
   * Extract organization from achievement with null safety
   */
  private extractAchievementOrg(achievement: string, cv: ParsedCV): string {
    // Input validation
    if (!achievement || typeof achievement !== 'string') {
      console.warn('[Timeline Service] Invalid achievement input for org extraction:', achievement);
      return 'Achievement';
    }
    
    if (!cv) {
      console.warn('[Timeline Service] No CV data provided for org extraction');
      return 'Achievement';
    }
    
    try {
      const cleanAchievement = achievement.trim();
      if (cleanAchievement.length === 0) {
        return 'Achievement';
      }
      
      // Check if any company names are mentioned
      if (cv.experience && Array.isArray(cv.experience)) {
        for (const exp of cv.experience) {
          if (exp && exp.company && typeof exp.company === 'string') {
            if (cleanAchievement.toLowerCase().includes(exp.company.toLowerCase())) {
              return exp.company;
            }
          }
        }
      }
      
      // Look for common patterns
      const patterns = [
        /(?:at|from|by)\s+([A-Z][A-Za-z\s&]+)/,
        /([A-Z][A-Za-z\s&]+)\s+(?:Award|Prize|Recognition)/
      ];
      
      for (const pattern of patterns) {
        const match = cleanAchievement.match(pattern);
        if (match && match[1]) {
          const org = match[1].trim();
          return org || 'Achievement';
        }
      }
      
      return 'Achievement';
    } catch (error) {
      console.error('[Timeline Service] Error extracting achievement organization:', error);
      return 'Achievement';
    }
  }
  
  /**
   * Generate timeline summary
   */
  private generateSummary(events: TimelineEvent[], cv: ParsedCV): TimelineData['summary'] {
    const workEvents = events.filter(e => e.type === 'work');
    const eduEvents = events.filter(e => e.type === 'education');
    const certEvents = events.filter(e => e.type === 'certification');
    
    // Calculate total years of experience
    let totalMonths = 0;
    for (const event of workEvents) {
      const start = event.startDate;
      const end = event.endDate || new Date();
      const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                     (end.getMonth() - start.getMonth());
      totalMonths += months;
    }
    
    const totalYears = Math.round(totalMonths / 12 * 10) / 10;
    
    // Extract career highlights
    const highlights: string[] = [];
    
    // Add current role if exists
    const currentRole = workEvents.find(e => e.current);
    if (currentRole) {
      highlights.push(`Currently ${currentRole.title} at ${currentRole.organization}`);
    }
    
    // Add notable achievements
    if (cv.achievements && cv.achievements.length > 0) {
      highlights.push(...cv.achievements.slice(0, 2));
    }
    
    // Add key skills - Fixed to use helper function
    const technicalSkills = this.getTechnicalSkills(cv.skills);
    if (technicalSkills.length > 0) {
      highlights.push(`Expert in ${technicalSkills.slice(0, 3).join(', ')}`);
    }
    
    return {
      totalYearsExperience: totalYears,
      companiesWorked: new Set(workEvents.map(e => e.organization)).size,
      degreesEarned: eduEvents.length,
      certificationsEarned: certEvents.length,
      careerHighlights: highlights
    };
  }
  
  /**
   * Generate career insights
   */
  private async generateInsights(events: TimelineEvent[], cv: ParsedCV): Promise<TimelineData['insights']> {
    const workEvents = events.filter(e => e.type === 'work');
    
    // Analyze career progression
    let careerProgression = 'Steady career growth';
    if (workEvents.length > 1) {
      const titles = workEvents.map(e => e.title.toLowerCase());
      const hasManagement = titles.some(t => 
        t.includes('manager') || t.includes('director') || 
        t.includes('lead') || t.includes('head')
      );
      const hasSenior = titles.some(t => t.includes('senior') || t.includes('principal'));
      
      if (hasManagement) {
        careerProgression = 'Progressive advancement into leadership roles';
      } else if (hasSenior) {
        careerProgression = 'Technical expertise growth to senior levels';
      }
    }
    
    // Identify industry focus
    const industries = this.identifyIndustries(workEvents, cv);
    
    // Analyze skill evolution
    const skillEvolution = this.analyzeSkillEvolution(events, cv);
    
    // Suggest next steps
    const nextSteps = this.suggestNextSteps(events, cv);
    
    return {
      careerProgression,
      industryFocus: industries,
      skillEvolution,
      nextSteps
    };
  }
  
  /**
   * Identify industries from work experience
   */
  private identifyIndustries(workEvents: TimelineEvent[], cv: ParsedCV): string[] {
    const industries = new Set<string>();
    
    // Common industry keywords
    const industryKeywords: Record<string, string[]> = {
      'Technology': ['software', 'tech', 'it', 'digital', 'app', 'platform', 'saas'],
      'Finance': ['bank', 'financial', 'investment', 'trading', 'fintech', 'insurance'],
      'Healthcare': ['health', 'medical', 'pharma', 'hospital', 'clinic', 'biotech'],
      'E-commerce': ['ecommerce', 'retail', 'marketplace', 'shopping'],
      'Education': ['education', 'university', 'school', 'learning', 'training'],
      'Consulting': ['consulting', 'advisory', 'strategy', 'management consulting']
    };
    
    for (const event of workEvents) {
      const combined = `${event.organization} ${event.description || ''}`.toLowerCase();
      
      for (const [industry, keywords] of Object.entries(industryKeywords)) {
        if (keywords.some(keyword => combined.includes(keyword))) {
          industries.add(industry);
        }
      }
    }
    
    return Array.from(industries).slice(0, 3);
  }
  
  /**
   * Analyze skill evolution over time
   */
  private analyzeSkillEvolution(events: TimelineEvent[], cv: ParsedCV): string {
    const workEvents = events.filter(e => e.type === 'work');
    
    if (workEvents.length === 0) {
      return 'Building foundational skills';
    }
    
    const earliestSkills = workEvents[0].skills || [];
    const latestSkills = workEvents[workEvents.length - 1].skills || [];
    
    // Check for technology progression
    const hasProgression = latestSkills.some(skill => 
      !earliestSkills.includes(skill) && 
      (skill.includes('lead') || skill.includes('architect') || skill.includes('senior'))
    );
    
    if (hasProgression) {
      return 'Evolution from implementation to architecture and leadership';
    }
    
    // Check for specialization
    if (latestSkills.length > earliestSkills.length * 1.5) {
      return 'Expanding technical expertise across multiple domains';
    }
    
    return 'Deepening expertise in core technology areas';
  }
  
  /**
   * Suggest next career steps
   */
  private suggestNextSteps(events: TimelineEvent[], cv: ParsedCV): string[] {
    const suggestions: string[] = [];
    const workEvents = events.filter(e => e.type === 'work');
    const certEvents = events.filter(e => e.type === 'certification');
    
    // Check current role level
    const currentRole = workEvents.find(e => e.current);
    if (currentRole) {
      const title = currentRole.title.toLowerCase();
      
      if (!title.includes('senior') && !title.includes('lead') && !title.includes('manager')) {
        suggestions.push('Consider advancing to a senior or lead position');
      } else if (!title.includes('manager') && !title.includes('director')) {
        suggestions.push('Explore management or technical leadership opportunities');
      }
    }
    
    // Check for recent certifications
    const recentCerts = certEvents.filter(e => 
      e.startDate.getTime() > Date.now() - (365 * 24 * 60 * 60 * 1000)
    );
    
    if (recentCerts.length === 0) {
      suggestions.push('Update certifications to stay current with industry standards');
    }
    
    // Skills recommendations - Fixed to use helper function
    const technicalSkills = this.getTechnicalSkills(cv.skills);
    if (technicalSkills.length > 0) {
      const hasCloud = technicalSkills.some(s => 
        s.toLowerCase().includes('aws') || 
        s.toLowerCase().includes('azure') || 
        s.toLowerCase().includes('gcp')
      );
      
      if (!hasCloud) {
        suggestions.push('Add cloud platform expertise (AWS, Azure, or GCP)');
      }
      
      const hasAI = technicalSkills.some(s => 
        s.toLowerCase().includes('ai') || 
        s.toLowerCase().includes('machine learning') || 
        s.toLowerCase().includes('ml')
      );
      
      if (!hasAI) {
        suggestions.push('Explore AI/ML technologies to stay ahead of industry trends');
      }
    }
    
    return suggestions.slice(0, 4);
  }
  
  /**
   * Recursively clean an object by removing undefined values
   */
  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item)).filter(item => item !== undefined && item !== null);
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
          const cleanedValue = this.removeUndefinedValues(value);
          if (cleanedValue !== undefined && cleanedValue !== null) {
            cleaned[key] = cleanedValue;
          }
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  /**
   * Clean timeline data by removing undefined values for Firestore storage
   */
  private cleanTimelineData(timelineData: TimelineData): any {
    const cleanEvents = timelineData.events.map(event => {
      const cleanEvent: any = {
        id: event.id,
        type: event.type,
        title: event.title,
        organization: event.organization,
        startDate: event.startDate
      };
      
      // Only add optional fields if they're not undefined
      if (event.endDate !== undefined) cleanEvent.endDate = event.endDate;
      if (event.current !== undefined) cleanEvent.current = event.current;
      if (event.description !== undefined) cleanEvent.description = event.description;
      if (event.achievements !== undefined) cleanEvent.achievements = event.achievements;
      if (event.skills !== undefined) cleanEvent.skills = event.skills;
      if (event.location !== undefined) cleanEvent.location = event.location;
      if (event.logo !== undefined) cleanEvent.logo = event.logo;
      if (event.impact !== undefined) cleanEvent.impact = event.impact;
      
      return cleanEvent;
    });
    
    const result = {
      events: cleanEvents,
      summary: timelineData.summary,
      insights: timelineData.insights
    };
    
    // Apply deep cleaning to ensure no undefined values remain
    return this.removeUndefinedValues(result);
  }

  /**
   * Store timeline data in Firestore
   */
  private async storeTimelineData(jobId: string, timelineData: TimelineData): Promise<void> {
    const cleanData = this.cleanTimelineData(timelineData);
    
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update({
        'enhancedFeatures.timeline': {
          enabled: true,
          status: 'completed',
          data: cleanData,
          generatedAt: FieldValue.serverTimestamp()
        }
      });
  }
}

export const timelineGenerationService = new TimelineGenerationService();