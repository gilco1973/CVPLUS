import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { corsOptions } from '../config/cors';
import { CVGenerator } from '../services/cvGenerator';

/**
 * Firebase Function to generate real-time CV preview HTML
 * Lightweight version of generateCV optimized for preview updates
 */
export const generateCVPreview = onCall(
  {
    timeoutSeconds: 60, // Short timeout for preview - should be fast
    memory: '1GiB', // Lower memory requirement than full generation
    ...corsOptions
  },
  async (request) => {
    console.log('generateCVPreview function called');
    
    if (!request.auth) {
      console.error('Authentication failed: No auth token');
      throw new Error('User must be authenticated');
    }

    const { jobId, templateId, features } = request.data;
    const userId = request.auth.uid;
    
    console.log('Preview request:', { jobId, templateId, features, userId });

    try {
      // Validate required parameters
      if (!jobId) {
        throw new Error('jobId is required');
      }

      // Get job data and validate user ownership
      const { cvData } = await validateJobAndGetData(jobId, userId);

      // Generate preview HTML (no file saving)
      const previewHTML = await generatePreviewHTML(cvData, templateId, features, jobId);

      console.log(`✅ Preview generated successfully for job ${jobId}`);
      
      return {
        success: true,
        html: previewHTML,
        template: templateId || 'modern',
        features: features || [],
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('Error generating CV preview:', error.message);
      console.error('Error stack:', error.stack);
      
      throw new Error(`Failed to generate CV preview: ${error.message}`);
    }
  }
);

/**
 * Validate job ownership and get CV data
 */
async function validateJobAndGetData(jobId: string, userId: string) {
  // Get job data
  const jobDoc = await admin.firestore()
    .collection('jobs')
    .doc(jobId)
    .get();
  
  if (!jobDoc.exists) {
    throw new Error('Job not found');
  }

  const jobData = jobDoc.data();
  
  // Verify user ownership
  if (jobData?.userId !== userId) {
    throw new Error('Unauthorized access to job');
  }
  
  const parsedCV = jobData?.parsedData;
  
  if (!parsedCV) {
    throw new Error('No parsed CV data found');
  }

  // Use privacy version if privacy mode is in features
  const cvData = jobData?.privacyVersion && jobData.privacyVersion
    ? jobData.privacyVersion 
    : parsedCV;

  return { jobData, cvData };
}

/**
 * Generate lightweight preview HTML (no file generation)
 */
async function generatePreviewHTML(
  cvData: any,
  templateId: string | undefined,
  features: string[] | undefined,
  jobId: string
): Promise<string> {
  console.log('🎨 [PREVIEW] Generating HTML preview with template:', templateId || 'modern');
  
  try {
    // Use CV generator but only for HTML generation
    const generator = new CVGenerator();
    const htmlContent = await generator.generateHTML(
      cvData, 
      templateId || 'modern', 
      features || [], 
      jobId
    );
    
    console.log(`✅ [PREVIEW] HTML preview generated successfully (${htmlContent.length} characters)`);
    
    // Add preview-specific styling to indicate this is a preview
    const previewHTML = addPreviewStyling(htmlContent);
    
    return previewHTML;
    
  } catch (error: any) {
    console.error('❌ [PREVIEW] Error generating HTML preview:', error);
    throw error;
  }
}

/**
 * Add preview-specific styling and indicators
 */
function addPreviewStyling(htmlContent: string): string {
  // Add a subtle preview indicator
  const previewIndicator = `
    <style>
      .preview-indicator {
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      @media print {
        .preview-indicator {
          display: none !important;
        }
      }
    </style>
    <div class="preview-indicator">Preview</div>
  `;

  // Insert the preview indicator just before the closing body tag
  const updatedHTML = htmlContent.replace(
    '</body>',
    `${previewIndicator}</body>`
  );

  return updatedHTML;
}