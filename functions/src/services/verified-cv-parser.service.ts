import { cvParsingWrapper } from './llm-integration-wrapper.service';
import { llmSecurityMonitor } from './llm-security-monitor.service';
import { ParsedCV } from './cvParser';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import axios from 'axios';

/**
 * Verified CV Parser Service
 * 
 * This service demonstrates how to integrate the LLM verification system
 * with existing CV parsing functionality while maintaining backward compatibility.
 * 
 * Features:
 * - Automatic LLM verification for all Claude responses
 * - Security monitoring and threat detection
 * - Comprehensive audit logging
 * - Fallback mechanisms for verification failures
 * - Performance optimization
 */

export interface VerifiedParsingResult {
  parsedCV: ParsedCV;
  verificationDetails: {
    verified: boolean;
    score: number;
    confidence: number;
    issues: Array<{
      category: string;
      severity: string;
      description: string;
    }>;
  };
  auditInfo: {
    auditId: string;
    processingTime: number;
    retryCount: number;
    securityEventIds: string[];
  };
  fallbackUsed?: boolean;
  warnings?: string[];
}

export class VerifiedCVParserService {
  constructor(private apiKey: string) {
    // Validate API key format (basic check)
    if (!apiKey || apiKey.length < 10) {
      throw new Error('Valid Anthropic API key is required');
    }
  }

