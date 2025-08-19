import { ParsedCV } from '../types/job';
import { VerifiedClaudeService } from './verified-claude.service';
import { PlaceholderManager, PlaceholderInfo } from './placeholder-manager.service';

export interface CVRecommendation {
  id: string;
  type: 'content' | 'structure' | 'formatting' | 'section_addition' | 'keyword_optimization';
  category: 'professional_summary' | 'experience' | 'skills' | 'education' | 'achievements' | 'formatting' | 'ats_optimization';
  title: string;
  description: string;
  currentContent?: string;
  suggestedContent?: string;
  customizedContent?: string; // Content after user has filled placeholders
  placeholders?: PlaceholderInfo[]; // Detected placeholders in suggestedContent
  isCustomized?: boolean; // Whether user has customized placeholders
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
2. NEVER invent specific numbers, metrics, team sizes, or financial figures
3. For quantifiable improvements, use placeholder templates like "[INSERT TEAM SIZE]" or "[ADD PERCENTAGE IMPROVEMENT]"
4. Suggest improvement patterns and structures, not fabricated data
5. Use strong action verbs and achievement-focused language based on existing content
6. Ensure ATS compatibility with relevant keywords from the actual CV
7. When existing content lacks metrics, suggest adding them without providing fake numbers
8. IMPORTANT: Return ONLY valid JSON - no markdown formatting, no code blocks, no explanatory text

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
          // Clean the response text to remove markdown code blocks
          let cleanText = content.text.trim();
          
          // Remove markdown code blocks if present
          if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          
          const parsed = JSON.parse(cleanText);
          const recommendations = parsed.recommendations || [];
          
