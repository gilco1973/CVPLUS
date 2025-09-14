/**
 * Send Chat Message Firebase Function
 *
 * POST /portal/{portalId}/chat/{sessionId}/message
 * Processes a chat message and returns AI-generated response
 *
 * @author CVPlus Team
 * @version 1.0.0
 */

import { https } from 'firebase-functions/v2';
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { authenticateUser } from '../middleware/auth.middleware';

/**
 * Send Chat Message Request Body
 */
interface SendChatMessageRequest {
  message: string;
  messageType?: 'text' | 'question' | 'feedback';
  context?: {
    previousMessageId?: string;
    topic?: string;
  };
}

/**
 * Send Chat Message Response
 */
interface SendChatMessageResponse {
  success: boolean;
  messageId?: string;
  aiResponse?: {
    message: string;
    messageId: string;
    timestamp: string;
    context?: {
      sources?: string[];
      confidence?: number;
      suggestedFollowUps?: string[];
    };
  };
  sessionStatus?: 'active' | 'expired' | 'rate_limited';
  error?: string;
}

/**
 * Chat message processing handler
 */
async function handleSendChatMessage(req: Request, res: Response): Promise<void> {
  try {
    // Validate request method
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
      } as SendChatMessageResponse);
      return;
    }

    // Extract portalId and sessionId from URL path
    const pathParts = req.url.split('/');
    const portalId = req.params.portalId || pathParts[2];
    const sessionId = req.params.sessionId || pathParts[4];

    if (!portalId || !sessionId) {
      res.status(400).json({
        success: false,
        error: 'portalId and sessionId are required',
      } as SendChatMessageResponse);
      return;
    }

    // Parse request body
    const { message, messageType, context } = req.body as SendChatMessageRequest;

    if (!message?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      } as SendChatMessageResponse);
      return;
    }

    // Initialize Firestore
    const db = getFirestore();

    // Validate session exists and is active
    const sessionDoc = await db.collection('chatSessions').doc(sessionId).get();

    if (!sessionDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Chat session not found',
      } as SendChatMessageResponse);
      return;
    }

    const sessionData = sessionDoc.data();

    // Verify session belongs to the portal
    if (sessionData?.portalId !== portalId) {
      res.status(400).json({
        success: false,
        error: 'Session does not belong to this portal',
      } as SendChatMessageResponse);
      return;
    }

    // Check session expiry
    const now = new Date();
    const expiresAt = sessionData?.expiresAt?.toDate?.() || new Date(sessionData?.expiresAt);

    if (now > expiresAt) {
      res.status(410).json({
        success: false,
        error: 'Chat session has expired',
        sessionStatus: 'expired',
      } as SendChatMessageResponse);
      return;
    }

    // Check rate limiting (simple implementation)
    const recentMessages =
      sessionData?.messages?.filter((msg: any) => {
        const msgTime = msg.timestamp?.toDate?.() || new Date(msg.timestamp);
        return now.getTime() - msgTime.getTime() < 60000; // Last minute
      }) || [];

    if (recentMessages.length >= 10) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please wait before sending more messages.',
        sessionStatus: 'rate_limited',
      } as SendChatMessageResponse);
      return;
    }

    // Get portal and CV data for context
    const [portalDoc, cvDoc] = await Promise.all([
      db.collection('portals').doc(portalId).get(),
      sessionData.portalId
        ? db
            .collection('processedCVs')
            .doc(sessionData.processedCvId || '')
            .get()
        : Promise.resolve(null),
    ]);

    const portalData = portalDoc.exists ? portalDoc.data() : null;
    const cvData = cvDoc?.exists ? cvDoc.data() : null;

    // Generate message IDs
    const userMessageId = `msg_${Date.now()}_user`;
    const aiMessageId = `msg_${Date.now()}_ai`;

    // Create user message object
    const userMessage = {
      messageId: userMessageId,
      type: 'user',
      message: message.trim(),
      messageType: messageType || 'text',
      timestamp: now,
      context: context || {},
    };

    // TODO: Generate AI response using Anthropic Claude API
    // This will be fully implemented in the TDD phase
    const aiResponse = await generateAIResponse(message, cvData, sessionData.context);

    // Create AI message object
    const aiMessage = {
      messageId: aiMessageId,
      type: 'ai',
      message: aiResponse.message,
      timestamp: new Date(),
      context: aiResponse.context || {},
    };

    // Update session with new messages
    await db
      .collection('chatSessions')
      .doc(sessionId)
      .update({
        messages: [...(sessionData.messages || []), userMessage, aiMessage],
        lastActivity: now,
        messageCount: (sessionData.messageCount || 0) + 2,
      });

    // Update portal analytics
    await updateChatAnalytics(db, portalId, sessionId);

    // Build response
    const response: SendChatMessageResponse = {
      success: true,
      messageId: userMessageId,
      aiResponse: {
        message: aiMessage.message,
        messageId: aiMessageId,
        timestamp: aiMessage.timestamp.toISOString(),
        context: aiResponse.context,
      },
      sessionStatus: 'active',
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as SendChatMessageResponse);
  }
}

