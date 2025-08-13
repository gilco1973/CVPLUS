import { ParsedCV } from '../types/job';
import { VerifiedClaudeService } from './verified-claude.service';

export interface CVRecommendation {
  id: string;
  type: 'content' | 'structure' | 'formatting' | 'section_addition' | 'keyword_optimization';
  category: 'professional_summary' | 'experience' | 'skills' | 'education' | 'achievements' | 'formatting' | 'ats_optimization';
  title: string;
  description: string;
  currentContent?: string;
  suggestedContent?: string;
  impact: 'high' | 'medium' | 'low';
  priority: number;
  section: string;
  actionRequired: 'replace' | 'add' | 'modify' | 'reformat';
  keywords?: string[];
  estimatedScoreImprovement: number;
}

export interface CVTransformationResult {
  originalCV: ParsedCV;
  improvedCV: ParsedCV;
  appliedRecommendations: CVRecommendation[];
  transformationSummary: {
    totalChanges: number;
    sectionsModified: string[];
    newSections: string[];
    keywordsAdded: string[];
    estimatedScoreIncrease: number;
  };
  comparisonReport: {
    beforeAfter: Array<{
      section: string;
      before: string;
      after: string;
      improvement: string;
    }>;
  };
}

export class CVTransformationService {
  private claudeService: VerifiedClaudeService;

  constructor() {
    this.claudeService = new VerifiedClaudeService();
  }