          // Process each recommendation to detect placeholders
          return this.processRecommendationsWithPlaceholders(recommendations);
        } catch (parseError) {
          console.error('Failed to parse recommendations JSON:', parseError);
          console.error('Raw response text:', content.text);
          // Fallback: extract recommendations from text response
          const fallbackRecs = this.extractRecommendationsFromText(content.text, parsedCV);
          return this.processRecommendationsWithPlaceholders(fallbackRecs);
        }
      }

      throw new Error('Invalid response format from Claude');
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Return basic recommendations as fallback
      const fallbackRecs = this.generateFallbackRecommendations(parsedCV);
      return this.processRecommendationsWithPlaceholders(fallbackRecs);
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
    console.log('Selected recommendation IDs:', selectedRecommendations.map(r => r.id));
    console.log('Selected recommendation sections:', selectedRecommendations.map(r => `${r.id}: "${r.section}"`));
    
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
    
    // Capture original content states for comparison
    const originalContentStates = this.captureContentStates(originalCV);

    // Group recommendations by type for efficient processing
    const groupedRecommendations = this.groupRecommendationsByType(selectedRecommendations);
    console.log('Grouped recommendations by type:');
    Object.entries(groupedRecommendations).forEach(([type, recs]) => {
      console.log(`  ${type}: ${recs.length} recommendations`);
    });

    // Apply content improvements first
    if (groupedRecommendations.content) {
      console.log(`Applying ${groupedRecommendations.content.length} content recommendations`);
      for (const rec of groupedRecommendations.content) {
        console.log(`Processing content recommendation: ${rec.id} for section "${rec.section}"`);
        const result = await this.applyContentRecommendation(improvedCV, rec);
        if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
          
          if (!transformationSummary.sectionsModified.includes(rec.section)) {
            transformationSummary.sectionsModified.push(rec.section);
          }

          // Comparison will be generated after all transformations
          console.log(`Successfully applied content recommendation: ${rec.id}`);
        } else {
          console.error(`Failed to apply content recommendation ${rec.id}: ${result.error}`);
        }
      }
    }

    // Apply structural changes
    if (groupedRecommendations.structure) {
      console.log(`Applying ${groupedRecommendations.structure.length} structural recommendations`);
      for (const rec of groupedRecommendations.structure) {
        console.log(`Processing structural recommendation: ${rec.id}`);
        const result = await this.applyStructuralRecommendation(improvedCV, rec);
        if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
          console.log(`Successfully applied structural recommendation: ${rec.id}`);
        } else {
          console.error(`Failed to apply structural recommendation ${rec.id}: ${result.error}`);
        }
      }
    }

    // Add new sections
    if (groupedRecommendations.section_addition) {
      console.log(`Adding ${groupedRecommendations.section_addition.length} new sections`);
      for (const rec of groupedRecommendations.section_addition) {
        console.log(`Processing section addition: ${rec.id} for section "${rec.section}"`);
        const result = await this.addNewSection(improvedCV, rec);
        if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.newSections.push(rec.section);
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
          console.log(`Successfully added new section: ${rec.id}`);
        } else {
          console.error(`Failed to add new section ${rec.id}: ${result.error}`);
        }
      }
    }

    // Apply keyword optimizations
    if (groupedRecommendations.keyword_optimization) {
      console.log(`Applying ${groupedRecommendations.keyword_optimization.length} keyword optimizations`);
      for (const rec of groupedRecommendations.keyword_optimization) {
        console.log(`Processing keyword optimization: ${rec.id}`);
        const result = await this.applyKeywordOptimization(improvedCV, rec);
        if (result.success) {
          appliedRecommendations.push(rec);
          transformationSummary.totalChanges++;
          transformationSummary.keywordsAdded.push(...(rec.keywords || []));
          transformationSummary.estimatedScoreIncrease += rec.estimatedScoreImprovement;
          console.log(`Successfully applied keyword optimization: ${rec.id}`);
        } else {
          console.error(`Failed to apply keyword optimization ${rec.id}: ${result.error}`);
        }
      }
    }

    const successRate = appliedRecommendations.length / selectedRecommendations.length * 100;
    console.log(`\n=== TRANSFORMATION SUMMARY ===`);
    console.log(`Total recommendations to apply: ${selectedRecommendations.length}`);
    console.log(`Successfully applied: ${appliedRecommendations.length}`);
    console.log(`Failed to apply: ${selectedRecommendations.length - appliedRecommendations.length}`);
    console.log(`Success rate: ${successRate.toFixed(1)}%`);
    console.log(`Total changes made: ${transformationSummary.totalChanges}`);
    console.log(`Sections modified: ${transformationSummary.sectionsModified.join(', ')}`);
    console.log(`New sections added: ${transformationSummary.newSections.join(', ')}`);
    console.log(`Estimated score increase: ${transformationSummary.estimatedScoreIncrease}`);
    console.log(`==============================\n`);
    
    // Log any failed recommendations for debugging
    const failedRecommendations = selectedRecommendations.filter(rec => 
      !appliedRecommendations.some(applied => applied.id === rec.id)
    );
    
    if (failedRecommendations.length > 0) {
      console.warn('Failed recommendations:');
      failedRecommendations.forEach(rec => {
        console.warn(`  - ${rec.id}: "${rec.section}" (${rec.type})`);
      });
    }
    
    // Generate proper before/after comparisons after all transformations
    const improvedContentStates = this.captureContentStates(improvedCV);
    comparisonReport.beforeAfter = this.generateComparisonReport(
      originalContentStates,
      improvedContentStates, 
      appliedRecommendations
    );
    
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
    
    // Optimize prompt length based on CV complexity
    const cvComplexity = this.getCVComplexity(parsedCV);
    const isComplexCV = cvComplexity === 'high';
    
    // Use condensed prompt for complex CVs to reduce processing time
    if (isComplexCV) {
      return this.buildCondensedPrompt(parsedCV, targetRole, industryKeywords);
    }
    
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

EXAMPLE IMPROVEMENT PATTERNS:
❌ "Responsible for managing a team"
✅ "Led cross-functional team of [INSERT TEAM SIZE], reducing project delivery time by [ADD PERCENTAGE]% and increasing client satisfaction scores"

❌ "Worked on various projects"
✅ "Spearheaded [NUMBER] high-priority client projects worth [INSERT VALUE], delivering all milestones on time and [ADD PERCENTAGE]% under budget"

❌ "Handled customer service"
✅ "Managed customer relationships resulting in [ADD SPECIFIC OUTCOME] and [INSERT METRIC] improvement in customer retention"

