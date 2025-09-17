/**
 * Job-Related Types
 * Type definitions for job postings and career-related data
  */

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  salary?: SalaryRange;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  industry: string;
  skills: string[];
  benefits?: string[];
  postedAt: Date;
  expiresAt?: Date;
  source?: string;
}

export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
  period: 'hourly' | 'daily' | 'monthly' | 'yearly';
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  TEMPORARY = 'temporary',
  INTERNSHIP = 'internship',
  FREELANCE = 'freelance'
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  JUNIOR = 'junior', 
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
  EXECUTIVE = 'executive'
}

export interface JobMatch {
  jobId: string;
  cvId: string;
  overallScore: number;
  skillsMatch: SkillMatchScore;
  experienceMatch: ExperienceMatchScore;
  educationMatch: number;
  recommendations: string[];
  missingSkills: string[];
  strengthAreas: string[];
}

export interface SkillMatchScore {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  additionalSkills: string[];
}

export interface ExperienceMatchScore {
  score: number;
  yearsRequired: number;
  yearsHave: number;
  relevantExperience: string[];
  gaps: string[];
}

export interface CareerPath {
  currentRole: string;
  targetRole: string;
  estimatedTimeframe: string;
  requiredSkills: string[];
  suggestedRoles: string[];
  trainingRecommendations: TrainingRecommendation[];
}

export interface TrainingRecommendation {
  skill: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: string;
  resources: LearningResource[];
}

export interface LearningResource {
  title: string;
  type: 'course' | 'certification' | 'book' | 'article' | 'video';
  provider: string;
  url?: string;
  cost?: number;
  duration?: string;
  rating?: number;
}