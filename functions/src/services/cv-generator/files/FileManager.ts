import * as admin from 'firebase-admin';
import { FileGenerationResult, EnhancedFileGenerationResult } from '../types';

/**
 * File management service for CV generation
 * Handles saving HTML, PDF, and DOCX files to Firebase Storage
 */
export class FileManager {
  private _bucket?: any;
  
  /**
   * Get Firebase Storage bucket (lazy initialization)
   */
  private getBucket() {
    if (!this._bucket) {
      this._bucket = admin.storage().bucket();
    }
    return this._bucket;
  }

  /**
   * Save generated CV files to Firebase Storage with comprehensive error handling
   */
  async saveGeneratedFiles(
    jobId: string,
    userId: string,
    htmlContent: string
  ): Promise<EnhancedFileGenerationResult> {
    console.log(`💾 [FILE-MGR] Starting file generation for job ${jobId}`);
    
    let htmlUrl = '';
    let pdfUrl = '';
    let docxUrl = '';
    const errors: string[] = [];
    
    try {
      // Save HTML file first (critical - must succeed)
      console.log('🌐 [FILE-MGR] Saving HTML file...');
      htmlUrl = await this.saveHtmlFile(userId, jobId, htmlContent);
      console.log('✅ [FILE-MGR] HTML file saved successfully');
      
    } catch (htmlError: any) {
      console.error('❌ [FILE-MGR] Critical: HTML file save failed:', htmlError);
      errors.push(`HTML save failed: ${htmlError.message}`);
      throw new Error(`Critical failure: Could not save HTML file: ${htmlError.message}`);
    }
    
    // Generate and save PDF (non-critical - continue if it fails)
    try {
      console.log('📏 [FILE-MGR] Generating PDF file...');
      pdfUrl = await this.generateAndSavePdf(userId, jobId, htmlContent);
      if (pdfUrl) {
        console.log('✅ [FILE-MGR] PDF file generated successfully');
      } else {
        console.warn('⚠️ [FILE-MGR] PDF generation returned empty URL');
        errors.push('PDF generation returned empty URL');
      }
    } catch (pdfError: any) {
      console.error('⚠️ [FILE-MGR] PDF generation failed (non-critical):', pdfError);
      errors.push(`PDF generation failed: ${pdfError.message}`);
      // Don't throw - PDF failure shouldn't break the entire process
    }
    
    // DOCX generation placeholder - to be implemented
    try {
      console.log('📄 [FILE-MGR] DOCX generation skipped (not implemented)');
      docxUrl = '';
    } catch (docxError: any) {
      console.error('⚠️ [FILE-MGR] DOCX generation failed:', docxError);
      errors.push(`DOCX generation failed: ${docxError.message}`);
    }
    
    // Log summary of file generation
    const successCount = [htmlUrl, pdfUrl, docxUrl].filter(Boolean).length;
    console.log(`📁 [FILE-MGR] File generation completed: ${successCount}/3 files generated`);
    
    if (errors.length > 0) {
      console.warn(`⚠️ [FILE-MGR] File generation completed with ${errors.length} errors:`, errors);
    }
    
    return { 
      pdfUrl, 
      docxUrl, 
      htmlUrl,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Save HTML content to Firebase Storage
   */
  private async saveHtmlFile(userId: string, jobId: string, htmlContent: string): Promise<string> {
    const htmlFileName = `users/${userId}/generated/${jobId}/cv.html`;
    const htmlFile = this.getBucket().file(htmlFileName);
    
    await htmlFile.save(htmlContent, {
      metadata: {
        contentType: 'text/html',
        cacheControl: 'public, max-age=31536000'
      },
    });
    
    // Check if we're in emulator environment
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
    let htmlUrl: string;
    
    if (isEmulator) {
      // Use emulator URL format
      htmlUrl = `http://localhost:9199/v0/b/${this.getBucket().name}/o/${encodeURIComponent(htmlFileName)}?alt=media`;
    } else {
      // Use signed URL for production
      const [signedUrl] = await htmlFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });
      htmlUrl = signedUrl;
    }
    
    console.log(`HTML file saved successfully: ${htmlFileName}`);
    return htmlUrl;
  }