Generate specific recommendations with placeholder templates that users can customize with their real data.`;
  }

  private async applyContentRecommendation(
    cv: ParsedCV, 
    recommendation: CVRecommendation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const section = recommendation.section.toLowerCase().trim();
      console.log(`Applying content recommendation for section: "${section}"`);
      
      // Handle professional summary sections
      if (this.isSummarySection(section)) {
        if (!cv.summary) cv.summary = '';
        cv.summary = recommendation.suggestedContent || cv.summary;
        console.log(`Applied summary recommendation`);
        return { success: true };
      }
      
      // Handle experience sections (including company-specific ones)
      if (this.isExperienceSection(section)) {
        const applied = this.applyExperienceRecommendation(cv, recommendation, section);
        if (applied) {
          console.log(`Applied experience recommendation for section: "${section}"`);
          return { success: true };
        }
      }
      
      // Handle skills sections
      if (this.isSkillsSection(section)) {
        const applied = this.applySkillsRecommendation(cv, recommendation);
        if (applied) {
          console.log(`Applied skills recommendation`);
          return { success: true };
        }
      }
      
      // Handle education sections
      if (this.isEducationSection(section)) {
        const applied = this.applyEducationRecommendation(cv, recommendation);
        if (applied) {
          console.log(`Applied education recommendation`);
          return { success: true };
        }
      }
      
      // Handle achievements sections
      if (this.isAchievementsSection(section)) {
        const applied = this.applyAchievementsRecommendation(cv, recommendation);
        if (applied) {
          console.log(`Applied achievements recommendation`);
          return { success: true };
        }
      }
      
      // Handle custom sections
      if (this.isCustomSection(section)) {
        const applied = this.applyCustomSectionRecommendation(cv, recommendation, section);
        if (applied) {
          console.log(`Applied custom section recommendation for: "${section}"`);
          return { success: true };
        }
      }
      
      console.warn(`Unable to apply recommendation for section: "${section}" - treating as custom section`);
      // As a fallback, treat as custom section
      if (!cv.customSections) cv.customSections = {};
      cv.customSections[recommendation.section] = recommendation.suggestedContent || '';
      
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
      const section = recommendation.section.toLowerCase().trim();
      console.log(`Adding new section: "${section}"`);
      
      // Handle professional summary sections
      if (this.isSummarySection(section)) {
        if (!cv.summary) {
          cv.summary = recommendation.suggestedContent || '';
          console.log('Added new summary section');
          return { success: true };
        }
      }
      
      // Handle achievements sections
      if (this.isAchievementsSection(section)) {
        if (!cv.achievements) {
          cv.achievements = [];
        }
        if (recommendation.suggestedContent) {
          const achievementsList = recommendation.suggestedContent
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^[•\-*]\s*/, '').trim())
            .filter(line => line.length > 0);
          
          // Add unique achievements only
          const uniqueAchievements = achievementsList.filter(achievement => 
            !cv.achievements?.some(existing => 
              existing.toLowerCase() === achievement.toLowerCase()
            )
          );
          
          cv.achievements.push(...uniqueAchievements);
          console.log(`Added ${uniqueAchievements.length} new achievements`);
        }
        return { success: true };
      }
      
      // Handle certifications
      if (section.includes('certification') || section.includes('certificate')) {
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
          console.log(`Added ${certsList.length} new certifications`);
        }
        return { success: true };
      }
      
      // Handle skills sections
      if (this.isSkillsSection(section)) {
        return { success: this.applySkillsRecommendation(cv, recommendation) };
      }
      
      // For all other sections, add to custom sections
      if (!cv.customSections) {
        cv.customSections = {};
      }
      cv.customSections[recommendation.section] = recommendation.suggestedContent || '';
      console.log(`Added custom section: "${recommendation.section}"`);
      
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
      console.log(`Applying keyword optimization with keywords: ${keywords.join(', ')}`);
      
      // Add keywords to skills section
      if (!cv.skills) cv.skills = [];
      
      if (Array.isArray(cv.skills)) {
        const skillsArray = cv.skills as string[];
        const relevantKeywords = keywords.filter(kw => 
          !skillsArray.some((skill: string) => 
            skill.toLowerCase().includes(kw.toLowerCase())
          )
        );
        skillsArray.push(...relevantKeywords);
        console.log(`Added ${relevantKeywords.length} new keywords to skills array`);
      } else {
        // Handle object-based skills
        const skillsObj = cv.skills as { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; };
        if (!skillsObj.technical) skillsObj.technical = [];
        const relevantKeywords = keywords.filter(kw => 
          !skillsObj.technical?.some((skill: string) => 
            skill.toLowerCase().includes(kw.toLowerCase())
          )
        );
        skillsObj.technical.push(...relevantKeywords);
        console.log(`Added ${relevantKeywords.length} new keywords to technical skills`);
      }
      
      // Enhance summary with keywords naturally integrated
      if (cv.summary && keywords.length > 0) {
        console.log('Integrating keywords naturally into summary');
        const enhancedSummary = await this.integrateKeywordsNaturally(cv.summary, keywords);
        if (enhancedSummary) {
          cv.summary = enhancedSummary;
          console.log('Successfully enhanced summary with keywords');
        } else {
          console.warn('Failed to enhance summary, keeping original');
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error applying keyword optimization:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Processes recommendations to detect and metadata for placeholders
   */
  private processRecommendationsWithPlaceholders(
    recommendations: CVRecommendation[]
  ): CVRecommendation[] {
    return recommendations.map(rec => {
      if (rec.suggestedContent) {
        // Detect placeholders in the suggested content
        const placeholders = PlaceholderManager.detectPlaceholders(rec.suggestedContent);
        
        if (placeholders.length > 0) {
          console.log(`Found ${placeholders.length} placeholders in recommendation ${rec.id}:`, placeholders.map(p => p.key));
          rec.placeholders = placeholders;
          rec.isCustomized = false;
        }
      }
      
      return rec;
    });
  }

  /**
   * Naturally integrates keywords into existing content using AI
   */
  private async integrateKeywordsNaturally(
    originalContent: string, 
    keywords: string[]
  ): Promise<string | null> {
    try {
      const prompt = `Enhance the following professional summary by naturally integrating these keywords: ${keywords.join(', ')}

