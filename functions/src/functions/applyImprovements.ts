import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { CVTransformationService, CVRecommendation } from '../services/cv-transformation.service';
import { ParsedCV } from '../types/job';
import { corsOptions } from '../config/cors';

export const applyImprovements = onCall(
  {
    timeoutSeconds: 180,
    memory: '1GiB',
    ...corsOptions,
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, selectedRecommendationIds, targetRole, industryKeywords } = request.data;
    
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    if (!selectedRecommendationIds || !Array.isArray(selectedRecommendationIds)) {
      throw new Error('Selected recommendation IDs array is required');
    }

    const db = getFirestore();
    const userId = request.auth.uid;

    try {
      console.log(`Applying ${selectedRecommendationIds.length} improvements for job ${jobId}`);

      // Get the job document
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData?.userId !== userId) {
        throw new Error('Unauthorized access to job');
      }

      // Get the original parsed CV
      const originalCV: ParsedCV = jobData?.parsedCV;
      if (!originalCV) {
        throw new Error('No parsed CV found for this job');
      }

      // Get stored recommendations
      let storedRecommendations: CVRecommendation[] = jobData?.cvRecommendations || [];
      
      // If no stored recommendations, generate them
      if (storedRecommendations.length === 0) {
        console.log('No stored recommendations found, generating new ones...');
        const transformationService = new CVTransformationService();
        storedRecommendations = await transformationService.generateDetailedRecommendations(
          originalCV,
          targetRole,
          industryKeywords
        );
        
        // Store the generated recommendations
        await db.collection('jobs').doc(jobId).update({
          cvRecommendations: storedRecommendations,
          lastRecommendationGeneration: new Date().toISOString()
        });
      }

      // Filter selected recommendations
      const selectedRecommendations = storedRecommendations.filter(rec => 
        selectedRecommendationIds.includes(rec.id)
      );

      if (selectedRecommendations.length === 0) {
        throw new Error('No valid recommendations found for the selected IDs');
      }

      console.log(`Found ${selectedRecommendations.length} recommendations to apply`);

      // Apply transformations
      const transformationService = new CVTransformationService();
      const transformationResult = await transformationService.applyRecommendations(
        originalCV,
        selectedRecommendations
      );

      // Store the improved CV and transformation results
      const updateData = {
        improvedCV: transformationResult.improvedCV,
        appliedRecommendations: transformationResult.appliedRecommendations,
        transformationSummary: transformationResult.transformationSummary,
        comparisonReport: transformationResult.comparisonReport,
        lastTransformation: new Date().toISOString(),
        status: 'improved'
      };

      await db.collection('jobs').doc(jobId).update(updateData);

      console.log(`Successfully applied ${transformationResult.appliedRecommendations.length} improvements`);

      return {
        success: true,
        data: {
          jobId,
          improvedCV: transformationResult.improvedCV,
          appliedRecommendations: transformationResult.appliedRecommendations,
          transformationSummary: transformationResult.transformationSummary,
          comparisonReport: transformationResult.comparisonReport,
          message: `Successfully applied ${transformationResult.appliedRecommendations.length} improvements`
        }
      };

    } catch (error: any) {
      console.error('Error applying improvements:', error);
      
      // Update job status to reflect error
      try {
        await db.collection('jobs').doc(jobId).update({
          status: 'failed',
          error: error.message,
          lastError: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Failed to update job status:', dbError);
      }

      throw new Error(`Failed to apply improvements: ${error.message}`);
    }
  }
);

export const getRecommendations = onCall(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
    ...corsOptions,
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, targetRole, industryKeywords, forceRegenerate } = request.data;
    
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    const db = getFirestore();
    const userId = request.auth.uid;

    try {
      console.log(`Getting recommendations for job ${jobId}`);

      // Get the job document
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData?.userId !== userId) {
        throw new Error('Unauthorized access to job');
      }

      const originalCV: ParsedCV = jobData?.parsedCV;
      if (!originalCV) {
        throw new Error('No parsed CV found for this job');
      }

      // Check if we have existing recommendations and don't need to regenerate
      const existingRecommendations: CVRecommendation[] = jobData?.cvRecommendations || [];
      const lastGeneration = jobData?.lastRecommendationGeneration;
      const isRecentGeneration = lastGeneration && 
        (new Date().getTime() - new Date(lastGeneration).getTime()) < 24 * 60 * 60 * 1000; // 24 hours

      if (existingRecommendations.length > 0 && isRecentGeneration && !forceRegenerate) {
        console.log('Using existing recommendations');
        return {
          success: true,
          data: {
            recommendations: existingRecommendations,
            cached: true,
            generatedAt: lastGeneration
          }
        };
      }

      // Generate new recommendations
      console.log('Generating new recommendations...');
      const transformationService = new CVTransformationService();
      const recommendations = await transformationService.generateDetailedRecommendations(
        originalCV,
        targetRole,
        industryKeywords
      );

      // Store the recommendations
      await db.collection('jobs').doc(jobId).update({
        cvRecommendations: recommendations,
        lastRecommendationGeneration: new Date().toISOString()
      });

      console.log(`Generated ${recommendations.length} recommendations`);

      return {
        success: true,
        data: {
          recommendations,
          cached: false,
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error: any) {
      console.error('Error getting recommendations:', error);
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }
);

export const previewImprovement = onCall(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    ...corsOptions,
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { jobId, recommendationId } = request.data;
    
    if (!jobId || !recommendationId) {
      throw new Error('Job ID and recommendation ID are required');
    }

    const db = getFirestore();
    const userId = request.auth.uid;

    try {
      // Get the job document
      const jobDoc = await db.collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const jobData = jobDoc.data();
      if (jobData?.userId !== userId) {
        throw new Error('Unauthorized access to job');
      }

      const originalCV: ParsedCV = jobData?.parsedCV;
      const recommendations: CVRecommendation[] = jobData?.cvRecommendations || [];
      
      const recommendation = recommendations.find(rec => rec.id === recommendationId);
      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      // Apply just this single recommendation for preview
      const transformationService = new CVTransformationService();
      const previewResult = await transformationService.applyRecommendations(
        originalCV,
        [recommendation]
      );

      return {
        success: true,
        data: {
          recommendation,
          beforeContent: recommendation.currentContent || '',
          afterContent: recommendation.suggestedContent || '',
          previewCV: previewResult.improvedCV,
          estimatedImpact: recommendation.estimatedScoreImprovement
        }
      };

    } catch (error: any) {
      console.error('Error previewing improvement:', error);
      throw new Error(`Failed to preview improvement: ${error.message}`);
    }
  }
);