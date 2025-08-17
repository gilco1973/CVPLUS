/**
 * Language Proficiency Visualization Service
 * Creates visual representations of language skills
 */

import { ParsedCV } from '../types/enhanced-models';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import { config } from '../config/environment';

export interface LanguageProficiency {
  language: string;
  level: 'Native' | 'Fluent' | 'Professional' | 'Conversational' | 'Basic';
  score: number; // 0-100
  certifications?: string[];
  yearsOfExperience?: number;
  contexts?: string[]; // Business, Technical, Academic, etc.
  verified?: boolean;
  flag?: string; // Country flag emoji
}

export interface LanguageVisualization {
  proficiencies: LanguageProficiency[];
  visualizations: {
    type: 'circular' | 'bar' | 'radar' | 'flags' | 'matrix';
    data: any;
    config: {
      primaryColor: string;
      accentColor: string;
      showCertifications: boolean;
      showFlags: boolean;
      animateOnLoad: boolean;
    };
  }[];
  insights: {
    totalLanguages: number;
    fluentLanguages: number;
    businessReady: string[];
    certifiedLanguages: string[];
    recommendations: string[];
  };
  metadata: {
    extractedFrom: string[];
    confidence: number;
    lastUpdated: Date;
  };
}

export class LanguageProficiencyService {
  private openai: OpenAI;
  
  // Language to country flag mapping
  private languageFlags: Record<string, string> = {
    'English': '🇬🇧',
    'Spanish': '🇪🇸',
    'French': '🇫🇷',
    'German': '🇩🇪',
    'Italian': '🇮🇹',
    'Portuguese': '🇵🇹',
    'Russian': '🇷🇺',
    'Chinese': '🇨🇳',
    'Japanese': '🇯🇵',
    'Korean': '🇰🇷',
    'Arabic': '🇸🇦',
    'Hindi': '🇮🇳',
    'Dutch': '🇳🇱',
    'Swedish': '🇸🇪',
    'Polish': '🇵🇱',
    'Turkish': '🇹🇷',
    'Hebrew': '🇮🇱',
    'Greek': '🇬🇷',
    'Danish': '🇩🇰',
    'Norwegian': '🇳🇴',
    'Finnish': '🇫🇮',
    'Czech': '🇨🇿',
    'Hungarian': '🇭🇺',
    'Romanian': '🇷🇴',
    'Vietnamese': '🇻🇳',
    'Thai': '🇹🇭',
    'Indonesian': '🇮🇩',
    'Malay': '🇲🇾',
    'Filipino': '🇵🇭',
    'Ukrainian': '🇺🇦'
  };