Original Summary:
${originalContent}

Requirements:
1. Keep the original meaning and tone
2. Integrate keywords naturally and contextually
3. Maintain professional language
4. Ensure the text flows smoothly
5. Don't force keywords that don't fit
6. Return only the enhanced summary text

Enhanced Summary:`;

      const response = await this.claudeService.createVerifiedMessage({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.3,
        system: 'You are an expert CV writer. Enhance the provided professional summary by naturally integrating the specified keywords while maintaining the original meaning and professional tone.',
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }
      
      return null;
    } catch (error) {
      console.error('Error integrating keywords naturally:', error);
      return null;
    }
  }

  /**
   * Captures the current state of all CV content sections
   */
  private captureContentStates(cv: ParsedCV): Record<string, string> {
    const states: Record<string, string> = {};
    
    // Capture summary
    if (cv.summary) {
      states['Professional Summary'] = cv.summary;
    }
    
    // Capture experience sections  
    if (cv.experience) {
      cv.experience.forEach(exp => {
        const key = `Experience - ${exp.company}`;
        states[key] = exp.description || `${exp.position} at ${exp.company}`;
      });
    }
    
    // Capture skills
    if (cv.skills) {
      if (Array.isArray(cv.skills)) {
        states['Skills'] = cv.skills.join(', ');
      } else {
        const skillsObj = cv.skills as any;
        states['Skills'] = Object.values(skillsObj).flat().join(', ');
      }
    }
    
    // Capture achievements
    if (cv.achievements && cv.achievements.length > 0) {
      states['Key Achievements'] = cv.achievements.join('\n• ');
    }
    
    // Capture custom sections
    if (cv.customSections) {
      Object.entries(cv.customSections).forEach(([key, value]) => {
        states[key] = value;
      });
    }
    
    return states;
  }
  
  /**
   * Generates proper before/after comparison report
   */
  private generateComparisonReport(
    originalStates: Record<string, string>,
    improvedStates: Record<string, string>,
    appliedRecommendations: CVRecommendation[]
  ): Array<{
    section: string;
    before: string;
    after: string;
    improvement: string;
  }> {
    const comparisons: Array<{
      section: string;
      before: string;
      after: string;
      improvement: string;
    }> = [];
    
    // Generate comparisons for each applied recommendation
    appliedRecommendations.forEach(rec => {
      let sectionKey = rec.section;
      
      // Map recommendation sections to content state keys
      if (this.isSummarySection(rec.section)) {
        sectionKey = 'Professional Summary';
      } else if (this.isSkillsSection(rec.section)) {
        sectionKey = 'Skills';
      } else if (this.isAchievementsSection(rec.section)) {
        sectionKey = 'Key Achievements';
      } else if (rec.section.includes('Experience - ')) {
        sectionKey = rec.section; // Already in correct format
      }
      
      const beforeContent = originalStates[sectionKey] || originalStates[rec.section] || '';
      const afterContent = improvedStates[sectionKey] || improvedStates[rec.section] || '';
      
      // Only add comparison if content actually changed
      if (beforeContent !== afterContent && afterContent) {
        comparisons.push({
          section: rec.section,
          before: beforeContent,
          after: afterContent,
          improvement: rec.description
        });
      }
    });
    
    return comparisons;
  }

  // Section detection helper methods
  private isSummarySection(section: string): boolean {
    const summaryPatterns = [
      'professional_summary', 'summary', 'professional summary',
      'profile', 'objective', 'career_summary', 'career summary'
    ];
    return summaryPatterns.some(pattern => section.includes(pattern));
  }
  
  private isExperienceSection(section: string): boolean {
    const experiencePatterns = [
      'experience', 'work_experience', 'work experience', 'employment',
      'career', 'professional_experience', 'professional experience'
    ];
    return experiencePatterns.some(pattern => section.includes(pattern));
  }
  
  private isSkillsSection(section: string): boolean {
    const skillsPatterns = [
      'skills', 'technical_skills', 'technical skills', 'core_competencies',
      'competencies', 'technologies', 'expertise'
    ];
    return skillsPatterns.some(pattern => section.includes(pattern));
  }
  
  private isEducationSection(section: string): boolean {
    const educationPatterns = [
      'education', 'academic', 'qualification', 'training'
    ];
    return educationPatterns.some(pattern => section.includes(pattern));
  }
  
  private isAchievementsSection(section: string): boolean {
    const achievementPatterns = [
      'achievements', 'accomplishments', 'awards', 'honors',
      'recognition', 'key_achievements', 'key achievements'
    ];
    return achievementPatterns.some(pattern => section.includes(pattern));
  }
  
  private isCustomSection(section: string): boolean {
    // Any section that doesn't match the standard patterns
    return !this.isSummarySection(section) && 
           !this.isExperienceSection(section) && 
           !this.isSkillsSection(section) && 
           !this.isEducationSection(section) && 
           !this.isAchievementsSection(section);
  }
  
  // Specialized application methods
  private applyExperienceRecommendation(cv: ParsedCV, recommendation: CVRecommendation, section: string): boolean {
    if (!cv.experience) return false;
    
    // Check if this is a company-specific experience section
    const companyMatch = section.match(/experience\s*-\s*(.+)/);
    const targetCompany = companyMatch ? companyMatch[1].trim().toLowerCase() : null;
    
    let applied = false;
    
    cv.experience = cv.experience.map(exp => {
      // If targeting a specific company, only apply to that company
      if (targetCompany && !exp.company.toLowerCase().includes(targetCompany)) {
        return exp;
      }
      
      // Apply the recommendation
      if (recommendation.currentContent && recommendation.suggestedContent) {
        // Replace specific content
        if (exp.description && exp.description.includes(recommendation.currentContent)) {
          exp.description = exp.description.replace(
            recommendation.currentContent,
            recommendation.suggestedContent
          );
          applied = true;
        }
      } else if (recommendation.suggestedContent && !recommendation.currentContent) {
        // Add new content if no current content specified
        if (!exp.description) {
          exp.description = recommendation.suggestedContent;
          applied = true;
        } else {
          // Append to existing description
          exp.description += '\n' + recommendation.suggestedContent;
          applied = true;
        }
      }
      
      return exp;
    });
    
    return applied;
  }
  
  private applySkillsRecommendation(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    if (!recommendation.suggestedContent) return false;
    
    // Parse and update skills
    const skillsToAdd = recommendation.suggestedContent
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    if (skillsToAdd.length === 0) return false;
    
    // Handle both skills structures: simple array or object with categories
    if (!cv.skills) {
      cv.skills = [];
    }
    
    if (Array.isArray(cv.skills)) {
      // Simple array format
      const currentSkills = cv.skills as string[];
      const newSkills = skillsToAdd.filter(skill => 
        !currentSkills.some(existing => 
          existing.toLowerCase() === skill.toLowerCase()
        )
      );
      cv.skills = [...currentSkills, ...newSkills];
    } else {
      // Object format with categories
      const skillsObj = cv.skills as { technical: string[]; soft: string[]; languages?: string[]; tools?: string[]; };
      if (!skillsObj.technical) skillsObj.technical = [];
      
      const newSkills = skillsToAdd.filter(skill => 
        !skillsObj.technical?.some(existing => 
          existing.toLowerCase() === skill.toLowerCase()
        )
      );
      skillsObj.technical.push(...newSkills);
    }
    
    return true;
  }
  
  private applyEducationRecommendation(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    if (!cv.education || !recommendation.currentContent || !recommendation.suggestedContent) {
      return false;
    }
    
    let applied = false;
    
    cv.education = cv.education.map(edu => {
      if (edu.description && edu.description.includes(recommendation.currentContent!)) {
        edu.description = edu.description.replace(
          recommendation.currentContent!,
          recommendation.suggestedContent!
        );
        applied = true;
      }
      return edu;
    });
    
    return applied;
  }
  
  private applyAchievementsRecommendation(cv: ParsedCV, recommendation: CVRecommendation): boolean {
    if (!recommendation.suggestedContent) return false;
    
    if (!cv.achievements) {
      cv.achievements = [];
    }
    
    // Parse achievements from suggested content
    const newAchievements = recommendation.suggestedContent
      .split('\n')
      .map(line => line.replace(/^[•\-*]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    // Add unique achievements only
    const uniqueAchievements = newAchievements.filter(achievement => 
      !cv.achievements?.some(existing => 
        existing.toLowerCase() === achievement.toLowerCase()
      )
    );
    
    cv.achievements.push(...uniqueAchievements);
    
    return uniqueAchievements.length > 0;
  }
  
  private applyCustomSectionRecommendation(cv: ParsedCV, recommendation: CVRecommendation, section: string): boolean {
    if (!recommendation.suggestedContent) return false;
    
    if (!cv.customSections) {
      cv.customSections = {};
    }
    
    cv.customSections[recommendation.section] = recommendation.suggestedContent;
    return true;
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

  /**
   * Assess CV complexity to optimize processing strategy
   */
  private getCVComplexity(cv: ParsedCV): 'low' | 'medium' | 'high' {
    const jsonSize = JSON.stringify(cv).length;
    const experienceCount = cv.experience?.length || 0;
    const totalSections = [
      cv.summary, cv.skills, cv.education, cv.experience, 
      cv.achievements, cv.certifications, cv.customSections
    ].filter(Boolean).length;
    
    if (jsonSize > 15000 || experienceCount > 8 || totalSections > 6) {
      return 'high';
    } else if (jsonSize > 8000 || experienceCount > 4 || totalSections > 4) {
      return 'medium';
    }
    return 'low';
  }
  
  /**
   * Build condensed prompt for complex CVs to reduce processing time
   */
  private buildCondensedPrompt(parsedCV: ParsedCV, targetRole?: string, industryKeywords?: string[]): string {
    const roleContext = targetRole ? `\nTarget Role: ${targetRole}` : '';
    const keywordContext = industryKeywords?.length ? `\nKeywords: ${industryKeywords.join(', ')}` : '';
    
    // Create a simplified CV summary for analysis
    const simplifiedCV = {
      summary: parsedCV.summary,
      experience: parsedCV.experience?.slice(0, 3).map(exp => ({
        company: exp.company,
        title: exp.position,
        description: exp.description?.substring(0, 200) + '...'
      })),
      skills: Array.isArray(parsedCV.skills) 
        ? parsedCV.skills.slice(0, 10) 
        : parsedCV.skills,
      education: parsedCV.education?.slice(0, 2)
    };
    
    return `Generate 5-8 high-impact CV improvement recommendations.${roleContext}${keywordContext}

CV Summary:
${JSON.stringify(simplifiedCV, null, 2)}

Focus on:
1. Professional summary enhancement
2. Top experience bullets with metrics
3. Key skills optimization
4. ATS keyword integration

Return JSON only: {"recommendations": [...]} with id, type, category, title, description, section, impact, priority, estimatedScoreImprovement fields.`;
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
        suggestedContent: 'Results-driven professional with proven track record in [INSERT YOUR FIELD]. Experienced in [LIST KEY SKILLS] with demonstrated ability to [DESCRIBE KEY ACHIEVEMENT]. Seeking to leverage expertise in [INSERT TARGET ROLE].',
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
        suggestedContent: 'Led cross-functional team of [INSERT TEAM SIZE], increasing productivity by [ADD PERCENTAGE]% and reducing project delivery time by [INSERT TIMEFRAME]',
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