  /**
   * Generate PDF and save to Firebase Storage with comprehensive error handling and timeout protection
   */
  private async generateAndSavePdf(userId: string, jobId: string, htmlContent: string): Promise<string> {
    let browser: any = null;
    const startTime = Date.now();
    
    try {
      console.log('🚀 [PDF-GEN] Starting PDF generation process...');
      
      // Check if Puppeteer is available
      let puppeteer: any;
      try {
        puppeteer = require('puppeteer');
        console.log('✅ [PDF-GEN] Puppeteer module loaded successfully');
      } catch (requireError) {
        console.error('❌ [PDF-GEN] Puppeteer not available:', requireError);
        throw new Error('Puppeteer dependency not available for PDF generation');
      }
      
      // Launch browser with comprehensive settings and timeout protection
      console.log('🌐 [PDF-GEN] Launching headless browser...');
      browser = await Promise.race([
        puppeteer.launch({ 
          headless: true,
          args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--run-all-compositor-stages-before-draw',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows'
          ],
          timeout: 30000 // 30 second timeout for browser launch
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Browser launch timed out after 30 seconds')), 30000);
        })
      ]);
      
      console.log('✅ [PDF-GEN] Browser launched successfully');
      
      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 794, height: 1123 }); // A4 size in pixels
      console.log('📱 [PDF-GEN] Viewport set to A4 dimensions');
      
      // Create PDF-optimized HTML content
      console.log('⚙️ [PDF-GEN] Optimizing HTML content for PDF...');
      const pdfOptimizedHtml = this.optimizeHtmlForPdf(htmlContent);
      console.log(`✅ [PDF-GEN] HTML optimized (${pdfOptimizedHtml.length} characters)`);
      
      // Set content and wait for resources with timeout protection
      console.log('📝 [PDF-GEN] Loading content into browser...');
      await Promise.race([
        page.setContent(pdfOptimizedHtml, { 
          waitUntil: ['networkidle0', 'domcontentloaded'],
          timeout: 45000
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Content loading timed out after 45 seconds')), 45000);
        })
      ]);
      
      console.log('✅ [PDF-GEN] Content loaded successfully');
      
      // Generate PDF with proper settings and timeout protection
      console.log('📏 [PDF-GEN] Generating PDF from content...');
      const pdfBuffer = await Promise.race([
        page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          },
          displayHeaderFooter: false,
          preferCSSPageSize: true,
          timeout: 60000 // 60 second timeout for PDF generation
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('PDF generation timed out after 60 seconds')), 60000);
        })
      ]);
      
      console.log(`✅ [PDF-GEN] PDF buffer created (${pdfBuffer.length} bytes)`);
      
      // Close browser as soon as possible to free resources
      await browser.close();
      browser = null;
      console.log('🔄 [PDF-GEN] Browser closed successfully');
      
      // Save PDF to Firebase Storage
      console.log('💾 [PDF-GEN] Saving PDF to Firebase Storage...');
      const pdfFileName = `users/${userId}/generated/${jobId}/cv.pdf`;
      const pdfFile = this.getBucket().file(pdfFileName);
      
      await pdfFile.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          cacheControl: 'public, max-age=31536000'
        },
      });
      
      console.log('✅ [PDF-GEN] PDF saved to storage successfully');
      
      // Generate signed URL
      console.log('🔗 [PDF-GEN] Generating signed URL...');
      const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
      let pdfSignedUrl: string;
      
      if (isEmulator) {
        // Use emulator URL format
        pdfSignedUrl = `http://localhost:9199/v0/b/${this.getBucket().name}/o/${encodeURIComponent(pdfFileName)}?alt=media`;
        console.log('💻 [PDF-GEN] Using emulator URL format');
      } else {
        // Use signed URL for production
        const [signedUrl] = await pdfFile.getSignedUrl({
          action: 'read',
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        });
        pdfSignedUrl = signedUrl;
        console.log('🌍 [PDF-GEN] Generated production signed URL');
      }
      
      const totalTime = Date.now() - startTime;
      console.log(`🎉 [PDF-GEN] PDF generation completed successfully in ${totalTime}ms: ${pdfFileName}`);
      return pdfSignedUrl;
      
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [PDF-GEN] PDF generation failed after ${totalTime}ms:`, error.message);
      
      // Ensure browser is closed even in error cases
      if (browser) {
        try {
          await browser.close();
          console.log('🔄 [PDF-GEN] Browser closed after error');
        } catch (closeError) {
          console.error('⚠️ [PDF-GEN] Failed to close browser:', closeError);
        }
      }
      
      // Log error details for debugging
      if (error.message.includes('timeout')) {
        console.error('⏰ [PDF-GEN] Timeout error - consider increasing timeout or reducing complexity');
      } else if (error.message.includes('memory') || error.message.includes('heap')) {
        console.error('🧠 [PDF-GEN] Memory error - consider increasing function memory or optimizing HTML');
      } else if (error.message.includes('puppeteer') || error.message.includes('browser')) {
        console.error('🌐 [PDF-GEN] Browser/Puppeteer error - check dependencies and system resources');
      }
      
      // Return empty string to indicate failure (don't throw to allow graceful degradation)
      return '';
    }
  }

  /**
   * Optimize HTML content for PDF generation
   * Converts interactive elements to static PDF-friendly versions
   */
  private optimizeHtmlForPdf(htmlContent: string): string {
    let optimizedHtml = htmlContent;
    
    // Remove or modify interactive elements that don't work in PDF
    optimizedHtml = optimizedHtml.replace(
      /<audio[^>]*>.*?<\/audio>/g, 
      '<div style="background: #f0f0f0; padding: 10px; border-radius: 5px; text-align: center; color: #666;">🎧 Audio content available in online version</div>'
    );
    
    optimizedHtml = optimizedHtml.replace(
      /<video[^>]*>.*?<\/video>/g, 
      '<div style="background: #f0f0f0; padding: 10px; border-radius: 5px; text-align: center; color: #666;">🎬 Video content available in online version</div>'
    );
    
    // Convert buttons to static text where appropriate
    optimizedHtml = optimizedHtml.replace(
      /<button[^>]*onclick="[^"]*"[^>]*>([^<]+)<\/button>/g, 
      '<span style="display: inline-block; padding: 8px 16px; background: #e0e0e0; border-radius: 4px; color: #333;">$1</span>'
    );
    
    // Remove scripts that might interfere with PDF generation
    optimizedHtml = optimizedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Add PDF-specific styles
    const pdfStyles = `
      <style>
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .container {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .no-print {
            display: none !important;
          }
          
          /* Ensure proper layout for PDF */
          .qr-code {
            position: static !important;
            float: right !important;
            margin: 10px !important;
          }
          
          /* Hide download buttons in PDF */
          .download-section, .download-btn {
            display: none !important;
          }
        }
      </style>
    `;
    
    // Insert PDF styles before closing head tag
    optimizedHtml = optimizedHtml.replace(
      '</head>', 
      pdfStyles + '</head>'
    );
    
    // Add PDF notice
    optimizedHtml = optimizedHtml.replace(
      '<body>',
      `<body>
        <div style="background: #f9f9f9; padding: 10px; text-align: center; border-bottom: 1px solid #ddd; font-size: 12px; color: #666; margin-bottom: 20px;">
        <strong>📄 PDF Version Notice:</strong> 
        This PDF contains static content. For interactive features (podcast, forms, animations), 
        please visit the online version.
        </div>`
    );
    
    return optimizedHtml;
  }


  /**
   * Delete generated files for a job
   */
  async deleteGeneratedFiles(userId: string, jobId: string): Promise<void> {
    try {
      const filePaths = [
        `users/${userId}/generated/${jobId}/cv.html`,
        `users/${userId}/generated/${jobId}/cv.pdf`,
        `users/${userId}/generated/${jobId}/cv.docx`
      ];
      
      for (const filePath of filePaths) {
        try {
          await this.getBucket().file(filePath).delete();
          console.log(`Deleted file: ${filePath}`);
        } catch (error: any) {
          // File might not exist, continue with others
          console.log(`Could not delete file ${filePath}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error deleting generated files:', error);
      // Don't throw error for cleanup operations
    }
  }

  /**
   * Check if files exist for a job
   */
  async checkFilesExist(userId: string, jobId: string): Promise<{
    htmlExists: boolean;
    pdfExists: boolean;
    docxExists: boolean;
  }> {
    try {
      const [htmlExists] = await this.getBucket().file(`users/${userId}/generated/${jobId}/cv.html`).exists();
      const [pdfExists] = await this.getBucket().file(`users/${userId}/generated/${jobId}/cv.pdf`).exists();
      const [docxExists] = await this.getBucket().file(`users/${userId}/generated/${jobId}/cv.docx`).exists();
      
      return { htmlExists, pdfExists, docxExists };
    } catch (error: any) {
      console.error('Error checking file existence:', error);
      return { htmlExists: false, pdfExists: false, docxExists: false };
    }
  }
}