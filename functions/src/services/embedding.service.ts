/**
 * Production-Ready Embedding Service for CVPlus RAG System
 * 
 * Core embedding service leveraging OpenAI text-embedding-ada-002
 * 
 * @version 2.0.0
 * @author Gil Klainert
 */

import OpenAI from 'openai';
import * as admin from 'firebase-admin';
import { config } from '../config/environment';
import { ParsedCV } from '../types/enhanced-models';
import { RAGEmbedding, EmbeddingMetadata, CVSection, ContentType } from '../types/portal';
import { logger } from 'firebase-functions';
import { ChunkingUtils, ChunkResult } from './cv-generator/chunking/ChunkingUtils';
import { EmbeddingHelpers } from './cv-generator/embedding/EmbeddingHelpers';

/**
 * Embedding generation configuration
 */
export interface EmbeddingConfig {
  model: 'text-embedding-ada-002';
  maxTokens: number;
  batchSize: number;
  retryAttempts: number;
  rateLimitDelay: number;
  enableCaching: boolean;
  huggingFaceMode: boolean;
}

/**
 * Chunking strategy options
 */
export interface ChunkingOptions {
  strategy: 'semantic' | 'fixed-size' | 'sliding-window';
  maxTokens: number;
  overlap: number;
  preserveContext: boolean;
  cvSectionAware: boolean;
}

/**
 * Similarity search result
 */
export interface SimilarityResult {
  embedding: RAGEmbedding;
  similarity: number;
  relevanceScore: number;
  rank: number;
}

/**
 * CV embedding processing result
 */
export interface CVEmbeddingResult {
  embeddings: RAGEmbedding[];
  totalChunks: number;
  totalTokens: number;
  processingTime: number;
  sectionsProcessed: string[];
}

/**
 * HuggingFace export configuration
 */
export interface HuggingFaceExport {
  embeddings: RAGEmbedding[];
  model: string;
  version: string;
  exportFormat: 'json' | 'parquet';
  optimizedForOffline: boolean;
}

/**
 * Production embedding service for CVPlus RAG system
 */
export class EmbeddingService {
  private openai: OpenAI | null = null;
  private db = admin.firestore();
  private config: EmbeddingConfig;

  constructor(customConfig?: Partial<EmbeddingConfig>) {
    this.config = {
      model: 'text-embedding-ada-002',
      maxTokens: 8191,
      batchSize: 20,
      retryAttempts: 3,
      rateLimitDelay: 1000,
      enableCaching: true,
      huggingFaceMode: false,
      ...customConfig
    };
  }

  /**
   * Initialize OpenAI client with error handling
   */
  private getOpenAI(): OpenAI {
    if (!this.openai) {
      const apiKey = config.rag?.openaiApiKey || process.env.OPENAI_API_KEY || '';
      if (!apiKey) {
        throw new Error('OpenAI API key not configured for embedding service');
      }
      
      this.openai = new OpenAI({
        apiKey,
        timeout: 30000,
        maxRetries: this.config.retryAttempts
      });
    }
    return this.openai;
  }