/**
 * Generate AI response using CV data and context
 * This is a placeholder implementation - full implementation will use Anthropic Claude API
 */
async function generateAIResponse(
  userMessage: string,
  cvData: any,
  sessionContext: any
): Promise<{
  message: string;
  context?: {
    sources?: string[];
    confidence?: number;
    suggestedFollowUps?: string[];
  };
}> {
  // TODO: Replace with actual Anthropic Claude API integration
  // This is a mock implementation for T005 setup

  const name = cvData?.personalInfo?.name || 'this professional';

  // Simple keyword-based responses (to be replaced with Claude API)
  let response = '';
  let sources: string[] = [];
  let suggestedFollowUps: string[] = [];

  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('experience') || lowerMessage.includes('work')) {
    response = `${name} has extensive experience in their field. `;
    if (cvData?.experience?.length > 0) {
      const latest = cvData.experience[0];
      response += `Most recently, they worked as ${latest.title} at ${latest.company}.`;
      sources.push('Work Experience');
    }
    suggestedFollowUps = ['Tell me about their skills', 'What projects have they worked on?'];
  } else if (lowerMessage.includes('skill')) {
    response = `${name} has a diverse skill set. `;
    if (cvData?.skills?.length > 0) {
      response += `Their key skills include ${cvData.skills.slice(0, 3).join(', ')}.`;
      sources.push('Skills Section');
    }
    suggestedFollowUps = ['What about their education?', 'Tell me about their experience'];
  } else if (lowerMessage.includes('education')) {
    response = `Regarding education, `;
    if (cvData?.education?.length > 0) {
      const edu = cvData.education[0];
      response += `${name} studied ${edu.degree || edu.field} at ${edu.institution}.`;
      sources.push('Education');
    } else {
      response += `specific educational details are not prominently featured in their profile.`;
    }
    suggestedFollowUps = ['What are their main skills?', 'Tell me about their work experience'];
  } else {
    response = `Thank you for your question about ${name}. I'm here to help you learn more about their professional background, experience, and skills. What specific aspect would you like to know more about?`;
    suggestedFollowUps = [
      'Tell me about their experience',
      'What skills do they have?',
      'What is their educational background?',
    ];
  }

  return {
    message: response,
    context: {
      sources,
      confidence: 0.8, // Mock confidence score
      suggestedFollowUps,
    },
  };
}

/**
 * Update chat analytics
 */
async function updateChatAnalytics(
  db: FirebaseFirestore.Firestore,
  portalId: string,
  sessionId: string
): Promise<void> {
  try {
    const analyticsRef = db.collection('portalAnalytics').doc(portalId);

    await db.runTransaction(async transaction => {
      const doc = await transaction.get(analyticsRef);

      if (doc.exists) {
        const data = doc.data();
        transaction.update(analyticsRef, {
          totalMessages: (data?.totalMessages || 0) + 2, // User + AI message
          lastActivity: new Date(),
        });
      } else {
        transaction.set(analyticsRef, {
          portalId,
          chatSessionsStarted: 0,
          totalMessages: 2,
          uniqueVisitors: 1,
          createdAt: new Date(),
          lastActivity: new Date(),
        });
      }
    });
  } catch (error) {
    console.warn('Failed to update chat analytics:', error);
  }
}

/**
 * Firebase Function: Send Chat Message
 * Endpoint: POST /portal/{portalId}/chat/{sessionId}/message
 */
export const sendChatMessage = https.onRequest(
  {
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 60,
    maxInstances: 20,
    region: 'us-central1',
  },
  async (req: Request, res: Response) => {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.status(200).send('');
      return;
    }

    // Note: Chat messages may be available for anonymous users
    // So we don't require authentication, but validate if token is present
    if (req.headers.authorization) {
      const authResult = await authenticateUser(req, { required: false });
      if (authResult.success && authResult.userId) {
        // Add userId to res.locals for the handler
        res.locals = { ...res.locals, uid: authResult.userId };
      }
    }

    // Handle the request
    await handleSendChatMessage(req, res);
  }
);
