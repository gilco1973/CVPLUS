/**
 * Timeline Generation Service
 * Creates interactive timeline visualization from CV data
 */

import { ParsedCV } from '../types/enhanced-models';
import * as admin from 'firebase-admin';

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
    if (parsedCV.achievements) {
      for (const achievement of parsedCV.achievements) {
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
   * Parse date string to Date object
   */
  private parseDate(dateStr: string): Date {
    // Handle various date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try parsing "Month Year" format
    const monthYearMatch = dateStr.match(/(\w+)\s+(\d{4})/);
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
      
      const month = monthMap[monthYearMatch[1].toLowerCase()];
      const year = parseInt(monthYearMatch[2]);
      
      if (month !== undefined && !isNaN(year)) {
        return new Date(year, month, 1);
      }
    }
    
    // Try parsing year only
    const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      return new Date(parseInt(yearMatch[0]), 0, 1);
    }
    
    // Default to current date if parsing fails
    return new Date();
  }
  
  /**
   * Check if date string represents recent/current position
   */
  private isRecent(dateStr: string): boolean {
    const keywords = ['present', 'current', 'now', 'ongoing'];
    return keywords.some(keyword => dateStr.toLowerCase().includes(keyword));
  }
  
  /**
   * Estimate education start date based on end date and degree type
   */
  private estimateEducationStartDate(edu: any): Date {
    if (!edu.endDate) return new Date();
    
    const endDate = this.parseDate(edu.endDate);
    const degreeYears: Record<string, number> = {
      'bachelor': 4,
      'master': 2,
      'phd': 5,
      'associate': 2,
      'diploma': 1,
      'certificate': 1
    };
    
    const degreeLower = edu.degree.toLowerCase();
    let years = 4; // Default to 4 years
    
    for (const [key, value] of Object.entries(degreeYears)) {
      if (degreeLower.includes(key)) {
        years = value;
        break;
      }
    }
    
    return new Date(endDate.getFullYear() - years, endDate.getMonth(), 1);
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
   * Extract achievement title
   */
  private extractAchievementTitle(achievement: string): string {
    // Try to extract the main action or award
    const patterns = [
      /^(Awarded|Received|Won|Achieved|Earned)\s+(.+?)(?:\s+for|\s+in|\s+at|$)/i,
      /^(.+?)\s+(Award|Prize|Recognition|Certificate)/i,
      /^(.{20,50})/
    ];
    
    for (const pattern of patterns) {
      const match = achievement.match(pattern);
      if (match) {
        return match[2] || match[1];
      }
    }
    
    // Default: return first 50 characters
    return achievement.substring(0, 50) + (achievement.length > 50 ? '...' : '');
  }
  
  /**
   * Extract organization from achievement
   */
  private extractAchievementOrg(achievement: string, cv: ParsedCV): string {
    // Check if any company names are mentioned
    if (cv.experience) {
      for (const exp of cv.experience) {
        if (achievement.includes(exp.company)) {
          return exp.company;
        }
      }
    }
    
    // Look for common patterns
    const patterns = [
      /(?:at|from|by)\s+([A-Z][A-Za-z\s&]+)/,
      /([A-Z][A-Za-z\s&]+)\s+(?:Award|Prize|Recognition)/
    ];
    
    for (const pattern of patterns) {
      const match = achievement.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return 'Achievement';
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
    
    // Add key skills
    if (cv.skills?.technical && cv.skills.technical.length > 0) {
      highlights.push(`Expert in ${cv.skills.technical.slice(0, 3).join(', ')}`);
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
    
    // Skills recommendations
    if (cv.skills?.technical) {
      const hasCloud = cv.skills.technical.some(s => 
        s.toLowerCase().includes('aws') || 
        s.toLowerCase().includes('azure') || 
        s.toLowerCase().includes('gcp')
      );
      
      if (!hasCloud) {
        suggestions.push('Add cloud platform expertise (AWS, Azure, or GCP)');
      }
      
      const hasAI = cv.skills.technical.some(s => 
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
   * Store timeline data in Firestore
   */
  private async storeTimelineData(jobId: string, timelineData: TimelineData): Promise<void> {
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update({
        'enhancedFeatures.timeline': {
          enabled: true,
          status: 'completed',
          data: timelineData,
          generatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });
  }
}

export const timelineGenerationService = new TimelineGenerationService();