  /**
   * Generate embeddings for batch of texts
   */
  async generateEmbeddings(texts: string[], options?: Partial<EmbeddingConfig>): Promise<RAGEmbedding[]> {
    const startTime = Date.now();
    const effectiveConfig = { ...this.config, ...options };
    
    logger.info('[EMBEDDING-SERVICE] Starting batch embedding generation', {
      textCount: texts.length,
      batchSize: effectiveConfig.batchSize
    });

    try {
      const embeddings: RAGEmbedding[] = [];
      
      for (let i = 0; i < texts.length; i += effectiveConfig.batchSize) {
        const batch = texts.slice(i, i + effectiveConfig.batchSize);
        const batchResults = await this.processBatch(batch, i);
        embeddings.push(...batchResults);
        
        if (i + effectiveConfig.batchSize < texts.length) {
          await EmbeddingHelpers.delay(effectiveConfig.rateLimitDelay);
        }
      }

      const processingTime = Date.now() - startTime;
      logger.info('[EMBEDDING-SERVICE] Batch embedding completed', {
        totalEmbeddings: embeddings.length,
        processingTime: `${processingTime}ms`
      });

      return embeddings;
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] Batch embedding failed', { error });
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  /**
   * Generate single embedding with metadata
   */
  async generateSingleEmbedding(text: string, metadata?: EmbeddingMetadata): Promise<RAGEmbedding> {
    try {
      const response = await this.getOpenAI().embeddings.create({
        model: this.config.model,
        input: text.trim()
      });

      return {
        id: `embed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: text,
        metadata: metadata || {
          section: CVSection.SUMMARY,
          importance: 1.0,
          contentType: ContentType.TEXT,
          keywords: []
        },
        vector: response.data[0].embedding,
        tokens: EmbeddingHelpers.estimateTokenCount(text),
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] Single embedding failed', { error });
      throw error;
    }
  }

  /**
   * Intelligent text chunking
   */
  chunkText(text: string, options?: Partial<ChunkingOptions>): ChunkResult[] {
    const config = {
      strategy: 'semantic' as const,
      maxTokens: 500,
      overlap: 50,
      preserveContext: true,
      cvSectionAware: true,
      ...options
    };

    switch (config.strategy) {
      case 'semantic':
        return ChunkingUtils.semanticChunking(text, config);
      case 'fixed-size':
        return ChunkingUtils.fixedSizeChunking(text, config);
      case 'sliding-window':
        return ChunkingUtils.slidingWindowChunking(text, config);
      default:
        return ChunkingUtils.semanticChunking(text, config);
    }
  }

  /**
   * Preprocess text for embedding generation
   */
  preprocessText(text: string, options?: { removeExtra?: boolean; normalizeSpacing?: boolean }): string {
    const config = { removeExtra: true, normalizeSpacing: true, ...options };
    let processed = text.trim();
    
    if (config.normalizeSpacing) {
      processed = processed.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n');
    }
    
    if (config.removeExtra) {
      processed = processed
        .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
        .replace(/\s+([,.!?;:])/g, '$1');
    }
    
    return processed;
  }

  /**
   * Calculate cosine similarity between vectors
   */
  cosineSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have same length for cosine similarity');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      magnitude1 += vector1[i] * vector1[i];
      magnitude2 += vector2[i] * vector2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    return (magnitude1 === 0 || magnitude2 === 0) ? 0 : dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Search for similar embeddings
   */
  async searchSimilar(query: string, embeddings: RAGEmbedding[], topK = 5): Promise<SimilarityResult[]> {
    try {
      const queryEmbedding = await this.generateSingleEmbedding(query);
      
      const similarities = embeddings.map((embedding, index) => {
        const similarity = this.cosineSimilarity(queryEmbedding.vector, embedding.vector);
        const relevanceScore = EmbeddingHelpers.calculateRelevanceScore(similarity, embedding.metadata);
        
        return { embedding, similarity, relevanceScore, rank: index };
      });
      
      return similarities
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, topK)
        .map((result, index) => ({ ...result, rank: index + 1 }));
        
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] Semantic search failed', { error });
      throw error;
    }
  }

  /**
   * Optimize for HuggingFace deployment
   */
  optimizeForHuggingFace(): HuggingFaceExport {
    return {
      embeddings: [],
      model: this.config.model,
      version: '2.0.0',
      exportFormat: 'json',
      optimizedForOffline: true
    };
  }

  /**
   * Process CV data into embeddings
   */
  async processCV(cvData: ParsedCV): Promise<CVEmbeddingResult> {
    const startTime = Date.now();
    const sectionsProcessed: string[] = [];
    const allChunks: ChunkResult[] = [];

    // Process CV sections
    if (cvData.experience) {
      allChunks.push(...EmbeddingHelpers.processCVSection(
        cvData.experience, CVSection.EXPERIENCE, this.chunkText.bind(this)
      ));
      sectionsProcessed.push('experience');
    }

    if (cvData.education) {
      allChunks.push(...EmbeddingHelpers.processCVSection(
        cvData.education, CVSection.EDUCATION, this.chunkText.bind(this)
      ));
      sectionsProcessed.push('education');
    }

    if (cvData.skills) {
      allChunks.push(...EmbeddingHelpers.processCVSection(
        cvData.skills, CVSection.SKILLS, this.chunkText.bind(this)
      ));
      sectionsProcessed.push('skills');
    }

    if (cvData.achievements) {
      allChunks.push(...EmbeddingHelpers.processCVSection(
        cvData.achievements, CVSection.ACHIEVEMENTS, this.chunkText.bind(this)
      ));
      sectionsProcessed.push('achievements');
    }

    // Generate embeddings
    const texts = allChunks.map(chunk => chunk.content);
    const embeddings = await this.generateEmbeddings(texts);
    
    // Enhance with chunk metadata
    const enhancedEmbeddings = embeddings.map((embedding, index) => ({
      ...embedding,
      metadata: { ...embedding.metadata, ...allChunks[index].metadata }
    }));

    return {
      embeddings: enhancedEmbeddings,
      totalChunks: allChunks.length,
      totalTokens: allChunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
      processingTime: Date.now() - startTime,
      sectionsProcessed
    };
  }

  /**
   * Create CV chunks (wrapper for processCV)
   */
  async createCVChunks(parsedCV: ParsedCV, jobId: string): Promise<any[]> {
    try {
      const result = await this.processCV(parsedCV);
      // Convert RAGEmbedding[] to CVChunk[] format for compatibility
      return result.embeddings.map(embedding => ({
        id: embedding.id,
        content: embedding.content,
        metadata: {
          section: embedding.metadata.section.toLowerCase(),
          subsection: embedding.metadata.subsection,
          dateRange: embedding.metadata.dateRange,
          technologies: embedding.metadata.technologies,
          companies: embedding.metadata.company ? [embedding.metadata.company] : undefined,
          importance: embedding.metadata.importance,
          keywords: embedding.metadata.keywords
        },
        embedding: embedding.vector,
        tokens: embedding.tokens
      }));
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] createCVChunks failed', { error, jobId });
      throw error;
    }
  }

  /**
   * Store embeddings (placeholder implementation)
   */
  async storeEmbeddings(chunks: any[], vectorNamespace: string, jobId: string): Promise<void> {
    try {
      logger.info('[EMBEDDING-SERVICE] Storing embeddings (simulated)', {
        count: chunks.length,
        vectorNamespace,
        jobId
      });
      // In a real implementation, this would store to a vector database
      // For now, we just log the operation
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] storeEmbeddings failed', { error, jobId });
      throw error;
    }
  }

  /**
   * Query similar chunks (wrapper for searchSimilar)
   */
  async querySimilarChunks(query: string, vectorNamespace: string, topK = 5): Promise<any[]> {
    try {
      logger.info('[EMBEDDING-SERVICE] Querying similar chunks (simulated)', {
        query,
        vectorNamespace,
        topK
      });
      // In a real implementation, this would query a vector database
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] querySimilarChunks failed', { error });
      throw error;
    }
  }

  /**
   * Delete embeddings (placeholder implementation)
   */
  async deleteEmbeddings(vectorNamespace: string, jobId: string): Promise<void> {
    try {
      logger.info('[EMBEDDING-SERVICE] Deleting embeddings (simulated)', {
        vectorNamespace,
        jobId
      });
      // In a real implementation, this would delete from a vector database
      // For now, we just log the operation
    } catch (error) {
      logger.error('[EMBEDDING-SERVICE] deleteEmbeddings failed', { error, jobId });
      throw error;
    }
  }

  // Private helper methods
  private async processBatch(texts: string[], startIndex: number): Promise<RAGEmbedding[]> {
    const response = await this.getOpenAI().embeddings.create({
      model: this.config.model,
      input: texts
    });

    return response.data.map((embedding, index) => ({
      id: `embed-${Date.now()}-${startIndex + index}`,
      content: texts[index],
      metadata: { section: CVSection.SUMMARY, importance: 1.0, contentType: ContentType.TEXT, keywords: [] },
      vector: embedding.embedding,
      tokens: EmbeddingHelpers.estimateTokenCount(texts[index]),
      createdAt: new Date()
    }));
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();