  /**
   * Analyzes CV and generates specific, actionable recommendations
   */
  async generateDetailedRecommendations(
    parsedCV: ParsedCV, 
    targetRole?: string,
    industryKeywords?: string[]
  ): Promise<CVRecommendation[]> {
    const analysisPrompt = this.buildAnalysisPrompt(parsedCV, targetRole, industryKeywords);
    
    try {
      const response = await this.claudeService.createVerifiedMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.3,
        system: `You are an expert CV transformation specialist. Analyze the provided CV and generate specific, actionable recommendations that can be directly applied to improve the content.

CRITICAL REQUIREMENTS:
1. Base recommendations ONLY on the actual content provided
2. For each recommendation, provide the exact current content and specific improved version
3. Generate real, professional content - no placeholders or generic suggestions
4. Focus on quantifiable improvements (metrics, numbers, impact)
5. Use strong action verbs and achievement-focused language
6. Ensure ATS compatibility with relevant keywords

Return a JSON array of recommendations following this exact structure:
{
  "recommendations": [
    {
      "id": "unique_id",
      "type": "content|structure|formatting|section_addition|keyword_optimization",
      "category": "professional_summary|experience|skills|education|achievements|formatting|ats_optimization",
      "title": "Brief title of improvement",
      "description": "Detailed explanation of why this improvement is needed",
      "currentContent": "Exact current text (if applicable)",
      "suggestedContent": "Specific improved text to replace current content",
      "impact": "high|medium|low",
      "priority": 1-10,
      "section": "Section name this applies to",
      "actionRequired": "replace|add|modify|reformat",
      "keywords": ["relevant", "keywords"],
      "estimatedScoreImprovement": 5-25
    }
  ]
}`,
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        try {
          const parsed = JSON.parse(content.text);
          return parsed.recommendations || [];
        } catch (parseError) {
          console.error('Failed to parse recommendations JSON:', parseError);
          // Fallback: extract recommendations from text response
          return this.extractRecommendationsFromText(content.text, parsedCV);
        }
      }

      throw new Error('Invalid response format from Claude');
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Return basic recommendations as fallback
      return this.generateFallbackRecommendations(parsedCV);
    }
  }

  /**
   * Applies selected recommendations to transform CV content
   */
  async applyRecommendations(
    originalCV: ParsedCV,
    selectedRecommendations: CVRecommendation[]
  ): Promise<CVTransformationResult> {
    console.log(`Applying ${selectedRecommendations.length} recommendations to CV`);
    
    // Deep clone the original CV to avoid mutations
    const improvedCV = JSON.parse(JSON.stringify(originalCV)) as ParsedCV;
    const appliedRecommendations: CVRecommendation[] = [];
    const transformationSummary = {
      totalChanges: 0,
      sectionsModified: [] as string[],
      newSections: [] as string[],
      keywordsAdded: [] as string[],
      estimatedScoreIncrease: 0
    };
    const comparisonReport: CVTransformationResult['comparisonReport'] = {
      beforeAfter: []
    };

    // Group recommendations by type for efficient processing
    const groupedRecommendations = this.groupRecommendationsByType(selectedRecommendations);

    // Apply content improvements first
    if (groupedRecommendations.content) {
      for (const rec of groupedRecommendations.content) {
        const result = await this.applyContentRecommendation(improvedCV, rec);
        if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
          
          if (!transformationSummary.sectionsModified.includes(rec.section)) {
            transformationSummary.sectionsModified.push(rec.section);
          }

          comparisonReport.beforeAfter.push({
            section: rec.section,
            before: rec.currentContent || '',
            after: rec.suggestedContent || '',
            improvement: rec.description
          });
        }
      }
    }

    // Apply structural changes
    if (groupedRecommendations.structure) {
      for (const rec of groupedRecommendations.structure) {
        const result = await this.applyStructuralRecommendation(improvedCV, rec);
        if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
        }
      }
    }

    // Add new sections
    if (groupedRecommendations.section_addition) {
      for (const rec of groupedRecommendations.section_addition) {
        const result = await this.addNewSection(improvedCV, rec);
        if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.newSections.push(rec.section);
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
        }
      }
    }

    // Apply keyword optimizations
    if (groupedRecommendations.keyword_optimization) {
      for (const rec of groupedRecommendations.keyword_optimization) {
        const result = await this.applyKeywordOptimization(improvedCV, rec);
        if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.keywordsAdded.push(...(rec.keywords || []));
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
        }
      }
    }

    return {
      originalCV,
      improvedCV,
      appliedRecommendations,
      transformationSummary,
      comparisonReport
    };
  }

  private buildAnalysisPrompt(parsedCV: ParsedCV, targetRole?: string, industryKeywords?: string[]): string {
    const roleContext = targetRole ? `\nTarget Role: ${targetRole}` : '';
    const keywordContext = industryKeywords?.length ? `\nIndustry Keywords to Consider: ${industryKeywords.join(', ')}` : '';
    
    return `Analyze this CV and provide detailed, actionable recommendations for improvement.${roleContext}${keywordContext}

CV TO ANALYZE:
${JSON.stringify(parsedCV, null, 2)}

Focus on these improvement areas:

1. PROFESSIONAL SUMMARY: Create/improve a compelling professional summary if missing or weak
2. EXPERIENCE BULLETS: Transform weak bullet points into achievement-focused statements with metrics
3. SKILLS OPTIMIZATION: Reorganize and enhance skills presentation for ATS and readability
4. KEYWORD INTEGRATION: Add relevant industry keywords naturally throughout content
5. STRUCTURAL IMPROVEMENTS: Suggest better organization and formatting
6. MISSING SECTIONS: Identify and suggest adding key sections (summary, achievements, etc.)

For each recommendation:
- Analyze the current content (if exists)
- Provide specific, ready-to-use improved content
- Explain the improvement and expected impact
- Include relevant keywords for ATS optimization
- Estimate the ATS score improvement (5-25 points)

EXAMPLE TRANSFORMATIONS:
❌ "Responsible for managing a team"
✅ "Led cross-functional team of 12 developers, reducing project delivery time by 30% and increasing client satisfaction scores from 7.2 to 9.1"

❌ "Worked on various projects"
✅ "Spearheaded 5 high-priority client projects worth $2.3M, delivering all milestones on time and 15% under budget"

Generate specific recommendations that can be directly applied to transform this CV.`;
  }

  private async applyContentRecommendation(
    cv: ParsedCV, 
    recommendation: CVRecommendation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const section = recommendation.section.toLowerCase();
      
      switch (section) {
        case 'professional_summary':
        case 'summary':
          if (!cv.summary) cv.summary = '';
          cv.summary = recommendation.suggestedContent || cv.summary;
          break;
          
        case 'experience':
        case 'work_experience':
          if (cv.experience && recommendation.currentContent && recommendation.suggestedContent) {
            // Find and replace specific experience bullet or description
            cv.experience = cv.experience.map(exp => {
              if (exp.description && exp.description.includes(recommendation.currentContent!)) {
                exp.description = exp.description.replace(
                  recommendation.currentContent!,
                  recommendation.suggestedContent!
                );
              }
              return exp;
            });
          }
          break;
          
        case 'skills':
          if (recommendation.suggestedContent) {
            // Parse and update skills
            const skillsToAdd = recommendation.suggestedContent.split(',').map(s => s.trim());
            
            // Handle both skills structures: simple array or object with categories
            if (!cv.skills) {
              cv.skills = [];
            }
            
            if (Array.isArray(cv.skills)) {
              // Simple array format
              cv.skills = [...new Set([...cv.skills, ...skillsToAdd])];
            } else {
              // Object format with categories
              if (!cv.skills.technical) cv.skills.technical = [];
              cv.skills.technical = [...new Set([...cv.skills.technical, ...skillsToAdd])];
            }
          }
          break;
          
        case 'education':
          if (cv.education && recommendation.currentContent && recommendation.suggestedContent) {
            cv.education = cv.education.map(edu => {
              if (edu.description && edu.description.includes(recommendation.currentContent!)) {
                edu.description = edu.description.replace(
                  recommendation.currentContent!,
                  recommendation.suggestedContent!
                );
              }
              return edu;
            });
          }
          break;
          
        default:
          console.warn(`Unknown section for content recommendation: ${section}`);
          return { success: false, error: `Unknown section: ${section}` };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error applying content recommendation:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async applyStructuralRecommendation(
    cv: ParsedCV, 
    recommendation: CVRecommendation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Structural improvements like reordering sections, formatting changes
      // This could involve reorganizing experience entries, skills grouping, etc.
      console.log(`Applying structural recommendation: ${recommendation.title}`);
      
      // Example: Reorder experience by relevance or date
      if (recommendation.description.includes('chronological order') && cv.experience) {
        cv.experience.sort((a, b) => {
          const dateA = new Date(a.endDate || a.startDate || '1900-01-01');
          const dateB = new Date(b.endDate || b.startDate || '1900-01-01');
          return dateB.getTime() - dateA.getTime(); // Newest first
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error applying structural recommendation:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async addNewSection(
    cv: ParsedCV, 
    recommendation: CVRecommendation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const sectionName = recommendation.section.toLowerCase();
      
      switch (sectionName) {
        case 'professional_summary':
        case 'summary':
          if (!cv.summary) {
            cv.summary = recommendation.suggestedContent || '';
          }
          break;
          
        case 'achievements':
        case 'key_achievements':
          if (!cv.achievements) {
            cv.achievements = [];
          }
          if (recommendation.suggestedContent) {
            const achievementsList = recommendation.suggestedContent
              .split('\n')
              .filter(line => line.trim())
              .map(line => line.replace(/^[•\-*]\s*/, '').trim());
            cv.achievements.push(...achievementsList);
          }
          break;
          
        case 'certifications':
          if (!cv.certifications) {
            cv.certifications = [];
          }
          if (recommendation.suggestedContent) {
            const certsList = recommendation.suggestedContent
              .split('\n')
              .filter(line => line.trim())
              .map(cert => ({
                name: cert.trim(),
                issuer: '',
                date: '',
                url: ''
              }));
            cv.certifications.push(...certsList);
          }
          break;
          
        default:
          // For custom sections, add to a general sections object
          if (!cv.customSections) {
            cv.customSections = {};
          }
          cv.customSections[recommendation.section] = recommendation.suggestedContent || '';
          break;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error adding new section:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async applyKeywordOptimization(
    cv: ParsedCV, 
    recommendation: CVRecommendation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const keywords = recommendation.keywords || [];
      
      // Add keywords to skills section
      if (!cv.skills) cv.skills = [];
      
      if (Array.isArray(cv.skills)) {
        const relevantKeywords = keywords.filter(kw => 
          !cv.skills!.some(skill => 
            skill.toLowerCase().includes(kw.toLowerCase())
          )
        );
        (cv.skills as string[]).push(...relevantKeywords);
      } else {
        // Handle object-based skills
        if (!cv.skills.technical) cv.skills.technical = [];
        const relevantKeywords = keywords.filter(kw => 
          !cv.skills!.technical?.some(skill => 
            skill.toLowerCase().includes(kw.toLowerCase())
          )
        );
        cv.skills.technical.push(...relevantKeywords);
      }
      
      // Enhance summary with keywords
      if (cv.summary && recommendation.suggestedContent) {
        cv.summary = recommendation.suggestedContent;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error applying keyword optimization:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private groupRecommendationsByType(recommendations: CVRecommendation[]): Record<string, CVRecommendation[]> {
    return recommendations.reduce((groups, rec) => {
      if (!groups[rec.type]) {
        groups[rec.type] = [];
      }
      groups[rec.type].push(rec);
      return groups;
    }, {} as Record<string, CVRecommendation[]>);
  }

  private extractRecommendationsFromText(text: string, cv: ParsedCV): CVRecommendation[] {
    // Fallback method to extract recommendations from non-JSON response
    const recommendations: CVRecommendation[] = [];
    const lines = text.split('\n');
    
    let currentRec: Partial<CVRecommendation> = {};
    let recId = 1;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.match(/^\d+\./)) {
        // New recommendation starts
        if (currentRec.title) {
          recommendations.push(this.completeRecommendation(currentRec, recId++));
        }
        currentRec = {
          title: trimmedLine.replace(/^\d+\.\s*/, ''),
          type: 'content',
          category: 'experience',
          impact: 'medium',
          priority: 5,
          section: 'experience',
          actionRequired: 'modify',
          estimatedScoreImprovement: 10
        };
      } else if (trimmedLine.toLowerCase().includes('current:')) {
        currentRec.currentContent = trimmedLine.replace(/current:\s*/i, '');
      } else if (trimmedLine.toLowerCase().includes('improved:')) {
        currentRec.suggestedContent = trimmedLine.replace(/improved:\s*/i, '');
      } else if (trimmedLine && currentRec.title && !currentRec.description) {
        currentRec.description = trimmedLine;
      }
    }
    
    // Add the last recommendation
    if (currentRec.title) {
      recommendations.push(this.completeRecommendation(currentRec, recId));
    }
    
    return recommendations.slice(0, 10); // Limit to 10 recommendations
  }

  private completeRecommendation(partial: Partial<CVRecommendation>, id: number): CVRecommendation {
    return {
      id: `rec_${id}`,
      type: partial.type || 'content',
      category: partial.category || 'experience',
      title: partial.title || 'CV Improvement',
      description: partial.description || 'Improve CV content',
      currentContent: partial.currentContent,
      suggestedContent: partial.suggestedContent,
      impact: partial.impact || 'medium',
      priority: partial.priority || 5,
      section: partial.section || 'experience',
      actionRequired: partial.actionRequired || 'modify',
      keywords: partial.keywords || [],
      estimatedScoreImprovement: partial.estimatedScoreImprovement || 10
    };
  }

  private generateFallbackRecommendations(cv: ParsedCV): CVRecommendation[] {
    const recommendations: CVRecommendation[] = [];
    
    // Check for missing professional summary
    if (!cv.summary || cv.summary.length < 50) {
      recommendations.push({
        id: 'rec_summary',
        type: 'section_addition',
        category: 'professional_summary',
        title: 'Add Professional Summary',
        description: 'A compelling professional summary is missing. This is crucial for ATS and recruiter attention.',
        suggestedContent: 'Results-driven professional with proven track record in [your field]. Experienced in [key skills] with demonstrated ability to [key achievement]. Seeking to leverage expertise in [target role].',
        impact: 'high',
        priority: 1,
        section: 'professional_summary',
        actionRequired: 'add',
        keywords: ['professional', 'results-driven', 'experienced'],
        estimatedScoreImprovement: 20
      });
    }
    
    // Check for weak experience descriptions
    if (cv.experience?.some(exp => exp.description && exp.description.split(' ').length < 10)) {
      recommendations.push({
        id: 'rec_experience',
        type: 'content',
        category: 'experience',
        title: 'Enhance Experience Descriptions',
        description: 'Experience descriptions are too brief and lack quantifiable achievements.',
        currentContent: 'Responsible for team management',
        suggestedContent: 'Led cross-functional team of 8 members, increasing productivity by 25% and reducing project delivery time by 3 weeks',
        impact: 'high',
        priority: 2,
        section: 'experience',
        actionRequired: 'replace',
        keywords: ['led', 'managed', 'increased', 'delivered'],
        estimatedScoreImprovement: 15
      });
    }
    
    return recommendations;
  }
}