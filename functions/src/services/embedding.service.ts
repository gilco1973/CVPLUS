/**
 * Embedding service for RAG feature
 */

import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config/environment';
import { CVChunk, ParsedCV } from '../types/enhanced-models';
import { nanoid } from 'nanoid';

export class EmbeddingService {
  private openai: OpenAI;
  private pinecone: Pinecone;
  
  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: config.rag.openaiApiKey,
    });
    
    // Initialize Pinecone
    this.pinecone = new Pinecone({
      apiKey: config.rag.pineconeApiKey!
    });
  }
  
  /**
   * Process CV data into chunks for embedding
   */
  async createCVChunks(parsedCV: ParsedCV, jobId: string): Promise<CVChunk[]> {
    const chunks: CVChunk[] = [];
    
    // Personal Information chunk
    if (parsedCV.personalInfo) {
      const personalChunk: CVChunk = {
        id: nanoid(),
        content: this.formatPersonalInfo(parsedCV.personalInfo),
        metadata: {
          section: 'personal',
          importance: 10,
          keywords: this.extractKeywords(parsedCV.personalInfo)
        }
      };
      chunks.push(personalChunk);
    }
    
    // Experience chunks
    if (parsedCV.experience) {
      parsedCV.experience.forEach((exp, index) => {
        const experienceChunk: CVChunk = {
          id: nanoid(),
          content: this.formatExperience(exp),
          metadata: {
            section: 'experience',
            subsection: exp.company,
            dateRange: {
              start: new Date(exp.startDate),
              end: exp.endDate ? new Date(exp.endDate) : new Date()
            },
            technologies: exp.technologies || [],
            companies: [exp.company],
            importance: 9 - (index * 0.5), // Recent experience is more important
            keywords: this.extractKeywords(exp)
          }
        };
        chunks.push(experienceChunk);
      });
    }
    
    // Education chunks
    if (parsedCV.education) {
      parsedCV.education.forEach((edu) => {
        const educationChunk: CVChunk = {
          id: nanoid(),
          content: this.formatEducation(edu),
          metadata: {
            section: 'education',
            subsection: edu.institution,
            importance: 7,
            keywords: this.extractKeywords(edu)
          }
        };
        chunks.push(educationChunk);
      });
    }
    
    // Skills chunk
    if (parsedCV.skills) {
      const skillsChunk: CVChunk = {
        id: nanoid(),
        content: this.formatSkills(parsedCV.skills),
        metadata: {
          section: 'skills',
          importance: 8,
          keywords: [
            ...(parsedCV.skills.technical || []),
            ...(parsedCV.skills.soft || []),
            ...(parsedCV.skills.tools || [])
          ]
        }
      };
      chunks.push(skillsChunk);
    }
    
    // Projects chunks
    if (parsedCV.projects) {
      parsedCV.projects.forEach((project) => {
        const projectChunk: CVChunk = {
          id: nanoid(),
          content: this.formatProject(project),
          metadata: {
            section: 'projects',
            subsection: project.name,
            technologies: project.technologies,
            importance: 6,
            keywords: this.extractKeywords(project)
          }
        };
        chunks.push(projectChunk);
      });
    }
    
    // Calculate tokens for each chunk
    for (const chunk of chunks) {
      chunk.tokens = this.estimateTokens(chunk.content);
    }
    
    return chunks;
  }
  
  /**
   * Generate embeddings for chunks
   */
  async generateEmbeddings(chunks: CVChunk[]): Promise<CVChunk[]> {
    const chunksWithEmbeddings: CVChunk[] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 20;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await this.batchEmbeddings(batch.map(c => c.content));
      
      batch.forEach((chunk, index) => {
        chunksWithEmbeddings.push({
          ...chunk,
          embedding: embeddings[index]
        });
      });
    }
    
    return chunksWithEmbeddings;
  }
  
  /**
   * Store embeddings in Pinecone
   */
  async storeEmbeddings(
    chunks: CVChunk[], 
    vectorNamespace: string,
    userId: string,
    jobId: string
  ): Promise<void> {
    const index = this.pinecone.index(config.rag.pineconeIndex);
    
    // Prepare vectors for Pinecone
    const vectors = chunks.map(chunk => ({
      id: chunk.id,
      values: chunk.embedding!,
      metadata: {
        ...chunk.metadata,
        content: chunk.content,
        userId,
        jobId,
        chunkId: chunk.id
      }
    }));
    
    // Upsert vectors in batches
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.namespace(vectorNamespace).upsert(batch);
    }
  }
  
  /**
   * Query similar chunks
   */
  async querySimilarChunks(
    query: string,
    vectorNamespace: string,
    topK: number = 5,
    filter?: Record<string, any>
  ): Promise<any[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateSingleEmbedding(query);
    
    const index = this.pinecone.index(config.rag.pineconeIndex);
    
    // Query Pinecone
    const results = await index.namespace(vectorNamespace).query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter
    });
    
    return results.matches || [];
  }
  
  /**
   * Delete embeddings for a job
   */
  async deleteEmbeddings(vectorNamespace: string, jobId: string): Promise<void> {
    const index = this.pinecone.index(config.rag.pineconeIndex);
    
    // Delete all vectors for this job
    await index.namespace(vectorNamespace).deleteMany({
      jobId: { $eq: jobId }
    });
  }
  
  // Helper methods
  
  private async generateSingleEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });
    
    return response.data[0].embedding;
  }
  
  private async batchEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts
    });
    
    return response.data.map(d => d.embedding);
  }
  
  private formatPersonalInfo(info: any): string {
    const parts = [];
    if (info.name) parts.push(`Name: ${info.name}`);
    if (info.summary) parts.push(`Summary: ${info.summary}`);
    if (info.email) parts.push(`Email: ${info.email}`);
    if (info.phone) parts.push(`Phone: ${info.phone}`);
    if (info.linkedin) parts.push(`LinkedIn: ${info.linkedin}`);
    if (info.github) parts.push(`GitHub: ${info.github}`);
    if (info.website) parts.push(`Website: ${info.website}`);
    if (info.address) parts.push(`Location: ${info.address}`);
    
    return parts.join('\n');
  }
  
  private formatExperience(exp: any): string {
    const parts = [
      `Position: ${exp.position} at ${exp.company}`,
      `Duration: ${exp.duration} (${exp.startDate} - ${exp.endDate || 'Present'})`
    ];
    
    if (exp.description) {
      parts.push(`Description: ${exp.description}`);
    }
    
    if (exp.achievements && exp.achievements.length > 0) {
      parts.push(`Achievements:\n${exp.achievements.map((a: string) => `- ${a}`).join('\n')}`);
    }
    
    if (exp.technologies && exp.technologies.length > 0) {
      parts.push(`Technologies: ${exp.technologies.join(', ')}`);
    }
    
    return parts.join('\n');
  }
  
  private formatEducation(edu: any): string {
    const parts = [
      `${edu.degree} in ${edu.field}`,
      `Institution: ${edu.institution}`,
      `Year: ${edu.year}`
    ];
    
    if (edu.gpa) parts.push(`GPA: ${edu.gpa}`);
    if (edu.honors && edu.honors.length > 0) {
      parts.push(`Honors: ${edu.honors.join(', ')}`);
    }
    
    return parts.join('\n');
  }
  
  private formatSkills(skills: any): string {
    const parts = [];
    
    if (skills.technical && skills.technical.length > 0) {
      parts.push(`Technical Skills: ${skills.technical.join(', ')}`);
    }
    
    if (skills.soft && skills.soft.length > 0) {
      parts.push(`Soft Skills: ${skills.soft.join(', ')}`);
    }
    
    if (skills.languages && skills.languages.length > 0) {
      parts.push(`Languages: ${skills.languages.join(', ')}`);
    }
    
    if (skills.tools && skills.tools.length > 0) {
      parts.push(`Tools: ${skills.tools.join(', ')}`);
    }
    
    return parts.join('\n');
  }
  
  private formatProject(project: any): string {
    const parts = [
      `Project: ${project.name}`,
      `Description: ${project.description}`
    ];
    
    if (project.technologies && project.technologies.length > 0) {
      parts.push(`Technologies: ${project.technologies.join(', ')}`);
    }
    
    if (project.url) {
      parts.push(`URL: ${project.url}`);
    }
    
    return parts.join('\n');
  }
  
  private extractKeywords(obj: any): string[] {
    const keywords: string[] = [];
    const text = JSON.stringify(obj).toLowerCase();
    
    // Extract technology keywords
    const techPattern = /(javascript|typescript|python|java|react|angular|vue|node|aws|docker|kubernetes|sql|nosql|mongodb|postgres|redis)/gi;
    const matches = text.match(techPattern);
    if (matches) {
      keywords.push(...matches);
    }
    
    // Extract skill keywords
    const skillPattern = /(leadership|management|communication|problem solving|analytical|creative|teamwork|agile|scrum)/gi;
    const skillMatches = text.match(skillPattern);
    if (skillMatches) {
      keywords.push(...skillMatches);
    }
    
    return [...new Set(keywords)]; // Remove duplicates
  }
  
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

export const embeddingService = new EmbeddingService();