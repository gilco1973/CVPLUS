import * as admin from 'firebase-admin';
import { FileGenerationResult } from '../types';

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
   * Save generated CV files to Firebase Storage
   */
  async saveGeneratedFiles(
    jobId: string,
    userId: string,
    htmlContent: string
  ): Promise<FileGenerationResult> {
    try {
      // Save HTML file first
      const htmlUrl = await this.saveHtmlFile(userId, jobId, htmlContent);
      
      // Generate and save PDF
      const pdfUrl = await this.generateAndSavePdf(userId, jobId, htmlContent);
      
      // DOCX generation placeholder - to be implemented
      const docxUrl = '';
      
      return { pdfUrl, docxUrl, htmlUrl };
    } catch (error: any) {
      console.error('Error saving generated files:', error);
      throw new Error(`Failed to save CV files: ${error.message}`);
    }
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
    
    const [htmlUrl] = await htmlFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });
    
    console.log(`HTML file saved successfully: ${htmlFileName}`);
    return htmlUrl;
  }

  /**
   * Generate PDF and save to Firebase Storage
   */
  private async generateAndSavePdf(userId: string, jobId: string, htmlContent: string): Promise<string> {
    try {
      const puppeteer = require('puppeteer');
      
      const browser = await puppeteer.launch({ 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 794, height: 1123 }); // A4 size in pixels
      
      // Create PDF-optimized HTML content
      const pdfOptimizedHtml = this.optimizeHtmlForPdf(htmlContent);
      
      // Set content and wait for resources
      await page.setContent(pdfOptimizedHtml, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      });
      
      // Generate PDF with proper settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });
      
      await browser.close();
      
      // Save PDF to Firebase Storage
      const pdfFileName = `users/${userId}/generated/${jobId}/cv.pdf`;
      const pdfFile = this.getBucket().file(pdfFileName);
      
      await pdfFile.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          cacheControl: 'public, max-age=31536000'
        },
      });
      
      const [pdfSignedUrl] = await pdfFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      });
      
      console.log(`PDF generated successfully: ${pdfFileName}`);
      return pdfSignedUrl;
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Return empty string if PDF generation fails
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