  // Common proficiency frameworks
  private proficiencyFrameworks = {
    CEFR: {
      'Native': 'C2+',
      'Fluent': 'C2',
      'Professional': 'C1',
      'Conversational': 'B2',
      'Basic': 'A2-B1'
    },
    ACTFL: {
      'Native': 'Distinguished',
      'Fluent': 'Superior',
      'Professional': 'Advanced High',
      'Conversational': 'Intermediate High',
      'Basic': 'Intermediate Low'
    }
  };
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY || ''
    });
  }
  
  /**
   * Generate language proficiency visualization from CV
   */
  async generateLanguageVisualization(
    parsedCV: ParsedCV, 
    jobId: string
  ): Promise<LanguageVisualization> {
    // Extract language information from CV
    const extractedLanguages = await this.extractLanguages(parsedCV);
    
    // Enhance with AI analysis
    const enhancedProficiencies = await this.enhanceLanguageProficiencies(
      extractedLanguages, 
      parsedCV
    );
    
    // Generate visualizations
    const visualizations = this.generateVisualizations(enhancedProficiencies);
    
    // Generate insights
    const insights = this.generateInsights(enhancedProficiencies);
    
    const visualization: LanguageVisualization = {
      proficiencies: enhancedProficiencies,
      visualizations,
      insights,
      metadata: {
        extractedFrom: this.identifyDataSources(parsedCV),
        confidence: this.calculateConfidence(enhancedProficiencies),
        lastUpdated: new Date()
      }
    };
    
    // Sanitize the entire visualization before storing
    const sanitizedVisualization = this.sanitizeForFirestore(visualization);
    
    // Store in Firestore
    await this.storeVisualization(jobId, sanitizedVisualization);
    
    return sanitizedVisualization;
  }
  
  /**
   * Extract language information from CV
   */
  private async extractLanguages(cv: ParsedCV): Promise<LanguageProficiency[]> {
    const languages: LanguageProficiency[] = [];
    
    // Check skills section for languages
    if (cv.skills && !Array.isArray(cv.skills)) {
      const skillsObj = cv.skills as { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; };
      if (skillsObj.languages && Array.isArray(skillsObj.languages)) {
        for (const lang of skillsObj.languages) {
          const parsed = this.parseLanguageString(lang);
          if (parsed) {
            languages.push(parsed);
          }
        }
      }
    }
    
    // Use AI to extract languages from other sections
    const prompt = `Extract language proficiencies from this CV content. Look for:
    - Explicit language skills mentions
    - Work experience in multilingual environments
    - International experience suggesting language use
    - Education in foreign languages
    - Certifications (TOEFL, DELE, DELF, etc.)
    
    CV Summary: ${cv.personalInfo?.summary || ''}
    Experience: ${JSON.stringify(cv.experience?.slice(0, 3) || [])}
    Education: ${JSON.stringify(cv.education || [])}
    Certifications: ${JSON.stringify(cv.certifications || [])}
    
    Return as JSON array with: language, level, certifications, contexts`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a language proficiency analyzer. Extract language skills and return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(response.choices[0].message?.content || '{"languages":[]}');
      const aiLanguages = result.languages || [];
      
      // Merge AI findings with extracted languages
      for (const aiLang of aiLanguages) {
        const existing = languages.find(l => 
          l.language.toLowerCase() === aiLang.language.toLowerCase()
        );
        
        if (!existing) {
          languages.push({
            language: aiLang.language,
            level: this.normalizeLevel(aiLang.level),
            score: this.levelToScore(aiLang.level),
            certifications: aiLang.certifications,
            contexts: aiLang.contexts,
            flag: this.languageFlags[aiLang.language] || '🌐'
          });
        } else {
          // Enhance existing entry
          if (aiLang.certifications) {
            existing.certifications = [
              ...(existing.certifications || []),
              ...aiLang.certifications
            ];
          }
          if (aiLang.contexts) {
            existing.contexts = [
              ...(existing.contexts || []),
              ...aiLang.contexts
            ];
          }
        }
      }
    } catch (error) {
      console.error('Error extracting languages with AI:', error);
    }
    
    // Always include native language if identifiable
    if (languages.length === 0 || !languages.find(l => l.level === 'Native')) {
      const nativeLanguage = this.inferNativeLanguage(cv);
      if (nativeLanguage && !languages.find(l => l.language === nativeLanguage)) {
        languages.unshift({
          language: nativeLanguage,
          level: 'Native',
          score: 100,
          flag: this.languageFlags[nativeLanguage] || '🌐'
        });
      }
    }
    
    return languages;
  }
  
  /**
   * Parse language string (e.g., "Spanish (Fluent)", "French - B2")
   */
  private parseLanguageString(langString: string): LanguageProficiency | null {
    const patterns = [
      /^(.+?)\s*[\(\-]\s*(.+?)\s*[\)]?$/,  // Language (Level) or Language - Level
      /^(.+?):\s*(.+)$/,                     // Language: Level
      /^(.+?)\s+(.+)$/                       // Language Level
    ];
    
    for (const pattern of patterns) {
      const match = langString.match(pattern);
      if (match) {
        const language = match[1].trim();
        const levelStr = match[2].trim();
        const level = this.normalizeLevel(levelStr);
        
        return {
          language,
          level,
          score: this.levelToScore(level),
          flag: this.languageFlags[language] || '🌐'
        };
      }
    }
    
    // If no pattern matches, assume it's just the language name
    return {
      language: langString.trim(),
      level: 'Professional', // Default assumption
      score: 70,
      flag: this.languageFlags[langString.trim()] || '🌐'
    };
  }
  
  /**
   * Normalize proficiency level
   */
  private normalizeLevel(levelStr: string): LanguageProficiency['level'] {
    const normalized = levelStr.toLowerCase();
    
    if (normalized.includes('native') || normalized.includes('mother')) {
      return 'Native';
    }
    if (normalized.includes('fluent') || normalized.includes('c2') || 
        normalized.includes('superior') || normalized.includes('excellent')) {
      return 'Fluent';
    }
    if (normalized.includes('professional') || normalized.includes('c1') ||
        normalized.includes('advanced') || normalized.includes('proficient')) {
      return 'Professional';
    }
    if (normalized.includes('conversational') || normalized.includes('b2') ||
        normalized.includes('intermediate') || normalized.includes('good')) {
      return 'Conversational';
    }
    if (normalized.includes('basic') || normalized.includes('beginner') ||
        normalized.includes('a1') || normalized.includes('a2') || 
        normalized.includes('elementary')) {
      return 'Basic';
    }
    
    return 'Professional'; // Default
  }
  
  /**
   * Convert level to numeric score
   */
  private levelToScore(level: LanguageProficiency['level']): number {
    const scores = {
      'Native': 100,
      'Fluent': 90,
      'Professional': 70,
      'Conversational': 50,
      'Basic': 30
    };
    return scores[level];
  }
  
  /**
   * Enhance language proficiencies with AI
   */
  private async enhanceLanguageProficiencies(
    languages: LanguageProficiency[],
    cv: ParsedCV
  ): Promise<LanguageProficiency[]> {
    // Add years of experience based on work history
    for (const lang of languages) {
      lang.yearsOfExperience = this.estimateYearsOfExperience(lang, cv);
      
      // Verify certifications
      if (cv.certifications) {
        const relatedCerts = cv.certifications.filter(cert => 
          this.isLanguageCertification(cert.name, lang.language)
        );
        if (relatedCerts.length > 0) {
          lang.certifications = relatedCerts.map(c => c.name);
          lang.verified = true;
        }
      }
    }
    
    return languages.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Sanitize data for Firestore compatibility
   */
  private sanitizeForFirestore(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj
        .map(item => this.sanitizeForFirestore(item))
        .filter(item => item !== null && item !== undefined);
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedValue = this.sanitizeForFirestore(value);
        if (sanitizedValue !== null && sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue;
        }
      }
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Generate visualizations for language proficiencies
   */
  private generateVisualizations(
    proficiencies: LanguageProficiency[]
  ): LanguageVisualization['visualizations'] {
    const visualizations: LanguageVisualization['visualizations'] = [];
    
    // 1. Circular Progress Visualization
    visualizations.push({
      type: 'circular',
      data: {
        languages: proficiencies.map(p => ({
          name: p.language,
          value: p.score,
          level: p.level,
          flag: p.flag,
          certified: (p.certifications?.length || 0) > 0
        }))
      },
      config: {
        primaryColor: '#3B82F6',
        accentColor: '#10B981',
        showCertifications: true,
        showFlags: true,
        animateOnLoad: true
      }
    });
    
    // 2. Horizontal Bar Chart
    visualizations.push({
      type: 'bar',
      data: {
        labels: proficiencies.map(p => `${p.flag} ${p.language}`),
        datasets: [{
          label: 'Proficiency Level',
          data: proficiencies.map(p => p.score),
          backgroundColor: proficiencies.map(p => 
            p.level === 'Native' ? '#10B981' :
            p.level === 'Fluent' ? '#3B82F6' :
            p.level === 'Professional' ? '#8B5CF6' :
            p.level === 'Conversational' ? '#F59E0B' :
            '#6B7280'
          )
        }]
      },
      config: {
        primaryColor: '#3B82F6',
        accentColor: '#10B981',
        showCertifications: true,
        showFlags: true,
        animateOnLoad: true
      }
    });
    
    // 3. Radar Chart (for top 6 languages)
    if (proficiencies.length >= 3) {
      visualizations.push({
        type: 'radar',
        data: {
          labels: proficiencies.slice(0, 6).map(p => p.language),
          datasets: [{
            label: 'Language Proficiency',
            data: proficiencies.slice(0, 6).map(p => p.score),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)'
          }]
        },
        config: {
          primaryColor: '#3B82F6',
          accentColor: '#10B981',
          showCertifications: false,
          showFlags: false,
          animateOnLoad: true
        }
      });
    }
    
    // 4. Flag Grid Visualization
    visualizations.push({
      type: 'flags',
      data: {
        languages: proficiencies.map(p => ({
          flag: p.flag,
          name: p.language,
          level: p.level,
          levelText: this.proficiencyFrameworks.CEFR[p.level],
          certified: p.verified,
          certifications: p.certifications
        }))
      },
      config: {
        primaryColor: '#3B82F6',
        accentColor: '#10B981',
        showCertifications: true,
        showFlags: true,
        animateOnLoad: true
      }
    });
    
    // 5. Proficiency Matrix
    visualizations.push({
      type: 'matrix',
      data: {
        languages: proficiencies.map(p => p.language),
        skills: ['Speaking', 'Writing', 'Reading', 'Listening'],
        values: proficiencies.map(p => {
          // Estimate sub-skills based on overall level
          const base = p.score;
          return {
            language: p.language,
            skills: {
              'Speaking': base - 5 + Math.random() * 10,
              'Writing': base - 5 + Math.random() * 10,
              'Reading': base + Math.random() * 5,
              'Listening': base - 2 + Math.random() * 7
            }
          };
        })
      },
      config: {
        primaryColor: '#3B82F6',
        accentColor: '#10B981',
        showCertifications: false,
        showFlags: false,
        animateOnLoad: true
      }
    });
    
    // Sanitize all visualizations to prevent undefined values in Firestore
    return this.sanitizeForFirestore(visualizations);
  }
  
  /**
   * Generate insights from language proficiencies
   */
  private generateInsights(
    proficiencies: LanguageProficiency[]
  ): LanguageVisualization['insights'] {
    const fluentLanguages = proficiencies.filter(p => 
      p.level === 'Native' || p.level === 'Fluent'
    );
    
    const businessReady = proficiencies.filter(p => 
      p.score >= 70 && p.contexts?.some(c => 
        c.toLowerCase().includes('business') || 
        c.toLowerCase().includes('professional')
      )
    ).map(p => p.language);
    
    const certifiedLanguages = proficiencies.filter(p => 
      p.certifications && p.certifications.length > 0
    ).map(p => p.language);
    
    const recommendations: string[] = [];
    
    // Generate recommendations
    if (proficiencies.length === 1) {
      recommendations.push('Consider learning a second language to enhance global opportunities');
    }
    
    if (certifiedLanguages.length === 0 && proficiencies.length > 1) {
      recommendations.push('Consider obtaining language certifications to validate your skills');
    }
    
    const conversationalLanguages = proficiencies.filter(p => p.level === 'Conversational');
    if (conversationalLanguages.length > 0) {
      recommendations.push(
        `Improve ${conversationalLanguages[0].language} to professional level for career advancement`
      );
    }
    
    if (!proficiencies.find(p => p.language === 'English') && proficiencies.length > 0) {
      recommendations.push('Consider adding English for broader international opportunities');
    }
    
    return {
      totalLanguages: proficiencies.length,
      fluentLanguages: fluentLanguages.length,
      businessReady,
      certifiedLanguages,
      recommendations
    };
  }
  
  /**
   * Identify data sources for language extraction
   */
  private identifyDataSources(cv: ParsedCV): string[] {
    const sources: string[] = [];
    
    if (cv.skills && !Array.isArray(cv.skills)) {
      const skillsObj = cv.skills as { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; };
      if (skillsObj.languages && skillsObj.languages.length > 0) {
        sources.push('Skills section');
      }
    }
    
    if (cv.certifications?.some(c => this.isLanguageCertification(c.name))) {
      sources.push('Certifications');
    }
    
    if (cv.experience?.some(exp => 
      exp.description?.toLowerCase().includes('language') ||
      exp.description?.toLowerCase().includes('multilingual') ||
      exp.description?.toLowerCase().includes('international')
    )) {
      sources.push('Work experience');
    }
    
    if (cv.education?.some(edu => 
      edu.field?.toLowerCase().includes('language') ||
      edu.field?.toLowerCase().includes('linguistics')
    )) {
      sources.push('Education');
    }
    
    return sources.length > 0 ? sources : ['AI inference'];
  }
  
  /**
   * Calculate confidence score
   */
  private calculateConfidence(proficiencies: LanguageProficiency[]): number {
    let confidence = 50; // Base confidence
    
    // Increase for certified languages
    const certifiedCount = proficiencies.filter(p => p.verified).length;
    confidence += certifiedCount * 10;
    
    // Increase for languages with contexts
    const contextCount = proficiencies.filter(p => p.contexts && p.contexts.length > 0).length;
    confidence += contextCount * 5;
    
    // Cap at 95
    return Math.min(confidence, 95);
  }
  
  /**
   * Estimate years of experience with a language
   */
  private estimateYearsOfExperience(
    language: LanguageProficiency,
    cv: ParsedCV
  ): number {
    if (language.level === 'Native') {
      // Estimate based on age (if available) or professional experience
      const totalExperience = cv.experience?.reduce((sum, exp) => {
        const start = new Date(exp.startDate || 0);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        return sum + (end.getFullYear() - start.getFullYear());
      }, 0) || 0;
      
      return Math.max(20, totalExperience + 5); // Assume native from childhood
    }
    
    // Look for language mentions in experience
    let years = 0;
    cv.experience?.forEach(exp => {
      if (exp.description?.toLowerCase().includes(language.language.toLowerCase()) ||
          exp.company?.toLowerCase().includes(language.language.toLowerCase())) {
        const start = new Date(exp.startDate || 0);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        years += (end.getFullYear() - start.getFullYear());
      }
    });
    
    // Minimum years based on level
    const minYears = {
      'Fluent': 5,
      'Professional': 3,
      'Conversational': 2,
      'Basic': 1
    };
    
    return Math.max(years, minYears[language.level] || 0);
  }
  
  /**
   * Check if certification is language-related
   */
  private isLanguageCertification(certName: string, language?: string): boolean {
    const languageCerts = [
      'TOEFL', 'IELTS', 'TOEIC', 'Cambridge', 'DELE', 'DELF', 'DALF',
      'TestDaF', 'Goethe', 'JLPT', 'HSK', 'TOPIK', 'CELI', 'CILS',
      'TORFL', 'SIELE', 'OPI', 'ACTFL', 'telc', 'ÖSD'
    ];
    
    const certLower = certName.toLowerCase();
    const hasLanguageCert = languageCerts.some(cert => 
      certLower.includes(cert.toLowerCase())
    );
    
    if (language) {
      return hasLanguageCert || certLower.includes(language.toLowerCase());
    }
    
    return hasLanguageCert;
  }
  
  /**
   * Infer native language from CV context
   */
  private inferNativeLanguage(cv: ParsedCV): string | null {
    // Check for location clues
    const location = cv.personalInfo?.address?.toLowerCase() || '';
    
    // Simple location to language mapping
    if (location.includes('usa') || location.includes('united states') || 
        location.includes('uk') || location.includes('england') ||
        location.includes('canada') || location.includes('australia')) {
      return 'English';
    }
    if (location.includes('spain') || location.includes('mexico') || 
        location.includes('argentina')) {
      return 'Spanish';
    }
    if (location.includes('france')) return 'French';
    if (location.includes('germany')) return 'German';
    if (location.includes('italy')) return 'Italian';
    if (location.includes('china')) return 'Chinese';
    if (location.includes('japan')) return 'Japanese';
    if (location.includes('korea')) return 'Korean';
    if (location.includes('brazil') || location.includes('portugal')) return 'Portuguese';
    if (location.includes('russia')) return 'Russian';
    if (location.includes('india')) return 'Hindi';
    
    // Default to English if unclear
    return 'English';
  }
  
  /**
   * Store visualization in Firestore
   */
  private async storeVisualization(
    jobId: string, 
    visualization: LanguageVisualization
  ): Promise<void> {
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update({
        'enhancedFeatures.languageProficiency': {
          enabled: true,
          status: 'completed',
          data: visualization,
          generatedAt: FieldValue.serverTimestamp()
        }
      });
  }
  
  /**
   * Update language proficiency
   */
  async updateLanguageProficiency(
    jobId: string,
    languageId: string,
    updates: Partial<LanguageProficiency>
  ): Promise<LanguageProficiency> {
    const jobDoc = await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .get();
    
    const data = jobDoc.data();
    const visualization = data?.enhancedFeatures?.languageProficiency?.data as LanguageVisualization;
    
    if (!visualization) {
      throw new Error('Language visualization not found');
    }
    
    const langIndex = visualization.proficiencies.findIndex(p => 
      p.language === languageId
    );
    
    if (langIndex === -1) {
      throw new Error('Language not found');
    }
    
    // Update the language
    visualization.proficiencies[langIndex] = {
      ...visualization.proficiencies[langIndex],
      ...updates
    };
    
    // Regenerate visualizations
    visualization.visualizations = this.generateVisualizations(visualization.proficiencies);
    
    // Update insights
    visualization.insights = this.generateInsights(visualization.proficiencies);
    
    // Save
    await admin.firestore()
      .collection('jobs')
      .doc(jobId)
      .update({
        'enhancedFeatures.languageProficiency.data': visualization,
        'enhancedFeatures.languageProficiency.lastModified': FieldValue.serverTimestamp()
      });
    
    return visualization.proficiencies[langIndex];
  }
}

export const languageProficiencyService = new LanguageProficiencyService();