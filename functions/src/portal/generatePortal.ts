/**
 * Generate Portal Firebase Function
 *
 * POST /portal/generate
 * Creates a new interactive AI portal for a processed CV
 *
 * @author CVPlus Team
 * @version 1.0.0
 */

import { https } from 'firebase-functions/v2';
import { Request, Response } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { authenticateUser } from '../middleware/auth.middleware';

/**
 * Generate Portal Request Body
 */
interface GeneratePortalRequest {
  processedCvId: string;
  portalConfig?: {
    theme?: 'professional' | 'creative' | 'minimal';
    features?: string[];
    customization?: Record<string, any>;
  };
}

/**
 * Generate Portal Response
 */
interface GeneratePortalResponse {
  success: boolean;
  portalId?: string;
  status?: 'queued' | 'processing' | 'completed' | 'failed';
  message?: string;
  error?: string;
}

/**
 * Portal generation handler
 */
async function handleGeneratePortal(req: Request, res: Response): Promise<void> {
  try {
    // Validate request method
    if (req.method !== 'POST') {
      res.status(405).json({
        success: false,
        error: 'Method not allowed',
      } as GeneratePortalResponse);
      return;
    }

    // Validate request body
    const { processedCvId, portalConfig } = req.body as GeneratePortalRequest;

    if (!processedCvId) {
      res.status(400).json({
        success: false,
        error: 'processedCvId is required',
      } as GeneratePortalResponse);
      return;
    }

    // Authenticate user
    const authResult = await authenticateUser(req, { required: true });
    if (!authResult.success || !authResult.userId) {
      res.status(401).json({
        success: false,
        error: authResult.error || 'User authentication required',
      } as GeneratePortalResponse);
      return;
    }
    const userId = authResult.userId;

    // Initialize Firestore
    const db = getFirestore();

    // Verify the processed CV exists and belongs to the user
    const cvDoc = await db.collection('processedCVs').doc(processedCvId).get();

    if (!cvDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Processed CV not found',
      } as GeneratePortalResponse);
      return;
    }

    const cvData = cvDoc.data();
    if (cvData?.userId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this CV',
      } as GeneratePortalResponse);
      return;
    }

    // Generate portal ID
    const portalId = `portal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create portal document
    const portalData = {
      portalId,
      userId,
      processedCvId,
      status: 'queued',
      config: portalConfig || {
        theme: 'professional',
        features: ['chat', 'analytics', 'sharing'],
        customization: {},
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        version: '1.0.0',
        generatedBy: 'cvplus-portal-generator',
      },
    };

    // Save portal to Firestore
    await db.collection('portals').doc(portalId).set(portalData);

    // TODO: Trigger portal generation process (T032 implementation)
    // This will be implemented in the actual portal generation phase

    // Return successful response
    res.status(200).json({
      success: true,
      portalId,
      status: 'queued',
      message: 'Portal generation initiated successfully',
    } as GeneratePortalResponse);
  } catch (error) {
    console.error('Error in generatePortal:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as GeneratePortalResponse);
  }
}

/**
 * Firebase Function: Generate Portal
 * Endpoint: POST /portal/generate
 */
export const generatePortal = https.onRequest(
  {
    cors: true,
    memory: '1GiB',
    timeoutSeconds: 60,
    maxInstances: 10,
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

    // Handle the request
    await handleGeneratePortal(req, res);
  }
);
