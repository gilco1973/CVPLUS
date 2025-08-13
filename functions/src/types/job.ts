/**
 * Job type definitions (keeping existing structure)
 */

export interface Job {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'analyzed' | 'generating' | 'completed' | 'failed';
  fileUrl?: string;
  mimeType?: string;
  isUrl?: boolean;
  parsedData?: ParsedCV;
  generatedCV?: {
    html: string;
    htmlUrl?: string;
    pdfUrl?: string;
    docxUrl?: string;
    features?: string[];
  };
  selectedTemplate?: string;
  selectedFeatures?: string[];
  error?: string;
  createdAt: any;
  updatedAt: any;
  quickCreate?: boolean;
  userInstructions?: string;
  piiDetection?: {
    hasPII: boolean;
    detectedTypes: string[];
    recommendations: string[];
  };
}

export interface ParsedCV {
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    summary?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  experience?: Array<{
    company: string;
    position: string;
    duration: string;
    startDate: string;
    endDate?: string;
    description?: string;
    achievements?: string[];
    technologies?: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field: string;
    year: string;
    gpa?: string;
    honors?: string[];
    description?: string;
  }>;
  skills?: string[] | {
    technical: string[];
    soft: string[];
    languages?: string[];
    tools?: string[];
  };
  achievements?: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
    credentialId?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;
  publications?: Array<{
    title: string;
    publication: string;
    date: string;
    url?: string;
  }>;
  interests?: string[];
  summary?: string; // Top-level summary field
  customSections?: { [sectionName: string]: string }; // For custom sections
}
// CV Improvement Types
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

