/**
 * Cloud Functions for RAG Chat feature
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { embeddingService } from '../services/embedding.service';
import { chatService } from '../services/chat.service';
import { enhancedDbService } from '../services/enhanced-db.service';
import { EnhancedJob, UserRAGProfile } from '../types/enhanced-models';
import { nanoid } from 'nanoid';

/**
 * Initialize RAG for a CV
 */
export const initializeRAG = functions
  .runWith({ timeoutSeconds: 540, memory: '2GB' })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = data;
    if (!jobId) {
      throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized to access this job');
      }

      if (!job.parsedData) {
        throw new functions.https.HttpsError('failed-precondition', 'CV must be parsed before initializing RAG');
      }

      // Generate vector namespace
      const vectorNamespace = `user-${context.auth.uid}-job-${jobId}`;

      // Create CV chunks
      console.log('Creating CV chunks...');
      const chunks = await embeddingService.createCVChunks(job.parsedData, jobId);

      // Generate embeddings
      console.log('Generating embeddings...');
      const chunksWithEmbeddings = await embeddingService.generateEmbeddings(chunks);

      // Store in vector database
      console.log('Storing embeddings in Pinecone...');
      await embeddingService.storeEmbeddings(
        chunksWithEmbeddings,
        vectorNamespace,
        context.auth.uid,
        jobId
      );

      // Create RAG profile
      const ragProfile: UserRAGProfile = {
        userId: context.auth.uid,
        jobId,
        vectorNamespace,
        embeddingModel: 'openai',
        chunks: chunksWithEmbeddings,
        lastIndexed: new Date(),
        chatSessions: [],
        settings: {
          temperature: 0.7,
          maxTokens: 500,
          systemPrompt: data.systemPrompt,
          allowedTopics: ['experience', 'skills', 'education', 'projects', 'achievements'],
          personality: data.personality || 'professional'
        },
        statistics: {
          totalQueries: 0,
          averageResponseTime: 0
        }
      };

      // Store RAG profile
      await enhancedDbService.upsertRAGProfile(ragProfile);

      // Update job with RAG status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'ragChat.enabled': true,
        'ragChat.vectorNamespace': vectorNamespace,
        'ragChat.lastIndexed': new Date(),
        'ragChat.settings': ragProfile.settings,
        'enhancedFeatures.ragChat': {
          enabled: true,
          status: 'completed',
          data: {
            chunksCount: chunks.length,
            vectorNamespace
          }
        }
      });

      return {
        success: true,
        vectorNamespace,
        chunksCount: chunks.length,
        message: 'RAG chat initialized successfully'
      };
    } catch (error: any) {
      console.error('Error initializing RAG:', error);
      
      // Update job with error status
      await admin.firestore().collection('jobs').doc(jobId).update({
        'enhancedFeatures.ragChat': {
          enabled: false,
          status: 'failed',
          error: error.message
        }
      });
      
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Start a new chat session
 */
export const startChatSession = functions.https.onCall(async (data) => {
  const { jobId, visitorId, metadata } = data;

  if (!jobId) {
    throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
  }

  try {
    // Get job to check if RAG is enabled
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'CV not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    if (!job.ragChat?.enabled) {
      throw new functions.https.HttpsError('failed-precondition', 'Chat is not enabled for this CV');
    }

    // Get public profile settings
    const publicProfileDoc = await admin.firestore()
      .collection('publicProfiles')
      .doc(jobId)
      .get();

    if (publicProfileDoc.exists) {
      const publicProfile = publicProfileDoc.data();
      if (!publicProfile?.settings?.showChat) {
        throw new functions.https.HttpsError('permission-denied', 'Chat is disabled for this profile');
      }
    }

    // Create new session
    const sessionId = await chatService.initializeSession(
      jobId,
      job.userId,
      visitorId || nanoid(),
      metadata
    );

    // Get suggested questions
    const suggestedQuestions = await chatService.getSuggestedQuestions(
      job.ragChat.vectorNamespace!,
      jobId
    );

    return {
      success: true,
      sessionId,
      suggestedQuestions,
      settings: {
        personality: job.ragChat.settings.personality,
        language: job.ragChat.settings.language || 'en'
      }
    };
  } catch (error: any) {
    console.error('Error starting chat session:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Send a chat message
 */
export const sendChatMessage = functions
  .runWith({ timeoutSeconds: 60 })
  .https.onCall(async (data) => {
    const { sessionId, message } = data;

    if (!sessionId || !message) {
      throw new functions.https.HttpsError('invalid-argument', 'Session ID and message are required');
    }

    try {
      // Validate message
      const validation = chatService.validateMessage(message);
      if (!validation.valid) {
        throw new functions.https.HttpsError('invalid-argument', validation.error);
      }

      // Get session
      const sessionDoc = await admin.firestore()
        .collection('chatSessions')
        .doc(sessionId)
        .get();

      if (!sessionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Session not found');
      }

      const session = sessionDoc.data();
      const jobId = session?.jobId;

      // Get job and RAG profile
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      const job = jobDoc.data() as EnhancedJob;

      if (!job.ragChat?.enabled) {
        throw new functions.https.HttpsError('failed-precondition', 'Chat is not available');
      }

      // Get RAG profile
      const ragProfileDoc = await admin.firestore()
        .collection('ragProfiles')
        .doc(`${job.userId}_${jobId}`)
        .get();

      if (!ragProfileDoc.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'RAG profile not found');
      }

      const ragProfile = ragProfileDoc.data() as UserRAGProfile;

      // Process message and generate response
      const startTime = Date.now();
      const response = await chatService.processMessage(
        sessionId,
        message,
        job.ragChat.vectorNamespace!,
        ragProfile
      );
      const responseTime = Date.now() - startTime;

      // Update statistics
      await admin.firestore()
        .collection('ragProfiles')
        .doc(`${job.userId}_${jobId}`)
        .update({
          'statistics.totalQueries': admin.firestore.FieldValue.increment(1),
          'statistics.averageResponseTime': admin.firestore.FieldValue.increment(responseTime)
        });

      return {
        success: true,
        response: {
          content: response.content,
          timestamp: response.timestamp,
          confidence: response.metadata?.confidence
        }
      };
    } catch (error: any) {
      console.error('Error processing chat message:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * End chat session and collect feedback
 */
export const endChatSession = functions.https.onCall(async (data) => {
  const { sessionId, rating, feedback } = data;

  if (!sessionId) {
    throw new functions.https.HttpsError('invalid-argument', 'Session ID is required');
  }

  try {
    // Update session with feedback
    await admin.firestore()
      .collection('chatSessions')
      .doc(sessionId)
      .update({
        'satisfaction.rating': rating,
        'satisfaction.feedback': feedback,
        endedAt: new Date()
      });

    return {
      success: true,
      message: 'Thank you for your feedback!'
    };
  } catch (error: any) {
    console.error('Error ending chat session:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Update RAG embeddings when CV is updated
 */
export const updateRAGEmbeddings = functions
  .runWith({ timeoutSeconds: 540, memory: '2GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { jobId } = data;
    if (!jobId) {
      throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
    }

    try {
      // Get job and verify ownership
      const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Job not found');
      }

      const job = jobDoc.data() as EnhancedJob;
      if (job.userId !== context.auth.uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized');
      }

      if (!job.ragChat?.enabled || !job.ragChat?.vectorNamespace) {
        throw new functions.https.HttpsError('failed-precondition', 'RAG not initialized');
      }

      // Delete old embeddings
      await embeddingService.deleteEmbeddings(job.ragChat.vectorNamespace, jobId);

      // Create new chunks and embeddings
      const chunks = await embeddingService.createCVChunks(job.parsedData!, jobId);
      const chunksWithEmbeddings = await embeddingService.generateEmbeddings(chunks);

      // Store new embeddings
      await embeddingService.storeEmbeddings(
        chunksWithEmbeddings,
        job.ragChat.vectorNamespace,
        context.auth.uid,
        jobId
      );

      // Update RAG profile
      await admin.firestore()
        .collection('ragProfiles')
        .doc(`${context.auth.uid}_${jobId}`)
        .update({
          chunks: chunksWithEmbeddings,
          lastIndexed: new Date()
        });

      // Update job
      await admin.firestore().collection('jobs').doc(jobId).update({
        'ragChat.lastIndexed': new Date()
      });

      return {
        success: true,
        chunksCount: chunks.length,
        message: 'RAG embeddings updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating RAG embeddings:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Get chat analytics
 */
export const getChatAnalytics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { jobId } = data;
  if (!jobId) {
    throw new functions.https.HttpsError('invalid-argument', 'Job ID is required');
  }

  try {
    // Verify ownership
    const jobDoc = await admin.firestore().collection('jobs').doc(jobId).get();
    if (!jobDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }

    const job = jobDoc.data() as EnhancedJob;
    if (job.userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not authorized');
    }

    // Get chat sessions
    const sessions = await admin.firestore()
      .collection('chatSessions')
      .where('jobId', '==', jobId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    // Calculate analytics
    const sessionData = sessions.docs.map(doc => doc.data());
    const totalSessions = sessionData.length;
    const completedSessions = sessionData.filter(s => s.satisfaction?.rating).length;
    const averageRating = completedSessions > 0
      ? sessionData.reduce((sum, s) => sum + (s.satisfaction?.rating || 0), 0) / completedSessions
      : 0;

    const messageCount = sessionData.reduce((sum, s) => sum + (s.messages?.length || 0), 0);
    const averageMessagesPerSession = totalSessions > 0 ? messageCount / totalSessions : 0;

    // Get RAG profile stats
    const ragProfileDoc = await admin.firestore()
      .collection('ragProfiles')
      .doc(`${context.auth.uid}_${jobId}`)
      .get();

    const ragStats = ragProfileDoc.exists ? ragProfileDoc.data()?.statistics : null;

    return {
      success: true,
      analytics: {
        totalSessions,
        completedSessions,
        averageRating: averageRating.toFixed(2),
        totalMessages: messageCount,
        averageMessagesPerSession: averageMessagesPerSession.toFixed(1),
        totalQueries: ragStats?.totalQueries || 0,
        averageResponseTime: ragStats?.averageResponseTime 
          ? `${(ragStats.averageResponseTime / ragStats.totalQueries).toFixed(0)}ms`
          : 'N/A',
        recentSessions: sessionData.slice(0, 10).map(s => ({
          sessionId: s.sessionId,
          createdAt: s.createdAt,
          messageCount: s.messages?.length || 0,
          rating: s.satisfaction?.rating,
          duration: s.endedAt 
            ? Math.floor((s.endedAt.toDate() - s.createdAt.toDate()) / 1000 / 60) 
            : null
        }))
      }
    };
  } catch (error: any) {
    console.error('Error getting chat analytics:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});