import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { corsOptions } from '../config/cors';
import { CVGenerator } from '../services/cvGenerator';

/**
 * Cloud Function to inject completed feature HTML fragments into the generated CV
 * This function is called after features complete processing to update the CV with their content
 */
export const injectCompletedFeatures = onCall(
  {
    timeoutSeconds: 120,
    memory: '1GiB',
    ...corsOptions
  },
  async (request) => {
    console.log('injectCompletedFeatures function called');
    
    if (!request.auth) {
      console.error('Authentication failed: No auth token');
      throw new Error('User must be authenticated');
    }

    const { jobId } = request.data;
    const userId = request.auth.uid;
    
    console.log('User authenticated:', userId);
    console.log('Injecting completed features for job:', jobId);

    try {
      // Step 1: Get job data and validate ownership
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

      // Check if there's a generated CV
      if (!jobData?.generatedCV?.html) {
        throw new Error('No generated CV found to inject features into');
      }

      // Step 2: Get completed features with HTML fragments
      const completedFeatures = await getCompletedFeaturesWithFragments(jobData);
      
      if (completedFeatures.length === 0) {
        console.log('No completed features with HTML fragments found');
        return {
          success: true,
          message: 'No features to inject',
          featuresInjected: 0
        };
      }

      // Step 3: Inject feature HTML fragments into the CV
      const updatedHTML = await injectFeatureFragments(
        jobData.generatedCV.html,
        completedFeatures
      );

      // Step 4: Save updated HTML to storage and update job
      const generator = new CVGenerator();
      const { htmlUrl } = await generator.saveGeneratedFiles(
        jobId,
        userId,
        updatedHTML
      );

      // Update job with new HTML and injection status
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'generatedCV.html': updatedHTML,
          'generatedCV.htmlUrl': htmlUrl,
          'featureInjectionStatus': 'completed',
          'lastFeatureInjection': FieldValue.serverTimestamp(),
          'injectedFeatures': completedFeatures.map(f => f.featureName),
          updatedAt: FieldValue.serverTimestamp()
        });

      console.log(`Successfully injected ${completedFeatures.length} features into CV`);

      return {
        success: true,
        featuresInjected: completedFeatures.length,
        injectedFeatures: completedFeatures.map(f => f.featureName),
        htmlUrl
      };

    } catch (error: any) {
      console.error('Error injecting completed features:', error.message);
      console.error('Error stack:', error.stack);
      
      // Update job with error status
      await admin.firestore()
        .collection('jobs')
        .doc(jobId)
        .update({
          'featureInjectionStatus': 'failed',
          'featureInjectionError': error.message,
          updatedAt: FieldValue.serverTimestamp()
        });
      
      throw new Error(`Failed to inject completed features: ${error.message}`);
    }
  });

/**
 * Get completed features that have HTML fragments ready for injection
 */
async function getCompletedFeaturesWithFragments(jobData: any): Promise<Array<{
  featureName: string;
  htmlFragment: string;
  featureType: string;
}>> {
  const completedFeatures: Array<{
    featureName: string;
    htmlFragment: string;
    featureType: string;
  }> = [];

  if (!jobData.enhancedFeatures) {
    console.log('No enhanced features found in job data');
    return completedFeatures;
  }

  for (const [featureName, featureData] of Object.entries(jobData.enhancedFeatures)) {
    const feature = featureData as any;
    
    if (feature.status === 'completed' && feature.htmlFragment) {
      console.log(`Found completed feature with HTML fragment: ${featureName}`);
      completedFeatures.push({
        featureName,
        htmlFragment: feature.htmlFragment,
        featureType: featureName
      });
    } else {
      console.log(`Skipping feature ${featureName}: status=${feature.status}, hasFragment=${!!feature.htmlFragment}`);
    }
  }

  console.log(`Found ${completedFeatures.length} completed features with HTML fragments`);
  return completedFeatures;
}

/**
 * Inject feature HTML fragments into the CV HTML at appropriate locations
 */
async function injectFeatureFragments(
  originalHTML: string,
  features: Array<{ featureName: string; htmlFragment: string; featureType: string }>
): Promise<string> {
  let updatedHTML = originalHTML;
  
  console.log('Starting feature injection into CV HTML');
  
  for (const feature of features) {
    console.log(`Injecting feature: ${feature.featureName}`);
    
    try {
      // Inject the feature HTML fragment at the end of the interactive features section
      // Look for the interactive features section in the template
      const interactiveFeaturesPattern = /<\/section>\s*<div class="download-section"/;
      
      if (interactiveFeaturesPattern.test(updatedHTML)) {
        // Inject before the download section
        updatedHTML = updatedHTML.replace(
          interactiveFeaturesPattern,
          `</section>\n        <!-- ${feature.featureName} Feature -->\n        <section class="section">\n            ${feature.htmlFragment}\n        </section>\n        <div class="download-section"`
        );
        console.log(`Successfully injected ${feature.featureName} before download section`);
      } else {
        // Fallback: inject before the closing container div
        const containerEndPattern = /<\/div>\s*<\/body>/;
        if (containerEndPattern.test(updatedHTML)) {
          updatedHTML = updatedHTML.replace(
            containerEndPattern,
            `        <!-- ${feature.featureName} Feature -->\n        <section class="section">\n            ${feature.htmlFragment}\n        </section>\n    </div>\n</body>`
          );
          console.log(`Successfully injected ${feature.featureName} before container end`);
        } else {
          console.warn(`Could not find injection point for ${feature.featureName}`);
        }
      }
    } catch (error) {
      console.error(`Error injecting feature ${feature.featureName}:`, error);
      // Continue with other features even if one fails
    }
  }
  
  console.log('Completed feature injection into CV HTML');
  return updatedHTML;
}