  /**
   * Main CV parsing method with integrated verification
   */
  async parseCV(
    fileBuffer: Buffer, 
    mimeType: string, 
    userInstructions?: string,
    context?: {
      userId?: string;
      sessionId?: string;
      sourceIP?: string;
      userAgent?: string;
      fileName?: string;
    }
  ): Promise<VerifiedParsingResult> {
    const startTime = Date.now();
    const securityEventIds: string[] = [];
    const warnings: string[] = [];

    try {
      // Security checks
      await this.performSecurityChecks(fileBuffer, mimeType, context);

      // Extract text from file
      const extractedText = await this.extractTextFromFile(fileBuffer, mimeType);
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the file');
      }

      // Security check for extracted text
      const textSecurityCheck = await this.checkTextSecurity(extractedText, context);
      if (textSecurityCheck.eventId) {
        securityEventIds.push(textSecurityCheck.eventId);
      }

      // Perform verified CV parsing
      const parsingResult = await cvParsingWrapper.parseCV(
        extractedText,
        userInstructions,
        {
          fileName: context?.fileName,
          mimeType,
          extractedTextLength: extractedText.length,
          userId: context?.userId,
          sessionId: context?.sessionId
        }
      );

      // Validate parsing result structure
      const structuralValidation = this.validateParsedCVStructure(parsingResult.content);
      if (!structuralValidation.valid) {
        warnings.push(...structuralValidation.warnings);
        
        // Log structural issues
        const eventId = await llmSecurityMonitor.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'medium',
          service: 'cv-parsing',
          userId: context?.userId,
          sessionId: context?.sessionId,
          sourceIP: context?.sourceIP,
          details: {
            issue: 'structural_validation_failed',
            warnings: structuralValidation.warnings,
            originalResponse: this.sanitizeForLogging(parsingResult.content)
          }
        });
        securityEventIds.push(eventId);
      }

      // Parse the JSON response
      let parsedCV: ParsedCV;
      try {
        parsedCV = JSON.parse(parsingResult.content);
      } catch (jsonError) {
        // If JSON parsing fails, try to extract and fix common issues
        const fixedContent = this.attemptJSONFix(parsingResult.content);
        try {
          parsedCV = JSON.parse(fixedContent);
          warnings.push('JSON structure was automatically corrected');
        } catch {
          throw new Error('Unable to parse CV response as valid JSON');
        }
      }

      // Additional data validation
      const dataValidation = this.validateExtractedData(parsedCV);
      if (!dataValidation.valid) {
        warnings.push(...dataValidation.warnings);
      }

      // Log successful parsing
      await this.logParsingSuccess(parsedCV, context);

      return {
        parsedCV,
        verificationDetails: {
          verified: parsingResult.verified || false,
          score: parsingResult.verificationScore || 0,
          confidence: 1.0, // Would come from verification details
          issues: [] // Would come from verification details
        },
        auditInfo: {
          auditId: parsingResult.auditId || 'none',
          processingTime: Date.now() - startTime,
          retryCount: 0, // Would come from verification system
          securityEventIds
        },
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      // Log parsing failure
      const eventId = await llmSecurityMonitor.logSecurityEvent({
        type: 'verification_failure',
        severity: 'medium',
        service: 'cv-parsing',
        userId: context?.userId,
        sessionId: context?.sessionId,
        sourceIP: context?.sourceIP,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          fileType: mimeType,
          hasUserInstructions: !!userInstructions,
          processingTime: Date.now() - startTime
        }
      });
      securityEventIds.push(eventId);

      // Attempt fallback parsing if available
      const fallbackResult = await this.attemptFallbackParsing(fileBuffer, mimeType, context);
      if (fallbackResult) {
        return {
          ...fallbackResult,
          fallbackUsed: true,
          auditInfo: {
            auditId: 'fallback',
            processingTime: Date.now() - startTime,
            retryCount: 0,
            securityEventIds
          },
          warnings: ['Primary parsing failed, fallback method used', ...(warnings || [])]
        };
      }

      throw error;
    }
  }

  /**
   * Parse CV from URL with verification
   */
  async parseCVFromURL(
    url: string,
    userInstructions?: string,
    context?: {
      userId?: string;
      sessionId?: string;
      sourceIP?: string;
      userAgent?: string;
    }
  ): Promise<VerifiedParsingResult> {
    // Validate URL security
    if (!this.isURLSafe(url)) {
      throw new Error('URL appears to be unsafe or blocked');
    }

    try {
      // Extract text from URL
      const extractedText = await this.extractFromURL(url);
      
      // Use the main parsing method
      return await this.parseCV(
        Buffer.from(extractedText),
        'text/plain',
        userInstructions,
        { ...context, fileName: url }
      );

    } catch (error) {
      const eventId = await llmSecurityMonitor.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        service: 'cv-parsing',
        userId: context?.userId,
        sourceIP: context?.sourceIP,
        details: {
          action: 'url_parsing_failed',
          url: this.sanitizeURL(url),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  /**
   * Security checks before processing
   */
  private async performSecurityChecks(
    fileBuffer: Buffer,
    mimeType: string,
    context?: any
  ): Promise<void> {
    // Check file size
    if (fileBuffer.length > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size exceeds maximum allowed limit');
    }

    // Check MIME type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!allowedTypes.includes(mimeType)) {
      const eventId = await llmSecurityMonitor.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        service: 'cv-parsing',
        userId: context?.userId,
        sourceIP: context?.sourceIP,
        details: {
          action: 'invalid_mime_type',
          mimeType,
          fileSize: fileBuffer.length
        }
      });
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Basic malware check (simplified)
    if (this.containsSuspiciousPatterns(fileBuffer)) {
      const eventId = await llmSecurityMonitor.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        service: 'cv-parsing',
        userId: context?.userId,
        sourceIP: context?.sourceIP,
        details: {
          action: 'suspicious_file_content',
          mimeType,
          fileSize: fileBuffer.length
        }
      });
      throw new Error('File contains suspicious content');
    }
  }

  /**
   * Check text content for security issues
   */
  private async checkTextSecurity(
    text: string,
    context?: any
  ): Promise<{ eventId?: string; issues: string[] }> {
    const issues: string[] = [];

    // Check for potential injection attempts
    const injectionPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(text)) {
        issues.push('Potential script injection detected');
        
        const eventId = await llmSecurityMonitor.logSecurityEvent({
          type: 'injection_attempt',
          severity: 'high',
          service: 'cv-parsing',
          userId: context?.userId,
          sourceIP: context?.sourceIP,
          details: {
            pattern: pattern.toString(),
            textLength: text.length,
            suspiciousContent: text.substring(0, 200) + '...'
          }
        });
        
        return { eventId, issues };
      }
    }

    return { issues };
  }

  /**
   * Extract text from different file types
   */
  private async extractTextFromFile(buffer: Buffer, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'application/pdf':
        return await this.extractFromPDF(buffer);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        return await this.extractFromDOCX(buffer);
      case 'text/plain':
        return buffer.toString('utf-8');
      default:
        throw new Error(`Unsupported file type for text extraction: ${mimeType}`);
    }
  }

  private async extractFromPDF(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      throw new Error(`Failed to extract text from PDF: ${error}`);
    }
  }

  private async extractFromDOCX(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error(`Failed to extract text from DOCX: ${error}`);
    }
  }

  private async extractFromURL(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
        headers: {
          'User-Agent': 'CVPlus-Parser/1.0'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch content from URL: ${error}`);
    }
  }

  /**
   * Validate parsed CV structure
   */
  private validateParsedCVStructure(content: string): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    try {
      const parsed = JSON.parse(content);
      
      // Check for required top-level properties
      const requiredProperties = ['personalInfo', 'workExperience', 'education', 'skills'];
      for (const prop of requiredProperties) {
        if (!parsed[prop]) {
          warnings.push(`Missing required property: ${prop}`);
        }
      }

      // Check personal info structure
      if (parsed.personalInfo && typeof parsed.personalInfo !== 'object') {
        warnings.push('personalInfo should be an object');
      }

      // Check work experience structure
      if (parsed.workExperience && !Array.isArray(parsed.workExperience)) {
        warnings.push('workExperience should be an array');
      }

      return {
        valid: warnings.length === 0,
        warnings
      };
    } catch {
      return {
        valid: false,
        warnings: ['Content is not valid JSON']
      };
    }
  }

  /**
   * Validate extracted data quality
   */
  private validateExtractedData(parsedCV: ParsedCV): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check if essential fields are populated
    if (!parsedCV.personalInfo?.name) {
      warnings.push('No name found in personal information');
    }

    if (!parsedCV.personalInfo?.email && !parsedCV.personalInfo?.phone) {
      warnings.push('No contact information found');
    }

    if (!parsedCV.workExperience || parsedCV.workExperience.length === 0) {
      warnings.push('No work experience found');
    }

    if (!parsedCV.skills || Object.keys(parsedCV.skills).length === 0) {
      warnings.push('No skills information found');
    }

    return {
      valid: warnings.length < 3, // Allow up to 2 warnings
      warnings
    };
  }

  /**
   * Attempt to fix common JSON issues
   */
  private attemptJSONFix(content: string): string {
    let fixed = content;

    // Remove common markdown formatting that might break JSON
    fixed = fixed.replace(/```json\s*/g, '');
    fixed = fixed.replace(/```\s*$/g, '');

    // Fix trailing commas
    fixed = fixed.replace(/,\s*}/g, '}');
    fixed = fixed.replace(/,\s*]/g, ']');

    // Ensure proper string escaping
    fixed = fixed.replace(/([^\\])"/g, '$1\\"');

    return fixed;
  }

  /**
   * Fallback parsing when main system fails
   */
  private async attemptFallbackParsing(
    fileBuffer: Buffer,
    mimeType: string,
    context?: any
  ): Promise<VerifiedParsingResult | null> {
    try {
      // Extract text again
      const text = await this.extractTextFromFile(fileBuffer, mimeType);
      
      // Use simple pattern matching as fallback
      const fallbackCV = this.parseWithPatternMatching(text);
      
      return {
        parsedCV: fallbackCV,
        verificationDetails: {
          verified: false,
          score: 0,
          confidence: 0.3, // Low confidence for fallback
          issues: [{
            category: 'system',
            severity: 'medium',
            description: 'Using fallback parsing method'
          }]
        },
        auditInfo: {
          auditId: 'fallback',
          processingTime: 100,
          retryCount: 0,
          securityEventIds: []
        },
        fallbackUsed: true
      };

    } catch (fallbackError) {
      console.error('Fallback parsing also failed:', fallbackError);
      return null;
    }
  }

  /**
   * Simple pattern matching for fallback
   */
  private parseWithPatternMatching(text: string): ParsedCV {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Basic pattern matching (simplified)
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = text.match(/[\+]?[\d\s\-\(\)]{10,}/);
    
    return {
      personalInfo: {
        name: lines[0] || 'Unknown',
        email: emailMatch ? emailMatch[0] : '',
        phone: phoneMatch ? phoneMatch[0] : '',
        address: '',
        linkedin: '',
        website: '',
        summary: ''
      },
      workExperience: [],
      education: [],
      skills: {
        technical: [],
        soft: [],
        languages: [],
        certifications: []
      },
      projects: [],
      achievements: [],
      volunteer: []
    };
  }

  /**
   * Utility methods
   */
  private containsSuspiciousPatterns(buffer: Buffer): boolean {
    const content = buffer.toString('utf-8', 0, Math.min(1024, buffer.length));
    const suspiciousPatterns = [
      /%PDF-.*?\/JavaScript/s,
      /eval\(/,
      /document\.write/,
      /<script/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  private isURLSafe(url: string): boolean {
    try {
      const parsed = new URL(url);
      
      // Block private/local addresses
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === 'localhost' || 
          hostname.startsWith('127.') || 
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        return false;
      }

      // Only allow HTTP/HTTPS
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  private sanitizeURL(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
    } catch {
      return 'invalid-url';
    }
  }

  private sanitizeForLogging(content: string): string {
    // Remove potential PII from logs
    let sanitized = content;
    sanitized = sanitized.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '[EMAIL]');
    sanitized = sanitized.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN]');
    sanitized = sanitized.replace(/\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[PHONE]');
    
    return sanitized.substring(0, 500); // Limit length
  }

  private async logParsingSuccess(parsedCV: ParsedCV, context?: any): Promise<void> {
    await llmSecurityMonitor.logSecurityEvent({
      type: 'suspicious_activity', // Using this type for general activity
      severity: 'low',
      service: 'cv-parsing',
      userId: context?.userId,
      sessionId: context?.sessionId,
      sourceIP: context?.sourceIP,
      details: {
        action: 'parsing_success',
        hasName: !!parsedCV.personalInfo?.name,
        hasEmail: !!parsedCV.personalInfo?.email,
        workExperienceCount: parsedCV.workExperience?.length || 0,
        educationCount: parsedCV.education?.length || 0,
        skillsCount: Object.keys(parsedCV.skills || {}).length
      }
    });
  }
}

// Factory function for easy integration
export function createVerifiedCVParser(apiKey: string): VerifiedCVParserService {
  return new VerifiedCVParserService(apiKey);
}

// Export default instance
export const verifiedCVParser = new VerifiedCVParserService(process.env.ANTHROPIC_API_KEY || '');